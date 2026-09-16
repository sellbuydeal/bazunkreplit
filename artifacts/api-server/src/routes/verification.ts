import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import {
  createVerificationSession,
  verifyWebhookSignature,
  DIDIT_STATUS_MAP,
  type VerificationStatus,
} from "../lib/didit.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Public / seller routes ─────────────────────────────────────────────────

/** GET /api/verification/status?email=… */
router.get("/verification/status", async (req, res) => {
  const email = req.query.email as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query parameter is required" });
    return;
  }

  const result = await db.execute(sql`
    SELECT verification_status, verification_date, didit_verification_id
    FROM users
    WHERE email = ${email}
  `);

  if (!result.rows.length) {
    res.json({ verificationStatus: "unverified" });
    return;
  }

  const row = result.rows[0];
  res.json({
    verificationStatus: (row.verification_status as string) ?? "unverified",
    verificationDate: row.verification_date,
    diditVerificationId: row.didit_verification_id,
  });
});

/** POST /api/verification/session — create a Didit KYC session for the calling seller */
router.post("/verification/session", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }

  const host = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
  const redirectUrl = `${host}/dashboard?section=verification&verified=1`;
  const callbackUrl = `${host}/api/verification/webhook`;

  try {
    const session = await createVerificationSession({
      vendorData: email,
      redirectUrl,
      callbackUrl,
    });

    await db.execute(sql`
      UPDATE users
      SET verification_status = 'pending',
          didit_verification_id = ${session.session_id}
      WHERE email = ${email}
    `);

    await db.execute(sql`
      INSERT INTO verification_webhook_logs
        (session_id, vendor_data, event_type, status, raw_payload, created_at)
      VALUES
        (${session.session_id}, ${email}, 'session_created', 'pending',
         ${JSON.stringify({ session_id: session.session_id, vendor_data: email })}::jsonb,
         NOW())
    `);

    req.log.info({ sessionId: session.session_id, email }, "Didit verification session created");
    res.json({ url: session.url, sessionId: session.session_id });
  } catch (err) {
    logger.error({ err }, "Failed to create Didit session");
    res.status(500).json({ error: "Failed to create verification session" });
  }
});

// ── Admin routes ───────────────────────────────────────────────────────────

/** GET /api/admin/verification/users?status=pending|verified|rejected */
router.get("/admin/verification/users", requireAdmin, async (req, res) => {
  const { status } = req.query as { status?: string };
  const allowed: VerificationStatus[] = ["pending", "verified", "rejected", "unverified"];

  let result;
  if (status && allowed.includes(status as VerificationStatus)) {
    result = await db.execute(sql`
      SELECT id, email, name, verification_status, verification_date,
             didit_verification_id, created_at
      FROM users
      WHERE verification_status = ${status}
      ORDER BY created_at DESC
    `);
  } else {
    result = await db.execute(sql`
      SELECT id, email, name, verification_status, verification_date,
             didit_verification_id, created_at
      FROM users
      WHERE verification_status != 'unverified'
      ORDER BY
        CASE verification_status
          WHEN 'pending'  THEN 1
          WHEN 'verified' THEN 2
          WHEN 'rejected' THEN 3
          ELSE 4
        END,
        created_at DESC
    `);
  }

  res.json(result.rows);
});

/** GET /api/admin/verification/logs — recent webhook event log */
router.get("/admin/verification/logs", requireAdmin, async (req, res) => {
  const result = await db.execute(sql`
    SELECT id, session_id, vendor_data, event_type, status, created_at
    FROM verification_webhook_logs
    ORDER BY created_at DESC
    LIMIT 200
  `);
  res.json(result.rows);
});

/** PATCH /api/admin/verification/users/:email — manually override status */
router.patch("/admin/verification/users/:email", requireAdmin, async (req, res) => {
  const email = decodeURIComponent(String(req.params.email));
  const { status } = req.body as { status?: string };

  const allowed: VerificationStatus[] = ["pending", "verified", "rejected", "unverified"];
  if (!status || !allowed.includes(status as VerificationStatus)) {
    res.status(400).json({ error: "status must be one of: pending, verified, rejected, unverified" });
    return;
  }

  await db.execute(sql`
    UPDATE users
    SET verification_status = ${status},
        verification_date = ${status === "verified" ? sql`NOW()` : sql`NULL`}
    WHERE email = ${email}
  `);

  req.log.info({ email, status }, "Admin manually updated verification status");
  res.json({ success: true });
});

export default router;

// ── Webhook handler (registered separately with raw body in app.ts) ────────

export async function handleDiditWebhook(req: Request, res: Response): Promise<void> {
  const signatureHeader = req.headers["x-signature"] as string | undefined;
  const rawBody = req.body as Buffer;

  if (signatureHeader) {
    if (!verifyWebhookSignature(rawBody, signatureHeader)) {
      logger.warn("Didit webhook: invalid signature — rejecting");
      res.status(400).json({ error: "Invalid webhook signature" });
      return;
    }
  } else if (process.env.NODE_ENV === "production" && process.env.DIDIT_WEBHOOK_SECRET) {
    logger.warn("Didit webhook: missing x-signature header in production — rejecting");
    res.status(400).json({ error: "Missing webhook signature" });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const { session_id, status, vendor_data } = payload as {
    session_id?: string;
    status?: string;
    vendor_data?: string;
  };

  logger.info({ session_id, status, vendor_data }, "Didit webhook received");

  const ourStatus: VerificationStatus =
    (status && DIDIT_STATUS_MAP[status]) || "pending";

  // Log every event for audit trail
  await db.execute(sql`
    INSERT INTO verification_webhook_logs
      (session_id, vendor_data, event_type, status, raw_payload, created_at)
    VALUES
      (${session_id ?? null}, ${vendor_data ?? null}, 'webhook', ${ourStatus},
       ${JSON.stringify(payload)}::jsonb, NOW())
  `);

  // Update the user record when a terminal status is received
  if (vendor_data && (ourStatus === "verified" || ourStatus === "rejected")) {
    await db.execute(sql`
      UPDATE users
      SET verification_status   = ${ourStatus},
          verification_date     = NOW(),
          didit_verification_id = ${session_id ?? null}
      WHERE email = ${vendor_data}
    `);
    logger.info({ email: vendor_data, status: ourStatus }, "User verification status updated");
  }

  res.json({ received: true });
}

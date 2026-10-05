import { Router, type Request, type Response } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { randomBytes } from "crypto";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import {
  createVerificationSession,
  verifyWebhookSignature,
  DIDIT_STATUS_MAP,
  type VerificationStatus,
  diditConfigured,
} from "../lib/didit.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ── Public / seller routes ─────────────────────────────────────────────────

async function authenticatedIdentity(req: Request): Promise<{ userId: string; email: string } | null> {
  const auth=getAuth(req); if(!auth.isAuthenticated||!auth.userId)return null;
  const u=await clerkClient.users.getUser(auth.userId);
  const email=u.primaryEmailAddress?.emailAddress?.toLowerCase() ?? u.emailAddresses[0]?.emailAddress?.toLowerCase();
  return email ? { userId: auth.userId, email } : null;
}
function newVerificationCode(){ return `BZV-${randomBytes(5).toString("hex").toUpperCase()}`; }

router.get("/verification/status", async (req,res)=>{
  const identity=await authenticatedIdentity(req); if(!identity){res.status(401).json({error:"Authentication required"});return;}
  const email=identity.email;
  const result=await db.execute(sql`SELECT verification_status, verification_date, didit_verification_id, verification_code FROM users WHERE LOWER(email)=LOWER(${email})`);
  const row=result.rows[0];
  res.json({verificationStatus:(row?.verification_status as string)??"unverified",verificationDate:row?.verification_date??null,verificationCode:row?.verification_code??null,configured:diditConfigured()});
});

router.post("/verification/session", async (req,res)=>{
  const identity=await authenticatedIdentity(req); if(!identity){res.status(401).json({error:"Authentication required"});return;}
  const email=identity.email;
  if(!diditConfigured()){res.status(503).json({error:"Identity verification is not configured yet. Check DIDIT_API_KEY and DIDIT_WEBHOOK_SECRET on the API service."});return;}
  const siteUrl=(process.env.PUBLIC_BASE_URL??"https://bazunk.com").replace(/\/$/,"");
  const apiUrl=(process.env.PUBLIC_API_URL??"https://bazunkreplit.onrender.com").replace(/\/$/,"");
  try{
    const session=await createVerificationSession({vendorData:identity.userId,callbackUrl:`${siteUrl}/dashboard?section=verification&verification_return=1`});
    await db.execute(sql`UPDATE users SET verification_status='pending', didit_verification_id=${session.session_id} WHERE LOWER(email)=LOWER(${email})`);
    await db.execute(sql`INSERT INTO verification_webhook_logs(session_id,vendor_data,event_type,status,raw_payload,created_at) VALUES(${session.session_id},${identity.userId},'session_created','pending',${JSON.stringify({session_id:session.session_id})}::jsonb,NOW())`);
    res.json({url:session.url,sessionId:session.session_id});
  }catch(err){logger.error({err},"Failed to create Didit session");res.status(502).json({error:err instanceof Error?err.message:"Failed to create verification session"});}
});

router.get("/verification/code/:code", async (req,res)=>{
  const code=String(req.params.code||"").toUpperCase();
  const r=await db.execute(sql`SELECT username, verification_code, verification_date FROM users WHERE verification_status='verified' AND verification_code=${code} LIMIT 1`);
  if(!r.rows.length){res.status(404).json({verified:false});return;}
  res.json({verified:true,username:r.rows[0].username??null,verificationCode:r.rows[0].verification_code,verificationDate:r.rows[0].verification_date});
});

// ── Admin routes ───────────────────────────────────────────────────────────

/** GET /api/admin/verification/users?status=pending|verified|rejected */
router.get("/admin/verification/users", requireAdmin, async (req, res) => {
  const { status } = req.query as { status?: string };
  const allowed: VerificationStatus[] = ["pending", "verified", "rejected", "unverified"];

  let result;
  if (status && allowed.includes(status as VerificationStatus)) {
    result = await db.execute(sql`
      SELECT id, email, name, verification_status, verification_date, verification_code,
             didit_verification_id, created_at
      FROM users
      WHERE verification_status = ${status}
      ORDER BY created_at DESC
    `);
  } else {
    result = await db.execute(sql`
      SELECT id, email, name, verification_status, verification_date, verification_code,
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
        verification_date = ${status === "verified" ? sql`NOW()` : sql`NULL`},
        verification_code = CASE WHEN ${status} = 'verified' THEN COALESCE(verification_code, ${newVerificationCode()}) ELSE verification_code END
    WHERE email = ${email}
  `);

  req.log.info({ email, status }, "Admin manually updated verification status");
  res.json({ success: true });
});

export default router;

// ── Webhook handler (registered separately with raw body in app.ts) ────────

export async function handleDiditWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf-8")) as Record<string, unknown>;
  } catch {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  const signature = String(req.headers["x-signature-v2"] ?? "");
  const timestamp = Array.isArray(req.headers["x-timestamp"])
    ? req.headers["x-timestamp"][0]
    : req.headers["x-timestamp"];
  if (!verifyWebhookSignature(payload, signature, timestamp)) {
    logger.warn("Didit webhook: invalid signature or stale timestamp — rejecting");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  const { event_id, session_id, status, vendor_data, webhook_type } = payload as {
    event_id?: string; session_id?: string; status?: string; vendor_data?: string; webhook_type?: string;
  };
  if (!event_id || !session_id || !status) {
    res.status(400).json({ error: "Missing Didit webhook fields" });
    return;
  }

  const duplicate = await db.execute(sql`SELECT 1 FROM verification_webhook_logs WHERE event_id=${event_id} LIMIT 1`);
  if (duplicate.rows.length) { res.json({ received: true, duplicate: true }); return; }

  const ourStatus: VerificationStatus = DIDIT_STATUS_MAP[status] ?? "pending";
  await db.execute(sql`
    INSERT INTO verification_webhook_logs
      (event_id, session_id, vendor_data, event_type, status, raw_payload, created_at)
    VALUES (${event_id}, ${session_id}, ${vendor_data ?? null}, ${webhook_type ?? "webhook"},
            ${ourStatus}, ${JSON.stringify(payload)}::jsonb, NOW())
    ON CONFLICT (event_id) DO NOTHING
  `);

  if (status === "Approved") {
    await db.execute(sql`
      UPDATE users SET verification_status='verified', verification_date=NOW(),
        didit_verification_id=${session_id},
        verification_code=COALESCE(verification_code, ${newVerificationCode()})
      WHERE didit_verification_id=${session_id}
    `);
  } else if (status === "Declined") {
    await db.execute(sql`UPDATE users SET verification_status='rejected', verification_date=NOW() WHERE didit_verification_id=${session_id}`);
  } else if (status === "Kyc Expired") {
    await db.execute(sql`UPDATE users SET verification_status='unverified', verification_date=NULL WHERE didit_verification_id=${session_id}`);
  } else if (["In Progress","Awaiting User","In Review","Resubmitted","Abandoned"].includes(status)) {
    await db.execute(sql`UPDATE users SET verification_status='pending' WHERE didit_verification_id=${session_id}`);
  } else if (status === "Expired" || status === "Not Started") {
    await db.execute(sql`UPDATE users SET verification_status='unverified' WHERE didit_verification_id=${session_id}`);
  }

  logger.info({ event_id, session_id, status, vendor_data }, "Didit V3 webhook processed");
  res.json({ received: true });
}

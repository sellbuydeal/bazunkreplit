import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";

const router = Router();

const VALID_REASONS = ["item_not_received", "not_as_described", "damaged", "wrong_item", "other"];
const VALID_STATUSES = ["open", "under_review", "resolved_refund", "resolved_no_action", "closed"];

router.post("/disputes", async (req, res) => {
  const { buyerEmail, sellerEmail, orderId, itemTitle, reason, description } = req.body as Record<string, string>;
  if (!buyerEmail || !itemTitle || !reason || !description) {
    res.status(400).json({ error: "buyerEmail, itemTitle, reason, and description are required" });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO disputes (id, order_id, buyer_email, seller_email, item_title, reason, description, status, created_at, updated_at)
    VALUES (${id}, ${orderId ?? null}, ${buyerEmail}, ${sellerEmail ?? null}, ${itemTitle}, ${reason}, ${description}, 'open', NOW(), NOW())
  `);
  res.status(201).json({ id });
});

router.get("/disputes", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT * FROM disputes
    WHERE buyer_email = ${email} OR seller_email = ${email}
    ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

router.patch("/disputes/:id/seller-response", async (req, res) => {
  const { id } = req.params;
  const { sellerEmail, response } = req.body as Record<string, string>;
  if (!sellerEmail || !response) {
    res.status(400).json({ error: "sellerEmail and response are required" });
    return;
  }
  await db.execute(sql`
    UPDATE disputes SET seller_response = ${response}, updated_at = NOW()
    WHERE id = ${id} AND seller_email = ${sellerEmail}
  `);
  res.json({ ok: true });
});

router.get("/admin/disputes", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`SELECT * FROM disputes ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.patch("/admin/disputes/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, resolutionNotes, refundAmount, adminEmail } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Valid status is required" });
    return;
  }
  const resolvedAt = ["resolved_refund", "resolved_no_action", "closed"].includes(status) ? sql`NOW()` : sql`NULL`;
  await db.execute(sql`
    UPDATE disputes
    SET status = ${status},
        resolution_notes = ${resolutionNotes ?? null},
        refund_amount = ${refundAmount ?? null},
        admin_email = ${adminEmail ?? null},
        resolved_at = ${resolvedAt},
        updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

export default router;

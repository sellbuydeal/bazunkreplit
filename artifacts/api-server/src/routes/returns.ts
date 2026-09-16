import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";

const router = Router();

const VALID_REASONS = ["changed_mind", "not_as_described", "damaged", "wrong_item", "faulty", "other"];
const VALID_CONDITIONS = ["unopened", "like_new", "used", "damaged"];
const VALID_STATUSES = ["requested", "approved", "declined", "return_shipped", "received", "refund_issued", "closed"];

router.post("/returns", async (req, res) => {
  const { orderId, buyerEmail, sellerEmail, itemTitle, reason, condition, description } = req.body as Record<string, string>;
  if (!orderId || !buyerEmail || !itemTitle || !reason || !condition || !description) {
    res.status(400).json({ error: "orderId, buyerEmail, itemTitle, reason, condition, and description are required" });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }
  if (!VALID_CONDITIONS.includes(condition)) {
    res.status(400).json({ error: "Invalid condition" });
    return;
  }
  const existing = await db.execute(sql`SELECT id FROM returns WHERE order_id = ${orderId} AND buyer_email = ${buyerEmail}`);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "A return request already exists for this order" });
    return;
  }
  const id = `RET-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO returns (id, order_id, buyer_email, seller_email, item_title, reason, condition, description, status, created_at, updated_at)
    VALUES (${id}, ${orderId}, ${buyerEmail}, ${sellerEmail ?? null}, ${itemTitle}, ${reason}, ${condition}, ${description}, 'requested', NOW(), NOW())
  `);
  res.status(201).json({ id });
});

router.get("/returns", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT * FROM returns WHERE buyer_email = ${email} OR seller_email = ${email} ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

router.patch("/returns/:id/ship", async (req, res) => {
  const { id } = req.params;
  const { buyerEmail, returnTracking } = req.body as Record<string, string>;
  if (!buyerEmail) {
    res.status(400).json({ error: "buyerEmail required" });
    return;
  }
  await db.execute(sql`
    UPDATE returns
    SET status = 'return_shipped',
        return_tracking = ${returnTracking ?? null},
        updated_at = NOW()
    WHERE id = ${id} AND buyer_email = ${buyerEmail} AND status = 'approved'
  `);
  res.json({ ok: true });
});

router.get("/admin/returns", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`SELECT * FROM returns ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.patch("/admin/returns/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, adminNotes, refundAmount } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Valid status required" });
    return;
  }
  await db.execute(sql`
    UPDATE returns
    SET status = ${status},
        admin_notes = COALESCE(${adminNotes ?? null}, admin_notes),
        refund_amount = COALESCE(${refundAmount ?? null}, refund_amount),
        updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

export default router;

import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";

const router = Router();

const VALID_REASONS = ["item_not_received", "not_as_described", "damaged", "wrong_item", "other"];
const VALID_STATUSES = ["open", "under_review", "resolved_refund", "resolved_no_action", "closed"];

// Orders a buyer can still dispute: their own, not cancelled, bought in the last 30 days,
// and with no dispute already open.
router.get("/disputes/eligible-orders", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT o.id, o.item_title, o.seller_email, o.price, o.created_at,
           GREATEST(0, 30 - FLOOR(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 86400))::int AS days_left
    FROM orders o
    WHERE o.buyer_email = ${email}
      AND o.status <> 'cancelled'
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_id = o.id AND d.status <> 'closed')
    ORDER BY o.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/disputes", async (req, res) => {
  const { buyerEmail, orderId, reason, description } = req.body as Record<string, string>;
  if (!buyerEmail || !orderId || !reason || !description) {
    res.status(400).json({ error: "Please choose an order and describe the issue." });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }

  // The order must exist, belong to this buyer, and have been bought within the last 30 days.
  // The item and seller always come from the order itself, never from the form.
  const order = (await db.execute(sql`
    SELECT id, buyer_email, seller_email, item_title, status,
           (created_at >= NOW() - INTERVAL '30 days') AS in_window
    FROM orders WHERE id = ${orderId}
  `)).rows[0] as Record<string, unknown> | undefined;

  if (!order || order.buyer_email !== buyerEmail) {
    res.status(404).json({ error: "We couldn't find that order on your account." });
    return;
  }
  if (order.status === "cancelled") {
    res.status(400).json({ error: "This order was cancelled, so it can't be disputed." });
    return;
  }
  if (!order.in_window) {
    res.status(400).json({ error: "Disputes must be opened within 30 days of purchase, and this order is older than that." });
    return;
  }
  const existing = await db.execute(sql`SELECT 1 FROM disputes WHERE order_id = ${orderId} AND status <> 'closed' LIMIT 1`);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "A dispute is already open for this order." });
    return;
  }

  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO disputes (id, order_id, buyer_email, seller_email, item_title, reason, description, status, created_at, updated_at)
    VALUES (${id}, ${orderId}, ${buyerEmail}, ${(order.seller_email as string | null) ?? null}, ${order.item_title as string}, ${reason}, ${description}, 'open', NOW(), NOW())
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

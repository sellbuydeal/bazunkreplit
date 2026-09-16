import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";

const router = Router();

const VALID_STATUSES = ["pending", "confirmed", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled"];

router.post("/orders", async (req, res) => {
  const { buyerEmail, sellerEmail, itemTitle, itemImage, price, address, notes } = req.body as Record<string, string>;
  if (!buyerEmail || !itemTitle || !price) {
    res.status(400).json({ error: "buyerEmail, itemTitle, and price are required" });
    return;
  }
  const id = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO orders (id, buyer_email, seller_email, item_title, item_image, price, status, address, notes, created_at, updated_at)
    VALUES (${id}, ${buyerEmail}, ${sellerEmail ?? null}, ${itemTitle}, ${itemImage ?? null}, ${parseFloat(price)}, 'pending', ${address ?? null}, ${notes ?? null}, NOW(), NOW())
  `);
  res.status(201).json({ id });
});

router.get("/orders", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT * FROM orders WHERE buyer_email = ${email} ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

router.get("/orders/:id", async (req, res) => {
  const { id } = req.params;
  const rows = await db.execute(sql`SELECT * FROM orders WHERE id = ${id}`);
  if (rows.rows.length === 0) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(rows.rows[0]);
});

router.patch("/orders/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, carrier, estimatedDelivery, buyerEmail } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Valid status required" });
    return;
  }
  await db.execute(sql`
    UPDATE orders
    SET status = ${status},
        tracking_number = COALESCE(${trackingNumber ?? null}, tracking_number),
        carrier = COALESCE(${carrier ?? null}, carrier),
        estimated_delivery = COALESCE(${estimatedDelivery ?? null}, estimated_delivery),
        updated_at = NOW()
    WHERE id = ${id} AND buyer_email = ${buyerEmail ?? ""}
  `);
  res.json({ ok: true });
});

router.get("/admin/orders", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`SELECT * FROM orders ORDER BY created_at DESC`);
  res.json(rows.rows);
});

router.patch("/admin/orders/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, trackingNumber, carrier, estimatedDelivery } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Valid status required" });
    return;
  }
  await db.execute(sql`
    UPDATE orders
    SET status = ${status},
        tracking_number = COALESCE(${trackingNumber ?? null}, tracking_number),
        carrier = COALESCE(${carrier ?? null}, carrier),
        estimated_delivery = COALESCE(${estimatedDelivery ?? null}, estimated_delivery),
        updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

export default router;

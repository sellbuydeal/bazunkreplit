import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";

const router = Router();

const VALID_TYPES = ["standard", "lightning", "happy_hour", "weekend_mega", "category_event"];

async function syncStatuses() {
  await db.execute(sql`
    UPDATE flash_sales
    SET status = 'active', updated_at = NOW()
    WHERE status = 'upcoming' AND starts_at <= NOW()
  `);
  await db.execute(sql`
    UPDATE flash_sales
    SET status = 'ended', updated_at = NOW()
    WHERE status = 'active' AND ends_at <= NOW()
  `);
}

router.get("/flash-sales", async (req, res) => {
  await syncStatuses();
  const { status = "active", category, sale_type, limit = "40", offset = "0" } = req.query as Record<string, string>;
  const lim = parseInt(limit);
  const off = parseInt(offset);

  let rows;
  if (status === "upcoming") {
    if (sale_type && sale_type !== "all") {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = 'upcoming' AND sale_type = ${sale_type} ORDER BY starts_at ASC LIMIT ${lim} OFFSET ${off}`);
    } else if (category && category !== "all") {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = 'upcoming' AND category = ${category} ORDER BY starts_at ASC LIMIT ${lim} OFFSET ${off}`);
    } else {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = 'upcoming' ORDER BY starts_at ASC LIMIT ${lim} OFFSET ${off}`);
    }
  } else {
    if (sale_type && sale_type !== "all" && category && category !== "all") {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = ${status} AND sale_type = ${sale_type} AND category = ${category} ORDER BY ends_at ASC LIMIT ${lim} OFFSET ${off}`);
    } else if (sale_type && sale_type !== "all") {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = ${status} AND sale_type = ${sale_type} ORDER BY ends_at ASC LIMIT ${lim} OFFSET ${off}`);
    } else if (category && category !== "all") {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = ${status} AND category = ${category} ORDER BY ends_at ASC LIMIT ${lim} OFFSET ${off}`);
    } else {
      rows = await db.execute(sql`SELECT * FROM flash_sales WHERE status = ${status} ORDER BY ends_at ASC LIMIT ${lim} OFFSET ${off}`);
    }
  }
  res.json(rows.rows);
});

router.get("/flash-sales/my-sales", async (req, res) => {
  await syncStatuses();
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const rows = await db.execute(sql`SELECT * FROM flash_sales WHERE seller_email = ${email} ORDER BY created_at DESC LIMIT 50`);
  res.json(rows.rows);
});

router.get("/flash-sales/:id", async (req, res) => {
  await syncStatuses();
  const { id } = req.params;
  const result = await db.execute(sql`SELECT * FROM flash_sales WHERE id = ${id}`);
  if (result.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  res.json(result.rows[0]);
});

router.post("/flash-sales", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { sellerEmail, sellerName, title, description, image, category, originalPrice, salePrice, startsAt, endsAt, saleType = "standard" } = body as Record<string, string>;
  if (!sellerEmail || !sellerName || !title || !originalPrice || !salePrice || !startsAt || !endsAt) {
    res.status(400).json({ error: "sellerEmail, sellerName, title, originalPrice, salePrice, startsAt, endsAt are required" });
    return;
  }
  const resolvedType = VALID_TYPES.includes(saleType) ? saleType : "standard";
  const op = parseFloat(originalPrice);
  const sp = parseFloat(salePrice);
  if (sp >= op) { res.status(400).json({ error: "Sale price must be less than original price" }); return; }
  if (new Date(endsAt) <= new Date(startsAt)) { res.status(400).json({ error: "End time must be after start time" }); return; }
  const discountPercent = Math.round(((op - sp) / op) * 100);
  const id = `FS-${randomUUID().slice(0, 8).toUpperCase()}`;
  const status = new Date(startsAt) <= new Date() ? "active" : "upcoming";
  await db.execute(sql`
    INSERT INTO flash_sales
      (id, seller_email, seller_name, title, description, image, category,
       original_price, sale_price, discount_percent, starts_at, ends_at, status, sale_type, created_at, updated_at)
    VALUES (
      ${id}, ${sellerEmail}, ${sellerName}, ${title}, ${description ?? null},
      ${image ?? null}, ${category ?? null},
      ${op}, ${sp}, ${discountPercent}, ${startsAt}, ${endsAt}, ${status}, ${resolvedType}, NOW(), NOW()
    )
  `);
  res.status(201).json({ id });
});

router.patch("/flash-sales/:id/cancel", async (req, res) => {
  const { id } = req.params;
  const { email } = req.body as Record<string, string>;
  const result = await db.execute(sql`SELECT * FROM flash_sales WHERE id = ${id}`);
  if (result.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const sale = result.rows[0] as Record<string, unknown>;
  if (sale["seller_email"] !== email) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.execute(sql`UPDATE flash_sales SET status = 'cancelled', updated_at = NOW() WHERE id = ${id}`);
  res.json({ ok: true });
});

router.get("/admin/flash-sales", requireAdmin, async (_req, res) => {
  await syncStatuses();
  const rows = await db.execute(sql`SELECT * FROM flash_sales ORDER BY created_at DESC LIMIT 200`);
  res.json(rows.rows);
});

router.patch("/admin/flash-sales/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as Record<string, string>;
  const VALID = ["active", "upcoming", "ended", "cancelled"];
  if (!status || !VALID.includes(status)) { res.status(400).json({ error: "Valid status required" }); return; }
  await db.execute(sql`UPDATE flash_sales SET status = ${status}, updated_at = NOW() WHERE id = ${id}`);
  res.json({ ok: true });
});

export default router;

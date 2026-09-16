import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  extractProductId,
  fetchAliExpressProduct,
  calculateBazunkPrice,
} from "../lib/aliexpress.js";
import { syncImport, syncAllImports } from "../lib/syncJob.js";

const router = Router();

// List all imports with their linked listing details
router.get("/supplier/imports", async (req, res) => {
  const { email } = req.query as Record<string, string>;

  let rows;
  if (email) {
    rows = await db.execute(sql`
      SELECT
        si.id,
        si.listing_id,
        si.supplier_source,
        si.supplier_id,
        si.supplier_url,
        si.supplier_price,
        si.supplier_currency,
        si.markup_type,
        si.markup_value,
        si.last_synced_at,
        si.sync_status,
        si.sync_error,
        si.supplier_data,
        si.created_at,
        si.updated_at,
        l.title,
        l.price AS bazunk_price,
        l.image,
        l.status AS listing_status,
        l.public_id
      FROM supplier_imports si
      JOIN listings l ON l.id = si.listing_id
      WHERE l.seller_email = ${email}
      ORDER BY si.created_at DESC
    `);
  } else {
    rows = await db.execute(sql`
      SELECT
        si.id,
        si.listing_id,
        si.supplier_source,
        si.supplier_id,
        si.supplier_url,
        si.supplier_price,
        si.supplier_currency,
        si.markup_type,
        si.markup_value,
        si.last_synced_at,
        si.sync_status,
        si.sync_error,
        si.supplier_data,
        si.created_at,
        si.updated_at,
        l.title,
        l.price AS bazunk_price,
        l.image,
        l.status AS listing_status,
        l.public_id
      FROM supplier_imports si
      JOIN listings l ON l.id = si.listing_id
      ORDER BY si.created_at DESC
    `);
  }

  res.json(rows.rows);
});

// Manual import — no API key needed. User supplies product details directly.
router.post("/supplier/import", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const url = String(body.url ?? "").trim();
  const sellerEmail = String(body.sellerEmail ?? "").trim();
  const sellerName = body.sellerName ? String(body.sellerName) : null;
  const title = String(body.title ?? "").trim();
  const supplierPriceUsd = parseFloat(String(body.supplierPriceUsd ?? "0"));
  const imageUrl = body.imageUrl ? String(body.imageUrl) : null;
  const category = body.category ? String(body.category) : "other";
  const condition = body.condition ? String(body.condition) : "new";
  const description = body.description ? String(body.description) : "";
  const markupType = body.markupType ? String(body.markupType) : "percentage";
  const markupValue = parseFloat(String(body.markupValue ?? "30"));

  if (!url || !sellerEmail || !title) {
    res.status(400).json({ error: "url, sellerEmail and title are required" });
    return;
  }
  if (isNaN(supplierPriceUsd) || supplierPriceUsd <= 0) {
    res.status(400).json({ error: "supplierPriceUsd must be a positive number" });
    return;
  }
  if (isNaN(markupValue) || markupValue < 0) {
    res.status(400).json({ error: "markupValue must be a non-negative number" });
    return;
  }

  const productId = extractProductId(url) ?? url;

  // Duplicate check
  const existing = await db.execute(sql`
    SELECT si.id FROM supplier_imports si
    JOIN listings l ON l.id = si.listing_id
    WHERE si.supplier_id = ${productId} AND l.seller_email = ${sellerEmail}
  `);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "This product is already in your store." });
    return;
  }

  const bazunkPrice = calculateBazunkPrice(supplierPriceUsd, markupType, markupValue);

  const [listing] = (await db.execute(sql`
    INSERT INTO listings (title, price, category, description, condition, image, seller_email, seller_name, status)
    VALUES (${title}, ${bazunkPrice}, ${category}, ${description || "Imported from AliExpress."}, ${condition}, ${imageUrl}, ${sellerEmail}, ${sellerName}, 'active')
    RETURNING *
  `)).rows as Record<string, unknown>[];

  const listingId = listing["id"] as number;
  await db.execute(sql`UPDATE listings SET public_id = ${'BZL-' + listingId} WHERE id = ${listingId}`);

  const [importRecord] = (await db.execute(sql`
    INSERT INTO supplier_imports (
      listing_id, supplier_source, supplier_id, supplier_url,
      supplier_price, supplier_currency, markup_type, markup_value,
      last_synced_at, sync_status
    ) VALUES (
      ${listingId}, 'aliexpress', ${productId}, ${url},
      ${supplierPriceUsd}, 'USD', ${markupType}, ${markupValue},
      NOW(), 'ok'
    )
    RETURNING *
  `)).rows as Record<string, unknown>[];

  res.status(201).json({
    import: importRecord,
    listing: { ...listing, publicId: 'BZL-' + listingId },
    product: { title, priceUsd: supplierPriceUsd, bazunkPrice, imageUrl },
  });
});

// Update markup for an import
router.patch("/supplier/imports/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { markupType, markupValue, sellerEmail } = req.body as Record<string, string | number>;

  if (!markupType || markupValue === undefined) {
    res.status(400).json({ error: "markupType and markupValue are required" });
    return;
  }

  const mv = parseFloat(String(markupValue));
  if (isNaN(mv) || mv < 0) {
    res.status(400).json({ error: "markupValue must be a non-negative number" });
    return;
  }

  const check = await db.execute(sql`
    SELECT si.id, si.supplier_price, l.id AS listing_id
    FROM supplier_imports si
    JOIN listings l ON l.id = si.listing_id
    WHERE si.id = ${id} ${sellerEmail ? sql`AND l.seller_email = ${String(sellerEmail)}` : sql``}
  `);
  if (check.rows.length === 0) { res.status(404).json({ error: "not found" }); return; }

  const row = check.rows[0] as { supplier_price: string; listing_id: number };
  const newPrice = calculateBazunkPrice(parseFloat(row.supplier_price), String(markupType), mv);

  await db.execute(sql`
    UPDATE supplier_imports SET markup_type = ${String(markupType)}, markup_value = ${mv}, updated_at = NOW()
    WHERE id = ${id}
  `);
  await db.execute(sql`
    UPDATE listings SET price = ${newPrice}, updated_at = NOW()
    WHERE id = ${row.listing_id}
  `);

  res.json({ id, markupType, markupValue: mv, bazunkPrice: newPrice });
});

// Sync a single import
router.post("/supplier/imports/:id/sync", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  if (!process.env.RAPIDAPI_KEY) {
    res.status(503).json({ error: "RAPIDAPI_KEY not configured" });
    return;
  }

  const result = await syncImport(id);
  if (!result.ok) {
    res.status(502).json({ error: result.error });
    return;
  }
  res.json({ ok: true });
});

// Sync all imports
router.post("/supplier/sync", async (req, res) => {
  if (!process.env.RAPIDAPI_KEY) {
    res.status(503).json({ error: "RAPIDAPI_KEY not configured" });
    return;
  }

  // Run in background, return immediately
  syncAllImports().catch(() => {});
  res.json({ ok: true, message: "Sync started in background" });
});

// Delete an import (optionally also delete the listing)
router.delete("/supplier/imports/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "invalid id" }); return; }

  const { sellerEmail, deleteListing } = req.query as Record<string, string>;

  const check = await db.execute(sql`
    SELECT si.id, l.id AS listing_id
    FROM supplier_imports si
    JOIN listings l ON l.id = si.listing_id
    WHERE si.id = ${id} ${sellerEmail ? sql`AND l.seller_email = ${sellerEmail}` : sql``}
  `);
  if (check.rows.length === 0) { res.status(404).json({ error: "not found" }); return; }

  const row = check.rows[0] as { listing_id: number };

  await db.execute(sql`DELETE FROM supplier_imports WHERE id = ${id}`);

  if (deleteListing === "true") {
    await db.execute(sql`DELETE FROM listings WHERE id = ${row.listing_id}`);
  }

  res.json({ ok: true });
});

export default router;

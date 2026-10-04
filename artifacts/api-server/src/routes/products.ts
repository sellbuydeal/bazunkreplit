import { Router } from "express";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.use("/admin/products", requireAdmin);
router.use("/admin/categories", requireAdmin);

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/admin/categories", async (_req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT pc.id, pc.name, pc.slug, pc.description, pc.created_at,
        (SELECT COUNT(*)::int FROM products WHERE category_id = pc.id) AS product_count
      FROM product_categories pc ORDER BY pc.name
    `).then(r => r.rows);
    res.json({ categories: rows });
  } catch (err) {
    logger.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "Failed to list categories" });
  }
});

router.post("/admin/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const slug = (name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const id = randomUUID();
    const [row] = await db.execute(sql`
      INSERT INTO product_categories (id, name, slug, description)
      VALUES (${id}, ${name}, ${slug}, ${description ?? null})
      ON CONFLICT (slug) DO UPDATE SET name = ${name}, description = ${description ?? null}
      RETURNING *
    `).then(r => r.rows as any[]);
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create category");
    res.status(500).json({ error: "Failed to create category" });
  }
});

router.put("/admin/categories/:id", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) { res.status(400).json({ error: "name required" }); return; }
    const slug = (name as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const [row] = await db.execute(sql`
      UPDATE product_categories SET name = ${name}, slug = ${slug}, description = ${description ?? null}
      WHERE id = ${req.params.id} RETURNING *
    `).then(r => r.rows as any[]);
    if (!row) { res.status(404).json({ error: "Category not found" }); return; }
    res.json(row);
  } catch (err) {
    logger.error({ err }, "Failed to update category");
    res.status(500).json({ error: "Failed to update category" });
  }
});

router.delete("/admin/categories/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM product_categories WHERE id = ${req.params.id}`);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "Failed to delete category" });
  }
});

// ── Products: Export (must come before /:id routes) ──────────────────────────

router.get("/admin/products/export", async (req, res) => {
  try {
    const status = (req.query.status as string) ?? "";
    const rows = await db.execute(sql`
      SELECT p.id, p.title, p.description, p.price, pc.slug AS category_slug,
        p.condition, p.inventory, p.status, p.tags, p.images, p.seller_email
      FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE (${status} = '' OR p.status = ${status})
      ORDER BY p.created_at DESC
    `).then(r => r.rows as any[]);

    const esc = (v: string) => `"${(v ?? "").replace(/"/g, '""')}"`;
    const header = "id,title,description,price,category_slug,condition,inventory,status,tags,image_url,seller_email";
    const lines = rows.map(r => {
      const imgs: string[] = Array.isArray(r.images) ? r.images : (r.images ? JSON.parse(r.images) : []);
      return [r.id, esc(r.title), esc(r.description ?? ""), r.price, r.category_slug ?? "",
        r.condition ?? "new", r.inventory ?? 0, r.status ?? "pending",
        esc(r.tags ?? ""), imgs[0] ?? "", r.seller_email ?? ""].join(",");
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="products-${Date.now()}.csv"`);
    res.send([header, ...lines].join("\n"));
  } catch (err) {
    logger.error({ err }, "Failed to export products");
    res.status(500).json({ error: "Failed to export products" });
  }
});

// ── Products: Import ──────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim()); current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

router.post("/admin/products/import", async (req, res) => {
  try {
    const { csv } = req.body;
    if (!csv) { res.status(400).json({ error: "csv required" }); return; }

    const lines = (csv as string).split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) { res.json({ imported: 0, errors: [] }); return; }

    const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase());
    const get = (row: string[], field: string) => {
      const i = headers.indexOf(field);
      return i >= 0 ? row[i] ?? "" : "";
    };

    let imported = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      const title = get(row, "title");
      if (!title) { errors.push(`Row ${i}: missing title`); continue; }

      const categorySlug = get(row, "category_slug");
      let categoryId: string | null = null;
      if (categorySlug) {
        const [cat] = await db.execute(
          sql`SELECT id FROM product_categories WHERE slug = ${categorySlug}`
        ).then(r => r.rows as any[]);
        categoryId = cat?.id ?? null;
      }

      const price = parseFloat(get(row, "price")) || 0;
      const inventory = parseInt(get(row, "inventory")) || 0;
      const rawStatus = get(row, "status");
      const status = ["pending", "approved", "rejected"].includes(rawStatus) ? rawStatus : "pending";
      const imageUrl = get(row, "image_url");
      const images = JSON.stringify(imageUrl ? [imageUrl] : []);
      const condition = get(row, "condition") || "new";

      await db.execute(sql`
        INSERT INTO products (id, title, description, price, category_id, condition, inventory, status, tags, images, seller_email)
        VALUES (
          ${randomUUID()}, ${title}, ${get(row, "description") || null}, ${price},
          ${categoryId}, ${condition}, ${inventory}, ${status},
          ${get(row, "tags") || null}, ${images}::jsonb, ${get(row, "seller_email") || null}
        )
      `);
      imported++;
    }

    logger.info({ imported }, "Products imported");
    res.json({ imported, errors });
  } catch (err) {
    logger.error({ err }, "Failed to import products");
    res.status(500).json({ error: "Failed to import products" });
  }
});

// ── Products: CRUD ────────────────────────────────────────────────────────────

router.get("/admin/products", async (req, res) => {
  try {
    const search = (req.query.search as string) ?? "";
    const status = (req.query.status as string) ?? "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const searchPat = "%" + search + "%";

    // Map admin status labels to listings statuses
    const dbStatus = status === "approved" ? "active" : status === "rejected" ? "rejected" : status;

    const rows = await db.execute(sql`
      SELECT
        id::text AS id, title, description, price::float AS price,
        status, condition, seller_email, seller_name,
        category AS category_slug, category AS category_name, subcategory,
        image AS images, created_at, updated_at, specifications, currency,
        NULL AS inventory, tags, '[]'::text AS variants, category AS category_id
      FROM listings
      WHERE (${search} = '' OR title ILIKE ${searchPat} OR description ILIKE ${searchPat})
        AND (${dbStatus} = '' OR status = ${dbStatus})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `).then(r => r.rows as any[]);

    const mappedRows = rows.map((r: any) => ({
      ...r,
      images: r.images ? [r.images] : [],
      status: r.status === "active" ? "approved" : r.status,
    }));

    const [{ count }] = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM listings
      WHERE (${search} = '' OR title ILIKE ${searchPat} OR description ILIKE ${searchPat})
        AND (${dbStatus} = '' OR status = ${dbStatus})
    `).then(r => r.rows as any[]);

    res.json({ products: mappedRows, total: count });
  } catch (err) {
    logger.error({ err }, "Failed to list products");
    res.status(500).json({ error: "Failed to list products" });
  }
});

router.post("/admin/products", async (req, res) => {
  try {
    const { title, description, price, category_id, condition, inventory, status, tags, images, variants, seller_email } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const id = randomUUID();
    const [row] = await db.execute(sql`
      INSERT INTO products (id, title, description, price, category_id, condition, inventory, status, tags, images, variants, seller_email)
      VALUES (
        ${id}, ${title}, ${description ?? null}, ${price ?? 0},
        ${category_id ?? null}, ${condition ?? "new"}, ${inventory ?? 0},
        ${status ?? "pending"}, ${tags ?? null},
        ${JSON.stringify(images ?? [])}::jsonb,
        ${JSON.stringify(variants ?? [])}::jsonb,
        ${seller_email ?? null}
      )
      RETURNING *
    `).then(r => r.rows as any[]);
    logger.info({ id, title }, "Product created");
    res.status(201).json(row);
  } catch (err) {
    logger.error({ err }, "Failed to create product");
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.get("/admin/products/:id", async (req, res) => {
  try {
    const [row] = await db.execute(sql`
      SELECT id::text AS id, public_id, title, description, price::float AS price,
        status, condition, seller_email, seller_name, seller_username,
        category AS category_id, category AS category_slug, category AS category_name,
        subcategory, image, tags, specifications, currency, price_gbp,
        created_at, updated_at
      FROM listings WHERE id = ${parseInt(req.params.id) || 0}
    `).then(r => r.rows as any[]);
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    let specs: Record<string, any> = {};
    try { specs = row.specifications ? JSON.parse(row.specifications) : {}; } catch { specs = {}; }
    res.json({
      ...row,
      images: row.image ? [row.image] : [],
      status: row.status === "active" ? "approved" : row.status,
      inventory: Number(specs.inventory ?? 1),
      brand: String(specs.brand ?? ""),
      sku: String(specs.sku ?? row.public_id ?? ""),
      ships_from: String(specs.ships_from ?? specs.source_country ?? ""),
      ships_from_location: String(specs.ships_from_location ?? specs.source_item_location ?? ""),
      ships_to: String(specs.ships_to ?? ""),
      shipping_price: specs.shipping_price ?? specs.shipping ?? "",
      free_shipping: Boolean(specs.free_shipping ?? (String(specs.source_shipping_label ?? "").toLowerCase() === "free")),
      dispatch_time: String(specs.dispatch_time ?? ""),
      delivery_estimate: String(specs.delivery_estimate ?? ""),
      source: specs.source ?? null,
      source_url: specs.ebay_url ?? specs.amazon_url ?? specs.aliexpress_url ?? specs.supplier_url ?? null,
      source_item_id: specs.item_id ?? specs.asin ?? specs.product_id ?? specs.supplier_id ?? null,
      source_condition: specs.source_condition ?? null,
      source_price: specs.ebay_price ?? specs.amazon_price ?? specs.supplier_price ?? null,
      source_postage: specs.source_shipping_label ?? specs.shipping ?? null,
      last_source_check: specs.last_source_check ?? specs.last_synced_at ?? null,
      markup_pct: specs.markup_pct ?? specs.markup ?? null,
      minimum_profit: specs.minimum_profit ?? null,
      specifications_object: specs,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.put("/admin/products/:id", async (req, res) => {
  try {
    const {
      title, description, price, condition, status, category_id, subcategory,
      seller_email, tags, images, currency, inventory, brand, sku,
      ships_from, ships_from_location, ships_to, shipping_price, free_shipping,
      dispatch_time, delivery_estimate,
    } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const id = parseInt(req.params.id) || 0;
    const [current] = await db.execute(sql`SELECT specifications FROM listings WHERE id = ${id}`)
      .then(r => r.rows as any[]);
    if (!current) { res.status(404).json({ error: "Product not found" }); return; }
    let specs: Record<string, any> = {};
    try { specs = current.specifications ? JSON.parse(current.specifications) : {}; } catch { specs = {}; }
    // Admin-editable merchandising/fulfilment fields live alongside private source metadata.
    // Source identifiers/prices are intentionally preserved so manual edits never break syncing.
    Object.assign(specs, {
      inventory: Math.max(0, Number(inventory ?? specs.inventory ?? 1)),
      brand: brand ?? "", sku: sku ?? "",
      ships_from: ships_from ?? "", ships_from_location: ships_from_location ?? "",
      ships_to: ships_to ?? "", shipping_price: shipping_price === "" ? null : Number(shipping_price),
      free_shipping: Boolean(free_shipping), dispatch_time: dispatch_time ?? "",
      delivery_estimate: delivery_estimate ?? "",
      admin_manual_override: true,
      admin_manual_override_at: new Date().toISOString(),
    });
    const dbStatus = status === "approved" ? "active" : status ?? "pending";
    const image = Array.isArray(images) && images.length ? String(images[0]) : null;
    const [row] = await db.execute(sql`
      UPDATE listings SET
        title = ${title}, description = ${description ?? ""}, price = ${price ?? 0},
        price_gbp = ${price ?? 0}, currency = ${currency ?? "GBP"},
        category = ${category_id || "other"}, subcategory = ${subcategory || null},
        condition = ${condition ?? "used"}, status = ${dbStatus},
        seller_email = ${seller_email ?? ""}, tags = ${tags || null}, image = ${image},
        specifications = ${JSON.stringify(specs)}, updated_at = NOW()
      WHERE id = ${id} RETURNING id::text, title, status
    `).then(r => r.rows as any[]);
    res.json({ ...row, status: row.status === "active" ? "approved" : row.status });
  } catch (err) {
    logger.error({ err }, "Failed to update product");
    res.status(500).json({ error: "Failed to update product" });
  }
});

router.delete("/admin/products/:id", async (req, res) => {
  try {
    await db.execute(sql`DELETE FROM listings WHERE id = ${parseInt(req.params.id) || 0}`);
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "Failed to delete product" });
  }
});

router.patch("/admin/products/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "approved", "rejected"].includes(status)) {
      res.status(400).json({ error: "status must be pending, approved, or rejected" }); return;
    }
    const dbStatus = status === "approved" ? "active" : status;
    const [row] = await db.execute(sql`
      UPDATE listings SET status = ${dbStatus}, updated_at = NOW()
      WHERE id = ${parseInt(req.params.id) || 0} RETURNING id::text, title, status
    `).then(r => r.rows as any[]);
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    logger.info({ id: req.params.id, status }, "Listing status updated by admin");
    res.json({ ...row, status: row.status === "active" ? "approved" : row.status });
  } catch (err) {
    logger.error({ err }, "Failed to update product status");
    res.status(500).json({ error: "Failed to update product status" });
  }
});

export default router;

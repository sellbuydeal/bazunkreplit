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
        category AS category_slug, category AS category_name,
        image AS images, created_at, updated_at,
        NULL AS inventory, NULL AS tags, '[]'::text AS variants, NULL AS category_id
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
      SELECT id::text AS id, title, description, price::float AS price,
        status, condition, seller_email, category AS category_slug,
        category AS category_name, image AS images, created_at, updated_at
      FROM listings WHERE id = ${parseInt(req.params.id) || 0}
    `).then(r => r.rows as any[]);
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    res.json({ ...row, images: row.images ? [row.images] : [], status: row.status === "active" ? "approved" : row.status });
  } catch (err) {
    logger.error({ err }, "Failed to get product");
    res.status(500).json({ error: "Failed to get product" });
  }
});

router.put("/admin/products/:id", async (req, res) => {
  try {
    const { title, description, price, condition, status } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const dbStatus = status === "approved" ? "active" : status ?? "pending";
    const [row] = await db.execute(sql`
      UPDATE listings SET
        title = ${title}, description = ${description ?? null}, price = ${price ?? 0},
        condition = ${condition ?? "used"}, status = ${dbStatus}, updated_at = NOW()
      WHERE id = ${parseInt(req.params.id) || 0} RETURNING id::text, title, status
    `).then(r => r.rows as any[]);
    if (!row) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(row);
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

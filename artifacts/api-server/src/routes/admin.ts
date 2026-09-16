import { Router } from "express";
import { sql } from "drizzle-orm";
import { createHmac } from "crypto";
import { db, classifiedAdsTable } from "@workspace/db";
import { createAdminToken, requireAdmin } from "../middlewares/adminAuth.js";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";
import { DEMO_PRODUCTS } from "../demoSeedData.js";
import { fetchAmazonDetails, buildAmazonDescription } from "../lib/amazon.js";
import { fetchEbayDetails, buildEbayDescription } from "../lib/ebay.js";

const router = Router();

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";

function hashPassword(password: string): string {
  return createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

// Resolve active admin credentials (DB overrides take priority over env vars)
async function getAdminCredentials(): Promise<{ email: string; passwordHash: string; isHashed: boolean }> {
  try {
    const rows = await db.execute(
      sql`SELECT key, value FROM site_settings WHERE key IN ('admin_email', 'admin_password_hash')`
    ).then(r => r.rows as any[]);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    if (map.admin_email && map.admin_password_hash) {
      return { email: map.admin_email, passwordHash: map.admin_password_hash, isHashed: true };
    }
  } catch { /* DB not ready */ }
  return {
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    passwordHash: process.env.ADMIN_PASSWORD ?? "admin123",
    isHashed: false,
  };
}

// ── Public: login ─────────────────────────────────────────────────────────────

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }

  const creds = await getAdminCredentials();
  const emailMatch = email.toLowerCase() === creds.email.toLowerCase();
  const passwordMatch = creds.isHashed
    ? hashPassword(password) === creds.passwordHash
    : password === creds.passwordHash;

  if (!emailMatch || !passwordMatch) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = createAdminToken();
  res.json({ token });
});

// ── Public: site settings (frontend reads these) ───────────────────────────────

router.get("/settings/public", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM site_settings`);
    const settings: Record<string, string> = {};
    for (const row of rows.rows as any[]) {
      settings[row.key] = row.value;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(settings);
  } catch (err) {
    logger.error({ err }, "Failed to get public settings");
    res.json({});
  }
});

// ── All routes below require admin token ──────────────────────────────────────

router.use("/admin", requireAdmin);

// Dashboard stats

router.get("/admin/stats", async (_req, res) => {
  try {
    const [userCount] = await db.execute(sql`SELECT COUNT(*)::int as count FROM users`).then(r => r.rows as any[]);
    const [creditSum] = await db.execute(sql`SELECT COALESCE(SUM(credits),0)::float as total FROM users`).then(r => r.rows as any[]);
    const [txCount] = await db.execute(sql`SELECT COUNT(*)::int as count, COALESCE(SUM(credits_added),0)::float as total FROM credit_transactions`).then(r => r.rows as any[]);

    let stripeRevenue = 0;
    let recentPayments: any[] = [];
    try {
      const stripe = await getUncachableStripeClient();
      const sessions = await stripe.checkout.sessions.list({ limit: 10, status: "complete" });
      recentPayments = sessions.data.map((s) => ({
        id: s.id,
        email: s.customer_details?.email ?? s.client_reference_id ?? "—",
        amount: (s.amount_total ?? 0) / 100,
        currency: s.currency?.toUpperCase() ?? "GBP",
        date: new Date((s.created) * 1000).toISOString(),
        status: s.payment_status,
      }));
      const balance = await stripe.balance.retrieve();
      stripeRevenue = (balance.available[0]?.amount ?? 0) / 100;
    } catch {
      // Stripe not available — skip
    }

    res.json({
      userCount: userCount.count,
      creditsInCirculation: creditSum.total,
      totalTransactions: txCount.count,
      totalRevenue: txCount.total,
      stripeBalance: stripeRevenue,
      recentPayments,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Users list

router.get("/admin/users", async (req, res) => {
  try {
    const search = (req.query.search as string) ?? "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const rows = search
      ? await db.execute(sql`
          SELECT id, email, name, credits, stripe_customer_id, banned, created_at
          FROM users WHERE email ILIKE ${"%" + search + "%"}
          ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `).then(r => r.rows)
      : await db.execute(sql`
          SELECT id, email, name, credits, stripe_customer_id, banned, created_at
          FROM users ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
        `).then(r => r.rows);

    const [{ count }] = await db.execute(
      search
        ? sql`SELECT COUNT(*)::int as count FROM users WHERE email ILIKE ${"%" + search + "%"}`
        : sql`SELECT COUNT(*)::int as count FROM users`
    ).then(r => r.rows as any[]);

    res.json({ users: rows, total: count });
  } catch (err) {
    logger.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Adjust credits

router.patch("/admin/users/:email/credits", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { amount, reason } = req.body;
    if (typeof amount !== "number") { res.status(400).json({ error: "amount required" }); return; }

    const [updated] = await db.execute(
      sql`UPDATE users SET credits = GREATEST(0, credits + ${amount}) WHERE email = ${email} RETURNING email, credits`
    ).then(r => r.rows as any[]);

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    logger.info({ email, amount, reason }, "Admin adjusted credits");
    res.json({ email: updated.email, newBalance: parseFloat(updated.credits) });
  } catch (err) {
    logger.error({ err }, "Failed to adjust credits");
    res.status(500).json({ error: "Failed to adjust credits" });
  }
});

// Edit user (name)

router.patch("/admin/users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { name } = req.body;
    const [updated] = await db.execute(
      sql`UPDATE users SET name = ${name ?? null} WHERE email = ${email} RETURNING email, name`
    ).then(r => r.rows as any[]);
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    logger.info({ email, name }, "Admin edited user");
    res.json({ email: updated.email, name: updated.name });
  } catch (err) {
    logger.error({ err }, "Failed to edit user");
    res.status(500).json({ error: "Failed to edit user" });
  }
});

// Delete user

router.delete("/admin/users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    await db.execute(sql`DELETE FROM users WHERE email = ${email}`);
    logger.info({ email }, "Admin deleted user");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Ban / unban user

router.patch("/admin/users/:email/ban", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { banned } = req.body;
    if (typeof banned !== "boolean") { res.status(400).json({ error: "banned (boolean) required" }); return; }

    const [updated] = await db.execute(
      sql`UPDATE users SET banned = ${banned} WHERE email = ${email} RETURNING email, banned`
    ).then(r => r.rows as any[]);

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    res.json({ email: updated.email, banned: updated.banned });
  } catch (err) {
    logger.error({ err }, "Failed to update ban status");
    res.status(500).json({ error: "Failed to update ban status" });
  }
});

// Site settings

router.get("/admin/settings", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM site_settings ORDER BY key`).then(r => r.rows as any[]);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key !== "admin_password_hash") settings[row.key] = row.value;
    }
    // Include the current admin email but never the hash
    const creds = await getAdminCredentials();
    settings._admin_email = creds.email;
    res.setHeader("Cache-Control", "no-store");
    res.json(settings);
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/admin/settings", async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    const blocked = new Set(["admin_password_hash", "_admin_email"]);
    for (const [key, value] of Object.entries(updates)) {
      if (blocked.has(key)) continue;
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()`
      );
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Update admin credentials

router.patch("/admin/credentials", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!currentPassword) { res.status(400).json({ error: "Current password required" }); return; }

    // Verify current password first
    const creds = await getAdminCredentials();
    const passwordMatch = creds.isHashed
      ? hashPassword(currentPassword) === creds.passwordHash
      : currentPassword === creds.passwordHash;

    if (!passwordMatch) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    // Save new credentials to DB
    if (email) {
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES ('admin_email', ${email}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${email}, updated_at = NOW()`
      );
    }
    if (newPassword) {
      const hash = hashPassword(newPassword);
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES ('admin_password_hash', ${hash}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = NOW()`
      );
    }

    logger.info({ email }, "Admin credentials updated");
    res.json({ success: true, message: "Credentials updated. Please log in again." });
  } catch (err) {
    logger.error({ err }, "Failed to update credentials");
    res.status(500).json({ error: "Failed to update credentials" });
  }
});

// ── User-facing milestones (public — no admin token required) ────────────────

const MILESTONE_CREDIT_REWARDS: Record<string, number> = {
  "welcome-bonus":    0.50,
  "first-listing":    1.00,
  "first-live":       2.00,
  "first-flash-sale": 1.50,
  "active-lister":    2.00,
  "consistent-seller":1.50,
};

router.get("/user/milestones", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const rows = await db.execute(
      sql`SELECT milestone_id, progress, completed, claimed FROM user_milestones WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const milestones: Record<string, { progress: number; completed: boolean; claimed: boolean }> = {};
    for (const row of rows) {
      milestones[row.milestone_id] = {
        progress: Number(row.progress),
        completed: Boolean(row.completed),
        claimed: Boolean(row.claimed),
      };
    }
    res.json({ milestones });
  } catch (err) {
    logger.error({ err }, "Failed to get user milestones");
    res.json({ milestones: {} });
  }
});

router.post("/user/milestones/:milestoneId/claim", async (req, res) => {
  try {
    const milestoneId = req.params.milestoneId;
    const email = req.body.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const rows = await db.execute(
      sql`SELECT completed, claimed FROM user_milestones WHERE email = ${email} AND milestone_id = ${milestoneId}`
    ).then(r => r.rows as any[]);

    if (rows.length === 0 || !rows[0].completed) {
      res.status(400).json({ error: "Milestone not completed" }); return;
    }
    if (rows[0].claimed) {
      res.status(409).json({ error: "Already claimed" }); return;
    }

    const creditAmount = MILESTONE_CREDIT_REWARDS[milestoneId] ?? 0;

    await db.execute(
      sql`UPDATE user_milestones SET claimed = TRUE, updated_at = NOW()
          WHERE email = ${email} AND milestone_id = ${milestoneId}`
    );

    if (creditAmount > 0) {
      await db.execute(
        sql`UPDATE users SET credits = GREATEST(0, credits + ${creditAmount}) WHERE email = ${email}`
      );
    }

    const balRow = await db.execute(
      sql`SELECT credits FROM users WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const newBalance = balRow.length > 0 ? parseFloat(balRow[0].credits) : 0;

    logger.info({ email, milestoneId, creditAmount }, "Milestone reward claimed");
    res.json({ success: true, creditAmount, newBalance });
  } catch (err) {
    logger.error({ err }, "Failed to claim milestone reward");
    res.status(500).json({ error: "Failed to claim reward" });
  }
});

// ── Admin milestone routes (require token) ────────────────────────────────────

router.get("/admin/users/:email/milestones", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const rows = await db.execute(
      sql`SELECT milestone_id, progress, completed FROM user_milestones WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const milestones: Record<string, { progress: number; completed: boolean }> = {};
    for (const row of rows) {
      milestones[row.milestone_id] = { progress: Number(row.progress), completed: Boolean(row.completed) };
    }
    res.json({ milestones });
  } catch (err) {
    logger.error({ err }, "Failed to get milestones");
    res.status(500).json({ error: "Failed to get milestones" });
  }
});

router.patch("/admin/users/:email/milestones/:milestoneId", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const milestoneId = req.params.milestoneId;
    const { progress, completed } = req.body;
    if (typeof progress !== "number") { res.status(400).json({ error: "progress (number) required" }); return; }
    const isCompleted = typeof completed === "boolean" ? completed : progress >= (req.body.total ?? progress);
    await db.execute(
      sql`INSERT INTO user_milestones (email, milestone_id, progress, completed, updated_at)
          VALUES (${email}, ${milestoneId}, ${progress}, ${isCompleted}, NOW())
          ON CONFLICT (email, milestone_id) DO UPDATE
          SET progress = ${progress}, completed = ${isCompleted}, updated_at = NOW()`
    );
    logger.info({ email, milestoneId, progress, completed: isCompleted }, "Admin updated milestone");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update milestone");
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

// Recent payments

router.get("/admin/payments", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const rows = await db.execute(
      sql`SELECT ct.id, ct.email, ct.credits_added, ct.created_at,
              u.name
          FROM credit_transactions ct
          LEFT JOIN users u ON u.email = ct.email
          ORDER BY ct.created_at DESC LIMIT ${limit}`
    ).then(r => r.rows);
    res.json({ payments: rows });
  } catch (err) {
    logger.error({ err }, "Failed to get payments");
    res.status(500).json({ error: "Failed to get payments" });
  }
});

// GET /api/admin/listings — paginated listings table for admin review
router.get("/admin/listings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string) ?? "";
    const imported = req.query.imported as string;
    // imported=1 → superdeals account (all imports), imported=0 → user listings
    const importedFilter = imported === "1"
      ? sql`seller_email = 'bazunkdeals@gmail.com'`
      : imported === "0"
        ? sql`seller_email != 'bazunkdeals@gmail.com'`
        : sql`TRUE`;

    const rows = await db.execute(sql`
      SELECT id, public_id, title, price, price_gbp, currency, category, subcategory,
             condition, status, seller_email, seller_username, image, specifications,
             created_at
      FROM listings
      WHERE (${search ? sql`(title ILIKE ${'%' + search + '%'} OR public_id ILIKE ${'%' + search + '%'} OR seller_email ILIKE ${'%' + search + '%'})` : sql`TRUE`})
      AND (${importedFilter})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `).then(r => r.rows);

    const [{ cnt }] = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM listings
      WHERE (${search ? sql`(title ILIKE ${'%' + search + '%'} OR public_id ILIKE ${'%' + search + '%'} OR seller_email ILIKE ${'%' + search + '%'})` : sql`TRUE`})
      AND (${importedFilter})
    `).then(r => r.rows as { cnt: string }[]);

    res.json({ listings: rows, total: parseInt(cnt) });
  } catch (err) {
    logger.error({ err }, "Failed to get admin listings");
    res.status(500).json({ error: "Failed to get listings" });
  }
});

// GET /api/admin/search-amazon — search Amazon UK and return raw results for admin to browse
router.get("/admin/search-amazon", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const query = (req.query.q as string ?? "").trim();
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!query) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const resp = await fetch(
      `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=GB&page=${page}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com" } }
    );
    if (!resp.ok) {
      res.status(502).json({ error: `Amazon API error ${resp.status}` });
      return;
    }
    const data = await resp.json() as Record<string, unknown>;
    const raw = ((data?.data as Record<string, unknown>)?.products as Record<string, unknown>[]) ?? [];

    const products = raw
      .filter(p => p.asin && p.product_price)
      .map(p => {
        const priceGbp = parseFloat(String(p.product_price ?? "").replace(/[^0-9.]/g, "")) || 0;
        return {
          asin: p.asin as string,
          title: String(p.product_title ?? "Amazon Product").slice(0, 200),
          price_gbp: priceGbp,
          image: (p.product_photo as string | null) ?? null,
          rating: String(p.product_star_rating ?? ""),
          amazon_url: `https://www.amazon.co.uk/dp/${p.asin}`,
        };
      });

    res.json({ products, total: products.length });
  } catch (err) {
    logger.error({ err }, "Amazon search failed");
    res.status(500).json({ error: "Amazon search failed" });
  }
});

// POST /api/admin/import-selected-amazon — import specific chosen ASINs
router.post("/admin/import-selected-amazon", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  interface SelectedProduct {
    asin: string; title: string; price_gbp: number;
    image: string | null; amazon_url: string; category?: string;
  }

  const products: SelectedProduct[] = req.body.products ?? [];
  const markupPct    = Math.max(0, parseFloat(String(req.body.markup   ?? 35))   || 35);
  const shippingGbp  = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);
  const category     = (req.body.category    as string) || "other";
  const subcategory  = (req.body.subcategory as string) || null;
  const sellerEmail  = (req.body.sellerEmail as string) || "bazunkdeals@gmail.com";

  if (!products.length) { res.status(400).json({ error: "products array required" }); return; }

  // Look up the chosen seller's name from the DB
  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const SELLER_EMAIL = sellerEmail;
  const SELLER_NAME  = sellerRow?.name ?? sellerEmail.split("@")[0];
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.asin || !p.price_gbp) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings WHERE specifications LIKE ${'%"asin":"' + p.asin + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const bazunkPrice = Math.round((p.price_gbp * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
    const publicId = `BZK-AMZ-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const specs = JSON.stringify({
      source: "Amazon UK",
      asin: p.asin,
      amazon_url: p.amazon_url,
      amazon_price_gbp: p.price_gbp,
      shipping_gbp: shippingGbp,
      markup_pct: markupPct,
    });

    // Fetch rich product details (About this item bullets + description)
    const details = await fetchAmazonDetails(p.asin, apiKey);
    const richTitle = details?.title ?? p.title;
    const description = details
      ? buildAmazonDescription(details, p.price_gbp)
      : [p.title, "", "Product sourced from Amazon UK.", "", `Original Amazon UK price: £${p.price_gbp.toFixed(2)}`, `View on Amazon: ${p.amazon_url}`].join("\n");
    const image = details?.image ?? p.image ?? null;

    await db.execute(sql`
      INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
        description, condition, image, seller_email, seller_name, specifications, status, created_at, updated_at)
      VALUES (
        ${publicId}, ${richTitle}, ${bazunkPrice}, ${bazunkPrice}, 'GBP', ${category}, ${subcategory},
        ${description},
        'new', ${image}, ${SELLER_EMAIL}, ${SELLER_NAME},
        ${specs}, 'active', NOW(), NOW()
      )
    `);
    inserted++;
  }

  logger.info({ inserted, markupPct, shippingGbp }, "Amazon UK selected import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} products` });
});

// POST /api/admin/sync-amazon-prices — re-fetch current Amazon UK prices and re-price by markup rules
router.post("/admin/sync-amazon-prices", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE seller_email = 'bazunkdeals@gmail.com'
      AND specifications LIKE '%"source":"Amazon UK"%'
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No Amazon imports found" }); return; }

  // Fetch current prices in parallel batches of 5
  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 5;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async row => {
      try {
        const specs = JSON.parse(row.specifications) as Record<string, unknown>;
        const asin = specs.asin as string;
        const markupPct   = parseFloat(String(specs.markup_pct  ?? 35))  || 35;
        const shippingGbp  = parseFloat(String(specs.shipping_gbp ?? 3.99)) || 3.99;
        const oldPrice    = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!asin) return;

        const resp = await fetch(
          `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(asin)}&country=GB&page=1`,
          { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com" } }
        );
        if (!resp.ok) { errors++; return; }
        const data = await resp.json() as Record<string, unknown>;
        const products = ((data?.data as Record<string, unknown>)?.products as Record<string, unknown>[]) ?? [];
        const match = products.find(p => p.asin === asin) ?? products[0];
        if (!match) { errors++; return; }

        const priceStr = String(match.product_price ?? "").replace(/[^0-9.]/g, "");
        const newAmazonPrice = parseFloat(priceStr);
        if (!newAmazonPrice || newAmazonPrice <= 0) { errors++; return; }

        if (Math.abs(newAmazonPrice - oldPrice) < 0.01) { unchanged++; return; }

        const newBazunkPrice = Math.round((newAmazonPrice * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
        const newSpecs = JSON.stringify({ ...specs, amazon_price_gbp: newAmazonPrice });

        await db.execute(sql`
          UPDATE listings
          SET price = ${newBazunkPrice}, price_gbp = ${newBazunkPrice},
              specifications = ${newSpecs}, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        updated++;
      } catch {
        errors++;
      }
    }));
  }

  logger.info({ updated, unchanged, errors }, "Amazon price sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length} products: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// POST /api/admin/sync-amazon-details — re-fetch title, about-this-item bullets & description
router.post("/admin/sync-amazon-details", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE specifications LIKE '%"source":"Amazon UK"%'
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No Amazon imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 3;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async row => {
      try {
        const specs    = JSON.parse(row.specifications) as Record<string, unknown>;
        const asin     = specs.asin as string;
        const priceGbp = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!asin) return;

        const details = await fetchAmazonDetails(asin, apiKey);
        if (!details) { errors++; return; }

        const latestPrice = details.price_gbp || priceGbp;
        const description = buildAmazonDescription(details, latestPrice);

        await db.execute(sql`
          UPDATE listings
          SET title = ${details.title}, description = ${description}, updated_at = NOW()
          WHERE id = ${row.id}
        `);

        if (details.title === row.title) unchanged++;
        else updated++;
      } catch {
        errors++;
      }
    }));
  }

  logger.info({ updated, unchanged, errors }, "Amazon details sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length} products: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// PATCH /api/admin/bulk-markup — re-price all Amazon UK imports with new markup + shipping
router.patch("/admin/bulk-markup", async (req, res) => {
  try {
    const markupPct   = Math.max(0, parseFloat(String(req.body.markup  ?? 35))  || 35);
    const shippingGbp  = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);

    const rows = await db.execute(sql`
      SELECT id, specifications FROM listings
      WHERE seller_email = 'bazunkdeals@gmail.com' AND specifications LIKE '%"source":"Amazon UK"%'
    `).then(r => r.rows as { id: number; specifications: string }[]);

    let updated = 0;
    for (const row of rows) {
      try {
        const specs = JSON.parse(row.specifications) as Record<string, unknown>;
        const amazonPrice = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!amazonPrice) continue;
        const newPrice = Math.round((amazonPrice * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
        const newSpecs = JSON.stringify({ ...specs, shipping_gbp: shippingGbp, markup_pct: markupPct });
        await db.execute(sql`
          UPDATE listings SET price = ${newPrice}, price_gbp = ${newPrice}, specifications = ${newSpecs}, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        updated++;
      } catch { /* malformed specs — skip */ }
    }

    logger.info({ updated, markupPct, shippingGbp }, "Bulk markup applied to Amazon imports");
    res.json({ updated, message: `Updated pricing on ${updated} Amazon imports` });
  } catch (err) {
    logger.error({ err }, "Bulk markup failed");
    res.status(500).json({ error: "Bulk markup failed" });
  }
});

// DELETE /api/admin/clear-demo-listings — wipe all BZK-DEMO-* listings
router.delete("/admin/clear-demo-listings", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-DEMO-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "Demo listings cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear demo listings failed");
    res.status(500).json({ error: "Failed to clear demo listings" });
  }
});

// DELETE /api/admin/clear-amazon-imports — wipe all BZK-AMZ-* listings
router.delete("/admin/clear-amazon-imports", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-AMZ-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "Amazon imports cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear Amazon imports failed");
    res.status(500).json({ error: "Failed to clear imports" });
  }
});

// ── eBay routes ──────────────────────────────────────────────────────────────

// GET /api/admin/search-ebay — search eBay UK or US
router.get("/admin/search-ebay", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const query = (req.query.q as string ?? "").trim();
  const site  = (req.query.site as string ?? "uk") === "us" ? "us" : "uk";
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!query) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
    const offset        = (page - 1) * 50;
    const resp = await fetch(
      `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(query)}&marketplace_id=${marketplaceId}&offset=${offset}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
    );
    if (!resp.ok) { res.status(502).json({ error: `eBay API error ${resp.status}` }); return; }

    const data = await resp.json() as Record<string, unknown>;
    const raw  = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
    const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
    const ebayBase = site === "uk" ? "https://www.ebay.co.uk" : "https://www.ebay.com";

    const products = raw
      .filter(p => p.legacyItemId && (p.price as Record<string, unknown>)?.value)
      .map(p => {
        const priceObj      = (p.price as Record<string, unknown>) ?? {};
        const price         = parseFloat(String(priceObj.value ?? "").replace(/[^0-9.]/g, "")) || 0;
        const itemCurrency  = String((priceObj.currency as string) ?? currency) as "GBP" | "USD";
        const imgUrl        = ((p.image as Record<string, unknown>)?.imageUrl as string | null)
          ?? ((p.thumbnailImages as Record<string, unknown>[])?.[0]?.imageUrl as string | null)
          ?? null;
        const seller        = (p.seller as Record<string, unknown>) ?? {};
        const location      = (p.itemLocation as Record<string, unknown>) ?? {};
        const country       = String(location.country ?? "");
        const cats          = (p.categories as { categoryName: string }[]) ?? [];
        const categoryNames = cats.map(c => c.categoryName).filter(Boolean);
        const shippingOpts  = (p.shippingOptions as Record<string, unknown>[]) ?? [];
        const firstShip     = shippingOpts[0] ?? {};
        const shipCost      = (firstShip.shippingCost as Record<string, unknown>)?.value;
        const shippingLabel = shipCost === "0.00" || shipCost === 0 ? "Free" : shipCost ? `${itemCurrency === "GBP" ? "£" : "$"}${shipCost}` : null;
        const mktPrice      = (p.marketingPrice as Record<string, unknown>) ?? {};
        const origPrice     = (mktPrice.originalPrice as Record<string, unknown>)?.value;
        const discountPct   = mktPrice.discountPercentage ? `${mktPrice.discountPercentage}% off` : null;
        const buyingOptions = (p.buyingOptions as string[]) ?? [];
        return {
          item_id:         String(p.legacyItemId),
          title:           String(p.title ?? "eBay Listing").slice(0, 200),
          price,
          currency:        itemCurrency,
          image:           imgUrl,
          rating:          String(seller.feedbackScore ?? ""),
          seller_username: String(seller.username ?? ""),
          seller_feedback: String(seller.feedbackPercentage ?? ""),
          condition:       String(p.condition ?? ""),
          ebay_url:        `${ebayBase}/itm/${p.legacyItemId}`,
          country,
          categories:      categoryNames,
          shipping_label:  shippingLabel,
          shipping_type:   String(firstShip.shippingCostType ?? ""),
          original_price:  origPrice ? String(origPrice) : null,
          discount_pct:    discountPct,
          buying_options:  buyingOptions,
          item_location:   country ? `${country}${location.postalCode ? ` (${String(location.postalCode).replace(/\*+$/, "***")})` : ""}` : null,
        };
      })
      .filter(p => p.price > 0);

    res.json({ products, total: (data.total as number) ?? products.length });
  } catch (err) {
    logger.error({ err }, "eBay search failed");
    res.status(500).json({ error: "eBay search failed" });
  }
});

// POST /api/admin/import-selected-ebay — import chosen eBay listings
router.post("/admin/import-selected-ebay", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  interface SelectedEbay {
    item_id: string; title: string; price: number; currency: "GBP" | "USD";
    image: string | null; ebay_url: string; condition: string;
    seller_username?: string; seller_feedback?: string;
    categories?: string[]; shipping_label?: string | null; shipping_type?: string;
    original_price?: string | null; discount_pct?: string | null;
    buying_options?: string[]; item_location?: string | null;
  }

  const products: SelectedEbay[] = req.body.products ?? [];
  const site        = (req.body.site as string ?? "uk") === "us" ? "us" : "uk";
  const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
  const markupPct   = Math.max(0, parseFloat(String(req.body.markup   ?? 35))   || 35);
  const shippingAmt = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);
  const category    = (req.body.category    as string) || "other";
  const subcategory = (req.body.subcategory as string) || null;
  const sellerEmail = (req.body.sellerEmail as string) || "bazunkdeals@gmail.com";

  if (!products.length) { res.status(400).json({ error: "products array required" }); return; }

  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const SELLER_NAME = sellerRow?.name ?? sellerEmail.split("@")[0];
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.item_id || !p.price) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings WHERE specifications LIKE ${'%"item_id":"' + p.item_id + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const bazunkPrice = Math.round((p.price * (1 + markupPct / 100) + shippingAmt) * 100) / 100;
    const prefix      = site === "uk" ? "BZK-EBY-UK" : "BZK-EBY-US";
    const publicId    = `${prefix}-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const source      = site === "uk" ? "eBay UK" : "eBay US";
    const specs       = JSON.stringify({
      source, item_id: p.item_id, ebay_url: p.ebay_url,
      ebay_price: p.price, ebay_currency: currency, ebay_site: site,
      shipping: shippingAmt, markup_pct: markupPct,
    });

    const sym = p.currency === "GBP" ? "£" : "$";
    const descParts: string[] = [p.title, ""];
    if (p.condition) descParts.push(`Condition: ${p.condition}`);
    if (p.categories?.length) descParts.push(`Category: ${p.categories.join(" › ")}`);
    const sellerLine = [
      p.seller_username ? `Sold by: ${p.seller_username}` : null,
      p.seller_feedback ? `(${p.seller_feedback}% positive feedback)` : null,
    ].filter(Boolean).join(" ");
    if (sellerLine) descParts.push(sellerLine);
    if (p.shipping_label) {
      const shipType = p.shipping_type === "FIXED" ? "Standard" : p.shipping_type === "FREE" ? "Free" : p.shipping_type ?? "";
      descParts.push(`Shipping: ${p.shipping_label}${shipType && shipType !== "Free" ? ` (${shipType})` : ""}`);
    }
    if (p.item_location) descParts.push(`Item location: ${p.item_location}`);
    if (p.buying_options?.length) {
      descParts.push(`Listing type: ${p.buying_options.map(o => o.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(", ")}`);
    }
    descParts.push("");
    if (p.original_price) descParts.push(`Original eBay retail price: ${sym}${p.original_price}${p.discount_pct ? ` (${p.discount_pct})` : ""}`);
    descParts.push(`eBay price: ${sym}${p.price.toFixed(2)}`);
    descParts.push(`View original listing: ${p.ebay_url}`);
    while (descParts.length && descParts[descParts.length - 1] === "") descParts.pop();
    const description = descParts.join("\n");
    const image       = p.image ?? null;
    const condition   = p.condition ?? "used";
    const condNorm  = ["new", "used", "refurbished", "for-parts"].includes(condition.toLowerCase())
      ? condition.toLowerCase() : "used";

    await db.execute(sql`
      INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
        description, condition, image, seller_email, seller_name, specifications, status, created_at, updated_at)
      VALUES (
        ${publicId}, ${p.title}, ${bazunkPrice}, ${bazunkPrice}, ${currency},
        ${category}, ${subcategory}, ${description}, ${condNorm},
        ${image}, ${sellerEmail}, ${SELLER_NAME}, ${specs}, 'active', NOW(), NOW()
      )
    `);
    inserted++;
  }

  logger.info({ inserted, site, markupPct, shippingAmt }, "eBay admin import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} product${inserted !== 1 ? "s" : ""}` });
});

// POST /api/admin/sync-ebay-prices — re-fetch current eBay prices and reprice
router.post("/admin/sync-ebay-prices", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const rows = await db.execute(sql`
    SELECT id, specifications FROM listings
    WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
      AND status = 'active'
  `).then(r => r.rows as { id: number; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No eBay imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 5;

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(rows.slice(i, i + BATCH).map(async row => {
      try {
        const specs     = JSON.parse(row.specifications) as Record<string, unknown>;
        const itemId    = specs.item_id as string;
        const site      = (specs.ebay_site as string ?? "uk") === "us" ? "us" : "uk";
        const markupPct = parseFloat(String(specs.markup_pct ?? 35)) || 35;
        const shipping  = parseFloat(String(specs.shipping   ?? 3.99)) || 3.99;
        const oldPrice  = parseFloat(String(specs.ebay_price ?? 0));
        if (!itemId) return;

        const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
        const resp = await fetch(
          `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(itemId)}&marketplace_id=${marketplaceId}`,
          { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
        );
        if (!resp.ok) { errors++; return; }

        const data     = await resp.json() as Record<string, unknown>;
        const results  = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
        const match    = results.find(p => String(p.legacyItemId) === itemId) ?? results[0];
        if (!match) { errors++; return; }

        const priceObj     = (match.price as Record<string, unknown>) ?? {};
        const newEbayPrice = parseFloat(String(priceObj.value ?? "").replace(/[^0-9.]/g, ""));
        if (!newEbayPrice || newEbayPrice <= 0) { errors++; return; }
        if (Math.abs(newEbayPrice - oldPrice) < 0.01) { unchanged++; return; }

        const newBazunkPrice = Math.round((newEbayPrice * (1 + markupPct / 100) + shipping) * 100) / 100;
        const newSpecs       = JSON.stringify({ ...specs, ebay_price: newEbayPrice });
        await db.execute(sql`
          UPDATE listings SET price = ${newBazunkPrice}, price_gbp = ${newBazunkPrice},
            specifications = ${newSpecs}, updated_at = NOW() WHERE id = ${row.id}
        `);
        updated++;
      } catch { errors++; }
    }));
  }

  logger.info({ updated, unchanged, errors }, "eBay price sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length}: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// POST /api/admin/sync-ebay-details — re-fetch eBay titles & descriptions
router.post("/admin/sync-ebay-details", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RAPIDAPI_KEY not configured" }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No eBay imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 3;

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(rows.slice(i, i + BATCH).map(async row => {
      try {
        const specs  = JSON.parse(row.specifications) as Record<string, unknown>;
        const itemId = specs.item_id as string;
        if (!itemId) return;

        // Item-details endpoint not available on this API plan; skip silently
        unchanged++;
      } catch { errors++; }
    }));
  }

  logger.info({ updated, unchanged, errors }, "eBay details sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length}: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// PATCH /api/admin/bulk-markup-ebay — re-price all eBay imports
router.patch("/admin/bulk-markup-ebay", async (req, res) => {
  try {
    const markupPct = Math.max(0, parseFloat(String(req.body.markup  ?? 35))  || 35);
    const shipping  = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);

    const rows = await db.execute(sql`
      SELECT id, specifications FROM listings
      WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
    `).then(r => r.rows as { id: number; specifications: string }[]);

    let updated = 0;
    for (const row of rows) {
      try {
        const specs    = JSON.parse(row.specifications) as Record<string, unknown>;
        const ebayPrice = parseFloat(String(specs.ebay_price ?? 0));
        if (!ebayPrice) continue;
        const newPrice  = Math.round((ebayPrice * (1 + markupPct / 100) + shipping) * 100) / 100;
        const newSpecs  = JSON.stringify({ ...specs, shipping, markup_pct: markupPct });
        await db.execute(sql`
          UPDATE listings SET price = ${newPrice}, price_gbp = ${newPrice},
            specifications = ${newSpecs}, updated_at = NOW() WHERE id = ${row.id}
        `);
        updated++;
      } catch { /* malformed specs */ }
    }

    logger.info({ updated, markupPct, shipping }, "Bulk markup applied to eBay imports");
    res.json({ updated, message: `Updated pricing on ${updated} eBay imports` });
  } catch (err) {
    logger.error({ err }, "eBay bulk markup failed");
    res.status(500).json({ error: "Bulk markup failed" });
  }
});

// DELETE /api/admin/clear-ebay-imports — wipe all BZK-EBY-* listings
router.delete("/admin/clear-ebay-imports", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-EBY-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "eBay imports cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear eBay imports failed");
    res.status(500).json({ error: "Failed to clear eBay imports" });
  }
});

// POST /api/admin/seed-demo — idempotently inserts 200 demo listings
router.post("/admin/seed-demo", async (req, res) => {
  try {
    const existing = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM listings WHERE public_id LIKE 'BZK-DEMO-%'`
    ).then(r => parseInt(String((r.rows[0] as Record<string, unknown>)?.cnt ?? "0")));

    if (existing >= 200) {
      res.json({ seeded: 0, existing, message: "Demo listings already present" });
      return;
    }

    const SELLER_EMAIL = "bazunkdeals@gmail.com";
    const SELLER_USERNAME = "superdeals";
    const SELLER_NAME = "Super Deals UK";
    const MARKUP = 1.30;
    let inserted = 0;

    for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
      const p = DEMO_PRODUCTS[i];
      const num = String(i + 1).padStart(3, "0");
      const publicId = `BZK-DEMO-${num}`;
      const alreadyExists = await db.execute(
        sql`SELECT id FROM listings WHERE public_id = ${publicId}`
      ).then(r => r.rows.length > 0);
      if (alreadyExists) continue;

      const priceGbp = parseFloat((p.base * MARKUP).toFixed(2));
      const specs = JSON.stringify({ source: "Amazon UK", asin: p.asin, amazon_url: `https://www.amazon.co.uk/dp/${p.asin}` });

      await db.execute(sql`
        INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
          description, condition, image, seller_email, seller_username, seller_name,
          tags, specifications, status, created_at, updated_at)
        VALUES (
          ${publicId}, ${p.title}, ${priceGbp}, ${priceGbp}, 'GBP', ${p.cat}, ${p.sub},
          ${p.desc}, ${p.cond}, ${p.img}, ${SELLER_EMAIL}, ${SELLER_USERNAME}, ${SELLER_NAME},
          ${p.tags}, ${specs}, 'active', NOW(), NOW()
        )
      `);
      inserted++;
    }

    logger.info({ inserted }, "Demo seed completed");
    res.json({ seeded: inserted, existing, message: `Seeded ${inserted} demo listings` });
  } catch (err) {
    logger.error({ err }, "Demo seed failed");
    res.status(500).json({ error: "Seed failed", detail: String(err) });
  }
});

// ── Gumtree scraper helpers ────────────────────────────────────────────────

interface GumtreeListing {
  id: string;
  title: string;
  price: string;
  location: string;
  thumbnail: string | null;
  url: string;
  description: string;
}

function tryPath(obj: unknown, ...keys: string[]): unknown {
  let curr = obj;
  for (const k of keys) {
    if (!curr || typeof curr !== "object") return undefined;
    curr = (curr as Record<string, unknown>)[k];
  }
  return curr;
}

function extractGtPrice(item: Record<string, unknown>): string {
  if (typeof item.price === "string") return item.price;
  if (typeof item.price === "object" && item.price !== null) {
    const p = item.price as Record<string, unknown>;
    if (p.display) return String(p.display);
    if (p.formatted) return String(p.formatted);
    if (p.amount) return `£${p.amount}`;
  }
  if (item.priceValue) return `£${item.priceValue}`;
  return "";
}

function extractGtLocation(item: Record<string, unknown>): string {
  if (typeof item.location === "string" && item.location) return item.location;
  if (typeof item.location === "object" && item.location !== null) {
    const loc = item.location as Record<string, unknown>;
    return String(loc.areaName ?? loc.name ?? loc.town ?? loc.county ?? "UK");
  }
  return String(item.locationName ?? item.area ?? item.town ?? "UK");
}

function extractGtThumbnail(item: Record<string, unknown>): string | null {
  if (typeof item.thumbnailUrl === "string" && item.thumbnailUrl) return item.thumbnailUrl;
  if (typeof item.imageUrl === "string" && item.imageUrl) return item.imageUrl;
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    const p = item.photos[0] as Record<string, unknown>;
    return String(p.url ?? p.thumbnailUrl ?? p.src ?? "") || null;
  }
  if (typeof item.image === "string") return item.image || null;
  if (typeof item.image === "object" && item.image !== null) {
    const img = item.image as Record<string, unknown>;
    return String(img.url ?? img.src ?? "") || null;
  }
  return null;
}

function extractGtUrl(item: Record<string, unknown>): string {
  const raw = String(item.url ?? item.href ?? item.link ?? item.adUrl ?? "");
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `https://www.gumtree.com${raw}`;
  return "https://www.gumtree.com/";
}

function extractGumtreeListings(nextData: unknown): GumtreeListing[] {
  const PATHS: string[][] = [
    ["props", "pageProps", "searchData", "results"],
    ["props", "pageProps", "searchResults", "results"],
    ["props", "pageProps", "listings"],
    ["props", "pageProps", "data", "results"],
    ["props", "pageProps", "data", "listings"],
    ["props", "pageProps", "initialState", "search", "results"],
    ["props", "pageProps", "searchData", "ads"],
    ["props", "pageProps", "ads"],
  ];

  for (const path of PATHS) {
    const val = tryPath(nextData, ...path);
    if (Array.isArray(val) && val.length > 0) {
      return val.slice(0, 24).map((item: Record<string, unknown>, i) => ({
        id: String(item.id ?? item.adId ?? item.listingId ?? i),
        title: String(item.title ?? item.name ?? item.headline ?? ""),
        price: extractGtPrice(item),
        location: extractGtLocation(item),
        thumbnail: extractGtThumbnail(item),
        url: extractGtUrl(item),
        description: String(item.description ?? item.snippet ?? item.body ?? ""),
      })).filter(l => l.title);
    }
  }
  return [];
}

// GET /api/admin/scrape-gumtree — scrape Gumtree search results
router.get("/admin/scrape-gumtree", requireAdmin, async (req, res) => {
  const { q, page = "1" } = req.query as Record<string, string>;
  if (!q?.trim()) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const searchUrl = `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(q.trim())}&page=${page}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: `Gumtree returned ${response.status}`, listings: [] });
      return;
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!match) {
      res.json({ listings: [], warning: "Could not find Next.js data — Gumtree may have changed structure" });
      return;
    }

    const nextData = JSON.parse(match[1]);
    const listings = extractGumtreeListings(nextData);
    logger.info({ q, page, found: listings.length }, "Gumtree scrape");
    res.json({ listings });
  } catch (err) {
    logger.error({ err }, "Gumtree scrape failed");
    res.status(500).json({ error: "Scrape failed", detail: String(err), listings: [] });
  }
});

// POST /api/admin/import-gumtree — import selected scraped Gumtree listings as classifieds
router.post("/admin/import-gumtree", requireAdmin, async (req, res) => {
  const {
    listings,
    category = "electronics",
    subcategory,
    expiry,
    sellerEmail,
    sellerName = "Bazunk",
  } = req.body as {
    listings: GumtreeListing[];
    category?: string;
    subcategory?: string;
    expiry?: string;
    sellerEmail?: string;
    sellerName?: string;
  };

  if (!Array.isArray(listings) || listings.length === 0) {
    res.status(400).json({ error: "listings array is required" }); return;
  }

  const expiresAt: Date | null =
    expiry === "7"  ? new Date(Date.now() + 7  * 86_400_000) :
    expiry === "14" ? new Date(Date.now() + 14 * 86_400_000) :
    expiry === "30" ? new Date(Date.now() + 30 * 86_400_000) :
    null;

  let imported = 0;
  for (const l of listings) {
    if (!l.title?.trim()) continue;
    const rawPrice = l.price?.replace(/[^0-9.]/g, "") ?? "";
    const priceNum = rawPrice ? parseFloat(rawPrice) : null;
    await db.insert(classifiedAdsTable).values({
      title: l.title.trim(),
      description: l.description?.trim() || l.title.trim(),
      category,
      subcategory: subcategory || null,
      type: "offer",
      price: priceNum != null ? String(priceNum) : null,
      priceLabel: l.price?.match(/free/i) ? "Free" : null,
      location: l.location || "UK",
      contactName: sellerName,
      contactEmail: sellerEmail || null,
      externalLink: l.url,
      expiresAt,
    });
    imported++;
  }

  logger.info({ imported }, "Gumtree import");
  res.json({ imported, message: `Imported ${imported} Gumtree ad${imported === 1 ? "" : "s"} to Classifieds` });
});

export default router;

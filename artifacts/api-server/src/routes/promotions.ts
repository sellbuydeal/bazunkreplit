import { Router } from "express";
import { db, listingPromotionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";
import { sendSystemMessage } from "../lib/systemMessages.js";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { getAllPromoConfigs, getPromoConfig, PROMO_DEFAULTS } from "../lib/promoConfig.js";

const router = Router();

const SELLER_TOOLS = new Set(["follower-notify", "scheduled-listing", "advanced-analytics", "social-share"]);

/** Public: current prices/durations/availability (what sellers see). */
router.get("/promotions/config", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const all = await getAllPromoConfigs();
  const out: Record<string, { cost: number; daysValid: number; enabled: boolean; comingSoon: boolean; kind: string }> = {};
  for (const [type, c] of Object.entries(all)) {
    out[type] = { cost: c.cost, daysValid: c.daysValid, enabled: c.enabled, comingSoon: !!c.comingSoon, kind: c.kind };
  }
  res.json(out);
});

router.post("/promotions/apply", async (req, res) => {
  const { email, type, listingId, publishAt } = req.body as { email?: string; type?: string; listingId?: number; publishAt?: string };
  if (!email || !type) { res.status(400).json({ error: "email and type are required" }); return; }
  if (!listingId) { res.status(400).json({ error: "listingId is required" }); return; }

  const config = await getPromoConfig(type);
  if (!config) { res.status(400).json({ error: "Unknown promotion type" }); return; }
  if (config.comingSoon) { res.status(400).json({ error: `${config.label} isn't available yet — coming soon.` }); return; }
  if (!config.enabled) { res.status(400).json({ error: `${config.label} is not currently available.` }); return; }
  if (config.kind === "auction") { res.status(400).json({ error: `${config.label} is added when you create an auction.` }); return; }

  try {
    // Seller tools act on the listing itself, so check it exists and belongs to this seller.
    let listing: { id: number; public_id: string | null; title: string; price: string; seller_email: string; seller_name: string | null; status: string } | null = null;
    if (SELLER_TOOLS.has(type)) {
      const r = await db.execute(sql`SELECT id, public_id, title, price, seller_email, seller_name, status FROM listings WHERE id = ${listingId}`);
      listing = (r.rows[0] as typeof listing) ?? null;
      if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }
      if (String(listing.seller_email).toLowerCase() !== email.toLowerCase()) { res.status(403).json({ error: "That isn't your listing" }); return; }
    }

    // Per-tool checks BEFORE any credits are taken
    let publishDate: Date | null = null;
    let followers: string[] = [];
    if (type === "scheduled-listing") {
      publishDate = publishAt ? new Date(publishAt) : null;
      if (!publishDate || isNaN(publishDate.getTime())) { res.status(400).json({ error: "Choose the date and time to publish" }); return; }
      const mins = (publishDate.getTime() - Date.now()) / 60000;
      if (mins < 5) { res.status(400).json({ error: "Pick a time at least 5 minutes from now" }); return; }
      if (mins > 90 * 24 * 60) { res.status(400).json({ error: "You can schedule up to 90 days ahead" }); return; }
      if (listing!.status !== "active") { res.status(400).json({ error: "Only an active listing can be scheduled" }); return; }
    }
    if (type === "follower-notify") {
      if (listing!.status !== "active") { res.status(400).json({ error: "Followers can only be notified about an active listing" }); return; }
      const f = await db.execute(sql`SELECT follower_email FROM seller_follows WHERE seller_email = ${listing!.seller_email} LIMIT 5000`);
      followers = (f.rows as any[]).map(r => r.follower_email as string).filter(e => e.toLowerCase() !== email.toLowerCase());
      if (followers.length === 0) { res.status(400).json({ error: "You don't have any followers yet — nobody to notify." }); return; }
    }

    const balance = await storage.getCredits(email);
    if (balance < config.cost) {
      res.status(402).json({ error: "Insufficient credits", balance, required: config.cost });
      return;
    }

    const newBalance = await storage.addCredits(email, -config.cost);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.daysValid);
    if (publishDate) { expiresAt.setTime(publishDate.getTime() + 24 * 3600 * 1000); }

    await db.insert(listingPromotionsTable).values({ listingId, type, expiresAt });

    let extra: Record<string, unknown> = {};
    if (type === "scheduled-listing" && publishDate) {
      await db.execute(sql`UPDATE listings SET status = 'scheduled', publish_at = ${publishDate.toISOString()}, updated_at = NOW() WHERE id = ${listingId}`);
      extra = { publishAt: publishDate.toISOString() };
    }
    if (type === "follower-notify" && listing) {
      const who = listing.seller_name || "A seller you follow";
      const link = `/listing/${listing.public_id ?? listing.id}`;
      for (const f of followers) {
        void sendSystemMessage(f, {
          category: "New from a seller you follow",
          subject: `${who} just listed: ${listing.title}`,
          body: `${who} has listed something new on Bazunk:\n\n${listing.title} — £${parseFloat(listing.price).toFixed(2)}\n\nView it here: ${link}`,
        });
      }
      extra = { notified: followers.length };
    }

    logger.info({ email, type, listingId, cost: config.cost, newBalance }, "Promotion applied");
    const when = type === "scheduled-listing" && publishDate
      ? `Your listing #${listingId} will go live on ${publishDate.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}.`
      : type === "follower-notify"
        ? `We've notified ${followers.length} follower${followers.length === 1 ? "" : "s"} about listing #${listingId}.`
        : `Your ${config.label} promotion is now active on listing #${listingId} until ` +
          `${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`;
    void sendSystemMessage(email, {
      category: "Promotions",
      subject: `${config.label} activated`,
      body: `${when}\n\nYou spent ${Math.round(config.cost * 100)} credits. Your new balance is ${Math.round(Number(newBalance) * 100)} credits.`,
    });
    res.json({ success: true, type, label: config.label, creditsSpent: config.cost, newBalance, expiresAt, ...extra });
  } catch (err) {
    logger.error({ err }, "Failed to apply promotion");
    res.status(500).json({ error: "Failed to apply promotion" });
  }
});

/** A seller's currently active promotion tools (so they can reopen analytics, share cards, schedules). */
router.get("/promotions/mine", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT lp.id, lp.listing_id, lp.type, lp.expires_at, l.title, l.image, l.price, l.status, l.publish_at, l.public_id
      FROM listing_promotions lp
      JOIN listings l ON l.id = lp.listing_id
      WHERE LOWER(l.seller_email) = LOWER(${email})
        AND lp.type IN ('advanced-analytics', 'social-share', 'scheduled-listing')
        AND lp.expires_at > NOW()
      ORDER BY lp.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "Failed to load seller promotions");
    res.status(500).json({ error: "Failed to load promotions" });
  }
});

// ── Follow a seller ──────────────────────────────────────────────────────────

router.get("/follows/status", async (req, res) => {
  const followerEmail = typeof req.query.followerEmail === "string" ? req.query.followerEmail : "";
  const sellerEmail = typeof req.query.sellerEmail === "string" ? req.query.sellerEmail : "";
  if (!sellerEmail) { res.status(400).json({ error: "sellerEmail required" }); return; }
  try {
    const [{ count }] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM seller_follows WHERE seller_email = ${sellerEmail}`).then(r => r.rows as any[]);
    let following = false;
    if (followerEmail) {
      following = (await db.execute(sql`SELECT 1 FROM seller_follows WHERE follower_email = ${followerEmail} AND seller_email = ${sellerEmail}`)).rows.length > 0;
    }
    res.json({ following, followers: count });
  } catch (err) {
    logger.error({ err }, "Follow status failed");
    res.status(500).json({ error: "Failed to load follow status" });
  }
});

router.post("/follows", async (req, res) => {
  const { followerEmail, sellerEmail } = req.body as { followerEmail?: string; sellerEmail?: string };
  if (!followerEmail || !sellerEmail) { res.status(400).json({ error: "followerEmail and sellerEmail required" }); return; }
  if (followerEmail.toLowerCase() === sellerEmail.toLowerCase()) { res.status(400).json({ error: "You can't follow yourself" }); return; }
  try {
    await db.execute(sql`INSERT INTO seller_follows (follower_email, seller_email) VALUES (${followerEmail}, ${sellerEmail}) ON CONFLICT DO NOTHING`);
    const [{ count }] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM seller_follows WHERE seller_email = ${sellerEmail}`).then(r => r.rows as any[]);
    res.json({ following: true, followers: count });
  } catch (err) {
    logger.error({ err }, "Follow failed");
    res.status(500).json({ error: "Failed to follow" });
  }
});

router.delete("/follows", async (req, res) => {
  const followerEmail = String(req.body?.followerEmail ?? req.query.followerEmail ?? "");
  const sellerEmail = String(req.body?.sellerEmail ?? req.query.sellerEmail ?? "");
  if (!followerEmail || !sellerEmail) { res.status(400).json({ error: "followerEmail and sellerEmail required" }); return; }
  try {
    await db.execute(sql`DELETE FROM seller_follows WHERE follower_email = ${followerEmail} AND seller_email = ${sellerEmail}`);
    const [{ count }] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM seller_follows WHERE seller_email = ${sellerEmail}`).then(r => r.rows as any[]);
    res.json({ following: false, followers: count });
  } catch (err) {
    logger.error({ err }, "Unfollow failed");
    res.status(500).json({ error: "Failed to unfollow" });
  }
});

// ── View tracking + analytics ────────────────────────────────────────────────

const VIEW_SOURCES = new Set(["direct", "internal", "search", "social", "email", "referral", "other"]);

router.post("/listings/:id/view", async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "bad id" }); return; }
  const source = VIEW_SOURCES.has(String(req.body?.source)) ? String(req.body.source) : "direct";
  const visitor = typeof req.body?.visitor === "string" ? req.body.visitor.slice(0, 64) : null;
  try {
    if (visitor) {
      const recent = await db.execute(sql`
        SELECT 1 FROM listing_views WHERE listing_id = ${id} AND visitor = ${visitor} AND created_at > NOW() - INTERVAL '30 minutes' LIMIT 1
      `);
      if (recent.rows.length) { res.json({ counted: false }); return; }
    }
    await db.execute(sql`INSERT INTO listing_views (listing_id, visitor, source) VALUES (${id}, ${visitor}, ${source})`);
    await db.execute(sql`UPDATE listings SET views = views + 1 WHERE id = ${id}`);
    res.json({ counted: true });
  } catch (err) {
    logger.error({ err }, "View tracking failed");
    res.json({ counted: false });
  }
});

router.get("/promotions/analytics/:listingId", async (req, res) => {
  const listingId = parseInt(req.params.listingId);
  const email = typeof req.query.email === "string" ? req.query.email : "";
  if (!listingId || !email) { res.status(400).json({ error: "listingId and email required" }); return; }
  try {
    const l = (await db.execute(sql`SELECT id, title, seller_email, watchers, views, created_at, status FROM listings WHERE id = ${listingId}`)).rows[0] as any;
    if (!l) { res.status(404).json({ error: "Listing not found" }); return; }
    if (String(l.seller_email).toLowerCase() !== email.toLowerCase()) { res.status(403).json({ error: "That isn't your listing" }); return; }
    const active = (await db.execute(sql`
      SELECT 1 FROM listing_promotions WHERE listing_id = ${listingId} AND type = 'advanced-analytics' AND expires_at > NOW() LIMIT 1
    `)).rows.length > 0;
    if (!active) { res.status(402).json({ error: "Advanced Analytics isn't active on this listing." }); return; }

    const totals = (await db.execute(sql`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT visitor)::int AS visitors, MIN(created_at) AS since
      FROM listing_views WHERE listing_id = ${listingId}
    `)).rows[0] as any;
    const sources = (await db.execute(sql`
      SELECT source, COUNT(*)::int AS count FROM listing_views WHERE listing_id = ${listingId} GROUP BY source ORDER BY count DESC
    `)).rows;
    const daily = (await db.execute(sql`
      SELECT to_char(d::date, 'YYYY-MM-DD') AS day, COALESCE(v.c, 0)::int AS views
      FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') d
      LEFT JOIN (
        SELECT created_at::date AS day, COUNT(*) AS c FROM listing_views WHERE listing_id = ${listingId} GROUP BY 1
      ) v ON v.day = d::date
      ORDER BY d
    `)).rows;
    // Orders don't store a listing id, so sales are matched on seller + item title.
    const sales = (await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM orders
      WHERE LOWER(seller_email) = LOWER(${email}) AND item_title = ${l.title} AND status <> 'cancelled'
    `)).rows[0] as any;
    const visitors = totals.visitors || totals.views || 0;
    res.json({
      title: l.title,
      views: totals.views,
      uniqueVisitors: totals.visitors,
      trackingSince: totals.since,
      watchers: l.watchers ?? 0,
      sales: sales.count,
      conversionRate: visitors > 0 ? Math.round((sales.count / visitors) * 1000) / 10 : 0,
      sources,
      daily,
    });
  } catch (err) {
    logger.error({ err }, "Analytics failed");
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

router.get("/promotions/related", async (req, res) => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const exclude = typeof req.query.exclude === "string" ? req.query.exclude : undefined;
  try {
    const promoted = await db.execute(sql`
      SELECT l.id, l.public_id, l.title, l.price, l.price_gbp, l.currency, l.image, l.category
      FROM listings l
      JOIN listing_promotions lp ON lp.listing_id = l.id
      WHERE lp.type IN ('related-listings-5d', 'related-listings-10d')
        AND lp.expires_at > NOW()
        AND l.status = 'active'
        ${category ? sql`AND LOWER(l.category) = LOWER(${category})` : sql``}
        ${exclude ? sql`AND l.id != ${parseInt(exclude)}` : sql``}
      ORDER BY RANDOM()
      LIMIT 6
    `);

    if (promoted.rows.length > 0) {
      res.json(promoted.rows);
      return;
    }

    const fallback = await db.execute(sql`
      SELECT l.id, l.public_id, l.title, l.price, l.price_gbp, l.currency, l.image, l.category
      FROM listings l
      WHERE l.status = 'active'
        ${category ? sql`AND LOWER(l.category) = LOWER(${category})` : sql``}
        ${exclude ? sql`AND l.id != ${parseInt(exclude)}` : sql``}
      ORDER BY l.created_at DESC
      LIMIT 6
    `);
    res.json(fallback.rows);
  } catch (err) {
    logger.error({ err }, "Failed to fetch related listings");
    res.status(500).json({ error: "Failed to fetch related listings" });
  }
});

router.get("/admin/promotions", requireAdmin, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    const rows = await db.execute(sql`
      SELECT lp.id, lp.listing_id, lp.type, lp.expires_at, lp.created_at,
             l.title AS listing_title, l.image AS listing_image, l.category,
             l.seller_email, l.seller_name
      FROM listing_promotions lp
      LEFT JOIN listings l ON l.id = lp.listing_id
      WHERE lp.expires_at > NOW()
      ORDER BY lp.created_at DESC
    `);
    res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "Failed to fetch admin promotions");
    res.status(500).json({ error: "Failed to fetch promotions" });
  }
});

router.delete("/admin/promotions/:id", requireAdmin, async (req, res) => {
  const rawId = req.params["id"];
  const numId = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  try {
    await db.execute(sql`DELETE FROM listing_promotions WHERE id = ${numId}`);
    logger.info({ id: numId }, "Admin cancelled promotion");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to cancel promotion");
    res.status(500).json({ error: "Failed to cancel promotion" });
  }
});

// ── Admin: edit prices ───────────────────────────────────────────────────────

router.get("/admin/promotion-settings", requireAdmin, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const all = await getAllPromoConfigs();
  res.json(
    Object.values(all)
      .filter(c => !c.hidden)
      .map(c => ({
        type: c.type, label: c.label, kind: c.kind, oneShot: !!c.oneShot, comingSoon: !!c.comingSoon,
        cost: c.cost, credits: Math.round(c.cost * 100), daysValid: c.daysValid, enabled: c.enabled,
        defaultCredits: Math.round(PROMO_DEFAULTS[c.type].cost * 100), defaultDays: PROMO_DEFAULTS[c.type].daysValid,
      })),
  );
});

router.put("/admin/promotion-settings/:type", requireAdmin, async (req, res) => {
  const type = String(req.params.type);
  const def = PROMO_DEFAULTS[type];
  if (!def) { res.status(404).json({ error: "Unknown promotion" }); return; }
  const credits = Number(req.body?.credits);
  const days = Math.round(Number(req.body?.daysValid ?? def.daysValid));
  const enabled = req.body?.enabled !== false;
  if (!isFinite(credits) || credits < 0 || credits > 100000) { res.status(400).json({ error: "Credits must be between 0 and 100,000" }); return; }
  if (!isFinite(days) || days < 1 || days > 365) { res.status(400).json({ error: "Duration must be 1–365 days" }); return; }
  const cost = Math.round(credits) / 100;
  try {
    await db.execute(sql`
      INSERT INTO promotion_settings (type, cost, days_valid, enabled, updated_at)
      VALUES (${type}, ${cost.toFixed(2)}, ${days}, ${enabled}, NOW())
      ON CONFLICT (type) DO UPDATE SET cost = ${cost.toFixed(2)}, days_valid = ${days}, enabled = ${enabled}, updated_at = NOW()
    `);
    logger.info({ type, cost, days, enabled }, "Admin updated promotion pricing");
    res.json({ ok: true, type, credits: Math.round(credits), daysValid: days, enabled });
  } catch (err) {
    logger.error({ err }, "Failed to save promotion settings");
    res.status(500).json({ error: "Failed to save" });
  }
});

export default router;

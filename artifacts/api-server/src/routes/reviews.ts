import { Router, type Request } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { logger } from "../lib/logger.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();

/** An order counts as a successful sale once the seller has sent it (and it wasn't cancelled). */
const SENT = sql`('shipped', 'out_for_delivery', 'delivered')`;

const MIN_REVIEWS_FOR_PERCENT = 3;   // below this we say "not enough reviews yet" instead of a misleading 100%
const MIN_ORDERS_FOR_DISPATCH = 3;   // dispatch speed needs a few orders to be meaningful

async function authenticatedEmail(req: Request): Promise<string | null> {
  const { isAuthenticated, userId } = getAuth(req);
  if (!isAuthenticated || !userId) return null;
  const user = await clerkClient.users.getUser(userId);
  return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}

// ── Reputation ───────────────────────────────────────────────────────────────

async function sellerReputation(email: string) {
  const rev = (await db.execute(sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE rating >= 4)::int AS positive,
           COUNT(*) FILTER (WHERE rating = 3)::int AS neutral,
           COUNT(*) FILTER (WHERE rating <= 2)::int AS negative,
           COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS average
    FROM reviews WHERE role = 'buyer_to_seller' AND LOWER(reviewee_email) = LOWER(${email})
  `)).rows[0] as { total: number; positive: number; neutral: number; negative: number; average: number };

  const sales = (await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM orders
    WHERE LOWER(seller_email) = LOWER(${email}) AND status IN ${SENT}
  `)).rows[0] as { n: number };

  const repeat = (await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM (
      SELECT LOWER(buyer_email) AS b FROM orders
      WHERE LOWER(seller_email) = LOWER(${email}) AND status IN ${SENT}
      GROUP BY LOWER(buyer_email) HAVING COUNT(*) >= 2
    ) x
  `)).rows[0] as { n: number };

  // Median hours from order to dispatch, over the last 90 days (orders the seller has sent)
  const disp = (await db.execute(sql`
    SELECT COUNT(*)::int AS n,
           PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (shipped_at - created_at)) / 3600.0)::float AS median_hours
    FROM orders
    WHERE LOWER(seller_email) = LOWER(${email}) AND shipped_at IS NOT NULL
      AND shipped_at >= created_at AND created_at > NOW() - INTERVAL '90 days'
  `)).rows[0] as { n: number; median_hours: number | null };

  const seller = (await db.execute(sql`
    SELECT u.name, u.created_at, u.verification_status,
           (SELECT l.seller_username FROM listings l WHERE LOWER(l.seller_email) = LOWER(${email}) AND l.seller_username IS NOT NULL ORDER BY l.created_at DESC LIMIT 1) AS username
    FROM users u WHERE LOWER(u.email) = LOWER(${email}) LIMIT 1
  `)).rows[0] as { name?: string | null; created_at?: string; verification_status?: string; username?: string | null } | undefined;

  const enoughReviews = rev.total >= MIN_REVIEWS_FOR_PERCENT;
  return {
    reviews: { total: rev.total, positive: rev.positive, neutral: rev.neutral, negative: rev.negative, average: rev.average },
    positivePercent: enoughReviews ? Math.round((rev.positive / rev.total) * 100) : null,
    successfulSales: sales.n,
    repeatBuyers: repeat.n,
    dispatchMedianHours: disp.n >= MIN_ORDERS_FOR_DISPATCH && disp.median_hours !== null ? Math.round(disp.median_hours * 10) / 10 : null,
    dispatchSampleSize: disp.n,
    // Buyer ↔ seller messaging isn't built yet, so there is nothing to measure here.
    replyMedianHours: null as number | null,
    memberSince: seller?.created_at ?? null,
    profile: {
      name: seller?.name || email.split("@")[0],
      username: seller?.username ?? null,
      verified: seller?.verification_status === "verified",
    },
  };
}

router.get("/sellers/reputation", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  try {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(await sellerReputation(email));
  } catch (err) {
    logger.error({ err }, "Reputation failed");
    res.status(500).json({ error: "Failed to load seller profile" });
  }
});

/** Buyers get a lighter profile so sellers can see who they are dealing with. */
router.get("/buyers/reputation", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  try {
    const rev = (await db.execute(sql`
      SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE rating >= 4)::int AS positive
      FROM reviews WHERE role = 'seller_to_buyer' AND LOWER(reviewee_email) = LOWER(${email})
    `)).rows[0] as { total: number; positive: number };
    const orders = (await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM orders WHERE LOWER(buyer_email) = LOWER(${email}) AND status <> 'cancelled'
    `)).rows[0] as { n: number };
    res.json({
      reviews: rev.total,
      positivePercent: rev.total >= MIN_REVIEWS_FOR_PERCENT ? Math.round((rev.positive / rev.total) * 100) : null,
      orders: orders.n,
    });
  } catch (err) {
    logger.error({ err }, "Buyer reputation failed");
    res.status(500).json({ error: "Failed to load buyer profile" });
  }
});

// ── Reading reviews ──────────────────────────────────────────────────────────

router.get("/reviews/seller", async (req, res) => {
  const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? "10")) || 10));
  const offset = Math.max(0, parseInt(String(req.query.offset ?? "0")) || 0);
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  try {
    const rows = await db.execute(sql`
      SELECT r.id, r.rating, r.comment, r.item_title, r.created_at, split_part(r.reviewer_email, '@', 1) AS reviewer
      FROM reviews r
      WHERE r.role = 'buyer_to_seller' AND LOWER(r.reviewee_email) = LOWER(${email})
      ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `);
    // Only the start of the buyer's email is shown, partly masked
    const out = (rows.rows as any[]).map(r => ({
      ...r,
      reviewer: String(r.reviewer).length > 2 ? `${String(r.reviewer).slice(0, 2)}${"•".repeat(Math.min(4, String(r.reviewer).length - 2))}` : "Buyer",
    }));
    res.json(out);
  } catch (err) {
    logger.error({ err }, "Load reviews failed");
    res.status(500).json({ error: "Failed to load reviews" });
  }
});

// ── Writing reviews ──────────────────────────────────────────────────────────

router.post("/reviews", async (req, res) => {
  const { orderId, rating, comment } = req.body as { orderId?: string; rating?: number; comment?: string };
  const stars = Math.round(Number(rating));
  if (!orderId) { res.status(400).json({ error: "orderId is required" }); return; }
  if (!(stars >= 1 && stars <= 5)) { res.status(400).json({ error: "Choose a rating from 1 to 5" }); return; }
  const text = typeof comment === "string" ? comment.trim().slice(0, 1000) : "";
  try {
    const reviewerEmail = await authenticatedEmail(req);
    if (!reviewerEmail) { res.status(401).json({ error: "Please sign in to leave a review" }); return; }
    const order = (await db.execute(sql`SELECT id, buyer_email, seller_email, item_title, status FROM orders WHERE id = ${orderId}`)).rows[0] as
      { id: string; buyer_email: string; seller_email: string | null; item_title: string; status: string } | undefined;
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!order.seller_email) { res.status(400).json({ error: "This order has no seller to review" }); return; }

    const me = reviewerEmail.toLowerCase();
    let role: "buyer_to_seller" | "seller_to_buyer";
    let reviewee: string;
    if (me === order.buyer_email.toLowerCase()) { role = "buyer_to_seller"; reviewee = order.seller_email; }
    else if (me === order.seller_email.toLowerCase()) { role = "seller_to_buyer"; reviewee = order.buyer_email; }
    else { res.status(403).json({ error: "You can only review orders you were part of" }); return; }
    if (order.buyer_email.toLowerCase() === order.seller_email.toLowerCase()) { res.status(400).json({ error: "You can't review yourself" }); return; }

    if (!["shipped", "out_for_delivery", "delivered"].includes(order.status)) {
      res.status(400).json({ error: "You can leave a review once the order has been sent." });
      return;
    }

    const inserted = await db.execute(sql`
      INSERT INTO reviews (order_id, role, reviewer_email, reviewee_email, rating, comment, item_title)
      VALUES (${orderId}, ${role}, ${reviewerEmail}, ${reviewee}, ${stars}, ${text || null}, ${order.item_title})
      ON CONFLICT (order_id, role) DO NOTHING RETURNING id
    `);
    if (!inserted.rows.length) { res.status(409).json({ error: "You've already reviewed this order" }); return; }

    void sendSystemMessage(reviewee, {
      category: "Reviews",
      subject: `You received a ${stars}-star review`,
      body: `${role === "buyer_to_seller" ? "A buyer" : "A seller"} reviewed your order "${order.item_title}": ${"★".repeat(stars)}${"☆".repeat(5 - stars)}${text ? `\n\n“${text}”` : ""}`,
    });
    res.status(201).json({ ok: true, role });
  } catch (err) {
    logger.error({ err }, "Create review failed");
    res.status(500).json({ error: "Failed to save your review" });
  }
});

// ── Seller side: see their orders and dispatch them ─────────────────────────

router.get("/orders/seller", async (req, res) => {
  try {
    const email = await authenticatedEmail(req);
    if (!email) { res.status(401).json({ error: "Please sign in to view your sales" }); return; }
    const rows = await db.execute(sql`
      SELECT o.id, o.item_title, o.item_image, o.price, o.status, o.tracking_number, o.carrier, o.address,
             o.created_at, o.shipped_at, split_part(o.buyer_email, '@', 1) AS buyer_name, o.buyer_email,
             (SELECT r.rating FROM reviews r WHERE r.order_id = o.id AND r.role = 'seller_to_buyer') AS my_review_rating,
             (SELECT r.rating FROM reviews r WHERE r.order_id = o.id AND r.role = 'buyer_to_seller') AS buyer_review_rating
      FROM orders o WHERE LOWER(o.seller_email) = LOWER(${email}) ORDER BY o.created_at DESC LIMIT 300
    `);
    res.json(rows.rows);
  } catch (err) {
    logger.error({ err }, "Seller orders failed");
    res.status(500).json({ error: "Failed to load your sales" });
  }
});

router.post("/orders/:id/dispatch", async (req, res) => {
  const { carrier, trackingNumber } = req.body as { carrier?: string; trackingNumber?: string };
  try {
    const sellerEmail = await authenticatedEmail(req);
    if (!sellerEmail) { res.status(401).json({ error: "Please sign in to dispatch orders" }); return; }
    const order = (await db.execute(sql`SELECT id, buyer_email, seller_email, item_title, status FROM orders WHERE id = ${req.params.id}`)).rows[0] as
      { id: string; buyer_email: string; seller_email: string | null; item_title: string; status: string } | undefined;
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }
    if (!order.seller_email || order.seller_email.toLowerCase() !== sellerEmail.toLowerCase()) { res.status(403).json({ error: "That isn't your order" }); return; }
    if (["cancelled", "delivered"].includes(order.status)) { res.status(400).json({ error: `This order is already ${order.status}.` }); return; }
    if (["shipped", "out_for_delivery"].includes(order.status)) { res.status(400).json({ error: "This order has already been dispatched." }); return; }

    await db.execute(sql`
      UPDATE orders SET status = 'shipped', shipped_at = COALESCE(shipped_at, NOW()),
        carrier = COALESCE(${carrier?.trim() || null}, carrier),
        tracking_number = COALESCE(${trackingNumber?.trim() || null}, tracking_number),
        updated_at = NOW()
      WHERE id = ${order.id}
    `);
    void sendSystemMessage(order.buyer_email, {
      category: "Orders",
      subject: "Your order is on its way",
      body: `Good news — "${order.item_title}" has been dispatched.${carrier ? `\n\nCarrier: ${carrier}` : ""}${trackingNumber ? `\nTracking number: ${trackingNumber}` : ""}\n\nOnce it arrives, please leave the seller a review from your Orders page.`,
    });
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Dispatch failed");
    res.status(500).json({ error: "Failed to dispatch the order" });
  }
});

// ── Admin moderation ─────────────────────────────────────────────────────────

router.get("/admin/reviews", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT id, order_id, role, reviewer_email, reviewee_email, rating, comment, item_title, created_at
    FROM reviews ORDER BY created_at DESC LIMIT 300
  `);
  res.json(rows.rows);
});

router.delete("/admin/reviews/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (!id) { res.status(400).json({ error: "bad id" }); return; }
  await db.execute(sql`DELETE FROM reviews WHERE id = ${id}`);
  logger.info({ id }, "Admin removed review");
  res.json({ ok: true });
});

export default router;

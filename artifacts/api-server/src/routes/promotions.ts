import { Router } from "express";
import { db, listingPromotionsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();

const PROMOTION_CONFIG: Record<string, { cost: number; daysValid: number; label: string }> = {
  "move-to-top":             { cost: 1.99, daysValid: 3,  label: "Move to Top"                          },
  "featured-badge":          { cost: 2.99, daysValid: 7,  label: "Featured Badge"                       },
  "homepage-spotlight":      { cost: 4.99, daysValid: 7,  label: "Homepage Spotlight"                   },
  "visibility-boost":        { cost: 3.49, daysValid: 5,  label: "Visibility Boost"                     },
  "premium-placement":       { cost: 5.99, daysValid: 10, label: "Premium Placement"                    },
  "urgent-badge":            { cost: 1.49, daysValid: 3,  label: "Urgent Badge"                         },
  "related-listings-5d":     { cost: 2.49, daysValid: 5,  label: "Related Listings Spotlight (5 days)"  },
  "related-listings-10d":    { cost: 4.49, daysValid: 10, label: "Related Listings Spotlight (10 days)" },
  "newsletter-feature":      { cost: 2.99, daysValid: 7,  label: "Newsletter & Blog Feature"            },
  "badge-new-listing":       { cost: 0.99, daysValid: 30, label: "Hot Seller Badge"                     },
  "badge-price-reduced":     { cost: 0.99, daysValid: 30, label: "Price Reduced Badge"                  },
  "badge-renovated":         { cost: 0.99, daysValid: 30, label: "Recently Renovated Badge"             },
  "badge-best-seller":       { cost: 0.99, daysValid: 30, label: "Best Seller Badge"                    },
  "engagement-boost":        { cost: 1.79, daysValid: 14, label: "Engagement Features"                  },
  featured:                  { cost: 2.99, daysValid: 7,  label: "Featured Listing"                     },
  spotlight:                 { cost: 4.99, daysValid: 1,  label: "Homepage Spotlight"                   },
  flash:                     { cost: 1.49, daysValid: 7,  label: "Flash Sale Slot"                      },
};

router.post("/promotions/apply", async (req, res) => {
  const { email, type, listingId } = req.body as { email?: string; type?: string; listingId?: number };
  if (!email || !type) { res.status(400).json({ error: "email and type are required" }); return; }
  if (!listingId) { res.status(400).json({ error: "listingId is required" }); return; }

  const config = PROMOTION_CONFIG[type];
  if (!config) { res.status(400).json({ error: "Unknown promotion type" }); return; }

  try {
    const balance = await storage.getCredits(email);
    if (balance < config.cost) {
      res.status(402).json({ error: "Insufficient credits", balance, required: config.cost });
      return;
    }

    const newBalance = await storage.addCredits(email, -config.cost);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.daysValid);

    await db.insert(listingPromotionsTable).values({
      listingId,
      type,
      expiresAt,
    });

    logger.info({ email, type, listingId, cost: config.cost, newBalance }, "Promotion applied");
    res.json({ success: true, type, label: config.label, creditsSpent: config.cost, newBalance, expiresAt });
  } catch (err) {
    logger.error({ err }, "Failed to apply promotion");
    res.status(500).json({ error: "Failed to apply promotion" });
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

export default router;

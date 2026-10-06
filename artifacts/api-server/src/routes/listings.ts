import { recordCreditEconomy } from "../lib/creditEconomy.js";
import { isBanned } from "../lib/banned.js";
import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, listingsTable, listingPromotionsTable } from "@workspace/db";
import { eq, desc, and, gt, sql, inArray } from "drizzle-orm";
import { toGbp } from "../fxRates.js";
import { storage } from "../storage.js";
import { refreshSellerMilestones } from "../lib/milestones.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

import { awardReferralMilestone } from "../lib/referrals.js";
import { getPromoConfig } from "../lib/promoConfig.js";

const router = Router();

function makePublicId(id: number): string {
  return `BZL-${id}`;
}

async function attachPromotions<T extends { id: number }>(rows: T[]): Promise<(T & { promotions: string[] })[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const now = new Date();

  // If listing_promotions is missing or the query fails for any reason,
  // fall back to showing listings with no promotions rather than letting
  // the failure take down the whole listings grid.
  let promos: { listingId: number; type: string }[] = [];
  try {
    promos = await db
      .select({ listingId: listingPromotionsTable.listingId, type: listingPromotionsTable.type })
      .from(listingPromotionsTable)
      .where(
        and(
          gt(listingPromotionsTable.expiresAt, now),
          inArray(listingPromotionsTable.listingId, ids)
        )
      );
  } catch (err) {
    console.error("attachPromotions: listing_promotions query failed, continuing without promotions:", err);
  }

  const promoMap = new Map<number, string[]>();
  for (const p of promos) {
    if (!promoMap.has(p.listingId)) promoMap.set(p.listingId, []);
    promoMap.get(p.listingId)!.push(p.type);
  }
  return rows.map((r) => ({ ...r, promotions: promoMap.get(r.id) ?? [] }));
}

function promoRank(promotions: string[]): number {
  if (promotions.includes("homepage-spotlight") || promotions.includes("spotlight")) return 4;
  if (promotions.includes("premium-placement")) return 3;
  if (promotions.includes("featured-badge") || promotions.includes("featured")) return 2;
  if (promotions.includes("visibility-boost") || promotions.includes("move-to-top") || promotions.includes("flash")) return 1;
  return 0;
}

router.get("/listings", async (req, res) => {
  try {
    const { category, sub, sellerEmail, limit = "40", offset = "0", ids } = req.query as Record<string, string>;

    if (ids) {
      const idList = ids.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
      if (idList.length === 0) { res.json([]); return; }
      const rows = await db.select().from(listingsTable).where(inArray(listingsTable.id, idList));
      res.json(rows);
      return;
    }

    const parsedLimit = Math.min(isNaN(parseInt(limit)) ? 40 : parseInt(limit), 100);
    const parsedOffset = isNaN(parseInt(offset)) ? 0 : parseInt(offset);

    // Browse/list views only need card fields. Avoid sending large description, tags,
    // specifications and other detail-only columns for every listing.
    const rows = await db
      .select({
        id: listingsTable.id,
        publicId: listingsTable.publicId,
        title: listingsTable.title,
        price: listingsTable.price,
        category: listingsTable.category,
        subcategory: listingsTable.subcategory,
        condition: listingsTable.condition,
        image: listingsTable.image,
        views: listingsTable.views,
        watchers: listingsTable.watchers,
        status: listingsTable.status,
        sellerEmail: listingsTable.sellerEmail,
        sellerName: listingsTable.sellerName,
        sellerUsername: listingsTable.sellerUsername,
        extraCategories: listingsTable.extraCategories,
        currency: listingsTable.currency,
        priceGbp: listingsTable.priceGbp,
        createdAt: listingsTable.createdAt,
      })
      .from(listingsTable)
      .where(
        sellerEmail
          ? and(eq(listingsTable.status, "active"), sql`LOWER(${listingsTable.sellerEmail}) = LOWER(${sellerEmail})`)
          : category && category !== "all"
            ? sub
              ? and(eq(listingsTable.status, "active"), eq(listingsTable.category, category), eq(listingsTable.subcategory, sub))
              : and(eq(listingsTable.status, "active"), eq(listingsTable.category, category))
            : eq(listingsTable.status, "active")
      )
      .orderBy(desc(listingsTable.createdAt))
      .limit(parsedLimit)
      .offset(parsedOffset);

    const withPromos = await attachPromotions(rows);
    withPromos.sort((a, b) => promoRank(b.promotions) - promoRank(a.promotions));
    // Public browse cards change relatively infrequently; a tiny cache removes repeated
    // database work while keeping new/edited listings fresh within seconds.
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=45");
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/category-counts", async (_req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=120");
    const rows = await db.execute(sql`
      SELECT category, subcategory, COUNT(*)::int AS count
      FROM listings
      WHERE status = 'active'
      GROUP BY category, subcategory
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error("Error fetching category counts:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/spotlight", async (req, res) => {
  try {
    const now = new Date();
    const spotlightTypes = ["homepage-spotlight", "spotlight", "featured-badge", "featured", "premium-placement"];

    const promos = await db
      .select({ listingId: listingPromotionsTable.listingId })
      .from(listingPromotionsTable)
      .where(
        and(
          gt(listingPromotionsTable.expiresAt, now),
          inArray(listingPromotionsTable.type, spotlightTypes)
        )
      )
      .limit(12);

    if (promos.length === 0) { res.json([]); return; }
    const ids = [...new Set(promos.map(p => p.listingId))];
    const rows = await db.select().from(listingsTable).where(
      and(eq(listingsTable.status, "active"), inArray(listingsTable.id, ids))
    );
    const withPromos = await attachPromotions(rows);
    withPromos.sort((a, b) => promoRank(b.promotions) - promoRank(a.promotions));
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching spotlight listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/mine", async (req, res) => {
  try {
    const { email } = req.query as Record<string, string>;
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }

    // Prevent 304 Caching Issues on newly posted items
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const rows = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.sellerEmail, email))
      .orderBy(desc(listingsTable.createdAt))
      .limit(100);
    const withPromos = await attachPromotions(rows);
    res.json(withPromos);
  } catch (err) {
    console.error("Error fetching my listings:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.get("/listings/:id", async (req, res) => {
  try {
    const rawId = req.params.id;
    const numId = parseInt(rawId);
    let row;
    if (!isNaN(numId)) {
      [row] = await db.select().from(listingsTable).where(eq(listingsTable.id, numId)).limit(1);
    }
    if (!row) {
      [row] = await db.select().from(listingsTable).where(eq(listingsTable.publicId, rawId)).limit(1);
    }
    if (!row) { res.status(404).json({ error: "not found" }); return; }
    if (row.status === "scheduled") {
      const viewer = typeof req.query.email === "string" ? req.query.email.toLowerCase() : "";
      if (viewer !== String(row.sellerEmail).toLowerCase()) { res.status(404).json({ error: "not found" }); return; }
    }
    const [withPromo] = await attachPromotions([row]);

    let sellerVerified = false;
    try {
      const verResult = await db.execute(sql`
        SELECT verification_status FROM users WHERE email = ${row.sellerEmail}
      `);
      sellerVerified = verResult.rows[0]?.verification_status === "verified";
    } catch (err) {
      console.error("Error checking seller verification, defaulting to unverified:", err);
    }

    res.json({ ...withPromo, sellerVerified });
  } catch (err) {
    console.error("Error fetching listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.post("/listings", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    
    const title = (body.title || body.name) as string;
    const price = (body.price || body.amount) as string;
    const category = (body.category || "General") as string;
    const description = (body.description || body.details || title || "No description provided") as string;
    const sellerEmail = (body.sellerEmail || body.email || req.headers["x-user-email"]) as string;

    console.log("POST /api/listings payload received:", { title, price, category, sellerEmail });

    if (await isBanned(sellerEmail)) {
      res.status(403).json({ error: "This account has been suspended and can't create listings." });
      return;
    }

    if (!title || !price || !sellerEmail) {
      console.error("Missing required fields:", { title, price, sellerEmail });
      res.status(400).json({ 
        error: "missing_fields", 
        message: "title, price, and sellerEmail are required.",
        received: { title: !!title, price: !!price, sellerEmail: !!sellerEmail }
      });
      return;
    }

    const condition = typeof body.condition === "string" ? body.condition : "good";
    const image = typeof body.image === "string" ? body.image : null;
    const sellerName = typeof body.sellerName === "string" ? body.sellerName : null;
    const sellerUsername = typeof body.sellerUsername === "string" ? body.sellerUsername : null;
    const subcategory = typeof body.subcategory === "string" && body.subcategory ? body.subcategory : null;
    const tags = typeof body.tags === "string" ? body.tags : null;
    const specifications = Array.isArray(body.specifications) ? JSON.stringify(body.specifications) : null;
    const extraCategories = Array.isArray(body.extra_categories) && body.extra_categories.length
      ? JSON.stringify(body.extra_categories)
      : null;
    const currency = typeof body.currency === "string" && body.currency ? body.currency.toUpperCase() : "GBP";
    const status = typeof body.status === "string" ? body.status : "active";
    const premiumVideo = body.premiumVideo === true;
    const shipOrigin = typeof body.shipOrigin === "string" ? body.shipOrigin.slice(0, 80) : null;
    const shipOriginOther = typeof body.shipOriginOther === "string" ? body.shipOriginOther.slice(0, 120) : null;
    const shipZone = typeof body.shipZone === "string" ? body.shipZone.slice(0, 80) : null;
    const carrier = typeof body.carrier === "string" ? body.carrier.slice(0, 80) : null;
    const shippingPrice = body.shippingPrice != null && Number.isFinite(Number(body.shippingPrice)) ? String(body.shippingPrice) : null;
    const handlingCharge = body.handlingCharge != null && Number.isFinite(Number(body.handlingCharge)) ? String(body.handlingCharge) : null;
    const quantity = body.quantity != null && Number.isFinite(Number(body.quantity)) ? Math.max(0, Math.floor(Number(body.quantity))) : null;
    const sku = typeof body.sku === "string" ? body.sku.slice(0, 120) : null;

    // Product Video is priced in credits and controlled by Admin → Promotions.
    // Validate the balance before creating the listing so a failed add-on cannot create duplicates.
    let productVideoConfig: Awaited<ReturnType<typeof getPromoConfig>> = null;
    if (premiumVideo) {
      productVideoConfig = await getPromoConfig("product-video");
      if (!productVideoConfig || !productVideoConfig.enabled) {
        res.status(400).json({ error: "Product Video is not currently available." });
        return;
      }
      const balance = await storage.getCredits(sellerEmail);
      if (balance < productVideoConfig.cost) {
        res.status(402).json({ error: "Insufficient credits", message: `Product Video costs ${Math.round(productVideoConfig.cost * 100)} credits.`, balance: Math.round(Number(balance) * 100), required: Math.round(productVideoConfig.cost * 100) });
        return;
      }
    }

    let priceGbp: string | null = null;
    try {
      priceGbp = (await toGbp(parseFloat(price), currency)).toFixed(2);
    } catch {
      priceGbp = String(price);
    }

    const [inserted] = await db
      .insert(listingsTable)
      .values({ 
        title, 
        price: String(price), 
        category, 
        subcategory, 
        description, 
        condition, 
        image, 
        sellerEmail, 
        sellerName, 
        sellerUsername, 
        tags, 
        extraCategories, 
        specifications, 
        currency, 
        priceGbp,
        shipOrigin,
        shipOriginOther,
        shipZone,
        carrier,
        shippingPrice,
        handlingCharge,
        quantity,
        sku,
        status 
      })
      .returning();

    const publicId = makePublicId(inserted.id);
    const [listing] = await db
      .update(listingsTable)
      .set({ publicId })
      .where(eq(listingsTable.id, inserted.id))
      .returning();

    console.log("Listing successfully created:", listing.id);

    if (premiumVideo && productVideoConfig) {
      const newBalance = await storage.addCredits(sellerEmail, -productVideoConfig.cost);
      await recordCreditEconomy({ email: sellerEmail, kind: "spent", credits: -productVideoConfig.cost, reason: "Product Video", referenceType: "product_video" });
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 10);
      await db.insert(listingPromotionsTable).values({ listingId: listing.id, type: "product-video", expiresAt });
      void sendSystemMessage(sellerEmail, { category: "Listings", subject: "Product Video added", body: `Product Video was added to “${listing.title}” for ${Math.round(productVideoConfig.cost * 100)} credits. Your new balance is ${Math.round(Number(newBalance) * 100)} credits.` });
    }

    // First listing ever posted by this seller completes the "First
    // Listing" milestone. Safe to call on every post — completeMilestone()
    // never un-completes it.
    storage.completeMilestone(sellerEmail, "first-listing").catch((err) => {
      console.error("Failed to record first-listing milestone:", err);
    });

    // Active Lister (5/month) and Inventory Master (20/month)
    void refreshSellerMilestones(sellerEmail);
    void sendSystemMessage(sellerEmail, {
      category: "Listings",
      subject: "Your listing is live",
      body:
        `Your item "${(listing as { title?: string }).title ?? "your item"}" has been listed on Bazunk.\n\n` +
        "Tip: you can promote it with credits to reach more buyers.",
    });

    if (status === 'active') void awardReferralMilestone(sellerEmail, 'seller');
    res.status(201).json({ ...listing, promotions: [] });

  } catch (err) {
    console.error("Error creating listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.patch("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email } = req.query as Record<string, string>;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const body = req.body as Record<string, unknown>;
    const allowed = ["title", "price", "description", "condition", "category", "subcategory", "image", "status", "currency"] as const;
    const updates: Partial<Record<typeof allowed[number] | "extraCategories", string>> = {};
    for (const key of allowed) {
      if (typeof body[key] === "string") updates[key] = body[key] as string;
    }

    if (Array.isArray(body.extra_categories)) {
      updates.extraCategories = body.extra_categories.length ? JSON.stringify(body.extra_categories) : "";
    }
    if (Object.keys(updates).length === 0) { res.status(400).json({ error: "no fields to update" }); return; }

    if (updates.price || updates.currency) {
      const [current] = await db.select({ price: listingsTable.price, currency: listingsTable.currency })
        .from(listingsTable).where(eq(listingsTable.id, id)).limit(1);
      if (current) {
        const price = updates.price ?? current.price;
        const currency = (updates.currency ?? current.currency ?? "GBP").toUpperCase();
        try {
          (updates as Record<string, string>).priceGbp = (await toGbp(parseFloat(price), currency)).toFixed(2);
        } catch { /* keep existing */ }
      }
    }

    const updated = await db
      .update(listingsTable)
      .set(updates)
      .where(and(eq(listingsTable.id, id), eq(listingsTable.sellerEmail, email)))
      .returning();
    if (updated.length === 0) { res.status(404).json({ error: "Listing not found or not yours" }); return; }
    res.json(updated[0]);
  } catch (err) {
    console.error("Error updating listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.delete("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { email } = req.query as Record<string, string>;
    if (!email) {
      res.status(400).json({ error: "email required" });
      return;
    }
    const deleted = await db
      .delete(listingsTable)
      .where(and(eq(listingsTable.id, id), eq(listingsTable.sellerEmail, email)))
      .returning();
    if (deleted.length === 0) {
      res.status(404).json({ error: "Listing not found or not yours" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting listing:", err);
    res.status(500).json({ error: "internal_server_error", message: String(err) });
  }
});

router.patch("/listings/seller-name", async (req, res) => {
  try {
    const auth = getAuth(req);
    if (!auth.isAuthenticated || !auth.userId) { res.status(401).json({ error: "Sign in required" }); return; }
    const clerkUser = await clerkClient.users.getUser(auth.userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase();
    if (!email) { res.status(400).json({ error: "Account email not found" }); return; }

    const { name, username } = req.body as { name?: string; username?: string };
    const cleanName = typeof name === "string" ? name.trim().slice(0, 120) : "";
    const cleanUsername = typeof username === "string" ? username.trim().replace(/^@/, "") : "";
    if (!/^[A-Za-z0-9._-]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, dots, underscores or hyphens." }); return;
    }
    const taken = await db.execute(sql`SELECT 1 FROM users WHERE LOWER(username)=LOWER(${cleanUsername}) AND LOWER(email)<>LOWER(${email}) LIMIT 1`);
    if (taken.rows.length) { res.status(409).json({ error: "That username is already taken." }); return; }

    await db.execute(sql`UPDATE users SET username=${cleanUsername}, name=COALESCE(NULLIF(${cleanName}, ''), name) WHERE LOWER(email)=LOWER(${email})`);
    // Retrospective privacy fix: every existing selling surface is updated to the chosen public username.
    await db.execute(sql`UPDATE listings SET seller_username=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    await db.execute(sql`UPDATE auctions SET seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    await db.execute(sql`UPDATE flash_sales SET seller_username=${cleanUsername}, seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`);
    res.json({ success: true, username: cleanUsername });
  } catch (err: any) {
    if (String(err?.code) === "23505") { res.status(409).json({ error: "That username is already taken." }); return; }
    res.status(500).json({ error: "Failed to update seller profile" });
  }
});


// ── Account profile + first-dashboard onboarding ───────────────────────────
async function authenticatedEmail(req: any): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) return null;
  const clerkUser = await clerkClient.users.getUser(auth.userId);
  return clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
}

router.get("/listings/profile/me", async (req, res) => {
  try {
    const email = await authenticatedEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required" }); return; }
    await db.execute(sql`INSERT INTO users (id,email,credits) VALUES (${email},${email},0.50) ON CONFLICT (email) DO NOTHING`);
    const r = await db.execute(sql`
      SELECT email,name,username,phone,address_line1,address_line2,city,postcode,country,
             seller_type,notification_preferences,onboarding_step,onboarding_completed
      FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1
    `);
    res.json(r.rows[0]);
  } catch (err) {
    console.error("profile/me failed", err);
    res.status(500).json({ error: "Failed to load profile" });
  }
});

router.patch("/listings/profile/me", async (req, res) => {
  try {
    const email = await authenticatedEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required" }); return; }
    // PATCH may be the first profile request after sign-up. Ensure the local
    // marketplace user exists instead of relying on the preceding GET having run.
    await db.execute(sql`INSERT INTO users (id,email,credits) VALUES (${email},${email},0.50) ON CONFLICT (email) DO NOTHING`);

    const b = req.body ?? {};
    const cleanName = typeof b.name === "string" ? b.name.trim().slice(0,120) : null;
    const cleanUsername = typeof b.username === "string" ? b.username.trim().replace(/^@/,"") : null;
    if (cleanUsername !== null && !/^[A-Za-z0-9._-]{3,30}$/.test(cleanUsername)) {
      res.status(400).json({ error: "Username must be 3–30 characters using letters, numbers, dots, underscores or hyphens." }); return;
    }
    if (cleanUsername) {
      const taken = await db.execute(sql`SELECT 1 FROM users WHERE LOWER(username)=LOWER(${cleanUsername}) AND LOWER(email)<>LOWER(${email}) LIMIT 1`);
      if (taken.rows.length) { res.status(409).json({ error: "That username is already taken." }); return; }
    }
    const phone = typeof b.phone === "string" ? b.phone.trim().slice(0,40) : null;
    const a1 = typeof b.addressLine1 === "string" ? b.addressLine1.trim().slice(0,180) : null;
    const a2 = typeof b.addressLine2 === "string" ? b.addressLine2.trim().slice(0,180) : null;
    const city = typeof b.city === "string" ? b.city.trim().slice(0,100) : null;
    const postcode = typeof b.postcode === "string" ? b.postcode.trim().slice(0,30) : null;
    const country = typeof b.country === "string" ? b.country.trim().slice(0,80) : null;
    const sellerType = ["private","sole_trader","business"].includes(b.sellerType) ? b.sellerType : null;
    const step = Number.isInteger(b.onboardingStep) ? Math.max(1,Math.min(6,b.onboardingStep)) : null;
    const completed = b.onboardingCompleted === true ? true : null;
    const prefs = b.notificationPreferences && typeof b.notificationPreferences === "object" ? b.notificationPreferences : null;

    // JSON is stringified and cast server-side so it is never interpolated as SQL text.
    const prefsJson = prefs ? JSON.stringify({
      orders: prefs.orders !== false,
      offers: prefs.offers !== false,
      messages: prefs.messages !== false,
      promotions: prefs.promotions === true,
    }) : null;
    await db.execute(sql`UPDATE users SET
      name=COALESCE(${cleanName},name), username=COALESCE(${cleanUsername},username), phone=COALESCE(${phone},phone),
      address_line1=COALESCE(${a1},address_line1), address_line2=COALESCE(${a2},address_line2), city=COALESCE(${city},city),
      postcode=COALESCE(${postcode},postcode), country=COALESCE(${country},country), seller_type=COALESCE(${sellerType},seller_type),
      notification_preferences=COALESCE(${prefsJson}::jsonb,notification_preferences),
      onboarding_step=COALESCE(${step},onboarding_step), onboarding_completed=COALESCE(${completed},onboarding_completed)
      WHERE LOWER(email)=LOWER(${email})`);
    // The profile update above is authoritative. Older deployments can have
    // different optional seller-name columns on individual selling surfaces.
    // Propagate retrospectively where supported, but never make onboarding fail
    // because a legacy table/column is absent.
    if (cleanUsername) {
      const propagate = async (query: any, surface: string) => {
        try {
          await db.execute(query);
        } catch (propagationError) {
          console.warn(`profile username propagation skipped for ${surface}`, propagationError);
        }
      };
      await propagate(sql`UPDATE listings SET seller_username=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "listings");
      await propagate(sql`UPDATE auctions SET seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "auctions");
      await propagate(sql`UPDATE flash_sales SET seller_username=${cleanUsername}, seller_name=${cleanUsername} WHERE LOWER(seller_email)=LOWER(${email})`, "flash_sales");
    }
    const out = await db.execute(sql`SELECT name,username,phone,address_line1,address_line2,city,postcode,country,seller_type,notification_preferences,onboarding_step,onboarding_completed FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1`);
    res.json(out.rows[0] ?? { success:true });
  } catch (err: any) {
    if (String(err?.code)==="23505") { res.status(409).json({ error:"That username is already taken." }); return; }
    console.error("profile/me update failed", err);
    res.status(500).json({ error:"Failed to save profile" });
  }
});

export default router;

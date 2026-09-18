import { Router } from "express";
import { db, listingsTable, listingPromotionsTable } from "@workspace/db";
import { eq, desc, and, gt, sql, inArray } from "drizzle-orm";
import { toGbp } from "../fxRates.js";

const router = Router();

function makePublicId(id: number): string {
  return `BZL-${id}`;
}

async function attachPromotions(rows: (typeof listingsTable.$inferSelect)[]): Promise<(typeof listingsTable.$inferSelect & { promotions: string[] })[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const now = new Date();
  const promos = await db
    .select({ listingId: listingPromotionsTable.listingId, type: listingPromotionsTable.type })
    .from(listingPromotionsTable)
    .where(
      and(
        gt(listingPromotionsTable.expiresAt, now),
        sql`${listingPromotionsTable.listingId} = ANY(ARRAY[${sql.join(ids.map((id) => sql`${id}`), sql`, `)}]::int[])`
      )
    );
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
  const { category, sub, limit = "40", offset = "0", ids } = req.query as Record<string, string>;

  // If specific IDs are requested (e.g. for live stream product panels), fetch only those
  if (ids) {
    const idList = ids.split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    if (idList.length === 0) { res.json([]); return; }
    const rows = await db.select().from(listingsTable).where(inArray(listingsTable.id, idList));
    res.json(rows);
    return;
  }

  const rows = await db
    .select()
    .from(listingsTable)
    .where(
      category && category !== "all"
        ? sub
          ? and(eq(listingsTable.status, "active"), eq(listingsTable.category, category), eq(listingsTable.subcategory, sub))
          : and(eq(listingsTable.status, "active"), eq(listingsTable.category, category))
        : eq(listingsTable.status, "active")
    )
    .orderBy(desc(listingsTable.createdAt))
    .limit(parseInt(limit))
    .offset(parseInt(offset));

  const withPromos = await attachPromotions(rows);
  withPromos.sort((a, b) => promoRank(b.promotions) - promoRank(a.promotions));
  res.json(withPromos);
});

router.get("/listings/spotlight", async (req, res) => {
  const now = new Date();
  const spotlightTypes = ["homepage-spotlight", "spotlight", "featured-badge", "featured", "premium-placement"];
  const promos = await db
    .select({ listingId: listingPromotionsTable.listingId })
    .from(listingPromotionsTable)
    .where(
      and(
        gt(listingPromotionsTable.expiresAt, now),
        sql`${listingPromotionsTable.type} = ANY(ARRAY[${sql.join(spotlightTypes.map(t => sql`${t}`), sql`, `)}]::text[])`
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
});

router.get("/listings/mine", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) {
    res.status(400).json({ error: "email required" });
    return;
  }
  const rows = await db
    .select()
    .from(listingsTable)
    .where(eq(listingsTable.sellerEmail, email))
    .orderBy(desc(listingsTable.createdAt))
    .limit(100);
  const withPromos = await attachPromotions(rows);
  res.json(withPromos);
});

router.get("/listings/:id", async (req, res) => {
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
  const [withPromo] = await attachPromotions([row]);

  // Attach seller verification badge
  const verResult = await db.execute(sql`
    SELECT verification_status FROM users WHERE email = ${row.sellerEmail}
  `);
  const sellerVerified = verResult.rows[0]?.verification_status === "verified";

  res.json({ ...withPromo, sellerVerified });
});

router.post("/listings", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { title, price, category, description, sellerEmail } = body as Record<string, string>;
  if (!title || !price || !category || !description || !sellerEmail) {
    res.status(400).json({ error: "title, price, category, description, and sellerEmail are required" });
    return;
  }

  // Require identity verification before listing
  const verResult = await db.execute(sql`
    SELECT verification_status FROM users WHERE email = ${sellerEmail}
  `);
  const verificationStatus = (verResult.rows[0]?.verification_status as string) ?? "unverified";
  if (verificationStatus !== "verified") {
    res.status(403).json({
      error: "identity_verification_required",
      message: "You must verify your identity before publishing listings. Visit your dashboard to get verified.",
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
  
  // FIX: Explicitly set status to "active" so it appears in the main listing query
  const status = typeof body.status === "string" ? body.status : "active";

  let priceGbp: string | null = null;
  try {
    priceGbp = (await toGbp(parseFloat(price), currency)).toFixed(2);
  } catch {
    priceGbp = price;
  }

  const [inserted] = await db
    .insert(listingsTable)
    .values({ 
      title, 
      price, 
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
      status // Inserted explicitly
    })
    .returning();

  const publicId = makePublicId(inserted.id);
  const [listing] = await db
    .update(listingsTable)
    .set({ publicId })
    .where(eq(listingsTable.id, inserted.id))
    .returning();

  res.status(201).json({ ...listing, promotions: [] });
});

router.patch("/listings/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const body = req.body as Record<string, unknown>;
  const allowed = ["title", "price", "description", "condition", "category", "subcategory", "image", "status", "currency"] as const;
  const updates: Partial<Record<typeof allowed[number] | "extraCategories", string>> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") updates[key] = body[key] as string;
  }
  // extra_categories comes in as an array; serialize to JSON string for storage
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
});

router.delete("/listings/:id", async (req, res) => {
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
});

// PATCH /api/listings/seller-name — update seller_name across all listing types for a given email
router.patch("/listings/seller-name", async (req, res) => {
  const { email, name, username } = req.body as { email?: string; name?: string; username?: string };
  if (!email || (!name && !username)) {
    res.status(400).json({ error: "email and at least one of name/username are required" });
    return;
  }
  try {
    const updates: Partial<typeof listingsTable.$inferInsert> = {};
    if (name) updates.sellerName = name;
    if (username) updates.sellerUsername = username;
    await db.update(listingsTable).set(updates).where(eq(listingsTable.sellerEmail, email));
    if (name) await db.execute(sql`UPDATE auctions SET seller_name = ${name} WHERE seller_email = ${email}`);
    if (username) await db.execute(sql`UPDATE auctions SET seller_username = ${username} WHERE seller_email = ${email}`);
    if (name) await db.execute(sql`UPDATE flash_sales SET seller_name = ${name} WHERE seller_email = ${email}`);
    if (username) await db.execute(sql`UPDATE flash_sales SET seller_username = ${username} WHERE seller_email = ${email}`);
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to update seller info");
    res.status(500).json({ error: "Failed to update seller info" });
  }
});

export default router;

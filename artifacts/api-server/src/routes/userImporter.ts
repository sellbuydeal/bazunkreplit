import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { fetchAmazonDetails, buildAmazonDescription } from "../lib/amazon.js";
import { rapidApiErrorMessage } from "../lib/rapidapi.js";
import { requestEmail, rapidKeyForRequest } from "../lib/userRapidApi.js";

import { validateOwnEbayItems } from "../lib/freeEbayImport.js";
import { randomUUID } from "node:crypto";
import { toGbp } from "../fxRates.js";
const router = Router();

// Free seller-owned inventory: no external fetch, RapidAPI key or refresh metadata.
router.post("/user/import-ebay-own", async (req, res) => {
  try {
    const email = await requestEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in to import your listings." }); return; }
    if (req.body.ownsItems !== true) { res.status(400).json({ error: "Confirm these are your own listings and inventory." }); return; }
    let items: ReturnType<typeof validateOwnEbayItems>;
    try { items = validateOwnEbayItems(req.body.products); } catch (e) { res.status(400).json({ error: e instanceof Error ? e.message : "Invalid listings" }); return; }
    const category = String(req.body.category ?? "");
    const subcategory = String(req.body.subcategory ?? "");
    if (!/^[a-z0-9-]{1,80}$/.test(category) || (subcategory && !/^[a-z0-9-]{1,80}$/.test(subcategory))) { res.status(400).json({ error: "Choose a Bazunk category." }); return; }
    const pricedItems = await Promise.all(items.map(async item => ({ ...item, priceGbp: (await toGbp(item.price, item.currency)).toFixed(2) })));
    const result = await db.transaction(async tx => {
      // Serialise batches for this seller so retries and duplicate clicks cannot create duplicates.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${email}))`);
      const user = await tx.execute(sql`SELECT name FROM users WHERE lower(email)=${email} LIMIT 1`).then(r => r.rows[0] as any);
      let imported = 0, skipped = 0;
      for (const item of pricedItems) {
        const marker = '%"own_ebay_item_id":"' + item.itemId + '"%';
        const exists = await tx.execute(sql`SELECT id FROM listings WHERE lower(seller_email)=${email} AND specifications LIKE ${marker} LIMIT 1`);
        if (exists.rows.length) { skipped++; continue; }
        const specs = JSON.stringify({ source: "eBay own listings", import_mode: "one_time", sync_enabled: false, own_ebay_item_id: item.itemId, item_id: item.itemId, ebay_url: `https://www.ebay.co.uk/itm/${item.itemId}`, inventory: item.quantity });
        await tx.execute(sql`INSERT INTO listings(public_id,title,price,price_gbp,currency,category,subcategory,description,condition,image,seller_email,seller_name,specifications,status,created_at,updated_at)
          VALUES(${'BZK-OWN-EBY-'+randomUUID()},${item.title},${item.price},${item.priceGbp},${item.currency},${category},${subcategory || null},${item.description || item.title},${item.condition},${item.image},${email},${user?.name || email.split("@")[0]},${specs},'active',NOW(),NOW())`);
        imported++;
      }
      return { imported, skipped };
    });
    res.json(result);
  } catch (err) { logger.error({ err }, "Own eBay import failed"); res.status(500).json({ error: "Import failed. Retry the batch; existing imports will be skipped." }); }
});

// GET /api/user/search-amazon — live Amazon UK search (any signed-in user)
router.get("/user/search-amazon", async (req, res) => {
  const { key: apiKey } = await rapidKeyForRequest(req);
  if (!apiKey) { res.status(503).json({ error: "Amazon search is not configured yet" }); return; }

  const q    = (req.query.q as string)?.trim();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!q) { res.status(400).json({ error: "q param required" }); return; }

  try {
    const url = `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(q)}&country=GB&page=${page}`;
    const resp = await fetch(url, {
      headers: {
        "X-RapidAPI-Key":  apiKey,
        "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
      },
    });
    if (!resp.ok) {
      logger.error(rapidApiErrorMessage("Amazon", resp.status));
      res.status(502).json({ error: "Amazon search is temporarily unavailable — please try again later." });
      return;
    }

    const data = await resp.json() as Record<string, unknown>;
    const raw  = ((data?.data as Record<string, unknown>)?.products as Record<string, unknown>[]) ?? [];

    const products = raw
      .filter(p => p.asin && p.product_price)
      .map(p => {
        const priceStr = String(p.product_price ?? "").replace(/[^0-9.]/g, "");
        const price    = parseFloat(priceStr);
        return {
          asin:        p.asin as string,
          title:       (p.product_title ?? p.product_description ?? "Unknown") as string,
          price_gbp:   price,
          image:       (p.product_photo ?? p.thumbnail ?? null) as string | null,
          rating:      (p.product_star_rating ?? "") as string,
          amazon_url:  (p.product_url ?? `https://www.amazon.co.uk/dp/${p.asin}`) as string,
        };
      })
      .filter(p => p.price_gbp > 0);

    req.log.info({ q, page, count: products.length }, "User Amazon UK search");
    res.json({ products });
  } catch (err) {
    logger.error({ err }, "User Amazon search error");
    res.status(500).json({ error: "Search failed" });
  }
});

// POST /api/user/import-amazon — import chosen ASINs to the user's own account
router.post("/user/import-amazon", async (req, res) => {
  const { key: apiKey } = await rapidKeyForRequest(req);
  if (!apiKey) { res.status(503).json({ error: "Amazon import is not configured yet" }); return; }

  interface SelectedProduct {
    asin: string; title: string; price_gbp: number;
    image: string | null; amazon_url: string;
  }

  const products: SelectedProduct[] = req.body.products ?? [];
  const markupPct   = Math.max(0, parseFloat(String(req.body.markup   ?? 35))   || 35);
  const shippingGbp = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);
  const category    = (req.body.category    as string) || "other";
  const subcategory = (req.body.subcategory as string) || null;
  const sellerEmail = (req.body.sellerEmail as string)?.trim();

  if (!sellerEmail)    { res.status(400).json({ error: "sellerEmail required" }); return; }
  if (!products.length){ res.status(400).json({ error: "products array required" }); return; }

  // Look up seller name
  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const sellerName = sellerRow?.name ?? sellerEmail.split("@")[0];

  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.asin || !p.price_gbp) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings
          WHERE seller_email = ${sellerEmail}
            AND specifications LIKE ${'%"asin":"' + p.asin + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const bazunkPrice = Math.round((p.price_gbp * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
    const publicId    = `BZK-AMZ-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const specs       = JSON.stringify({
      source:           "Amazon UK",
      asin:             p.asin,
      amazon_url:       p.amazon_url,
      amazon_price_gbp: p.price_gbp,
      shipping_gbp:     shippingGbp,
      markup_pct:       markupPct,
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
        'new', ${image}, ${sellerEmail}, ${sellerName},
        ${specs}, 'active', NOW(), NOW()
      )
    `);
    inserted++;
  }

  req.log.info({ inserted, sellerEmail, markupPct, shippingGbp }, "User Amazon import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} product${inserted !== 1 ? "s" : ""} to your listings` });
});

// ── eBay user routes ─────────────────────────────────────────────────────────

// GET /api/user/search-ebay — live eBay search (any signed-in user)
router.get("/user/search-ebay", async (req, res) => {
  const { key: apiKey } = await rapidKeyForRequest(req);
  if (!apiKey) { res.status(503).json({ error: "eBay search is not configured yet" }); return; }

  const q    = (req.query.q as string)?.trim();
  const site = (req.query.site as string ?? "uk") === "us" ? "us" : "uk";
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!q) { res.status(400).json({ error: "q param required" }); return; }

  try {
    const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
    const offset        = (page - 1) * 50;
    const resp = await fetch(
      `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(q)}&marketplace_id=${marketplaceId}&item_location_country=${site === "uk" ? "GB" : "US"}&delivery_country=${site === "uk" ? "GB" : "US"}&offset=${offset}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
    );
    if (!resp.ok) {
      logger.error(rapidApiErrorMessage("eBay", resp.status));
      res.status(502).json({ error: "eBay search is temporarily unavailable — please try again later." });
      return;
    }

    const data     = await resp.json() as Record<string, unknown>;
    const raw      = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
    const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
    const ebayBase = site === "uk" ? "https://www.ebay.co.uk" : "https://www.ebay.com";

    const expectedCountries = site === "uk"
      ? new Set(["GB", "GBR", "UK", "UNITED KINGDOM"])
      : new Set(["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"]);
    const products = raw
      .filter(p => {
        if (!p.legacyItemId || !(p.price as Record<string, unknown>)?.value) return false;
        const loc = (p.itemLocation as Record<string, unknown>) ?? {};
        const country = String(loc.country ?? "").trim().toUpperCase();
        const cur = String(((p.price as Record<string, unknown>)?.currency ?? "")).toUpperCase();
        return expectedCountries.has(country) && cur === (site === "uk" ? "GBP" : "USD");
      })
      .map(p => {
        const priceObj       = (p.price as Record<string, unknown>) ?? {};
        const price          = parseFloat(String(priceObj.value ?? "").replace(/[^0-9.]/g, "")) || 0;
        const itemCurrency   = String((priceObj.currency as string) ?? currency) as "GBP" | "USD";
        const imgUrl         = ((p.image as Record<string, unknown>)?.imageUrl as string | null)
          ?? ((p.thumbnailImages as Record<string, unknown>[])?.[0]?.imageUrl as string | null)
          ?? null;
        const seller         = (p.seller as Record<string, unknown>) ?? {};
        const location       = (p.itemLocation as Record<string, unknown>) ?? {};
        const country        = String(location.country ?? "");
        const cats           = (p.categories as { categoryName: string }[]) ?? [];
        const categoryNames  = cats.map(c => c.categoryName).filter(Boolean);
        const shippingOpts   = (p.shippingOptions as Record<string, unknown>[]) ?? [];
        const firstShip      = shippingOpts[0] ?? {};
        const shipCost       = (firstShip.shippingCost as Record<string, unknown>)?.value;
        const shippingLabel  = shipCost === "0.00" || shipCost === 0 ? "Free" : shipCost ? `${itemCurrency === "GBP" ? "£" : "$"}${shipCost}` : null;
        const shippingType   = String(firstShip.shippingCostType ?? "");
        const mktPrice       = (p.marketingPrice as Record<string, unknown>) ?? {};
        const origPrice      = (mktPrice.originalPrice as Record<string, unknown>)?.value;
        const discountPct    = mktPrice.discountPercentage ? `${mktPrice.discountPercentage}% off` : null;
        const buyingOptions  = (p.buyingOptions as string[]) ?? [];
        return {
          item_id:          String(p.legacyItemId),
          title:            String(p.title ?? "eBay Listing"),
          price,
          currency:         itemCurrency,
          image:            imgUrl,
          rating:           String(seller.feedbackScore ?? ""),
          seller_username:  String(seller.username ?? ""),
          seller_feedback:  String(seller.feedbackPercentage ?? ""),
          condition:        String(p.condition ?? ""),
          condition_id:     p.conditionId != null ? String(p.conditionId) : null,
          ebay_url:         `${ebayBase}/itm/${p.legacyItemId}`,
          country,
          categories:       categoryNames,
          shipping_label:   shippingLabel,
          shipping_type:    shippingType,
          original_price:   origPrice ? String(origPrice) : null,
          discount_pct:     discountPct,
          buying_options:   buyingOptions,
          item_location:    country ? `${country}${location.postalCode ? ` (${String(location.postalCode).replace(/\*+$/, "***")})` : ""}` : null,
        };
      })
      .filter(p => p.price > 0);

    req.log.info({ q, site, page, count: products.length }, "User eBay search");
    res.json({ products });
  } catch (err) {
    logger.error({ err }, "User eBay search error");
    res.status(500).json({ error: "Search failed" });
  }
});

// POST /api/user/import-ebay — import chosen eBay listings to the user's own account
router.post("/user/import-ebay", async (req, res) => {
  const { key: apiKey } = await rapidKeyForRequest(req);
  if (!apiKey) { res.status(503).json({ error: "eBay import is not configured yet" }); return; }

  interface SelectedEbay {
    item_id: string; title: string; price: number; currency: "GBP" | "USD";
    image: string | null; ebay_url: string; condition: string; condition_id?: string | null;
    seller_username?: string; seller_feedback?: string;
    categories?: string[]; shipping_label?: string | null; shipping_type?: string;
    original_price?: string | null; discount_pct?: string | null;
    buying_options?: string[]; item_location?: string | null; country?: string;
  }

  const products: SelectedEbay[] = req.body.products ?? [];
  const site        = (req.body.site as string ?? "uk") === "us" ? "us" : "uk";
  const siteId      = site === "uk" ? 3 : 0;
  const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
  const markupPct   = Math.max(0, parseFloat(String(req.body.markup   ?? 35))   || 35);
  const shippingAmt = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);
  const category    = (req.body.category    as string) || "other";
  const subcategory = (req.body.subcategory as string) || null;
  const sellerEmail = (req.body.sellerEmail as string)?.trim();

  if (!sellerEmail)     { res.status(400).json({ error: "sellerEmail required" }); return; }
  if (!products.length) { res.status(400).json({ error: "products array required" }); return; }

  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const sellerName = sellerRow?.name ?? sellerEmail.split("@")[0];
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.item_id || !p.price) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings
          WHERE seller_email = ${sellerEmail}
            AND specifications LIKE ${'%"item_id":"' + p.item_id + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const bazunkPrice = Math.round((p.price * (1 + markupPct / 100) + shippingAmt) * 100) / 100;
    const prefix      = site === "uk" ? "BZK-EBY-UK" : "BZK-EBY-US";
    const publicId    = `${prefix}-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const source      = site === "uk" ? "eBay UK" : "eBay US";
    const originalCondition = String(p.condition ?? "").trim();
    const c = originalCondition.toLowerCase();
    // Preserve eBay's useful condition detail instead of collapsing unknown values to "used".
    // This is deliberately text-based because RapidAPI returns the human eBay condition label.
    const condNorm = c.includes("new with tags") ? "new-with-tags"
      : c.includes("new without tags") ? "new-without-tags"
      : c.includes("new with defects") ? "new-with-defects"
      : c === "new" || c.startsWith("brand new") ? "new"
      : c.includes("open box") ? "open-box"
      : c.includes("certified refurbished") ? "certified-refurbished"
      : c.includes("excellent refurbished") ? "excellent-refurbished"
      : c.includes("very good refurbished") ? "very-good-refurbished"
      : c.includes("good refurbished") ? "good-refurbished"
      : c.includes("refurbished") ? "refurbished"
      : c.includes("parts") || c.includes("not working") ? "for-parts"
      : c.includes("excellent") ? "excellent"
      : c.includes("very good") ? "very-good"
      : c.includes("good") ? "good"
      : c.includes("pre-owned") || c.includes("preowned") || c.includes("used") ? "used"
      : (c || "used").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    const specs       = JSON.stringify({
      source, item_id: p.item_id, ebay_url: p.ebay_url,
      ebay_price: p.price, ebay_currency: currency, ebay_site: site,
      shipping: shippingAmt, markup_pct: markupPct,
      source_condition: originalCondition || null,
      source_condition_id: p.condition_id ?? null,
      source_item_location: p.item_location ?? null,
      source_country: p.country ?? null,
      source_shipping_label: p.shipping_label ?? null,
      source_shipping_type: p.shipping_type ?? null,
      source_seller_username: p.seller_username ?? null,
      source_seller_feedback: p.seller_feedback ?? null,
      source_original_price: p.original_price ?? null,
      source_discount_pct: p.discount_pct ?? null,
      source_buying_options: p.buying_options ?? [],
      last_source_check: new Date().toISOString(),
    });

    // Public description must describe the item, not expose Bazunk's sourcing metadata.
    // The full source details remain privately in specifications for Admin and syncing.
    const description = p.title;

    const image     = p.image ?? null;

    await db.execute(sql`
      INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
        description, condition, image, seller_email, seller_name, specifications, status, created_at, updated_at)
      VALUES (
        ${publicId}, ${p.title}, ${bazunkPrice}, ${bazunkPrice}, ${currency},
        ${category}, ${subcategory}, ${description}, ${condNorm},
        ${image}, ${sellerEmail}, ${sellerName}, ${specs}, 'active', NOW(), NOW()
      )
    `);
    inserted++;
  }

  req.log.info({ inserted, sellerEmail, site, markupPct }, "User eBay import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} product${inserted !== 1 ? "s" : ""} to your listings` });
});

export default router;

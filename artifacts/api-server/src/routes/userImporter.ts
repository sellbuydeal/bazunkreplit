import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { fetchAmazonDetails, buildAmazonDescription } from "../lib/amazon.js";

const router = Router();

// GET /api/user/search-amazon — live Amazon UK search (any signed-in user)
router.get("/user/search-amazon", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
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
    if (!resp.ok) { res.status(502).json({ error: "Amazon search unavailable" }); return; }

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
  const apiKey = process.env.RAPIDAPI_KEY;
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
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "eBay search is not configured yet" }); return; }

  const q    = (req.query.q as string)?.trim();
  const site = (req.query.site as string ?? "uk") === "us" ? "us" : "uk";
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!q) { res.status(400).json({ error: "q param required" }); return; }

  try {
    const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
    const offset        = (page - 1) * 50;
    const resp = await fetch(
      `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(q)}&marketplace_id=${marketplaceId}&offset=${offset}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
    );
    if (!resp.ok) { res.status(502).json({ error: "eBay search unavailable" }); return; }

    const data     = await resp.json() as Record<string, unknown>;
    const raw      = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
    const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
    const ebayBase = site === "uk" ? "https://www.ebay.co.uk" : "https://www.ebay.com";

    const products = raw
      .filter(p => p.legacyItemId && (p.price as Record<string, unknown>)?.value)
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
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "eBay import is not configured yet" }); return; }

  interface SelectedEbay {
    item_id: string; title: string; price: number; currency: "GBP" | "USD";
    image: string | null; ebay_url: string; condition: string;
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
    const specs       = JSON.stringify({
      source, item_id: p.item_id, ebay_url: p.ebay_url,
      ebay_price: p.price, ebay_currency: currency, ebay_site: site,
      shipping: shippingAmt, markup_pct: markupPct,
    });

    const sym      = p.currency === "GBP" ? "£" : "$";
    const descParts: string[] = [p.title, ""];

    // Condition
    if (p.condition) descParts.push(`Condition: ${p.condition}`);

    // Categories
    if (p.categories?.length) descParts.push(`Category: ${p.categories.join(" › ")}`);

    // Seller
    const sellerLine = [
      p.seller_username ? `Sold by: ${p.seller_username}` : null,
      p.seller_feedback ? `(${p.seller_feedback}% positive feedback)` : null,
    ].filter(Boolean).join(" ");
    if (sellerLine) descParts.push(sellerLine);

    // Shipping
    if (p.shipping_label) {
      const shipType = p.shipping_type === "FIXED" ? "Standard" : p.shipping_type === "FREE" ? "Free" : p.shipping_type ?? "";
      descParts.push(`Shipping: ${p.shipping_label}${shipType && shipType !== "Free" ? ` (${shipType})` : ""}`);
    }

    // Location
    if (p.item_location) descParts.push(`Item location: ${p.item_location}`);

    // Buying options
    if (p.buying_options?.length) {
      descParts.push(`Listing type: ${p.buying_options.map(o => o.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(", ")}`);
    }

    descParts.push("");

    // Original price / discount
    if (p.original_price) {
      descParts.push(`Original eBay retail price: ${sym}${p.original_price}${p.discount_pct ? ` (${p.discount_pct})` : ""}`);
    }
    descParts.push(`eBay price: ${sym}${p.price.toFixed(2)}`);
    descParts.push(`View original listing: ${p.ebay_url}`);

    while (descParts.length && descParts[descParts.length - 1] === "") descParts.pop();
    const description = descParts.join("\n");

    const image     = p.image ?? null;
    const condition = p.condition ?? "used";
    const condNorm    = ["new", "used", "refurbished", "for-parts"].includes(condition.toLowerCase())
      ? condition.toLowerCase() : "used";

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

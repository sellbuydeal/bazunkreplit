import { logger } from "./logger.js";

export interface AliExpressProduct {
  id: string;
  title: string;
  priceUsd: number;
  imageUrl: string;
  additionalImages: string[];
  description: string;
  category: string;
  rating: number;
  reviewCount: number;
  url: string;
  rawData: unknown;
}

export function extractProductId(url: string): string | null {
  const patterns = [
    /aliexpress\.com\/item\/(\d+)/,
    /aliexpress\.com\/[^/]+\/(\d+)\.html/,
    /s\.click\.aliexpress\.com.*productId=(\d+)/,
    /ae01\.alicdn\.com.*\/(\d{10,})\./,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  // If the input looks like a bare product ID
  if (/^\d{10,}$/.test(url.trim())) return url.trim();
  return null;
}

export function calculateBazunkPrice(
  supplierPriceUsd: number,
  markupType: string,
  markupValue: number,
  usdToGbpRate = 0.79,
): number {
  const priceGbp = supplierPriceUsd * usdToGbpRate;
  if (markupType === "fixed") {
    return Math.round((priceGbp + markupValue) * 100) / 100;
  }
  return Math.round(priceGbp * (1 + markupValue / 100) * 100) / 100;
}

export async function fetchAliExpressProduct(
  productId: string,
): Promise<AliExpressProduct> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  // AliExpress DataHub (aliexpress-datahub.p.rapidapi.com)
  // Try item_detail_2 first, fall back to item_detail
  const endpoints = ["item_detail_2", "item_detail"];
  let lastError = "";

  for (const endpoint of endpoints) {
    const response = await fetch(
      `https://aliexpress-datahub.p.rapidapi.com/${endpoint}?itemId=${productId}&currency=USD&locale=en_US&region=GB&country=GB`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "aliexpress-datahub.p.rapidapi.com",
        },
      },
    );

    if (!response.ok) {
      lastError = `HTTP ${response.status}`;
      continue;
    }

    const raw = await response.json() as Record<string, unknown>;
    const result = raw["result"] as Record<string, unknown> | undefined;
    const statusCode = (result?.["status"] as Record<string, unknown>)?.["code"];

    // code 200 = success, code 205 = not found, 5040 = temporarily unavailable
    if (statusCode === 200 || statusCode === "200") {
      logger.info({ productId, endpoint }, "AliExpress product fetched");
      return normaliseProductResponse(productId, raw);
    }

    const msg = JSON.stringify((result?.["status"] as Record<string, unknown>)?.["msg"] ?? "");
    if (statusCode === 205 || statusCode === "205") {
      throw new Error(`Product ${productId} not found on AliExpress`);
    }
    lastError = `DataHub error ${statusCode}: ${msg}`;
    logger.warn({ productId, endpoint, statusCode }, "DataHub endpoint failed, trying next");
  }

  throw new Error(`AliExpress DataHub unavailable: ${lastError}`);
}

function normaliseProductResponse(
  productId: string,
  raw: Record<string, unknown>,
): AliExpressProduct {
  // Handle "Real-Time AliExpress Data" API shape
  const rawResult = raw["result"] as Record<string, unknown> | undefined;
  const item = (raw["item"] ?? rawResult?.["item"] ?? raw["data"] ?? raw) as Record<string, unknown>;

  const title =
    (item["title"] as string) ??
    (item["subject"] as string) ??
    "Unknown product";

  // Try to extract price from various shapes
  let priceUsd = 0;
  const priceObj = item["sku_info"] ?? item["prices"] ?? item["price"];
  if (typeof item["salePrice"] === "string") {
    priceUsd = parseFloat((item["salePrice"] as string).replace(/[^0-9.]/g, "")) || 0;
  } else if (priceObj && typeof priceObj === "object") {
    const p = priceObj as Record<string, unknown>;
    const raw =
      p["salePrice"] ??
      p["sale_price"] ??
      p["promotionPrice"] ??
      p["price"] ??
      p["minAmount"];
    if (typeof raw === "string") priceUsd = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
    if (typeof raw === "number") priceUsd = raw;
    // Nested "formattedPrice" like {salePrice: {formattedPrice: "US $1.99"}}
    if (typeof raw === "object" && raw !== null) {
      const rr = raw as Record<string, unknown>;
      const fp = rr["formattedPrice"] ?? rr["value"] ?? rr["minPrice"];
      if (typeof fp === "string") priceUsd = parseFloat(fp.replace(/[^0-9.]/g, "")) || 0;
      if (typeof fp === "number") priceUsd = fp;
    }
  }

  // Images
  const imageModule = item["imageModule"] as Record<string, unknown> | undefined;
  const multiImage = item["multi_image"] as Record<string, unknown> | undefined;
  const imgList: string[] =
    (item["images"] as string[] | undefined) ??
    (imageModule?.["imagePathList"] as string[] | undefined) ??
    (multiImage?.["image_list"] as string[] | undefined) ??
    [];
  const imageUrl = typeof imgList[0] === "string" ? imgList[0] : "";
  const additionalImages = imgList.slice(1, 5).filter((x) => typeof x === "string");

  // Category
  const crumbs =
    (item["breadcrumbPathLinks"] as { name: string }[]) ??
    (item["categories"] as { name: string }[]) ??
    [];
  const category =
    crumbs.length > 0
      ? crumbs[crumbs.length - 1]?.name?.toLowerCase() ?? "other"
      : "other";

  // Rating
  const feedback = item["feedbackModule"] ?? item["rating"] ?? {};
  const feedbackObj = feedback as Record<string, unknown>;
  const rating = (feedbackObj["trialScore"] as number) ?? (feedbackObj["averageStar"] as number) ?? 0;
  const reviewCount = (feedbackObj["evaCount"] as number) ?? (feedbackObj["reviewCount"] as number) ?? 0;

  const descModule = item["descriptionModule"] as Record<string, unknown> | undefined;
  const description =
    (descModule?.["description"] as string | undefined) ??
    (item["description"] as string | undefined) ??
    "";

  return {
    id: productId,
    title,
    priceUsd,
    imageUrl,
    additionalImages,
    description,
    category: mapCategory(category),
    rating,
    reviewCount,
    url: `https://www.aliexpress.com/item/${productId}.html`,
    rawData: raw,
  };
}

function mapCategory(aliCategory: string): string {
  const lower = aliCategory.toLowerCase();
  if (lower.includes("phone") || lower.includes("electronics") || lower.includes("computer")) return "electronics";
  if (lower.includes("cloth") || lower.includes("fashion") || lower.includes("apparel") || lower.includes("dress") || lower.includes("shirt")) return "fashion";
  if (lower.includes("home") || lower.includes("garden") || lower.includes("kitchen") || lower.includes("furniture")) return "home";
  if (lower.includes("toy") || lower.includes("game") || lower.includes("gaming")) return "gaming";
  if (lower.includes("sport") || lower.includes("outdoor") || lower.includes("fitness")) return "sports";
  if (lower.includes("beauty") || lower.includes("health") || lower.includes("hair")) return "beauty";
  if (lower.includes("book") || lower.includes("education")) return "books";
  if (lower.includes("car") || lower.includes("auto") || lower.includes("vehicle")) return "automotive";
  return "other";
}

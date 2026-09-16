export interface AmazonProductDetails {
  title: string;
  about_product: string[];
  product_description: string | null;
  price_gbp: number;
  image: string | null;
  amazon_url: string;
}

/**
 * Call the RapidAPI product-details endpoint for one ASIN.
 * Returns null if the call fails or returns no usable data.
 */
export async function fetchAmazonDetails(
  asin: string,
  apiKey: string,
): Promise<AmazonProductDetails | null> {
  try {
    const resp = await fetch(
      `https://real-time-amazon-data.p.rapidapi.com/product-details?asin=${encodeURIComponent(asin)}&country=GB`,
      {
        headers: {
          "X-RapidAPI-Key":  apiKey,
          "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com",
        },
      },
    );
    if (!resp.ok) return null;

    const json  = await resp.json() as Record<string, unknown>;
    const data  = (json?.data ?? {}) as Record<string, unknown>;
    const title = String(data.product_title ?? "").trim();
    if (!title) return null;

    const bullets: string[] = Array.isArray(data.about_product)
      ? (data.about_product as unknown[]).map(b => String(b).trim()).filter(Boolean)
      : [];

    const rawDesc  = data.product_description;
    const descText = rawDesc && typeof rawDesc === "string" && rawDesc.trim() ? rawDesc.trim() : null;

    const priceStr = String(data.product_price ?? "").replace(/[^0-9.]/g, "");
    const price    = parseFloat(priceStr) || 0;

    const image = typeof data.product_photo === "string" ? data.product_photo : null;
    const url   = typeof data.product_url  === "string"
      ? data.product_url
      : `https://www.amazon.co.uk/dp/${asin}`;

    return { title, about_product: bullets, product_description: descText, price_gbp: price, image, amazon_url: url };
  } catch {
    return null;
  }
}

/**
 * Compose a rich listing description from product-details fields.
 * Falls back gracefully if bullets/description are missing.
 */
export function buildAmazonDescription(
  details: Pick<AmazonProductDetails, "title" | "about_product" | "product_description" | "amazon_url">,
  _amazonPriceGbp: number,
): string {
  // Strip any "See more" / "see more" fragments Amazon sometimes appends to bullets
  const cleanBullet = (s: string) => s.replace(/\s*[Ss]ee\s+more\.?$/, "").trim();

  const parts: string[] = [details.title, ""];

  if (details.about_product.length > 0) {
    parts.push("About this item:");
    for (const b of details.about_product) {
      const cleaned = cleanBullet(b);
      if (cleaned) parts.push(`• ${cleaned}`);
    }
    parts.push("");
  }

  if (details.product_description) {
    const cleaned = details.product_description.replace(/\s*[Ss]ee\s+more\.?$/, "").trim();
    if (cleaned) parts.push(cleaned, "");
  }

  // Remove trailing blank lines
  while (parts.length && parts[parts.length - 1] === "") parts.pop();

  return parts.join("\n");
}

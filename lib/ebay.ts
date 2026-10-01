export interface EbayProductDetails {
  title: string;
  about_item: string[];
  description: string | null;
  price: number;
  currency: "GBP" | "USD";
  image: string | null;
  ebay_url: string;
  condition: string | null;
}

/**
 * fetchEbayDetails: The subscribed API (mahmudulhasandev/real-time-ebay-data)
 * does not expose an item-details endpoint — only /ebay_search is available.
 * This function always returns null; import routes build descriptions from
 * search-result data instead.
 */
export async function fetchEbayDetails(
  _itemId: string,
  _siteId: number,
  _apiKey: string,
): Promise<EbayProductDetails | null> {
  return null;
}

export function buildEbayDescription(
  details: Pick<EbayProductDetails, "title" | "about_item" | "description" | "ebay_url" | "price" | "currency">,
): string {
  const symbol = details.currency === "GBP" ? "£" : "$";
  const parts: string[] = [details.title, ""];

  if (details.about_item.length > 0) {
    parts.push("About this item:");
    for (const b of details.about_item) {
      if (b) parts.push(`• ${b}`);
    }
    parts.push("");
  }

  if (details.description) {
    const cleaned = details.description.trim();
    if (cleaned) parts.push(cleaned, "");
  }

  parts.push(`Original eBay price: ${symbol}${details.price.toFixed(2)}`);
  parts.push(`View on eBay: ${details.ebay_url}`);

  while (parts.length && parts[parts.length - 1] === "") parts.pop();
  return parts.join("\n");
}

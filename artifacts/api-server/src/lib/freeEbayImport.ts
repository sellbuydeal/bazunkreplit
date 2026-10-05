export function validateOwnEbayItems(value: unknown) {
  if (!Array.isArray(value) || !value.length || value.length > 50) throw new Error("Send between 1 and 50 listings per batch.");
  return value.map((p: any) => {
    if (!p || !/^\d{6,20}$/.test(String(p.itemId)) || typeof p.title !== "string" || !p.title.trim() || p.title.length > 500 || !Number.isFinite(p.price) || p.price <= 0 || p.price > 1000000 || !Number.isInteger(p.quantity) || p.quantity < 1 || p.quantity > 1000000 || !["GBP","USD","EUR"].includes(p.currency)) throw new Error("Invalid listing: check item number, title, price, quantity and currency.");
    const image = String(p.image ?? "").trim();
    if(image) { const url = new URL(image); if(url.protocol !== "https:" || !/(^|\.)ebayimg\.com$/.test(url.hostname) || url.username || url.password) throw new Error("Images must use an HTTPS ebayimg.com URL, or leave the image blank."); }
    const condition = String(p.condition ?? "used").toLowerCase();
    return { itemId: String(p.itemId), title: p.title.trim(), price: p.price, quantity: p.quantity, currency: p.currency as string, description: String(p.description ?? "").slice(0,20000), image: image || null, condition: ["new","used","new-with-tags","new-without-tags","open-box","refurbished","for-parts","like-new","excellent","very-good","good","fair"].includes(condition) ? condition : condition.includes("new") && !condition.includes("pre") ? "new" : "used" };
  });
}

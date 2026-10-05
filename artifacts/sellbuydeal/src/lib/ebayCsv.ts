export interface EbayOwnItem { itemId: string; title: string; price: number; currency: string; quantity: number; description: string; image: string; condition: string }
export function parseEbayCsv(text: string): EbayOwnItem[] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else if (!cell || quoted) quoted = !quoted; else cell += c; }
    else if (c === ',' && !quoted) { row.push(cell); cell = ""; }
    else if ((c === '\n' || c === '\r') && !quoted) { row.push(cell); if (row.some(v => v.trim())) rows.push(row); row = []; cell = ""; if(c === '\r' && text[i+1] === '\n') i++; }
    else cell += c;
  }
  if (quoted) throw new Error("The CSV has an unfinished quoted field.");
  row.push(cell); if (row.some(v => v.trim())) rows.push(row);
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
  const headerIndex = rows.findIndex(r => r.some(v => ["itemid","itemnumber"].includes(norm(v))) && r.some(v => ["title","itemtitle"].includes(norm(v))));
  if (headerIndex < 0) throw new Error("CSV needs Item number, Title and Current price columns. Download the template for the supported format.");
  const headers = rows[headerIndex].map(norm);
  const col = (...names: string[]) => headers.findIndex(h => names.includes(h));
  const indices = { id: col("itemid","itemnumber"), title: col("title","itemtitle"), price: col("price","currentprice","startprice","buyitnowprice"), quantity: col("quantity","availablequantity","quantityavailable"), currency: col("currency","currencycode"), description: col("description","itemdescription"), image: col("image","imageurl","pictureurl","picurl"), condition: col("condition","conditionname") };
  if (indices.price < 0) throw new Error("CSV needs a Price or Current price column.");
  const items = rows.slice(headerIndex + 1).map((r,i) => {
    const get = (n: number) => n < 0 ? "" : (r[n] ?? "").trim();
    const item: EbayOwnItem = { itemId: get(indices.id), title: get(indices.title), price: Number(get(indices.price).replace(/[£$€,\s]/g,"")), currency: get(indices.currency).toUpperCase() || "GBP", quantity: indices.quantity < 0 || !get(indices.quantity) ? 1 : Number(get(indices.quantity)), description: get(indices.description), image: get(indices.image), condition: get(indices.condition) || "used" };
    if (!/^\d{6,20}$/.test(item.itemId) || !item.title || !Number.isFinite(item.price) || item.price <= 0 || !Number.isInteger(item.quantity) || item.quantity < 1 || !["GBP","USD","EUR"].includes(item.currency)) throw new Error(`CSV row ${headerIndex+i+2}: check item number, title, positive price, available quantity and GBP/USD/EUR currency. Remove sold-out rows before importing.`);
    return item;
  });
  if (!items.length) throw new Error("The CSV has no listings to import.");
  if (items.length > 5000) throw new Error("Split this file into files of up to 5,000 rows. There is no monthly import limit.");
  return items;
}

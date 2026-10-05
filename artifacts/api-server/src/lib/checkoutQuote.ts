import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { convertAmount } from "../fxRates.js";
import { calculateFees, minor, percentage, type FeeItem } from "./marketplaceFees.js";
import { randomUUID } from "crypto";
export class QuoteError extends Error { constructor(message: string, public status = 400) { super(message); } }
export type CheckoutQuote = ReturnType<typeof calculateFees>;
export async function ensureFeeSchema() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS checkout_fee_snapshots (id TEXT PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`);
}
export async function quoteCart(input: unknown): Promise<CheckoutQuote> {
  if (!Array.isArray(input) || !input.length || input.length > 100) throw new QuoteError("Cart must contain 1–100 listings.");
  const counts = new Map<number,number>();
  for (const raw of input) {
    const id=Number(raw?.id), quantity=Number(raw?.quantity);
    if (!Number.isInteger(id) || id<=0 || !Number.isInteger(quantity) || quantity<1 || quantity>50) throw new QuoteError("Invalid listing or quantity.");
    const qty=(counts.get(id)??0)+quantity;
    if(qty>50) throw new QuoteError("Maximum 50 units per listing.");
    counts.set(id,qty);
  }
  const ids=[...counts.keys()];
  const rows=(await db.execute(sql`SELECT l.id,l.title,l.image,l.price,l.price_gbp,l.currency,l.category,l.status,l.seller_email,COALESCE(u.seller_type,'private') seller_type
    FROM listings l LEFT JOIN users u ON LOWER(u.email)=LOWER(l.seller_email)
    WHERE l.id IN (${sql.join(ids.map(id=>sql`${id}`),sql`, `)})`)).rows as Array<Record<string,unknown>>;
  const byId=new Map(rows.map(r=>[Number(r.id),r]));
  const settings=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'fee_rate_%' OR key LIKE 'buyer_protection_%'`)).rows as Array<Record<string,unknown>>;
  const fees=Object.fromEntries(settings.map(r=>[String(r.key),String(r.value)]));
  const items:FeeItem[]=[];
  for(const id of ids) {
    const row=byId.get(id);
    if(!row || row.status!=="active" || !row.seller_email) throw new QuoteError("An item is no longer available. Please update your cart.",409);
    const currency=String(row.currency??"GBP").toUpperCase();
    const priceGbp=row.price_gbp!=null ? Number(row.price_gbp) : currency==="GBP" ? Number(row.price) : await convertAmount(Number(row.price),currency,"GBP");
    const priceMinor=minor(priceGbp);
    if(priceMinor<=0) throw new QuoteError("Items must have a positive price.");
    const category=String(row.category??"").toLowerCase();
    const sellerType=String(row.seller_type??"private").toLowerCase();
    if(!["private","business","sole_trader"].includes(sellerType)) throw new QuoteError("Seller account type needs to be checked before checkout.",409);
    items.push({id,quantity:counts.get(id)!,priceMinor,sellerType,businessRate:percentage(fees[`fee_rate_${category}`],percentage(fees.fee_rate_default,8)),title:String(row.title),image:row.image ? String(row.image):null,sellerEmail:String(row.seller_email),category});
  }
  const subtotal=items.reduce((sum,item)=>sum+item.priceMinor*item.quantity,0);
  const fixed=fees.buyer_protection_fixed_gbp==null ? 70 : minor(fees.buyer_protection_fixed_gbp);
  return calculateFees(items,percentage(fees.buyer_protection_percent,5),fixed,subtotal>=5000?0:399);
}
export async function saveFeeSnapshot(quote:CheckoutQuote) {
  await ensureFeeSchema(); const id=randomUUID();
  await db.execute(sql`INSERT INTO checkout_fee_snapshots(id,payload) VALUES(${id},${JSON.stringify(quote)}::jsonb)`);return id;
}
export async function getFeeSnapshot(id:string):Promise<CheckoutQuote> {
  const row=(await db.execute(sql`SELECT payload FROM checkout_fee_snapshots WHERE id=${id}`)).rows[0] as {payload?:CheckoutQuote}|undefined;
  if(!row?.payload) throw new Error("Checkout fee snapshot is missing");return row.payload;
}

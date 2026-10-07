import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

export const FEATURE_DEFINITIONS = [
  ["quick_sell","Direct Sale","Selling"],["offers","Make an Offer","Selling"],["auctions","Auctions","Selling"],["flash_sales","Flash Sales","Selling"],["classifieds","Classifieds","Selling"],["live","Live selling","Selling"],["product_video","Product Video","Selling"],
  ["importers","Importers","Tools"],["promotions","Promotions","Tools"],["watchers","Watch / Watcher offers","Tools"],["messaging","Messaging","Community"],["reviews","Reviews & reputation","Community"],["referrals","Referrals","Rewards"],["games","Rewards Arcade / Games","Rewards"],["credits","Credits","Rewards"],["cashback","Cashback","Rewards"],
  ["bundles","Bundles","Buying"],["buyer_protection","Buyer Protection","Buying"],["disputes_returns","Disputes & Returns","Buying"],["verification","Seller verification","Trust"]
] as const;

export async function featureEnabled(key:string):Promise<boolean>{
  try {
    const r=await db.execute(sql`SELECT value FROM site_settings WHERE key=${`feature_${key}`} LIMIT 1`);
    const v=(r.rows[0] as any)?.value;
    return v == null ? true : String(v).toLowerCase() !== "false";
  } catch { return true; }
}

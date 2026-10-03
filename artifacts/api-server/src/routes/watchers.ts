import { Router, type Request, type Response } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();
async function authEmail(req: Request) {
  const a = getAuth(req); if (!a.isAuthenticated || !a.userId) return null;
  const u = await clerkClient.users.getUser(a.userId);
  return u.primaryEmailAddress?.emailAddress?.trim().toLowerCase() ?? null;
}

router.get("/watchers/mine", async (req: Request, res: Response) => {
  const email = await authEmail(req); if (!email) return res.status(401).json({error:"Sign in required"});
  const r = await db.execute(sql`SELECT listing_id FROM listing_watchers WHERE LOWER(buyer_email)=LOWER(${email})`);
  res.json({ listingIds: (r.rows as any[]).map(x => Number(x.listing_id)) });
});

router.post("/listings/:id/watch", async (req: Request, res: Response) => {
  const email = await authEmail(req); if (!email) return res.status(401).json({error:"Sign in to watch items"});
  const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({error:"Invalid listing"});
  const lr = await db.execute(sql`SELECT seller_email FROM listings WHERE id=${id} LIMIT 1`); const l=(lr.rows[0] as any);
  if (!l) return res.status(404).json({error:"Listing not found"});
  if (String(l.seller_email).toLowerCase()===email) return res.status(400).json({error:"You cannot watch your own listing"});
  await db.execute(sql`INSERT INTO listing_watchers(listing_id,buyer_email) VALUES(${id},${email}) ON CONFLICT DO NOTHING`);
  const c=await db.execute(sql`SELECT COUNT(*)::int count FROM listing_watchers WHERE listing_id=${id}`); const count=Number((c.rows[0] as any)?.count||0);
  await db.execute(sql`UPDATE listings SET watchers=${count} WHERE id=${id}`);
  res.json({watched:true,count});
});

router.delete("/listings/:id/watch", async (req: Request, res: Response) => {
  const email = await authEmail(req); if (!email) return res.status(401).json({error:"Sign in required"});
  const id=Number(req.params.id); await db.execute(sql`DELETE FROM listing_watchers WHERE listing_id=${id} AND LOWER(buyer_email)=LOWER(${email})`);
  const c=await db.execute(sql`SELECT COUNT(*)::int count FROM listing_watchers WHERE listing_id=${id}`); const count=Number((c.rows[0] as any)?.count||0);
  await db.execute(sql`UPDATE listings SET watchers=${count} WHERE id=${id}`); res.json({watched:false,count});
});

router.post("/listings/:id/watcher-offer", async (req: Request, res: Response) => {
  const email=await authEmail(req); if(!email) return res.status(401).json({error:"Sign in required"});
  const id=Number(req.params.id); const percent=Math.round(Number(req.body?.percent)); const hours=Math.round(Number(req.body?.hours ?? 24));
  if(!Number.isFinite(percent)||percent<1||percent>80) return res.status(400).json({error:"Discount must be 1–80%"});
  if(!Number.isFinite(hours)||hours<1||hours>168) return res.status(400).json({error:"Duration must be 1–168 hours"});
  const lr=await db.execute(sql`SELECT id,title,price,seller_email,public_id FROM listings WHERE id=${id} LIMIT 1`); const l=lr.rows[0] as any;
  if(!l) return res.status(404).json({error:"Listing not found"}); if(String(l.seller_email).toLowerCase()!==email) return res.status(403).json({error:"This is not your listing"});
  const wr=await db.execute(sql`SELECT buyer_email FROM listing_watchers WHERE listing_id=${id}`); if(!wr.rows.length) return res.status(400).json({error:"This item has no watchers yet"});
  const price=Number(l.price); const offerPrice=Math.round(price*(1-percent/100)*100)/100;
  const or=await db.execute(sql`INSERT INTO watcher_offers(listing_id,seller_email,discount_percent,original_price,offer_price,expires_at) VALUES(${id},${email},${percent},${price},${offerPrice},NOW()+(${hours}::text||' hours')::interval) RETURNING id,expires_at`);
  const offer=or.rows[0] as any;
  await Promise.all((wr.rows as any[]).map(w=>sendSystemMessage(String(w.buyer_email),{category:"Watcher offer",subject:`${percent}% off an item you're watching`,body:`The seller has sent watchers ${percent}% off “${l.title}”. Offer price: £${offerPrice.toFixed(2)}. Valid for ${hours} hours. Open the listing to buy: /listing/${l.public_id || l.id}`})));
  res.json({ok:true,sent:wr.rows.length,offerPrice,expiresAt:offer.expires_at});
});

router.get("/listings/:id/watcher-offer", async (req:Request,res:Response)=>{
  const email=await authEmail(req); if(!email) return res.json({offer:null}); const id=Number(req.params.id);
  const w=await db.execute(sql`SELECT 1 FROM listing_watchers WHERE listing_id=${id} AND LOWER(buyer_email)=LOWER(${email}) LIMIT 1`); if(!w.rows.length) return res.json({offer:null});
  const r=await db.execute(sql`SELECT discount_percent,original_price,offer_price,expires_at FROM watcher_offers WHERE listing_id=${id} AND expires_at>NOW() ORDER BY created_at DESC LIMIT 1`);
  res.json({offer:r.rows[0]||null});
});
export default router;

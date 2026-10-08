import { randomUUID } from "crypto";
import { Router } from "express";
import { getAuth, clerkClient } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";

const router=Router();
const BASE="https://api.goshippo.com";
async function shippo(path:string,body:any){
 const token=process.env.SHIPPO_API_TOKEN;
 if(!token) throw new Error("Shippo not configured");
 const r=await fetch(BASE+path,{method:"POST",headers:{"Authorization":"ShippoToken "+token,"Content-Type":"application/json"},body:JSON.stringify(body)});
 const data:any=await r.json().catch(()=>({}));
 if(!r.ok) throw new Error("Shippo request failed: "+r.status);
 return data;
}
async function email(req:any){
 const {isAuthenticated,userId}=getAuth(req);
 if(!isAuthenticated||!userId)return null;
 const user=await clerkClient.users.getUser(userId);
 return user.primaryEmailAddress?.emailAddress?.trim().toLowerCase()||null;
}
async function table(){
 await db.execute(sql`CREATE TABLE IF NOT EXISTS shippo_label_orders(
  id TEXT PRIMARY KEY, order_id TEXT NOT NULL, seller_email TEXT NOT NULL,
  shipment_id TEXT NOT NULL, rate_id TEXT NOT NULL, amount_pence INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP', stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'quoted', shippo_transaction_id TEXT,
  label_url TEXT, tracking_number TEXT, carrier TEXT, error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`);
}
const address=(a:any)=>({
 name:String(a?.name||"").trim(),street1:String(a?.street1||"").trim(),
 street2:String(a?.street2||"").trim(),city:String(a?.city||"").trim(),
 state:String(a?.state||"").trim(),zip:String(a?.zip||"").trim(),
 country:String(a?.country||"GB").trim().toUpperCase(),
 phone:String(a?.phone||"").trim(),email:String(a?.email||"").trim()
});
function valid(a:any){return a.name&&a.street1&&a.city&&a.zip&&/^[A-Z]{2}$/.test(a.country);}
router.post("/orders/:id/postage/quote",async(req,res)=>{
 if(process.env.SHIPPO_LABEL_PURCHASES_ENABLED!=="true"){res.status(503).json({error:"Postage labels are not yet enabled"});return;}
 try{
  const seller=await email(req);if(!seller){res.status(401).json({error:"Sign in required"});return;}
  const order=(await db.execute(sql`SELECT id,seller_email,status FROM orders WHERE id=${req.params.id}`)).rows[0] as any;
  if(!order||String(order.seller_email).toLowerCase()!==seller){res.status(404).json({error:"Order not found"});return;}
  if(!["confirmed","preparing"].includes(order.status)){res.status(409).json({error:"Order is not awaiting dispatch"});return;}
  const from=address(req.body?.from),to=address(req.body?.to);
  const p=req.body?.parcel||{};
  const parcel={length:Number(p.length),width:Number(p.width),height:Number(p.height),distance_unit:"cm",weight:Number(p.weight),mass_unit:"g"};
  if(!valid(from)||!valid(to)||!Object.values(parcel).slice(0,3).every(v=>typeof v==="number"&&Number.isFinite(v)&&v>0)||!Number.isFinite(parcel.weight)||parcel.weight<=0){res.status(400).json({error:"Enter complete sender/recipient addresses and positive parcel dimensions and weight"});return;}
  const shipment=await shippo("/shipments/",{address_from:from,address_to:to,parcels:[parcel],async:false});
  const rates=(shipment.rates||[]).filter((r:any)=>r.currency==="GBP"&&Number(r.amount)>0).map((r:any)=>({id:r.object_id,provider:r.provider,service:r.servicelevel?.name||"",amount:r.amount,currency:r.currency,days:r.estimated_days}));
  res.json({shipmentId:shipment.object_id,rates});
 }catch(err){logger.error({err},"Postage quote failed");res.status(502).json({error:"Could not retrieve postage rates. Check addresses and try again."});}
});
router.post("/orders/:id/postage/checkout",async(req,res)=>{
 if(process.env.SHIPPO_LABEL_PURCHASES_ENABLED!=="true"){res.status(503).json({error:"Postage labels are not yet enabled"});return;}
 try{
  const seller=await email(req);if(!seller){res.status(401).json({error:"Sign in required"});return;}
  const order=(await db.execute(sql`SELECT id,seller_email,status FROM orders WHERE id=${req.params.id}`)).rows[0] as any;
  if(!order||String(order.seller_email).toLowerCase()!==seller){res.status(404).json({error:"Order not found"});return;}
  if(!["confirmed","preparing"].includes(order.status)){res.status(409).json({error:"Order is not awaiting dispatch"});return;}
  const shipmentId=String(req.body?.shipmentId||""),rateId=String(req.body?.rateId||"");
  if(!/^[a-f0-9-]{36}$/i.test(shipmentId)||!/^[a-f0-9-]{36}$/i.test(rateId)){res.status(400).json({error:"Invalid postage quote"});return;}
  // Re-fetch the selected rate server-side: never trust a client-supplied price.
  const token=process.env.SHIPPO_API_TOKEN;if(!token){res.status(503).json({error:"Postage unavailable"});return;}
  const r=await fetch(BASE+"/rates/"+encodeURIComponent(rateId),{headers:{Authorization:"ShippoToken "+token}});
  const rate:any=await r.json().catch(()=>({}));
  if(!r.ok||(typeof rate.shipment==="string"?rate.shipment:rate.shipment?.object_id)!==shipmentId||rate.currency!=="GBP"){res.status(400).json({error:"Quote expired or invalid. Request new rates."});return;}
  const amount=Math.round(Number(rate.amount)*100);
  if(!Number.isSafeInteger(amount)||amount<50||amount>100000){res.status(400).json({error:"Invalid postage amount"});return;}
  await table();
  const id=randomUUID();
  await db.execute(sql`INSERT INTO shippo_label_orders(id,order_id,seller_email,shipment_id,rate_id,amount_pence,status)
   VALUES(${id},${order.id},${seller},${shipmentId},${rateId},${amount},'quoted')`);
  const stripe=await getUncachableStripeClient();
  const origin="https://bazunk.com";
  const session=await stripe.checkout.sessions.create({
   mode:"payment",customer_email:seller,
   line_items:[{price_data:{currency:"gbp",unit_amount:amount,product_data:{name:"Postage label for order "+order.id}},quantity:1}],
   success_url:origin+"/dashboard?postage=success",cancel_url:origin+"/dashboard?postage=cancel",
   metadata:{type:"shippo_postage",labelOrderId:id}
  },{idempotencyKey:"postage-checkout-"+id});
  await db.execute(sql`UPDATE shippo_label_orders SET stripe_session_id=${session.id},status='checkout',updated_at=NOW() WHERE id=${id}`);
  res.json({url:session.url});
 }catch(err){logger.error({err},"Postage checkout failed");res.status(500).json({error:"Unable to start postage payment"});}
});
export async function fulfillPostage(sessionId:string){
 await table();
 const stripe=await getUncachableStripeClient();
 const session=await stripe.checkout.sessions.retrieve(sessionId);
 if(session.payment_status!=="paid"||session.metadata?.type!=="shippo_postage")return;
 const id=session.metadata.labelOrderId;
 const claim=await db.execute(sql`UPDATE shippo_label_orders SET status='purchasing',updated_at=NOW()
 WHERE id=${id} AND stripe_session_id=${sessionId} AND status='checkout' AND amount_pence=${session.amount_total??-1} AND currency='GBP'
 RETURNING *`);
 const row=claim.rows[0] as any;if(!row)return;
 try{
  // Shippo transaction metadata and local claim prevent normal duplicate webhook purchases.
  const result=await shippo("/transactions/",{rate:row.rate_id,label_file_type:"PDF",async:false,metadata:"Bazunk postage "+row.id});
  if(result.status!=="SUCCESS"||!result.label_url||!result.tracking_number)throw new Error("Shippo label was not created successfully");
  await db.execute(sql`UPDATE shippo_label_orders SET status='purchased',shippo_transaction_id=${result.object_id},
   label_url=${result.label_url},tracking_number=${result.tracking_number},carrier=${result.rate?.provider||null},updated_at=NOW() WHERE id=${id}`);
  // Never automatically dispatch without a verified purchased label.
  await db.execute(sql`UPDATE orders SET tracking_number=${result.tracking_number},carrier=${result.rate?.provider||"Shippo"},
    status='shipped',shipped_at=COALESCE(shipped_at,NOW()),updated_at=NOW()
    WHERE id=${row.order_id} AND LOWER(seller_email)=LOWER(${row.seller_email}) AND status IN ('confirmed','preparing')`);
 }catch(err){
  logger.error({err,labelOrderId:id},"Paid postage needs reconciliation");
  await db.execute(sql`UPDATE shippo_label_orders SET status='needs_review',error='Label purchase failed or result uncertain; review before retry/refund',updated_at=NOW() WHERE id=${id}`);
 }
}
router.get("/orders/:id/postage",async(req,res)=>{
 const seller=await email(req);if(!seller){res.status(401).json({error:"Sign in required"});return;}
 await table();
 const rows=await db.execute(sql`SELECT id,status,label_url,tracking_number,carrier,amount_pence,created_at FROM shippo_label_orders
 WHERE order_id=${req.params.id} AND LOWER(seller_email)=LOWER(${seller}) ORDER BY created_at DESC LIMIT 10`);
 res.json(rows.rows);
});
export default router;

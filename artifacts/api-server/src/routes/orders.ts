import { refundOrder, releaseOrderPayout } from "../lib/orderSettlement.js";
import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID, timingSafeEqual } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { recordAdminAudit } from "../lib/adminAudit.js";
import { getTracking, mapShippoStatus, shippoEnabled, shippoCarrier } from "../lib/shippo.js";

const router = Router();
const VALID_STATUSES = ["pending", "confirmed", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];
async function signedInEmail(req:any){const {isAuthenticated,userId}=getAuth(req);if(!isAuthenticated||!userId)return null;const u=await clerkClient.users.getUser(userId);return u.primaryEmailAddress?.emailAddress?.trim().toLowerCase()??null;}

async function ensureEvents() {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS order_admin_events (
    id TEXT PRIMARY KEY, order_id TEXT NOT NULL, event_type TEXT NOT NULL, title TEXT NOT NULL,
    detail TEXT, admin_email TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  )`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_order_admin_events_order ON order_admin_events(order_id, created_at DESC)`);
}
async function event(orderId:string, type:string, title:string, detail?:string|null, admin?:string|null) {
  await ensureEvents();
  await db.execute(sql`INSERT INTO order_admin_events(id,order_id,event_type,title,detail,admin_email,created_at)
    VALUES(${randomUUID()},${orderId},${type},${title},${detail??null},${admin??null},NOW())`);
}

// Shippo sends track_updated events to this endpoint. A separate random secret in
// the webhook URL prevents unauthenticated parties from changing order status.
// Configure SHIPPO_WEBHOOK_SECRET in Render and use the same value in Shippo's URL.
router.post("/webhooks/shippo/tracking", async (req, res) => {
  const secret = process.env.SHIPPO_WEBHOOK_SECRET?.trim();
  const supplied = typeof req.query.key === "string" ? req.query.key : "";
  if (!secret || secret.length < 32) { res.status(503).json({error:"Shippo webhook not configured"}); return; }
  const a = Buffer.from(secret), b = Buffer.from(supplied);
  if (a.length !== b.length || !timingSafeEqual(a,b)) { res.status(401).json({error:"Unauthorized"}); return; }
  const payload:any = req.body;
  if (payload?.event !== "track_updated") { res.json({ok:true,ignored:true}); return; }
  const track:any = payload?.data;
  const number = String(track?.tracking_number || "").trim();
  const carrier = String(track?.carrier || "").trim();
  const latest = track?.tracking_status;
  if (!number || !carrier || !latest || typeof latest.status !== "string") {
    res.status(400).json({error:"Invalid tracking event"}); return;
  }
  const status = String(latest.status).toUpperCase();
  const substatus = String(latest?.substatus?.code || latest?.substatus || "").toLowerCase();
  const outForDelivery = status === "TRANSIT" && ["out_for_delivery","out-for-delivery"].includes(substatus);
  if (!["UNKNOWN","PRE_TRANSIT","TRANSIT","DELIVERED","RETURNED","FAILURE"].includes(status)) {
    res.status(400).json({error:"Unsupported tracking status"}); return;
  }
  try {
    const matches = (await db.execute(sql`SELECT id, status, carrier, tracking_number, tracking_status, tracking_history
      FROM orders WHERE tracking_number=${number} AND status NOT IN ('cancelled','refunded')`)).rows as any[];
    let updated = 0;
    for (const order of matches) {
      if (shippoCarrier(String(order.carrier),number) !== shippoCarrier(carrier,number)) continue;
      const previous = String(order.tracking_status || "").toUpperCase();
      // Never regress a delivered order because of delayed or duplicated webhooks.
      if (String(order.status)==="delivered" && status!=="DELIVERED") continue;
      const next = status==="DELIVERED" ? "delivered"
        : outForDelivery && String(order.status)!=="delivered" ? "out_for_delivery"
        : status==="TRANSIT" && !["delivered","out_for_delivery"].includes(String(order.status)) ? "shipped"
        : String(order.status);
      const history = Array.isArray(track.tracking_history) ? track.tracking_history.slice(-100) : [];
      const detail = String(latest.status_details || "").slice(0,1000);
      await db.execute(sql`UPDATE orders SET status=${next},tracking_status=${status},
        tracking_eta=${track.eta??null},tracking_last_event=${detail},
        tracking_updated_at=NOW(),tracking_history=${JSON.stringify(history)}::jsonb,
        estimated_delivery=COALESCE(${track.eta??null},estimated_delivery),
        delivered_at=CASE WHEN ${next}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
        updated_at=NOW() WHERE id=${order.id}`);
      if (previous !== status) await event(String(order.id),"tracking",
        status==="DELIVERED" ? "Shippo confirmed delivery" :
        outForDelivery ? "Shippo: out for delivery" :
        ["RETURNED","FAILURE"].includes(status) ? "Shippo delivery exception" : "Shippo tracking updated",
        [outForDelivery ? "OUT_FOR_DELIVERY" : status,detail].filter(Boolean).join(" · "));
      updated++;
    }
    res.json({ok:true,updated});
  } catch (err) {
    res.status(500).json({error:"Tracking update failed"});
  }
});

router.post("/orders", requireAdmin, async (req, res) => {
  const { buyerEmail, sellerEmail, itemTitle, itemImage, price, address, notes } = req.body as Record<string, string>;
  if (!buyerEmail || !itemTitle || !price) { res.status(400).json({ error: "buyerEmail, itemTitle, and price are required" }); return; }
  const id = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`INSERT INTO orders (id,buyer_email,seller_email,item_title,item_image,price,status,address,notes,created_at,updated_at)
    VALUES (${id},${buyerEmail},${sellerEmail??null},${itemTitle},${itemImage??null},${parseFloat(price)},'pending',${address??null},${notes??null},NOW(),NOW())`);
  res.status(201).json({ id });
});
router.get("/orders", async (req,res)=>{ const email=await signedInEmail(req); if(!email){res.status(401).json({error:"Please sign in to view your orders"});return;} const rows=await db.execute(sql`SELECT o.*,(SELECT r.rating FROM reviews r WHERE r.order_id=o.id AND r.role='buyer_to_seller') AS my_review_rating FROM orders o WHERE LOWER(o.buyer_email)=LOWER(${email}) ORDER BY o.created_at DESC`);res.json(rows.rows); });
router.get("/orders/:id", async(req,res)=>{const email=await signedInEmail(req);if(!email){res.status(401).json({error:"Please sign in"});return;}const rows=await db.execute(sql`SELECT * FROM orders WHERE id=${req.params.id} AND (LOWER(buyer_email)=LOWER(${email}) OR LOWER(COALESCE(seller_email,''))=LOWER(${email}))`);if(!rows.rows.length){res.status(404).json({error:"Order not found"});return;}res.json(rows.rows[0]);});

router.post("/orders/:id/tracking/refresh", async(req,res)=>{
  if(!shippoEnabled()){res.status(503).json({error:"Shipment tracking is not configured yet"});return;}
  const o=(await db.execute(sql`SELECT * FROM orders WHERE id=${req.params.id}`)).rows[0] as any;
  if(!o){res.status(404).json({error:"Order not found"});return;}
  const email=await signedInEmail(req); if(!email){res.status(401).json({error:"Please sign in"});return;}
  if(email!==String(o.buyer_email||"").toLowerCase()&&email!==String(o.seller_email||"").toLowerCase()){res.status(403).json({error:"That is not your order"});return;}
  if(!o.carrier||!o.tracking_number){res.status(400).json({error:"This order does not have a tracking number yet"});return;}
  try{
    const track:any=await getTracking(String(o.carrier),String(o.tracking_number));
    const latest=track?.tracking_status||{}; const mapped=mapShippoStatus(latest.status);
    const nextStatus=mapped==="delivered"?"delivered":(mapped==="shipped"&&!["delivered","out_for_delivery"].includes(String(o.status))?"shipped":String(o.status));
    await db.execute(sql`UPDATE orders SET status=${nextStatus},tracking_status=${latest.status??null},
      tracking_eta=${track?.eta??null},estimated_delivery=COALESCE(${track?.eta??null},estimated_delivery),
      tracking_last_event=${latest.status_details??null},tracking_updated_at=NOW(),
      tracking_history=${JSON.stringify(track?.tracking_history??[])}::jsonb,
      delivered_at=CASE WHEN ${nextStatus}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
      updated_at=NOW() WHERE id=${o.id}`);
    res.json({ok:true,status:nextStatus,trackingStatus:latest.status??null,eta:track?.eta??null,lastEvent:latest.status_details??null,history:track?.tracking_history??[]});
  }catch(err:any){res.status(502).json({error:err?.message||"Could not refresh tracking"});}
});
router.patch("/orders/:id/status",async(req,res)=>{const {status,trackingNumber,carrier,estimatedDelivery,buyerEmail}=req.body as Record<string,string>;if(!status||!VALID_STATUSES.includes(status)){res.status(400).json({error:"Valid status required"});return;}await db.execute(sql`UPDATE orders SET status=${status},tracking_number=COALESCE(${trackingNumber??null},tracking_number),carrier=COALESCE(${carrier??null},carrier),estimated_delivery=COALESCE(${estimatedDelivery??null},estimated_delivery),shipped_at=CASE WHEN ${status} IN ('shipped','out_for_delivery','delivered') THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,delivered_at=CASE WHEN ${status}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,updated_at=NOW() WHERE id=${req.params.id} AND buyer_email=${buyerEmail??""}`);res.json({ok:true});});

router.post("/admin/orders/test-sale", requireAdmin, async(req,res)=>{
  const buyerEmail=String(req.body?.buyerEmail||"").trim().toLowerCase();
  const sellerEmail=String(req.body?.sellerEmail||"").trim().toLowerCase();
  const itemTitle=String(req.body?.itemTitle||"Shippo Tracking Test Item").trim().slice(0,200);
  if(!buyerEmail||!sellerEmail){res.status(400).json({error:"Buyer and seller emails are required"});return;}
  if(buyerEmail===sellerEmail){res.status(400).json({error:"Buyer and seller must be different accounts"});return;}
  const users=await db.execute(sql`SELECT LOWER(email) email FROM users WHERE LOWER(email) IN (LOWER(${buyerEmail}),LOWER(${sellerEmail}))`);
  const found=new Set((users.rows as any[]).map(x=>String(x.email)));
  if(!found.has(buyerEmail)||!found.has(sellerEmail)){res.status(400).json({error:"Both emails must belong to existing Bazunk accounts"});return;}
  const id=`TEST-${randomUUID().slice(0,8).toUpperCase()}`;
  await db.execute(sql`INSERT INTO orders
    (id,buyer_email,seller_email,item_title,price,status,notes,buyer_protection_fee,seller_fee,seller_net,delivery_fee,buyer_total,payout_status,created_at,updated_at)
    VALUES(${id},${buyerEmail},${sellerEmail},${itemTitle},0,'confirmed','ADMIN TEST SALE — no Stripe charge or payout',0,0,0,0,0,'test_no_payout',NOW(),NOW())`);
  await event(id,"test","Test sale created","No Stripe payment or seller payout was created.");
  res.status(201).json({ok:true,id});
});

router.get("/admin/orders", requireAdmin, async (req,res)=>{
  const q=String(req.query.q??"").trim(); const status=String(req.query.status??"").trim();
  const rows=await db.execute(sql`SELECT o.*,
    (SELECT d.status FROM disputes d WHERE d.order_id=o.id ORDER BY d.created_at DESC LIMIT 1) dispute_status,
    (SELECT r.status FROM returns r WHERE r.order_id=o.id ORDER BY r.created_at DESC LIMIT 1) return_status,
    (SELECT COALESCE(SUM(CASE WHEN d.refund_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN d.refund_amount::numeric ELSE 0 END),0) FROM disputes d WHERE d.order_id=o.id) dispute_refund,
    (SELECT COALESCE(SUM(CASE WHEN r.refund_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN r.refund_amount::numeric ELSE 0 END),0) FROM returns r WHERE r.order_id=o.id) return_refund
    FROM orders o WHERE (${q}='' OR o.id ILIKE ${'%'+q+'%'} OR o.buyer_email ILIKE ${'%'+q+'%'} OR COALESCE(o.seller_email,'') ILIKE ${'%'+q+'%'} OR o.item_title ILIKE ${'%'+q+'%'} OR COALESCE(o.tracking_number,'') ILIKE ${'%'+q+'%'}) AND (${status}='' OR o.status=${status}) ORDER BY o.created_at DESC LIMIT 500`);
  const data=rows.rows as any[]; const stripe=await getUncachableStripeClient().catch(()=>null);
  const cache=new Map<string,any>();
  if(stripe){for(const sid of [...new Set(data.map(x=>x.stripe_session_id).filter(Boolean))]){try{cache.set(String(sid),await stripe.checkout.sessions.retrieve(String(sid),{expand:["payment_intent"]}));}catch{cache.set(String(sid),null);}}}
  res.json({orders:data.map(o=>{const s=cache.get(String(o.stripe_session_id));return {...o,payment_status:s?.payment_status??(o.stripe_session_id?"unknown":"manual"),payment_currency:s?.currency?.toUpperCase?.()??"GBP",payment_total:s?.amount_total!=null?s.amount_total/100:null};})});
});

router.post("/admin/orders/:id/tracking/refresh", requireAdmin, async(req,res)=>{
  if(!shippoEnabled()){res.status(503).json({error:"Shippo is not configured on the API service"});return;}
  const o=(await db.execute(sql`SELECT * FROM orders WHERE id=${req.params.id}`)).rows[0] as any;
  if(!o){res.status(404).json({error:"Order not found"});return;}
  if(!o.carrier||!o.tracking_number){res.status(400).json({error:"This order does not have a carrier and tracking number"});return;}
  try{
    const track:any=await getTracking(String(o.carrier),String(o.tracking_number));
    const latest=track?.tracking_status||{};
    const mapped=mapShippoStatus(latest.status);
    const nextStatus=mapped==="delivered"?"delivered":(mapped==="shipped"&&!["delivered","out_for_delivery"].includes(String(o.status))?"shipped":String(o.status));
    const history=track?.tracking_history??[];
    await db.execute(sql`UPDATE orders SET status=${nextStatus},tracking_status=${latest.status??null},
      tracking_eta=${track?.eta??null},estimated_delivery=COALESCE(${track?.eta??null},estimated_delivery),
      tracking_last_event=${latest.status_details??null},tracking_updated_at=NOW(),
      tracking_history=${JSON.stringify(history)}::jsonb,
      delivered_at=CASE WHEN ${nextStatus}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,
      updated_at=NOW() WHERE id=${o.id}`);
    await event(o.id,"tracking","Shippo tracking refreshed",[`Status: ${latest.status||"unknown"}`,latest.status_details].filter(Boolean).join(" · "));
    res.json({ok:true,status:nextStatus,trackingStatus:latest.status??null,eta:track?.eta??null,lastEvent:latest.status_details??null,history});
  }catch(err:any){
    const message=err?.message||"Shippo tracking refresh failed";
    await event(o.id,"tracking_error","Shippo tracking error",message).catch(()=>{});
    res.status(502).json({error:message});
  }
});

router.get("/admin/orders/:id/command", requireAdmin, async(req,res)=>{
  await ensureEvents(); const id=req.params.id;
  const o=(await db.execute(sql`SELECT * FROM orders WHERE id=${id}`)).rows[0] as any; if(!o){res.status(404).json({error:"Order not found"});return;}
  const [d,r,e]=await Promise.all([db.execute(sql`SELECT * FROM disputes WHERE order_id=${id} ORDER BY created_at DESC`),db.execute(sql`SELECT * FROM returns WHERE order_id=${id} ORDER BY created_at DESC`),db.execute(sql`SELECT * FROM order_admin_events WHERE order_id=${id} ORDER BY created_at DESC`)]);
  let payment:any={status:o.stripe_session_id?"unknown":"manual",currency:"GBP",total:null,refunded:0,refundable:0};
  if(o.stripe_session_id){try{const stripe=await getUncachableStripeClient();const s:any=await stripe.checkout.sessions.retrieve(o.stripe_session_id,{expand:["payment_intent.latest_charge"]});const pi:any=s.payment_intent;const charge:any=pi?.latest_charge;payment={status:s.payment_status,currency:String(s.currency||"gbp").toUpperCase(),total:(s.amount_total||0)/100,refunded:(charge?.amount_refunded||0)/100,refundable:Math.max(0,((charge?.amount||0)-(charge?.amount_refunded||0))/100)};}catch{}}
  const timeline:any[]=[{at:o.created_at,title:"Order created",detail:`${o.item_title} · ${o.buyer_email}`,type:"order"}];
  if(o.shipped_at) timeline.push({at:o.shipped_at,title:"Dispatched",detail:[o.carrier,o.tracking_number].filter(Boolean).join(" · "),type:"shipping"});
  if(o.delivered_at) timeline.push({at:o.delivered_at,title:"Delivered",detail:"Order marked delivered",type:"delivery"});
  for(const x of d.rows as any[]) timeline.push({at:x.created_at,title:`Dispute: ${x.status}`,detail:x.reason||x.description,type:"dispute"});
  for(const x of r.rows as any[]) timeline.push({at:x.created_at,title:`Return: ${x.status}`,detail:x.reason||x.description,type:"return"});
  for(const x of e.rows as any[]) timeline.push({at:x.created_at,title:x.title,detail:x.detail,type:x.event_type});
  timeline.sort((a,b)=>new Date(b.at).getTime()-new Date(a.at).getTime());
  res.json({order:o,payment,disputes:d.rows,returns:r.rows,timeline});
});

router.patch("/admin/orders/:id", requireAdmin, async(req,res)=>{const {status,trackingNumber,carrier,estimatedDelivery,adminEmail}=req.body as Record<string,string>;if(!status||!VALID_STATUSES.includes(status)){res.status(400).json({error:"Valid status required"});return;}const before=(await db.execute(sql`SELECT status,tracking_number,carrier,estimated_delivery FROM orders WHERE id=${req.params.id}`)).rows[0] as any;await db.execute(sql`UPDATE orders SET status=${status},tracking_number=COALESCE(${trackingNumber??null},tracking_number),carrier=COALESCE(${carrier??null},carrier),estimated_delivery=COALESCE(${estimatedDelivery??null},estimated_delivery),shipped_at=CASE WHEN ${status} IN ('shipped','out_for_delivery','delivered') THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,delivered_at=CASE WHEN ${status}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,updated_at=NOW() WHERE id=${req.params.id}`);await event(req.params.id,"admin",`Order status changed to ${status}`,[carrier,trackingNumber].filter(Boolean).join(" · ")||null,adminEmail);await recordAdminAudit({req,actor:adminEmail||"Admin",category:"orders",action:"order.update",targetType:"order",targetId:req.params.id,summary:`Admin changed order ${req.params.id} from ${before?.status??"unknown"} → ${status}`,before,after:{status,trackingNumber,carrier,estimatedDelivery}});res.json({ok:true});});

router.post("/admin/orders/:id/cancel", requireAdmin, async(req,res)=>{const id=req.params.id;const o=(await db.execute(sql`SELECT status FROM orders WHERE id=${id}`)).rows[0] as any;if(!o){res.status(404).json({error:"Order not found"});return;}if(["delivered","refunded"].includes(String(o.status))){res.status(409).json({error:"Delivered/refunded orders cannot be cancelled here."});return;}await db.execute(sql`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=${id}`);await event(id,"cancel","Order cancelled",String(req.body.reason||"Admin cancellation"),String(req.body.adminEmail||""));await recordAdminAudit({req,actor:String(req.body.adminEmail||"Admin"),category:"orders",action:"order.cancel",targetType:"order",targetId:id,summary:`Admin cancelled order ${id}`,before:{status:o.status},after:{status:"cancelled"},metadata:{reason:req.body.reason||"Admin cancellation"}});res.json({ok:true});});

router.post("/admin/orders/:id/refund",requireAdmin,async(req,res)=>{
  try {const result=await refundOrder(String(req.params.id),req.body.amount==null?undefined:Number(req.body.amount));await event(String(req.params.id),"refund","Stripe refund issued",`GBP ${result.amount.toFixed(2)} · ${result.refundId}`);await recordAdminAudit({req,category:"orders",action:"order.refund",targetType:"order",targetId:String(req.params.id),summary:`Order refund GBP ${result.amount.toFixed(2)}`,after:result});res.json({ok:true,...result});}
  catch(err:any){res.status(409).json({error:err.message||"Refund failed"});}
});
router.post("/admin/orders/:id/release-payout",requireAdmin,async(req,res)=>{
  try {const result=await releaseOrderPayout(String(req.params.id));await event(String(req.params.id),"payout","Seller payout reviewed",`${result.transferId} · ${result.payoutStatus}`);await recordAdminAudit({req,category:"orders",action:"order.payout_release",targetType:"order",targetId:String(req.params.id),summary:"Admin reviewed seller payout",after:result});res.json({ok:true,...result});}
  catch(err:any){res.status(409).json({error:err.message||"Payout release failed"});}
});

export default router;

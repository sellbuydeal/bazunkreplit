import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";

const router = Router();
const VALID_STATUSES = ["pending", "confirmed", "preparing", "shipped", "out_for_delivery", "delivered", "cancelled", "refunded"];

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

router.post("/orders", requireAdmin, async (req, res) => {
  const { buyerEmail, sellerEmail, itemTitle, itemImage, price, address, notes } = req.body as Record<string, string>;
  if (!buyerEmail || !itemTitle || !price) { res.status(400).json({ error: "buyerEmail, itemTitle, and price are required" }); return; }
  const id = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`INSERT INTO orders (id,buyer_email,seller_email,item_title,item_image,price,status,address,notes,created_at,updated_at)
    VALUES (${id},${buyerEmail},${sellerEmail??null},${itemTitle},${itemImage??null},${parseFloat(price)},'pending',${address??null},${notes??null},NOW(),NOW())`);
  res.status(201).json({ id });
});
router.get("/orders", async (req,res)=>{ const email=req.query["email"] as string|undefined; if(!email){res.status(400).json({error:"email query param required"});return;} const rows=await db.execute(sql`SELECT o.*,(SELECT r.rating FROM reviews r WHERE r.order_id=o.id AND r.role='buyer_to_seller') AS my_review_rating FROM orders o WHERE o.buyer_email=${email} ORDER BY o.created_at DESC`);res.json(rows.rows); });
router.get("/orders/:id", async(req,res)=>{const rows=await db.execute(sql`SELECT * FROM orders WHERE id=${req.params.id}`);if(!rows.rows.length){res.status(404).json({error:"Order not found"});return;}res.json(rows.rows[0]);});
router.patch("/orders/:id/status",async(req,res)=>{const {status,trackingNumber,carrier,estimatedDelivery,buyerEmail}=req.body as Record<string,string>;if(!status||!VALID_STATUSES.includes(status)){res.status(400).json({error:"Valid status required"});return;}await db.execute(sql`UPDATE orders SET status=${status},tracking_number=COALESCE(${trackingNumber??null},tracking_number),carrier=COALESCE(${carrier??null},carrier),estimated_delivery=COALESCE(${estimatedDelivery??null},estimated_delivery),shipped_at=CASE WHEN ${status} IN ('shipped','out_for_delivery','delivered') THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,delivered_at=CASE WHEN ${status}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,updated_at=NOW() WHERE id=${req.params.id} AND buyer_email=${buyerEmail??""}`);res.json({ok:true});});

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

router.patch("/admin/orders/:id", requireAdmin, async(req,res)=>{const {status,trackingNumber,carrier,estimatedDelivery,adminEmail}=req.body as Record<string,string>;if(!status||!VALID_STATUSES.includes(status)){res.status(400).json({error:"Valid status required"});return;}await db.execute(sql`UPDATE orders SET status=${status},tracking_number=COALESCE(${trackingNumber??null},tracking_number),carrier=COALESCE(${carrier??null},carrier),estimated_delivery=COALESCE(${estimatedDelivery??null},estimated_delivery),shipped_at=CASE WHEN ${status} IN ('shipped','out_for_delivery','delivered') THEN COALESCE(shipped_at,NOW()) ELSE shipped_at END,delivered_at=CASE WHEN ${status}='delivered' THEN COALESCE(delivered_at,NOW()) ELSE delivered_at END,updated_at=NOW() WHERE id=${req.params.id}`);await event(req.params.id,"admin",`Order status changed to ${status}`,[carrier,trackingNumber].filter(Boolean).join(" · ")||null,adminEmail);res.json({ok:true});});

router.post("/admin/orders/:id/cancel", requireAdmin, async(req,res)=>{const id=req.params.id;const o=(await db.execute(sql`SELECT status FROM orders WHERE id=${id}`)).rows[0] as any;if(!o){res.status(404).json({error:"Order not found"});return;}if(["delivered","refunded"].includes(String(o.status))){res.status(409).json({error:"Delivered/refunded orders cannot be cancelled here."});return;}await db.execute(sql`UPDATE orders SET status='cancelled',updated_at=NOW() WHERE id=${id}`);await event(id,"cancel","Order cancelled",String(req.body.reason||"Admin cancellation"),String(req.body.adminEmail||""));res.json({ok:true});});

router.post("/admin/orders/:id/refund", requireAdmin, async(req,res)=>{const id=req.params.id;const o=(await db.execute(sql`SELECT * FROM orders WHERE id=${id}`)).rows[0] as any;if(!o){res.status(404).json({error:"Order not found"});return;}if(!o.stripe_session_id){res.status(400).json({error:"This order has no Stripe payment session. Use the dispute/return workflow to record an offline refund."});return;}try{const stripe=await getUncachableStripeClient();const s:any=await stripe.checkout.sessions.retrieve(o.stripe_session_id,{expand:["payment_intent.latest_charge"]});const pi:any=s.payment_intent;if(!pi?.id){res.status(400).json({error:"No refundable Stripe payment found."});return;}const charge:any=pi.latest_charge;const remaining=Math.max(0,(Number(charge?.amount||0)-Number(charge?.amount_refunded||0))/100);const requested=req.body.amount==null?Number(o.price||0)+Number(o.buyer_protection_fee||0):Number(req.body.amount);const amount=Math.min(remaining,Math.max(0,requested));if(!amount){res.status(409).json({error:"No refundable amount remains on this payment."});return;}const currency=String(s.currency||"gbp").toLowerCase();const zero=["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"].includes(currency);const minor=Math.round(amount*(zero?1:100));const refund=await stripe.refunds.create({payment_intent:pi.id,amount:minor,metadata:{bazunk_order_id:id}});await db.execute(sql`UPDATE orders SET status='refunded',updated_at=NOW() WHERE id=${id}`);await event(id,"refund","Stripe refund issued",`${currency.toUpperCase()} ${amount.toFixed(2)} · ${refund.id}`,String(req.body.adminEmail||""));res.json({ok:true,refundId:refund.id,amount,currency:currency.toUpperCase()});}catch(err:any){res.status(500).json({error:err?.message||"Refund failed"});}});

export default router;

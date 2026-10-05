import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth.js";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { recordAdminAudit } from "../lib/adminAudit.js";
import { recordCreditEconomy } from "../lib/creditEconomy.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();

const VALID_REASONS = ["item_not_received", "not_as_described", "damaged", "wrong_item", "other"];
const VALID_STATUSES = ["open", "under_review", "resolved_refund", "resolved_no_action", "closed"];

// Orders a buyer can still dispute: their own, not cancelled, bought in the last 30 days,
// and with no dispute already open.
router.get("/disputes/eligible-orders", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT o.id, o.item_title, o.seller_email, o.price, o.created_at,
           GREATEST(0, 30 - FLOOR(EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 86400))::int AS days_left
    FROM orders o
    WHERE o.buyer_email = ${email}
      AND o.status <> 'cancelled'
      AND o.created_at >= NOW() - INTERVAL '30 days'
      AND NOT EXISTS (SELECT 1 FROM disputes d WHERE d.order_id = o.id AND d.status <> 'closed')
    ORDER BY o.created_at DESC
  `);
  res.json(rows.rows);
});

router.post("/disputes", async (req, res) => {
  const { buyerEmail, orderId, reason, description } = req.body as Record<string, string>;
  if (!buyerEmail || !orderId || !reason || !description) {
    res.status(400).json({ error: "Please choose an order and describe the issue." });
    return;
  }
  if (!VALID_REASONS.includes(reason)) {
    res.status(400).json({ error: "Invalid reason" });
    return;
  }

  // The order must exist, belong to this buyer, and have been bought within the last 30 days.
  // The item and seller always come from the order itself, never from the form.
  const order = (await db.execute(sql`
    SELECT id, buyer_email, seller_email, item_title, status,
           (created_at >= NOW() - INTERVAL '30 days') AS in_window
    FROM orders WHERE id = ${orderId}
  `)).rows[0] as Record<string, unknown> | undefined;

  if (!order || order.buyer_email !== buyerEmail) {
    res.status(404).json({ error: "We couldn't find that order on your account." });
    return;
  }
  if (order.status === "cancelled") {
    res.status(400).json({ error: "This order was cancelled, so it can't be disputed." });
    return;
  }
  if (!order.in_window) {
    res.status(400).json({ error: "Disputes must be opened within 30 days of purchase, and this order is older than that." });
    return;
  }
  const existing = await db.execute(sql`SELECT 1 FROM disputes WHERE order_id = ${orderId} AND status <> 'closed' LIMIT 1`);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "A dispute is already open for this order." });
    return;
  }

  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO disputes (id, order_id, buyer_email, seller_email, item_title, reason, description, status, created_at, updated_at)
    VALUES (${id}, ${orderId}, ${buyerEmail}, ${(order.seller_email as string | null) ?? null}, ${order.item_title as string}, ${reason}, ${description}, 'open', NOW(), NOW())
  `);
  res.status(201).json({ id });
});

router.get("/disputes", async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) {
    res.status(400).json({ error: "email query param required" });
    return;
  }
  const rows = await db.execute(sql`
    SELECT * FROM disputes
    WHERE buyer_email = ${email} OR seller_email = ${email}
    ORDER BY created_at DESC
  `);
  res.json(rows.rows);
});

router.patch("/disputes/:id/seller-response", async (req, res) => {
  const { id } = req.params;
  const { sellerEmail, response } = req.body as Record<string, string>;
  if (!sellerEmail || !response) {
    res.status(400).json({ error: "sellerEmail and response are required" });
    return;
  }
  await db.execute(sql`
    UPDATE disputes SET seller_response = ${response}, updated_at = NOW()
    WHERE id = ${id} AND seller_email = ${sellerEmail}
  `);
  res.json({ ok: true });
});

router.get("/admin/disputes", requireAdmin, async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT d.*, o.price AS order_price, o.buyer_protection_fee, o.status AS order_status,
           CASE WHEN o.stripe_session_id IS NULL THEN false ELSE true END AS has_stripe_payment
    FROM disputes d LEFT JOIN orders o ON o.id = d.order_id
    ORDER BY d.created_at DESC
  `);
  res.json(rows.rows);
});

// Execute a real dispute resolution action. Money-moving actions happen server-side only.
router.post("/admin/disputes/:id/action", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const action = String(req.body?.action ?? "");
  const notes = String(req.body?.notes ?? "").trim();
  const amount = Number(req.body?.amount ?? 0);
  const credits = Number(req.body?.credits ?? 0);

  const dispute = (await db.execute(sql`SELECT * FROM disputes WHERE id=${id}`)).rows[0] as any;
  if (!dispute) { res.status(404).json({ error: "Dispute not found" }); return; }
  const order = dispute.order_id ? (await db.execute(sql`SELECT * FROM orders WHERE id=${dispute.order_id}`)).rows[0] as any : null;
  if (["resolved_refund", "resolved_no_action", "closed"].includes(String(dispute.status)) && ["refund_full", "refund_partial", "credits"].includes(action)) {
    res.status(409).json({ error: "This dispute is already resolved. Reopen it or move it to Under Review before issuing another financial remedy." }); return;
  }

  try {
    if (action === "mark_review") {
      await db.execute(sql`UPDATE disputes SET status='under_review', resolution_notes=${notes || null}, updated_at=NOW() WHERE id=${id}`);
    } else if (action === "no_action") {
      await db.execute(sql`UPDATE disputes SET status='resolved_no_action', resolution_notes=${notes || null}, resolved_at=NOW(), updated_at=NOW() WHERE id=${id}`);
      await sendSystemMessage(dispute.buyer_email, { category:"Dispute update", subject:`Dispute resolved: ${dispute.item_title}`, body:`Bazunk reviewed your dispute and closed it without a refund.${notes ? `\n\n${notes}` : ""}` });
    } else if (action === "close") {
      await db.execute(sql`UPDATE disputes SET status='closed', resolution_notes=${notes || null}, resolved_at=NOW(), updated_at=NOW() WHERE id=${id}`);
    } else if (action === "credits") {
      if (!Number.isFinite(credits) || credits <= 0 || !Number.isInteger(credits)) { res.status(400).json({ error:"Enter a whole number of credits greater than 0." }); return; }
      const updated = await db.execute(sql`UPDATE users SET credits=credits+${credits} WHERE LOWER(email)=LOWER(${dispute.buyer_email}) RETURNING credits`);
      if (!updated.rows.length) { res.status(404).json({ error:"Buyer account was not found." }); return; }
      await recordCreditEconomy({ email:dispute.buyer_email, kind:"refund", credits, reason:`Dispute goodwill credit: ${dispute.item_title}`, referenceType:"dispute_credit", referenceId:id, metadata:{orderId:dispute.order_id} });
      await db.execute(sql`UPDATE disputes SET status='closed', resolution_notes=${notes || `Awarded ${credits} Bazunk credits`}, resolved_at=NOW(), updated_at=NOW() WHERE id=${id}`);
      await sendSystemMessage(dispute.buyer_email, { category:"Dispute update", subject:`${credits} Bazunk credits added`, body:`Bazunk has added ${credits} credits to your account following your dispute for “${dispute.item_title}”.${notes ? `\n\n${notes}` : ""}` });
    } else if (action === "refund_full" || action === "refund_partial") {
      if (!order?.stripe_session_id) { res.status(400).json({ error:"This order has no Stripe payment, so an automatic card refund cannot be issued." }); return; }
      const stripe = await getUncachableStripeClient();
      const session:any = await stripe.checkout.sessions.retrieve(order.stripe_session_id,{expand:["payment_intent.latest_charge"]});
      const pi:any = session.payment_intent; const charge:any = pi?.latest_charge;
      if (!pi?.id || !charge) { res.status(400).json({ error:"No refundable Stripe payment was found." }); return; }
      const currency=String(session.currency||"gbp").toLowerCase();
      const remaining=Math.max(0,(Number(charge.amount||0)-Number(charge.amount_refunded||0))/100);
      const requested=action === "refund_full" ? remaining : amount;
      if (!Number.isFinite(requested) || requested <= 0) { res.status(400).json({ error:"Enter a refund amount greater than 0." }); return; }
      if (requested > remaining + 0.0001) { res.status(400).json({ error:`Only ${currency.toUpperCase()} ${remaining.toFixed(2)} remains refundable.` }); return; }
      const zero=["bif","clp","djf","gnf","jpy","kmf","krw","mga","pyg","rwf","ugx","vnd","vuv","xaf","xof","xpf"].includes(currency);
      const refund=await stripe.refunds.create({payment_intent:pi.id,amount:Math.round(requested*(zero?1:100)),metadata:{bazunk_order_id:String(order.id),bazunk_dispute_id:id}});
      const isFull=requested >= remaining - 0.005;
      if (isFull) await db.execute(sql`UPDATE orders SET status='refunded',updated_at=NOW() WHERE id=${order.id}`);
      await db.execute(sql`UPDATE disputes SET status='resolved_refund', refund_amount=${requested.toFixed(2)}, resolution_notes=${notes || null}, resolved_at=NOW(), updated_at=NOW() WHERE id=${id}`);
      await sendSystemMessage(dispute.buyer_email, { category:"Dispute update", subject:`Refund issued: ${dispute.item_title}`, body:`Bazunk issued a ${isFull ? "full" : "partial"} refund of ${currency.toUpperCase()} ${requested.toFixed(2)} to your original payment method.${notes ? `\n\n${notes}` : ""}` });
      await recordAdminAudit({req,category:"disputes",action:isFull?"dispute.refund_full":"dispute.refund_partial",targetType:"dispute",targetId:id,summary:`${isFull?"Full":"Partial"} refund ${currency.toUpperCase()} ${requested.toFixed(2)} for dispute ${id}`,before:{status:dispute.status},after:{status:"resolved_refund",refundAmount:requested,refundId:refund.id},metadata:{orderId:order.id}});
      res.json({ok:true, amount:requested, currency:currency.toUpperCase(), refundId:refund.id}); return;
    } else { res.status(400).json({ error:"Unknown dispute action." }); return; }

    await recordAdminAudit({req,category:"disputes",action:`dispute.${action}`,targetType:"dispute",targetId:id,summary:`Dispute action: ${action}`,before:{status:dispute.status},after:{notes,credits:action==="credits"?credits:undefined},metadata:{orderId:dispute.order_id}});
    res.json({ok:true});
  } catch (err:any) { res.status(500).json({ error:err?.message || "Dispute action failed" }); }
});

router.patch("/admin/disputes/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, resolutionNotes, refundAmount, adminEmail } = req.body as Record<string, string>;
  if (!status || !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: "Valid status is required" });
    return;
  }
  const resolvedAt = ["resolved_refund", "resolved_no_action", "closed"].includes(status) ? sql`NOW()` : sql`NULL`;
  await db.execute(sql`
    UPDATE disputes
    SET status = ${status},
        resolution_notes = ${resolutionNotes ?? null},
        refund_amount = ${refundAmount ?? null},
        admin_email = ${adminEmail ?? null},
        resolved_at = ${resolvedAt},
        updated_at = NOW()
    WHERE id = ${id}
  `);
  res.json({ ok: true });
});

export default router;

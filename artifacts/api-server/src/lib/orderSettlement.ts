import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getUncachableStripeClient } from "../stripeClient.js";
import { FEE_POLICY, minor } from "./marketplaceFees.js";

/** Serialises settlement actions for the same Stripe payment. No automatic release. */
async function withOrder<T>(id:string, fn:(tx:any,order:any,stripe:any,session:any,refundedMinor:number,hasPendingRefund:boolean)=>Promise<T>):Promise<T> {
  const stripe=await getUncachableStripeClient();
  return db.transaction(async tx=>{
    const order=(await tx.execute(sql`SELECT * FROM orders WHERE id=${id} FOR UPDATE`)).rows[0] as any;
    if(!order?.stripe_session_id)throw new Error("Order has no Stripe payment.");
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${String(order.stripe_session_id)}))`);
    const session:any=await stripe.checkout.sessions.retrieve(order.stripe_session_id,{expand:["payment_intent.latest_charge"]});
    if(session.payment_status!=="paid" || session.currency!=="gbp" || !session.payment_intent?.id)throw new Error("Settlement requires a paid GBP checkout. Legacy foreign-currency orders require manual reconciliation.");
    let refundedMinor=0,hasPendingRefund=false;
    for await (const refund of stripe.refunds.list({payment_intent:session.payment_intent.id,limit:100})) {
      if(["failed","canceled"].includes(refund.status ?? ""))continue;
      if(!refund.metadata?.bazunk_order_id)throw new Error("This payment has an unallocated refund. Reconcile it before further settlement.");
      if(refund.metadata.bazunk_order_id===id){refundedMinor+=refund.amount;if(refund.status!=="succeeded")hasPendingRefund=true;}
    }
    return fn(tx,order,stripe,session,refundedMinor,hasPendingRefund);
  });
}
function entitlement(order:any) {
  return minor(order.buyer_total ?? (Number(order.price)+Number(order.buyer_protection_fee??0)+Number(order.delivery_fee??0)));
}
async function syncNet(tx:any,order:any,stripe:any,refundedMinor:number,deferReversal=false) {
  const originalNet=Math.max(0,minor(order.price)-minor(order.seller_fee??0));
  const total=entitlement(order);
  const reduction=total ? Math.min(originalNet,Math.round(originalNet*refundedMinor/total)):originalNet;
  const netMinor=originalNet-reduction;
  let payoutStatus=order.payout_status??"awaiting_release",warning:string|undefined;
  if(deferReversal) payoutStatus="refund_pending";
  if(order.stripe_transfer_id && !deferReversal) {
    try {
      const transfer=await stripe.transfers.retrieve(order.stripe_transfer_id);
      const reverseTarget=Math.min(transfer.amount,reduction);
      const delta=reverseTarget-transfer.amount_reversed;
      if(delta>0)await stripe.transfers.createReversal(transfer.id,{amount:delta,metadata:{bazunk_order_id:String(order.id)}},{idempotencyKey:`order-reversal-${order.id}-${reverseTarget}`});
      payoutStatus=netMinor===0?"reversed":"paid";
    } catch { payoutStatus="reversal_pending"; warning="Buyer refund succeeded; seller transfer reversal needs admin reconciliation. Retry the payout reconciliation action."; }
  }
  await tx.execute(sql`UPDATE orders SET refunded_total=${refundedMinor/100},seller_net=${netMinor/100},payout_status=${payoutStatus},updated_at=NOW() WHERE id=${order.id}`);
  return {netMinor,payoutStatus,warning};
}
export async function refundOrder(id:string,requested?:number,metadata:Record<string,string>={}) {
  return withOrder(id,async(tx,order,stripe,session,already)=>{
    const total=entitlement(order);
    const charge=session.payment_intent.latest_charge;
    const remaining=Math.max(0,Math.min(total-already,Number(charge?.amount??0)-Number(charge?.amount_refunded??0)));
    const amount=requested==null?remaining:minor(requested);
    if(!amount || amount>remaining)throw new Error(`This order has £${(remaining/100).toFixed(2)} remaining refundable.`);
    const refund=await stripe.refunds.create({payment_intent:session.payment_intent.id,amount,metadata:{...metadata,bazunk_order_id:id}},{idempotencyKey:`order-refund-${id}-${already}-${amount}`});
    if(["failed","canceled"].includes(refund.status ?? ""))throw new Error("Stripe could not complete the refund.");
    const cumulative=already+amount;
    const pending=refund.status!=="succeeded";
    const result=await syncNet(tx,order,stripe,cumulative,pending);
    const full=cumulative>=total && !pending;
    if(full)await tx.execute(sql`UPDATE orders SET status='refunded',updated_at=NOW() WHERE id=${id}`);
    return {refundId:refund.id,amount:amount/100,currency:"GBP",full,pending,...result};
  });
}
export async function releaseOrderPayout(id:string) {
  return withOrder(id,async(tx,order,stripe,session,refunded,pending)=>{
    if(order.fee_policy!==FEE_POLICY)throw new Error("Only orders using the new fee snapshot can be released here. Reconcile historical payouts separately.");
    if(pending)throw new Error("Wait for the pending buyer refund to resolve before reconciling or releasing payout.");
    const reconciled=await syncNet(tx,order,stripe,refunded);
    if(order.stripe_transfer_id)return {transferId:order.stripe_transfer_id,alreadyReleased:true,...reconciled};
    if(session.payment_intent.latest_charge?.disputed)throw new Error("Resolve the payment dispute before releasing payout.");
    if(order.status!=="delivered")throw new Error("Mark the order delivered before reviewing payout release.");
    const open=(await tx.execute(sql`SELECT 1 FROM disputes WHERE order_id=${id} AND status NOT IN ('closed','resolved_no_action','resolved_refund') UNION ALL SELECT 1 FROM returns WHERE order_id=${id} AND status NOT IN ('closed','declined','refund_issued') LIMIT 1`)).rows;
    if(open.length)throw new Error("Resolve the open dispute or return before releasing payout.");
    if(reconciled.netMinor<=0)throw new Error("No seller proceeds remain to transfer.");
    const seller=(await tx.execute(sql`SELECT stripe_account_id FROM users WHERE LOWER(email)=LOWER(${order.seller_email}) LIMIT 1`)).rows[0] as any;
    if(!seller?.stripe_account_id)throw new Error("Seller must connect a Stripe payout account first.");
    const account=await stripe.accounts.retrieve(seller.stripe_account_id);
    if(account.capabilities?.transfers!=="active" || !account.payouts_enabled)throw new Error("Seller's Stripe account is not ready for transfers and payouts.");
    const charge=session.payment_intent.latest_charge;
    if(!charge?.id)throw new Error("Payment charge is not available.");
    const transfer=await stripe.transfers.create({amount:reconciled.netMinor,currency:"gbp",destination:seller.stripe_account_id,source_transaction:charge.id,transfer_group:`bazunk-${session.id}`,metadata:{bazunk_order_id:id}},{idempotencyKey:`order-payout-${id}`});
    await tx.execute(sql`UPDATE orders SET stripe_transfer_id=${transfer.id},payout_status='paid',updated_at=NOW() WHERE id=${id}`);
    return {transferId:transfer.id,netMinor:reconciled.netMinor,payoutStatus:"paid"};
  });
}

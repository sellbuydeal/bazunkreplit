import { awardReferralMilestone } from "./referrals.js";
import { db, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { storage } from "../storage.js";
import { sendOrderConfirmation, sendSellerSaleNotification } from "../email.js";
import { refreshSellerMilestones } from "./milestones.js";
import { sendSystemMessage } from "./systemMessages.js";
import { logger } from "./logger.js";

export type FulfillResult = {
  status: "fulfilled" | "already_done" | "not_paid" | "email_mismatch";
  orders: number;
};

/**
 * Turns a paid cart Checkout Session into `orders` rows (one per unit), applies
 * any credits used, sends the confirmation email and updates seller milestones.
 *
 * Idempotent and safe to call from BOTH the Stripe webhook and the browser
 * redirect: the first caller claims `cart-<sessionId>` in credit_transactions
 * atomically; later callers get "already_done".
 *
 * Seller/price/title come from the `listings` table (looked up by the listing
 * ids stored in session metadata), never from client-supplied values.
 */
export async function fulfillCartSession(sessionId: string, expectedEmail?: string): Promise<FulfillResult> {
  const stripe = await getUncachableStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid") return { status: "not_paid", orders: 0 };

  const buyerEmail = session.client_reference_id ?? session.metadata?.email;
  if (!buyerEmail) throw new Error(`Session ${sessionId} has no buyer email`);
  if (expectedEmail && buyerEmail !== expectedEmail) return { status: "email_mismatch", orders: 0 };

  const claimId = `cart-${sessionId}`;
  const claimed = await db
    .insert(creditTransactionsTable)
    .values({ id: claimId, email: buyerEmail, creditsAdded: "0" })
    .onConflictDoNothing()
    .returning({ id: creditTransactionsTable.id });
  if (claimed.length === 0) return { status: "already_done", orders: 0 };

  try {
    // metadata.items = "listingId:qty,listingId:qty"
    const lines = (session.metadata?.items ?? "")
      .split(",")
      .map((s) => s.split(":"))
      .map(([id, q]) => ({ id: Number(id), qty: Math.max(1, Math.min(50, Number(q) || 1)) }))
      .filter((l) => Number.isInteger(l.id) && l.id > 0);

    const ids = lines.map((l) => l.id);
    const rows = ids.length
      ? (await db.execute(sql`
          SELECT id, title, image, price, price_gbp, seller_email, category FROM listings WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
        `)).rows as Array<Record<string, unknown>>
      : [];
    const byId = new Map(rows.map((r) => [Number(r.id), r]));

    let lineNo = 0;
    const buyerProtectionTotal = parseFloat(session.metadata?.buyerProtectionFee ?? "0") || 0;
    const totalItemValue = rows.reduce((sum, r) => sum + Number(r.price_gbp ?? r.price ?? 0) * (lines.find(l => l.id === Number(r.id))?.qty ?? 0), 0);
    const feeRows = (await db.execute(sql`SELECT key, value FROM site_settings WHERE key LIKE 'fee_rate_%'`)).rows as Array<Record<string, unknown>>;
    const feeSettings = Object.fromEntries(feeRows.map(r => [String(r.key), Number(r.value)]));
    const sellers = new Set<string>();
    const sellerItems = new Map<string, string[]>();
    const sellerEmailItems = new Map<string, Array<{ title: string; price: number; quantity: number }>>();
    const emailItems: Array<{ title: string; price: number; quantity: number }> = [];

    for (const l of lines) {
      const row = byId.get(l.id);
      if (!row) {
        logger.warn({ sessionId, listingId: l.id }, "Cart item has no matching listing — no order created");
        continue;
      }
      const price = Number(row.price_gbp ?? row.price ?? 0);
      const seller = (row.seller_email as string | null) ?? null;
      for (let u = 0; u < l.qty; u++) {
        lineNo++;
        const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
        const sellerTypeRow = seller ? (await db.execute(sql`SELECT seller_type FROM users WHERE LOWER(email)=LOWER(${seller}) LIMIT 1`)).rows[0] as any : null;
        const sellerType = String(sellerTypeRow?.seller_type ?? "private");
        const categorySlug = String(row.category ?? "").toLowerCase();
        const businessRate = sellerType === "private" ? 0 : (feeSettings[`fee_rate_${categorySlug}`] ?? feeSettings.fee_rate_default ?? 5);
        const sellerFee = price * (businessRate / 100);
        const protectionShare = totalItemValue > 0 ? buyerProtectionTotal * (price / totalItemValue) : 0;
        await db.execute(sql`
          INSERT INTO orders (id, buyer_email, seller_email, item_title, item_image, price, status,
                              stripe_session_id, line_no, buyer_protection_fee, seller_fee, created_at, updated_at)
          VALUES (${orderId}, ${buyerEmail}, ${seller}, ${row.title as string}, ${(row.image as string | null) ?? null},
                  ${price}, 'confirmed', ${sessionId}, ${lineNo}, ${protectionShare}, ${sellerFee}, NOW(), NOW())
          ON CONFLICT (stripe_session_id, line_no) DO NOTHING
        `);
      }
      if (seller) {
        sellers.add(seller);
        sellerItems.set(seller, [...(sellerItems.get(seller) ?? []), `${row.title as string}${l.qty > 1 ? ` x${l.qty}` : ""}`]);
        sellerEmailItems.set(seller, [...(sellerEmailItems.get(seller) ?? []), { title: row.title as string, price, quantity: l.qty }]);
      }
      emailItems.push({ title: row.title as string, price, quantity: l.qty });
    }

    const creditsApplied = parseFloat(session.metadata?.creditsApplied ?? "0") || 0;
    if (creditsApplied > 0) await storage.addCredits(buyerEmail, -creditsApplied);

    for (const seller of sellers) {
      void refreshSellerMilestones(seller);
      void sendSystemMessage(seller, {
        category: "Sales",
        subject: "You made a sale",
        body: `Great news! Someone just bought:\n\n${(sellerItems.get(seller) ?? []).join("\n")}\n\nOpen your Sales page to see the order details.`,
      });
    }

    if (emailItems.length) {
      void awardReferralMilestone(buyerEmail, 'purchase');
      void sendSystemMessage(buyerEmail, {
        category: "Orders",
        subject: "Order confirmed",
        body: `Thanks for your purchase! Your order has been placed:\n\n${emailItems.map((i) => i.title + (i.quantity > 1 ? ` x${i.quantity}` : "")).join("\n")}\n\nYou can follow it from your Orders page.`,
      });
    }

    if (emailItems.length) {
      void sendOrderConfirmation({
        email: buyerEmail,
        name: session.customer_details?.name ?? undefined,
        items: emailItems,
        total: (session.amount_total ?? 0) / 100,
      });
      for (const [email, items] of sellerEmailItems) void sendSellerSaleNotification({ email, items, buyerEmail });
    }

    return { status: "fulfilled", orders: lineNo };
  } catch (err) {
    // Release the claim so a retry (webhook redelivery or page refresh) can finish the job.
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.id, claimId)).catch(() => {});
    throw err;
  }
}
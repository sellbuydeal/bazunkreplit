#!/usr/bin/env bash
# Run from the repo root (the folder that contains "artifacts/").
set -e
API=artifacts/api-server/src
[ -d "$API" ] || { echo "Run this from the repo root (folder containing artifacts/)"; exit 1; }

# ── 1. NEW FILE: monthly milestone counting ─────────────────────────────────
cat > $API/lib/milestones.ts <<'EOF'
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

/**
 * Monthly seller milestones whose progress is a count we can derive from data.
 * `total` must match the `total` for the same id in DashboardPage.tsx MILESTONES.
 */
const LISTING_MILESTONES = [
  { id: "active-lister", total: 5 },
  { id: "inventory-master", total: 20 },
];
const SALES_MILESTONES = [
  { id: "quick-seller", total: 3 },
  { id: "power-seller", total: 10 },
];

async function setProgress(email: string, id: string, count: number, total: number) {
  const progress = Math.min(count, total);
  // Completion is sticky (never un-completes) and `claimed` is never touched here.
  await db.execute(sql`
    INSERT INTO user_milestones (email, milestone_id, progress, completed, claimed, updated_at)
    VALUES (${email}, ${id}, ${progress}, ${progress >= total}, FALSE, NOW())
    ON CONFLICT (email, milestone_id) DO UPDATE SET
      progress = CASE WHEN user_milestones.completed THEN user_milestones.progress ELSE EXCLUDED.progress END,
      completed = user_milestones.completed OR EXCLUDED.completed,
      updated_at = NOW()
  `);
}

/**
 * Recomputes this calendar month's listing and sales counts for a seller and
 * updates their milestone progress. Safe to call repeatedly.
 */
export async function refreshSellerMilestones(email: string): Promise<void> {
  if (!email) return;
  try {
    const listed = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM listings
      WHERE seller_email = ${email} AND created_at >= date_trunc('month', NOW())
    `);
    const listedCount = Number((listed.rows[0] as Record<string, unknown>)?.n ?? 0);
    for (const m of LISTING_MILESTONES) await setProgress(email, m.id, listedCount, m.total);

    const sold = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM orders
      WHERE seller_email = ${email}
        AND status <> 'cancelled'
        AND created_at >= date_trunc('month', NOW())
    `);
    const soldCount = Number((sold.rows[0] as Record<string, unknown>)?.n ?? 0);
    for (const m of SALES_MILESTONES) await setProgress(email, m.id, soldCount, m.total);
  } catch (err) {
    logger.error({ err, email }, "Failed to refresh seller milestones");
  }
}
EOF

# ── 2. NEW FILE: turn a paid Stripe cart session into orders ────────────────
cat > $API/lib/fulfillment.ts <<'EOF'
import { db, creditTransactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getUncachableStripeClient } from "../stripeClient.js";
import { storage } from "../storage.js";
import { sendOrderConfirmation } from "../email.js";
import { refreshSellerMilestones } from "./milestones.js";
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
          SELECT id, title, image, price, price_gbp, seller_email FROM listings WHERE id = ANY(${ids}::int[])
        `)).rows as Array<Record<string, unknown>>
      : [];
    const byId = new Map(rows.map((r) => [Number(r.id), r]));

    let lineNo = 0;
    const sellers = new Set<string>();
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
        await db.execute(sql`
          INSERT INTO orders (id, buyer_email, seller_email, item_title, item_image, price, status,
                              stripe_session_id, line_no, created_at, updated_at)
          VALUES (${orderId}, ${buyerEmail}, ${seller}, ${row.title as string}, ${(row.image as string | null) ?? null},
                  ${price}, 'confirmed', ${sessionId}, ${lineNo}, NOW(), NOW())
          ON CONFLICT (stripe_session_id, line_no) DO NOTHING
        `);
      }
      if (seller) sellers.add(seller);
      emailItems.push({ title: row.title as string, price, quantity: l.qty });
    }

    const creditsApplied = parseFloat(session.metadata?.creditsApplied ?? "0") || 0;
    if (creditsApplied > 0) await storage.addCredits(buyerEmail, -creditsApplied);

    for (const seller of sellers) {
      void refreshSellerMilestones(seller);
    }

    if (emailItems.length) {
      void sendOrderConfirmation({
        email: buyerEmail,
        name: session.customer_details?.name ?? undefined,
        items: emailItems,
        total: (session.amount_total ?? 0) / 100,
      });
    }

    return { status: "fulfilled", orders: lineNo };
  } catch (err) {
    // Release the claim so a retry (webhook redelivery or page refresh) can finish the job.
    await db.delete(creditTransactionsTable).where(eq(creditTransactionsTable.id, claimId)).catch(() => {});
    throw err;
  }
}
EOF

# ── 3. EDITS to existing files (safe to re-run; skips anything already applied) ──
python3 - <<'PYEOF'
API = "artifacts/api-server/src/"
WEB = "artifacts/sellbuydeal/src/"

def edit(path, old, new):
    s = open(path).read()
    if new in s:
        print("already applied:", path); return
    if old not in s:
        raise SystemExit("COULD NOT FIND text to replace in " + path + ":\n" + old[:120])
    open(path, "w").write(s.replace(old, new, 1))
    print("edited:", path)

# Stripe keys from env vars (Render) with Replit fallback
edit(API + "stripeClient.ts",
'async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {\n',
'''async function getCredentials(): Promise<{ publishableKey: string; secretKey: string }> {
  // Render / any non-Replit host: read keys straight from environment variables.
  if (process.env.STRIPE_SECRET_KEY) {
    return {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? "",
    };
  }

''')

# Webhook: verify with STRIPE_WEBHOOK_SECRET and fulfil paid carts
edit(API + "webhookHandlers.ts",
'import { getStripeSync } from "./stripeClient.js";',
'import type Stripe from "stripe";\nimport { getStripeSync, getUncachableStripeClient } from "./stripeClient.js";\nimport { fulfillCartSession } from "./lib/fulfillment.js";')
edit(API + "webhookHandlers.ts",
'    const sync = await getStripeSync();',
'''    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.metadata?.type === "cart") await fulfillCartSession(session.id);
      }
      return;
    }
    const sync = await getStripeSync();''')

# routes/stripe.ts: send listing ids; confirm route delegates to fulfilment
p = API + "routes/stripe.ts"
edit(p,
'const items = body.items as Array<{ title: string; price: number; quantity: number; currency?: string; priceGbp?: number }>;',
'const items = body.items as Array<{ id?: number; title: string; price: number; quantity: number; currency?: string; priceGbp?: number }>;')
edit(p,
'        type: "cart",\n        creditsApplied: creditsApplied.toFixed(2),',
'''        type: "cart",
        // "listingId:qty,..." — fulfilment looks up seller/price from the listings table
        items: items
          .filter((i) => Number.isInteger(i.id))
          .map((i) => `${i.id}:${i.quantity}`)
          .join(",")
          .slice(0, 500),
        creditsApplied: creditsApplied.toFixed(2),''')
s = open(p).read()
if "fulfillCartSession(sessionId, email)" not in s:
    a = s.index("    if (sessionId) {\n      const alreadyApplied = await storage.hasCreditTransaction(`cart-${sessionId}`);")
    b = s.index("    } else if (freeOrder) {")
    s = s[:a] + '''    if (sessionId) {
      const result = await fulfillCartSession(sessionId, email);
      if (result.status === "not_paid") { res.status(400).json({ error: "Payment not completed" }); return; }
      if (result.status === "email_mismatch") { res.status(403).json({ error: "Email mismatch" }); return; }
''' + s[b:]
    open(p, "w").write(s)
    print("edited:", p, "(confirm-cart-payment)")
edit(p,
'import { sendCreditsConfirmation, sendOrderConfirmation } from "../email.js";',
'import { sendCreditsConfirmation, sendOrderConfirmation } from "../email.js";\nimport { fulfillCartSession } from "../lib/fulfillment.js";')

# orders table: session id + line number + unique index (idempotency)
edit(API + "index.ts",
'  `, "orders");\n',
'''  `, "orders");

  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`, "orders.stripe_session_id");
  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_no INTEGER`, "orders.line_no");
  await run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_session_line_uniq ON orders (stripe_session_id, line_no)`,
    "orders_session_line_uniq",
  );
''')

# Milestone triggers
edit(API + "routes/listings.ts",
'import { storage } from "../storage.js";',
'import { storage } from "../storage.js";\nimport { refreshSellerMilestones } from "../lib/milestones.js";')
edit(API + "routes/listings.ts",
'    res.status(201).json({ ...listing, promotions: [] });',
'''    // Active Lister (5/month) and Inventory Master (20/month)
    void refreshSellerMilestones(sellerEmail);

    res.status(201).json({ ...listing, promotions: [] });''')
edit(API + "routes/flashSales.ts",
'import { randomUUID } from "crypto";',
'import { randomUUID } from "crypto";\nimport { storage } from "../storage.js";')
edit(API + "routes/flashSales.ts",
'  res.status(201).json({ id });\n});\n\nrouter.patch("/flash-sales/:id/cancel"',
'''  storage.completeMilestone(sellerEmail, "first-flash-sale").catch((err) => {
    console.error("Failed to record first-flash-sale milestone:", err);
  });
  res.status(201).json({ id });
});

router.patch("/flash-sales/:id/cancel"''')

# Typo
edit(API + "app.ts", "process.env.NODE_NODE_ENV ===", "process.env.NODE_ENV ===")

# Frontend: send listing id with each cart item
edit(WEB + "pages/CheckoutPage.tsx",
'          items: items.map((i) => ({\n            title: i.product.title,',
'          items: items.map((i) => ({\n            id: i.product.id,\n            title: i.product.title,')
PYEOF

echo
echo "Done. Next: git add -A && git commit -m 'Fix orders, Stripe on Render, milestones' && git push"

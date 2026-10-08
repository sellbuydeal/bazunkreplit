import { getAuth, clerkClient } from "@clerk/express";
import { percentage, minor } from "../lib/marketplaceFees.js";
import { quoteCart, saveFeeSnapshot, QuoteError } from "../lib/checkoutQuote.js";
import { isBanned } from "../lib/banned.js";
import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { storage } from "../storage.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { convertAmount, smallestUnit } from "../fxRates.js";
import { logger } from "../lib/logger.js";
import { sendCreditsConfirmation, sendOrderConfirmation } from "../email.js";
import { fulfillCartSession } from "../lib/fulfillment.js";
import { sendSystemMessage } from "../lib/systemMessages.js";

const router = Router();

import { recordCreditEconomy } from "../lib/creditEconomy.js";
// 100 credits = £1
const CREDITS_PER_GBP = 100;

const PACKAGES: Record<string, { price: number; bonus: number; name: string }> = {
  starter:  { price: 5,   bonus: 0,    name: "Starter Package" },
  basic:    { price: 10,  bonus: 0.5,  name: "Basic Package" },
  popular:  { price: 25,  bonus: 2.5,  name: "Popular Package" },
  pro:      { price: 50,  bonus: 7.5,  name: "Pro Package" },
  business: { price: 100, bonus: 20,   name: "Business Package" },
};

// Falls back to a real, valid URL instead of "https://undefined" (which Stripe
// rejects) when there's no Origin header and PUBLIC_BASE_URL isn't set.
function resolveOrigin(req: import("express").Request): string {
  return (
    req.headers.origin ||
    process.env.PUBLIC_BASE_URL ||
    "https://bazunk-web.onrender.com"
  );
}

router.get("/stripe/publishable-key", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    logger.error({ err }, "Failed to get publishable key");
    res.status(500).json({ error: "Failed to get publishable key", message: String(err) });
  }
});

router.get("/stripe/balance/:email", async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const balance = await storage.getCredits(decodeURIComponent(email));
    res.json({ balance });
  } catch (err) {
    logger.error({ err }, "Failed to get balance");
    res.status(500).json({ error: "Failed to get balance", message: String(err) });
  }
});

router.post("/stripe/sync-user", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    if (await isBanned(email)) { res.status(403).json({ error: "This account has been suspended.", banned: true }); return; }
    const user = await storage.upsertUser(email, name);
    const balance = parseFloat(user.credits as string);
    res.json({ balance, username: user.username ?? null, name: user.name ?? null });
  } catch (err) {
    logger.error({ err }, "Failed to sync user");
    res.status(500).json({ error: "Failed to sync user", message: String(err) });
  }
});

router.post("/stripe/checkout", async (req, res) => {
  try {
    const { email, name, packageId, customAmount } = req.body;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    let basePrice: number;
    let bonus: number;
    let packageName: string;

    if (packageId && PACKAGES[packageId]) {
      const pkg = PACKAGES[packageId];
      basePrice = pkg.price;
      bonus = pkg.bonus;
      packageName = pkg.name;
    } else if (customAmount && customAmount > 0) {
      basePrice = parseFloat(customAmount);
      bonus =
        basePrice >= 100 ? basePrice * 0.2
        : basePrice >= 50 ? basePrice * 0.15
        : basePrice >= 25 ? basePrice * 0.1
        : basePrice >= 10 ? basePrice * 0.05
        : 0;
      packageName = "Custom Package";
    } else {
      res.status(400).json({ error: "packageId or customAmount required" }); return;
    }

    const totalCredits = basePrice + bonus;

    if (await isBanned(email)) { res.status(403).json({ error: "This account has been suspended.", banned: true }); return; }
    await storage.upsertUser(email, name);

    const stripe = await getUncachableStripeClient();

    let user = await storage.getUser(email);
    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email, name: name ?? undefined });
      await storage.setStripeCustomerId(email, customer.id);
      stripeCustomerId = customer.id;
    }

    const origin = resolveOrigin(req);

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            unit_amount: Math.round(basePrice * 100),
            product_data: {
              name: packageName,
              description: `${Math.round(totalCredits * CREDITS_PER_GBP).toLocaleString()} credits (${Math.round(basePrice * CREDITS_PER_GBP)} base + ${Math.round(bonus * CREDITS_PER_GBP)} bonus) · 100 credits = £1`,
            },
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: {
        email,
        totalCredits: totalCredits.toFixed(2),
        basePrice: basePrice.toFixed(2),
        bonusCredits: bonus.toFixed(2),
        packageName,
      },
      success_url: `${origin}/credits?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to create checkout session", message: String(err) });
  }
});

router.post("/stripe/seller-fee-estimate",async(req,res)=>{
  try {
    const auth=getAuth(req);if(!auth.isAuthenticated || !auth.userId){res.status(401).json({error:"Sign in to calculate seller fees."});return;}
    const account=await clerkClient.users.getUser(auth.userId);
    const email=account.primaryEmailAddress?.emailAddress;
    if(!email){res.status(401).json({error:"Account email required."});return;}
    const row=(await db.execute(sql`SELECT seller_type FROM users WHERE LOWER(email)=LOWER(${email}) LIMIT 1`)).rows[0] as any;
    const sellerType=String(row?.seller_type??"private");
    const settings=(await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'fee_rate_%'`)).rows as any[];
    const fees=Object.fromEntries(settings.map(r=>[r.key,r.value]));
    const rate=sellerType==="private"?0:percentage(fees[`fee_rate_${String(req.body.category??"").toLowerCase()}`],percentage(fees.fee_rate_default,8));
    const amount=minor(req.body.amount??0),fee=Math.round(amount*rate/100);
    res.json({sellerType,rate,sellerFee:fee/100,sellerNet:(amount-fee)/100,currency:"GBP"});
  }catch(err){res.status(400).json({error:"Could not calculate seller fees."});}
});

router.post("/stripe/quote-cart", async (req,res) => {
  try {
    const quote=await quoteCart(req.body.items);
    res.setHeader("Cache-Control","no-store");
    res.json({currency:quote.currency,subtotal:quote.subtotalMinor/100,privateSubtotal:quote.privateSubtotalMinor/100,buyerProtectionFee:quote.buyerProtectionMinor/100,delivery:quote.deliveryMinor/100,total:quote.totalMinor/100,protectionPercent:quote.protectionPercent,fixedProtection:quote.fixedMinor/100,items:[...new Map(quote.units.map(u=>[u.id,{id:u.id,title:u.title,price:u.priceMinor/100,sellerType:u.sellerType}])).values()]});
  } catch(err) { res.status(err instanceof QuoteError ? err.status : 500).json({error:err instanceof QuoteError ? err.message : "Could not calculate checkout fees."}); }
});

router.post("/stripe/checkout-cart", async (req, res) => {
  try {
    const body=req.body as Record<string,unknown>;
    const email=String(body.email??"").trim().toLowerCase();
    const name=typeof body.name==="string" ? body.name : undefined;
    if(!/^\S+@\S+\.\S+$/.test(email)) throw new QuoteError("A valid email is required.");
    // Credits and demo promo codes were never discounted by Stripe. Do not charge
    // a full cash price while also subtracting credits from the buyer's balance.
    if(Number(body.creditsApplied??0)>0 || body.promoCode) throw new QuoteError("Marketplace credits and promotion codes are not supported for this checkout.");
    const quote=await quoteCart(body.items);
    if(body.expectedTotal==null || Math.round(Number(body.expectedTotal)*100)!==quote.totalMinor)
      throw new QuoteError("Your cart price or fees changed. Refresh the fee breakdown before paying.",409);
    await storage.upsertUser(email,name);
    const snapshotId=await saveFeeSnapshot(quote);
    const grouped=new Map<number,{title:string;priceMinor:number;quantity:number}>();
    for(const unit of quote.units) {
      const prev=grouped.get(unit.id);if(prev) prev.quantity++;else grouped.set(unit.id,{title:unit.title,priceMinor:unit.priceMinor,quantity:1});
    }
    const lineItems=[...grouped.values()].map(item=>({price_data:{currency:"gbp",unit_amount:item.priceMinor,product_data:{name:item.title}},quantity:item.quantity}));
    if(quote.buyerProtectionMinor) lineItems.push({price_data:{currency:"gbp",unit_amount:quote.buyerProtectionMinor,product_data:{name:"Buyer Protection — personal seller items"}},quantity:1});
    if(quote.deliveryMinor) lineItems.push({price_data:{currency:"gbp",unit_amount:quote.deliveryMinor,product_data:{name:"Delivery"}},quantity:1});
    const stripe=await getUncachableStripeClient();
    let user=await storage.getUser(email);let stripeCustomerId=user?.stripeCustomerId;
    if(!stripeCustomerId) {const customer=await stripe.customers.create({email,name});await storage.setStripeCustomerId(email,customer.id);stripeCustomerId=customer.id;}
    const origin=resolveOrigin(req);
    const session=await stripe.checkout.sessions.create({customer:stripeCustomerId,client_reference_id:email,line_items:lineItems,mode:"payment",metadata:{email,type:"cart",feeQuoteId:snapshotId,feePolicy:quote.policy,chargeCurrency:"GBP",creditsApplied:"0",buyerProtectionFee:(quote.buyerProtectionMinor/100).toFixed(2),buyerProtectionPercent:String(quote.protectionPercent)},success_url:`${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,cancel_url:`${origin}/checkout`});
    res.json({url:session.url});
  } catch(err) {
    logger.error({err},"Failed to create cart checkout session");
    res.status(err instanceof QuoteError ? err.status : 500).json({error:err instanceof QuoteError ? err.message : "Failed to create checkout session"});
  }
});

router.post("/stripe/confirm-cart-payment", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = body.email as string;
    const sessionId = body.sessionId as string | undefined;
    const creditsApplied = parseFloat((body.creditsApplied as string) ?? "0") || 0;
    const freeOrder = body.freeOrder === true;

    if (!email && !sessionId) { res.status(400).json({ error: "email required" }); return; }

    if (sessionId) {
      const result = await fulfillCartSession(sessionId, email);
      if (result.status === "not_paid") { res.status(400).json({ error: "Payment not completed" }); return; }
      if (result.status === "email_mismatch") { res.status(403).json({ error: "Email mismatch" }); return; }
    } else { res.status(400).json({error:"A paid checkout session is required."}); return; }


    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to confirm cart payment");
    res.status(500).json({ error: "Failed to confirm payment", message: String(err) });
  }
});

// ── Stripe Connect (seller payouts) ──────────────────────────────────────────

// Stripe Accounts v2 recipient/Express integration. v2 account IDs remain compatible
// with Stripe-hosted Account Links and Express login links.
async function connectSellerEmail(req: import("express").Request): Promise<string | null> {
  const auth = getAuth(req);
  if (!auth.isAuthenticated || !auth.userId) return null;
  const account = await clerkClient.users.getUser(auth.userId);
  return account.primaryEmailAddress?.emailAddress?.toLowerCase() ?? null;
}

router.post("/stripe/connect/onboard", async (req, res) => {
  try {
    const email = await connectSellerEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in to connect seller payouts." }); return; }
    const { name } = (req.body || {}) as { name?: string };
    await storage.upsertUser(email, name);
    const stripe = await getUncachableStripeClient();
    let accountId = await storage.getStripeAccountId(email);
    if (!accountId) {
      // Recipient-only: Bazunk takes payment on its platform and transfers the
      // seller proceeds. Express requires the platform to collect fees/losses.
      const account = await stripe.v2.core.accounts.create({
        contact_email: email,
        display_name: name || email.split("@")[0],
        dashboard: "express",
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
        defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        metadata: { bazunk_email: email },
      } as any, { apiVersion: "2026-09-30.endive" as any });
      accountId = account.id;
      await storage.setStripeAccountId(email, accountId);
    }
    const origin = resolveOrigin(req);
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?section=seller-payouts&connect=refresh`,
      return_url: `${origin}/dashboard?section=seller-payouts&connect=success`,
      type: "account_onboarding",
    });
    res.json({ url: link.url });
  } catch (err) {
    logger.error({ err }, "Failed to create Connect onboarding link");
    res.status(503).json({ error: "Seller payouts are temporarily unavailable. Please try again later." });
  }
});

router.get("/stripe/connect/status/:email", async (req, res) => {
  try {
    const email = await connectSellerEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required." }); return; }
    if (decodeURIComponent(req.params.email).toLowerCase() !== email) { res.status(403).json({ error: "Forbidden" }); return; }
    const accountId = await storage.getStripeAccountId(email);
    if (!accountId) { res.json({ connected: false, chargesEnabled: false, payoutsEnabled: false, accountId: null }); return; }
    const stripe = await getUncachableStripeClient();
    const account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient", "requirements"] } as any, { apiVersion: "2026-09-30.endive" as any });
    const recipient = (account as any).configuration?.recipient;
    const transfers = recipient?.capabilities?.stripe_balance?.stripe_transfers;
    const payouts = recipient?.capabilities?.stripe_balance?.payouts;
    const active = transfers?.status === "active";
    res.json({
      connected: true, chargesEnabled: active, payoutsEnabled: active && (payouts == null || payouts.status === "active"),
      accountId, detailsSubmitted: active,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get Connect status");
    res.status(503).json({ error: "Could not check payout status." });
  }
});

router.get("/stripe/connect/dashboard-link/:email", async (req, res) => {
  try {
    const email = await connectSellerEmail(req);
    if (!email) { res.status(401).json({ error: "Sign in required." }); return; }
    if (decodeURIComponent(req.params.email).toLowerCase() !== email) { res.status(403).json({ error: "Forbidden" }); return; }
    const accountId = await storage.getStripeAccountId(email);
    if (!accountId) { res.status(404).json({ error: "No connected account" }); return; }
    const stripe = await getUncachableStripeClient();
    const link = await stripe.accounts.createLoginLink(accountId);
    res.json({ url: link.url });
  } catch (err) {
    logger.error({ err }, "Failed to create dashboard link");
    res.status(503).json({ error: "Could not open Stripe payout dashboard." });
  }
});

router.post("/stripe/apply-credits", async (req, res) => {
  try {
    const { sessionId, email } = req.body;
    if (!sessionId || !email) { res.status(400).json({ error: "sessionId and email required" }); return; }

    const alreadyApplied = await storage.hasCreditTransaction(sessionId);
    if (alreadyApplied) {
      const balance = await storage.getCredits(email);
      res.json({ success: true, alreadyApplied: true, balance }); return;
    }

    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.status(400).json({ error: "Payment not completed" }); return;
    }

    if (session.client_reference_id !== email) {
      res.status(403).json({ error: "Email mismatch" }); return;
    }

    const totalCredits = parseFloat(session.metadata?.totalCredits ?? "0");
    if (totalCredits <= 0) {
      res.status(400).json({ error: "Invalid credit amount in session" }); return;
    }

    await storage.upsertUser(email);
    await storage.recordCreditTransaction(sessionId, email, totalCredits);
    const balance = await storage.addCredits(email, totalCredits);
    await recordCreditEconomy({ email, kind: "purchased", credits: totalCredits, cashAmount: (session.amount_total ?? 0) / 100, currency: session.currency?.toUpperCase() ?? "GBP", reason: session.metadata?.packageName || "Credit purchase", referenceType: "stripe_checkout", referenceId: session.id, metadata: { bonusCredits: Number(session.metadata?.bonusCredits || 0), paymentStatus: session.payment_status } });

    void sendCreditsConfirmation({ email, creditsAdded: totalCredits, newBalance: balance });
    void sendSystemMessage(email, {
      category: "Credits",
      subject: "Credits added to your account",
      body:
        `We've added ${Math.round(totalCredits * 100)} credits (\u00A3${totalCredits.toFixed(2)}) to your account.\n\n` +
        `Your new balance is ${Math.round(Number(balance) * 100)} credits.`,
    });

    res.json({ success: true, creditsAdded: totalCredits, balance });
  } catch (err) {
    logger.error({ err }, "Failed to apply credits");
    res.status(500).json({ error: "Failed to apply credits", message: String(err) });
  }
});

export default router;


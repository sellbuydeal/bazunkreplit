import { Router } from "express";
import { storage } from "../storage.js";
import { getUncachableStripeClient, getStripePublishableKey } from "../stripeClient.js";
import { convertAmount, smallestUnit } from "../fxRates.js";
import { logger } from "../lib/logger.js";
import { sendCreditsConfirmation, sendOrderConfirmation } from "../email.js";

const router = Router();

// 100 credits = £1
const CREDITS_PER_GBP = 100;

const PACKAGES: Record<string, { price: number; bonus: number; name: string }> = {
  starter:  { price: 5,   bonus: 0,    name: "Starter Package" },
  basic:    { price: 10,  bonus: 0.5,  name: "Basic Package" },
  popular:  { price: 25,  bonus: 2.5,  name: "Popular Package" },
  pro:      { price: 50,  bonus: 7.5,  name: "Pro Package" },
  business: { price: 100, bonus: 20,   name: "Business Package" },
};

router.get("/stripe/publishable-key", async (_req, res) => {
  try {
    const publishableKey = await getStripePublishableKey();
    res.json({ publishableKey });
  } catch (err) {
    logger.error({ err }, "Failed to get publishable key");
    res.status(500).json({ error: "Failed to get publishable key" });
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
    res.status(500).json({ error: "Failed to get balance" });
  }
});

router.post("/stripe/sync-user", async (req, res) => {
  try {
    const { email, name } = req.body;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    const user = await storage.upsertUser(email, name);
    const balance = parseFloat(user.credits as string);
    res.json({ balance });
  } catch (err) {
    logger.error({ err }, "Failed to sync user");
    res.status(500).json({ error: "Failed to sync user" });
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

    await storage.upsertUser(email, name);

    const stripe = await getUncachableStripeClient();

    let user = await storage.getUser(email);
    let stripeCustomerId = user?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email, name: name ?? undefined });
      await storage.setStripeCustomerId(email, customer.id);
      stripeCustomerId = customer.id;
    }

    const origin = req.headers.origin || `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

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
      },
      success_url: `${origin}/credits?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/credits`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/stripe/checkout-cart", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = body.email as string;
    const name = body.name as string | undefined;
    const items = body.items as Array<{ title: string; price: number; quantity: number; currency?: string; priceGbp?: number }>;
    const total = parseFloat(body.total as string);
    const creditsApplied = parseFloat((body.creditsApplied as string) ?? "0") || 0;
    const deliveryGbp = parseFloat((body.deliveryGbp as string) ?? "0") || 0;

    if (!email || !items?.length) {
      res.status(400).json({ error: "email and items are required" }); return;
    }

    await storage.upsertUser(email, name);

    if (total <= 0) {
      res.json({ freeOrder: true });
      return;
    }

    // Determine charge currency — use uniform item currency, else fall back to GBP
    const itemCurrencies = items.map((i) => (i.currency ?? "GBP").toUpperCase());
    const allSame = itemCurrencies.every((c) => c === itemCurrencies[0]);
    const chargeCurrency = allSame ? itemCurrencies[0] : "GBP";

    // Build line items, converting amounts to charge currency as needed
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const itemCurrency = (item.currency ?? "GBP").toUpperCase();
        let chargeAmount: number;
        if (itemCurrency === chargeCurrency) {
          chargeAmount = item.price;
        } else {
          const gbp = item.priceGbp ?? await convertAmount(item.price, itemCurrency, "GBP");
          chargeAmount = chargeCurrency === "GBP" ? gbp : await convertAmount(gbp, "GBP", chargeCurrency);
        }
        return {
          price_data: {
            currency: chargeCurrency.toLowerCase(),
            unit_amount: smallestUnit(chargeAmount, chargeCurrency),
            product_data: { name: item.title },
          },
          quantity: item.quantity,
        };
      })
    );

    // Delivery — always provided in GBP, convert if needed
    if (deliveryGbp > 0) {
      const deliveryCharge = chargeCurrency === "GBP"
        ? deliveryGbp
        : await convertAmount(deliveryGbp, "GBP", chargeCurrency);
      lineItems.push({
        price_data: {
          currency: chargeCurrency.toLowerCase(),
          unit_amount: smallestUnit(deliveryCharge, chargeCurrency),
          product_data: { name: "Delivery" },
        },
        quantity: 1,
      });
    }

    const stripe = await getUncachableStripeClient();

    let user = await storage.getUser(email);
    let stripeCustomerId = user?.stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email, name: name ?? undefined });
      await storage.setStripeCustomerId(email, customer.id);
      stripeCustomerId = customer.id;
    }

    const origin = req.headers.origin || `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      client_reference_id: email,
      line_items: lineItems,
      mode: "payment",
      metadata: {
        email,
        type: "cart",
        creditsApplied: creditsApplied.toFixed(2),
        chargeCurrency,
      },
      success_url: `${origin}/checkout?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error({ err }, "Failed to create cart checkout session");
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

router.post("/stripe/confirm-cart-payment", async (req, res) => {
  try {
    const body = req.body as Record<string, unknown>;
    const email = body.email as string;
    const sessionId = body.sessionId as string | undefined;
    const creditsApplied = parseFloat((body.creditsApplied as string) ?? "0") || 0;
    const freeOrder = body.freeOrder === true;

    if (!email) { res.status(400).json({ error: "email required" }); return; }

    if (sessionId) {
      const alreadyApplied = await storage.hasCreditTransaction(`cart-${sessionId}`);
      if (alreadyApplied) {
        res.json({ success: true, alreadyApplied: true }); return;
      }

      const stripe = await getUncachableStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        res.status(400).json({ error: "Payment not completed" }); return;
      }
      if (session.client_reference_id !== email) {
        res.status(403).json({ error: "Email mismatch" }); return;
      }

      const sessionCredits = parseFloat(session.metadata?.creditsApplied ?? "0") || 0;
      await storage.recordCreditTransaction(`cart-${sessionId}`, email, 0);
      if (sessionCredits > 0) {
        await storage.addCredits(email, -sessionCredits);
      }
      // Send order confirmation (fire-and-forget)
      const cartItems = body.items as Array<{ title: string; price: number; quantity: number }> | undefined;
      if (cartItems?.length) {
        const paidTotal = parseFloat(body.total as string ?? "0") || 0;
        void sendOrderConfirmation({ email, name: body.name as string | undefined, items: cartItems, total: paidTotal });
      }
    } else if (freeOrder) {
      if (creditsApplied > 0) {
        await storage.addCredits(email, -creditsApplied);
      }
      const cartItems = body.items as Array<{ title: string; price: number; quantity: number }> | undefined;
      if (cartItems?.length) {
        void sendOrderConfirmation({ email, name: body.name as string | undefined, items: cartItems, total: 0 });
      }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to confirm cart payment");
    res.status(500).json({ error: "Failed to confirm payment" });
  }
});

// ── Stripe Connect (seller payouts) ──────────────────────────────────────────

router.post("/stripe/connect/onboard", async (req, res) => {
  try {
    const { email, name, returnUrl } = req.body as { email: string; name?: string; returnUrl?: string };
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    await storage.upsertUser(email, name);
    const stripe = await getUncachableStripeClient();

    let accountId = await storage.getStripeAccountId(email);

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: "individual",
        metadata: { bazunk_email: email },
      });
      accountId = account.id;
      await storage.setStripeAccountId(email, accountId);
    }

    const origin = returnUrl ?? req.headers.origin ?? `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?section=seller-payouts&connect=refresh`,
      return_url:  `${origin}/dashboard?section=seller-payouts&connect=success`,
      type: "account_onboarding",
    });

    res.json({ url: link.url, accountId });
  } catch (err) {
    logger.error({ err }, "Failed to create Connect onboarding link");
    res.status(500).json({ error: "Failed to start onboarding" });
  }
});

router.get("/stripe/connect/status/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const accountId = await storage.getStripeAccountId(email);

    if (!accountId) {
      res.json({ connected: false, chargesEnabled: false, payoutsEnabled: false, accountId: null });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const account = await stripe.accounts.retrieve(accountId);

    res.json({
      connected: true,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountId,
      detailsSubmitted: account.details_submitted,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get Connect status");
    res.status(500).json({ error: "Failed to get connect status" });
  }
});

router.get("/stripe/connect/dashboard-link/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const accountId = await storage.getStripeAccountId(email);

    if (!accountId) {
      res.status(404).json({ error: "No connected account" }); return;
    }

    const stripe = await getUncachableStripeClient();
    const link = await stripe.accounts.createLoginLink(accountId);
    res.json({ url: link.url });
  } catch (err) {
    logger.error({ err }, "Failed to create dashboard link");
    res.status(500).json({ error: "Failed to get dashboard link" });
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

    void sendCreditsConfirmation({ email, creditsAdded: totalCredits, newBalance: balance });

    res.json({ success: true, creditsAdded: totalCredits, balance });
  } catch (err) {
    logger.error({ err }, "Failed to apply credits");
    res.status(500).json({ error: "Failed to apply credits" });
  }
});

export default router;

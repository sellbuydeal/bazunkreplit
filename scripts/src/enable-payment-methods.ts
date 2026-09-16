import { getUncachableStripeClient } from "./stripeClient.js";

async function enablePaymentMethods() {
  const stripe = await getUncachableStripeClient();

  console.log("Fetching payment method configurations…");
  const configs = await stripe.paymentMethodConfigurations.list();

  if (configs.data.length === 0) {
    console.log("No payment method configurations found. Stripe will use account defaults.");
    console.log("Klarna and PayPal can be enabled at: https://dashboard.stripe.com/settings/payment_methods");
    return;
  }

  const defaultConfig = configs.data.find((c: any) => c.is_default) ?? configs.data[0];
  console.log(`Using configuration: ${defaultConfig.id} (default: ${defaultConfig.is_default})`);
  console.log(`Current klarna: ${JSON.stringify((defaultConfig as any).klarna)}`);
  console.log(`Current paypal: ${JSON.stringify((defaultConfig as any).paypal)}`);

  console.log("\nEnabling Klarna and PayPal…");

  const updated = await stripe.paymentMethodConfigurations.update(defaultConfig.id, {
    klarna: { display_preference: { preference: "on" } },
    paypal: { display_preference: { preference: "on" } },
  } as any);

  console.log(`\n✓ Klarna: ${JSON.stringify((updated as any).klarna?.display_preference)}`);
  console.log(`✓ PayPal: ${JSON.stringify((updated as any).paypal?.display_preference)}`);
  console.log("\nDone! Klarna and PayPal are now enabled in Stripe Checkout.");
}

enablePaymentMethods().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

import { getUncachableStripeClient } from "./stripeClient.js";

const PACKAGES = [
  { id: "starter",  name: "Starter Package",  price: 500,   bonus: 0,    description: "Great for trying out promotions" },
  { id: "basic",    name: "Basic Package",     price: 1000,  bonus: 50,   description: "Perfect for occasional sellers" },
  { id: "popular",  name: "Popular Package",   price: 2500,  bonus: 250,  description: "Best value for active sellers" },
  { id: "pro",      name: "Pro Package",       price: 5000,  bonus: 750,  description: "For power sellers who want maximum reach" },
  { id: "business", name: "Business Package",  price: 10000, bonus: 2000, description: "Ideal for high-volume stores" },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();
  console.log("Creating Bazunk credit packages in Stripe...\n");

  for (const pkg of PACKAGES) {
    const existing = await stripe.products.search({
      query: `name:'${pkg.name}' AND active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`✓ ${pkg.name} already exists (${existing.data[0].id})`);
      continue;
    }

    const product = await stripe.products.create({
      name: pkg.name,
      description: pkg.description,
      metadata: {
        packageId: pkg.id,
        bonusPence: pkg.bonus.toString(),
        totalCreditsPence: (pkg.price + pkg.bonus).toString(),
      },
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: pkg.price,
      currency: "gbp",
    });

    console.log(`✓ Created ${pkg.name}: £${(pkg.price / 100).toFixed(2)} → price ID ${price.id}`);
  }

  console.log("\nDone! Webhooks will sync these products to your database automatically.");
}

seedProducts().catch((err) => {
  console.error("Error seeding products:", err.message);
  process.exit(1);
});

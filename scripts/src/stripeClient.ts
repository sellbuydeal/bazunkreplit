import Stripe from "stripe";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), { apiVersion: "2025-08-27.basil" as any });
}

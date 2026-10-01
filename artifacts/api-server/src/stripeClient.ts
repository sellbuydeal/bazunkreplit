import Stripe from "stripe";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. Add it in your host's environment variables.`);
  }
  return value;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string> {
  return process.env.STRIPE_PUBLISHABLE_KEY ?? "";
}

export async function getStripeSecretKey(): Promise<string> {
  return requireEnv("STRIPE_SECRET_KEY");
}

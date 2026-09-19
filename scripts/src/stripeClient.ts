/**
 * Drop-in replacement for artifacts/api-server/src/stripeClient.ts
 *
 * Reads Stripe credentials from plain environment variables (Render doesn't
 * have Replit's connector service). Required env vars on the API service:
 *   STRIPE_SECRET_KEY        sk_live_... (or sk_test_...)
 *   STRIPE_PUBLISHABLE_KEY   pk_live_... (or pk_test_...)
 *   STRIPE_WEBHOOK_SECRET    whsec_...   (from the endpoint you created in
 *                                          the Stripe Dashboard)
 */

import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is not set. Add it in Render > your service > Environment.`,
    );
  }
  return value;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2025-08-27.basil" as any,
  });
}

export async function getStripePublishableKey(): Promise<string> {
  return requireEnv("STRIPE_PUBLISHABLE_KEY");
}

export async function getStripeSecretKey(): Promise<string> {
  return requireEnv("STRIPE_SECRET_KEY");
}

export async function getStripeSync(): Promise<StripeSync> {
  return new StripeSync({
    poolConfig: { connectionString: requireEnv("DATABASE_URL"), max: 2 },
    stripeSecretKey: requireEnv("STRIPE_SECRET_KEY"),
    stripeWebhookSecret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  });
}


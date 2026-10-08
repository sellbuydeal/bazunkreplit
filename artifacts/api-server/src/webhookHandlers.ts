import type Stripe from "stripe";
import { getUncachableStripeClient } from "./stripeClient.js";
import { fulfillCartSession } from "./lib/fulfillment.js";
import { fulfillPostage } from "./routes/postage.js";

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. " +
        "Ensure the webhook route is registered BEFORE app.use(express.json())."
      );
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }
    const stripe = await getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.type === "cart") await fulfillCartSession(session.id);
      if (session.metadata?.type === "shippo_postage") await fulfillPostage(session.id);
    }
  }
}

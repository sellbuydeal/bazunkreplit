import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { WebhookHandlers } from "./webhookHandlers.js";
import { handleDiditWebhook } from "./routes/verification.js";

const app: Express = express();

// Render terminates TLS in front of us — trust it so req.protocol / IPs are right
app.set("trust proxy", 1);

// Didit KYC webhook — must come before express.json() so body stays as a Buffer
app.post(
  "/api/verification/webhook",
  express.raw({ type: "application/json" }),
  handleDiditWebhook,
);

// Stripe webhook — must come before express.json() so body stays as a Buffer
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: unknown) {
      logger.error({ err }, "Webhook processing error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Restrict browsers to your frontend(s). CORS_ORIGINS = comma-separated list.
// If unset, any origin is allowed (fine while testing, tighten for production).
const allowedOrigins = [...new Set([...(process.env.CORS_ORIGINS ?? "").split(","), "https://bazunk-web.onrender.com", "https://bazunkreplit.onrender.com"].map((o) => o.trim().replace(/\/$/, "")).filter(Boolean))];
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// No route reads Clerk auth server-side, and clerkMiddleware throws on EVERY
// request when CLERK_SECRET_KEY is missing — so only mount it when configured.
if (process.env.CLERK_SECRET_KEY && process.env.CLERK_PUBLISHABLE_KEY) {
  app.use(clerkMiddleware());
}

app.use("/api", router);

// Global Error Handler - Logs runtime errors directly to stdout/Render logs
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("🚨 UNCAUGHT EXPRESS ERROR:", err.stack || err);
  res.status(500).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

export default app;

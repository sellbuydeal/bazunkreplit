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
const allowedOrigins = [...new Set([
  ...(process.env.CORS_ORIGINS ?? "").split(","),
  "https://bazunk.com",
  "https://www.bazunk.com",
  "https://bazunk-web.onrender.com",
].map((o) => o.trim().replace(/\/$/, "")).filter(Boolean))];
app.use(
  cors({
    credentials: true,
    origin: allowedOrigins.length ? allowedOrigins : true,
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Seller/account routes use getAuth(req), so Clerk middleware must be mounted
// whenever the server-side Clerk secret is configured. The publishable key is
// a frontend concern and must not disable API authentication.
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
} else {
  logger.warn("CLERK_SECRET_KEY is missing; authenticated marketplace API routes will return 401/500 until configured");
}

// AliExpress redirects to the marketplace domain; forward the one-time code server-to-server.
app.get("/api/integrations/aliexpress/callback", async (req: Request, res: Response): Promise<void> => {
  const code=typeof req.query.code==="string"?req.query.code:"";
  const state=typeof req.query.state==="string"?req.query.state:"";
  const token=process.env.ALIEXPRESS_INTERNAL_TOKEN;
  if(!code||!state){res.status(400).send("AliExpress authorization missing code or state. Start from Bazunk admin.");return;}
  if(!token){res.status(503).send("AliExpress internal connection is not configured.");return;}
  try {
    const url=new URL("/internal/aliexpress/oauth/callback","https://bazunk-platform-core-api.onrender.com");
    url.searchParams.set("code",code);url.searchParams.set("state",state);
    const response=await fetch(url,{headers:{"x-internal-token":token},signal:AbortSignal.timeout(20000)});
    if(!response.ok){logger.error({status:response.status},"AliExpress OAuth callback failed");res.status(502).send("AliExpress connection failed. Please retry authorization from Bazunk admin.");return;}
    res.status(200).send("AliExpress connected successfully. You can close this window.");
  }catch(err){logger.error({err},"AliExpress OAuth forwarding failed");res.status(502).send("AliExpress connection unavailable. Please retry.");}
});

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

import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { getUncachableStripeClient } from "../stripeClient.js";

const router = Router();

// GET /api/setup/status — public, returns env/config health
router.get("/setup/status", async (_req, res) => {
  const checks: Record<string, { ok: boolean; label: string; hint: string }> = {
    database: {
      ok: !!process.env.DATABASE_URL,
      label: "Database (DATABASE_URL)",
      hint: "Set DATABASE_URL to a PostgreSQL connection string.",
    },
    session: {
      ok: !!process.env.SESSION_SECRET,
      label: "Session Secret (SESSION_SECRET)",
      hint: "Set SESSION_SECRET to a long random string for security.",
    },
    adminPassword: {
      ok: !!process.env.ADMIN_PASSWORD,
      label: "Admin Password (ADMIN_PASSWORD)",
      hint: "Set ADMIN_PASSWORD — default is admin123 which is insecure.",
    },
    stripe: {
      ok: false,
      label: "Stripe Payments",
      hint: "Connect Stripe via the Replit Stripe integration.",
    },
  };

  // Live-test Stripe
  try {
    const stripe = await getUncachableStripeClient();
    await stripe.balance.retrieve();
    checks.stripe.ok = true;
  } catch {
    checks.stripe.ok = false;
  }

  let setupComplete = false;
  try {
    const rows = await db.execute(sql`SELECT value FROM site_settings WHERE key = 'setup_complete'`).then(r => r.rows as any[]);
    setupComplete = rows[0]?.value === "true";
  } catch { /* DB might not be ready */ }

  res.json({ checks, setupComplete });
});

// POST /api/setup/init — save initial branding and mark complete
router.post("/setup/init", async (req, res) => {
  try {
    const allowed = ["site_name", "site_tagline", "hero_title", "hero_subtitle", "primary_color", "secondary_color"];
    const body = req.body as Record<string, string>;

    for (const key of allowed) {
      if (body[key]) {
        await db.execute(
          sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${body[key]}, NOW())
              ON CONFLICT (key) DO UPDATE SET value = ${body[key]}, updated_at = NOW()`
        );
      }
    }

    await db.execute(
      sql`INSERT INTO site_settings (key, value, updated_at) VALUES ('setup_complete', 'true', NOW())
          ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`
    );

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Setup init failed");
    res.status(500).json({ error: "Failed to save settings" });
  }
});

export default router;

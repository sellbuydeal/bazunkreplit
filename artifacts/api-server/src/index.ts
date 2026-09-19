import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { startSyncJob } from "./lib/syncJob.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }
  try {
    logger.info("Initializing Stripe schema…");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    stripeSync.syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err: unknown) => logger.error({ err }, "Stripe backfill error"));
  } catch (err) {
    logger.error({ err }, "Stripe initialization failed");
  }
}

async function runAppMigrations() {
  // Runs each migration statement independently so one missing/failing
  // statement (e.g. a table that references another table that doesn't
  // exist yet) no longer skips every statement after it. Each failure is
  // logged with a label so it's easy to see exactly which one failed.
  const run = async (q: any, label: string) => {
    try {
      await db.execute(q);
    } catch (err) {
      logger.error({ err, label }, "Migration statement failed");
    }
  };

  await run(sql`
    CREATE TABLE IF NOT EXISTS user_milestones (
      email TEXT NOT NULL,
      milestone_id TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      claimed BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (email, milestone_id)
    )
  `, "user_milestones");

  await run(sql`
    ALTER TABLE user_milestones ADD COLUMN IF NOT EXISTS claimed BOOLEAN NOT NULL DEFAULT FALSE
  `, "user_milestones.claimed");

  await run(sql`
    CREATE TABLE IF NOT EXISTS product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "product_categories");

  await run(sql`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC(10, 2) NOT NULL DEFAULT 0,
      category_id TEXT REFERENCES product_categories(id) ON DELETE SET NULL,
      seller_email TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      inventory INTEGER NOT NULL DEFAULT 0,
      condition TEXT NOT NULL DEFAULT 'new',
      tags TEXT,
      images JSONB NOT NULL DEFAULT '[]',
      variants JSONB NOT NULL DEFAULT '[]',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "products");

  await run(sql`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      buyer_email TEXT NOT NULL,
      seller_email TEXT,
      item_title TEXT NOT NULL,
      item_image TEXT,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      tracking_number TEXT,
      carrier TEXT,
      estimated_delivery TEXT,
      address TEXT,
      notes TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "orders");

  await run(sql`
    CREATE TABLE IF NOT EXISTS returns (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      seller_email TEXT,
      item_title TEXT NOT NULL,
      reason TEXT NOT NULL,
      condition TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'requested',
      admin_notes TEXT,
      refund_amount TEXT,
      return_tracking TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "returns");

  await run(sql`
    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      order_id TEXT,
      buyer_email TEXT NOT NULL,
      seller_email TEXT,
      item_title TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      resolution_notes TEXT,
      refund_amount TEXT,
      admin_email TEXT,
      seller_response TEXT,
      evidence_urls TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      resolved_at TIMESTAMP WITH TIME ZONE
    )
  `, "disputes");

  await run(sql`
    CREATE TABLE IF NOT EXISTS auctions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      images JSONB NOT NULL DEFAULT '[]',
      category TEXT,
      condition TEXT NOT NULL DEFAULT 'used',
      seller_email TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      starting_bid NUMERIC(10,2) NOT NULL DEFAULT 1.00,
      reserve_price NUMERIC(10,2),
      bid_increment NUMERIC(10,2) NOT NULL DEFAULT 1.00,
      current_bid NUMERIC(10,2),
      bid_count INTEGER NOT NULL DEFAULT 0,
      winner_email TEXT,
      winner_name TEXT,
      winner_bid NUMERIC(10,2),
      end_time TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "auctions");

  await run(sql`
    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
      bidder_email TEXT NOT NULL,
      bidder_name TEXT NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "bids");

  await run(sql`
    CREATE TABLE IF NOT EXISTS flash_sales (
      id TEXT PRIMARY KEY,
      seller_email TEXT NOT NULL,
      seller_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image TEXT,
      category TEXT,
      original_price NUMERIC(10,2) NOT NULL,
      sale_price NUMERIC(10,2) NOT NULL,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'upcoming',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "flash_sales");

  await run(sql`
    ALTER TABLE flash_sales ADD COLUMN IF NOT EXISTS sale_type TEXT NOT NULL DEFAULT 'standard'
  `, "flash_sales.sale_type");

  await run(sql`
    CREATE TABLE IF NOT EXISTS treasure_tokens (
      id TEXT PRIMARY KEY,
      hunt_date DATE NOT NULL,
      position_id TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      page_path TEXT NOT NULL,
      hint TEXT NOT NULL,
      credit_value INTEGER NOT NULL DEFAULT 20,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(hunt_date, position_id)
    )
  `, "treasure_tokens");

  await run(sql`
    CREATE TABLE IF NOT EXISTS treasure_claims (
      id TEXT PRIMARY KEY,
      token_code TEXT NOT NULL,
      user_email TEXT NOT NULL,
      credit_value INTEGER NOT NULL,
      claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(token_code, user_email)
    )
  `, "treasure_claims");

  await run(sql`
    CREATE TABLE IF NOT EXISTS user_hunt_credits (
      user_email TEXT PRIMARY KEY,
      total_credits INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "user_hunt_credits");

  await run(sql`
    CREATE TABLE IF NOT EXISTS supplier_imports (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER REFERENCES listings(id) ON DELETE CASCADE,
      supplier_source TEXT NOT NULL DEFAULT 'aliexpress',
      supplier_id TEXT NOT NULL,
      supplier_url TEXT NOT NULL,
      supplier_price NUMERIC(10,2) NOT NULL,
      supplier_currency TEXT NOT NULL DEFAULT 'USD',
      markup_type TEXT NOT NULL DEFAULT 'percentage',
      markup_value NUMERIC(10,2) NOT NULL DEFAULT 30,
      last_synced_at TIMESTAMP WITH TIME ZONE,
      sync_status TEXT NOT NULL DEFAULT 'pending',
      sync_error TEXT,
      supplier_data JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "supplier_imports");

  await run(sql`
    CREATE TABLE IF NOT EXISTS reward_games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🎮',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      credits_min INTEGER NOT NULL DEFAULT 5,
      credits_max INTEGER NOT NULL DEFAULT 50,
      daily_plays_per_user INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "reward_games");

  await run(sql`
    CREATE TABLE IF NOT EXISTS reward_plays (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL REFERENCES reward_games(id) ON DELETE CASCADE,
      user_email TEXT NOT NULL,
      credits_earned INTEGER NOT NULL DEFAULT 0,
      played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "reward_plays");

  await run(sql`
    INSERT INTO reward_games (id, name, description, icon, enabled, credits_min, credits_max, daily_plays_per_user)
    VALUES
      ('daily-checkin',  'Daily Check-In',   'Show up every day and earn free credits instantly.',                              '📅', TRUE, 10, 10,  1),
      ('spin-wheel',     'Spin the Wheel',   'Give the wheel a spin and land on a random credit prize.',                       '🎡', TRUE,  5, 50,  1),
      ('daily-quiz',     'Daily Quiz',       'Answer today''s marketplace question correctly to earn credits.',                '❓', TRUE, 15, 15,  1),
      ('scratch-card',   'Scratch Card',     'Scratch to reveal your prize — 70% chance of winning each card.',               '🎁', TRUE,  5, 30,  3),
      ('word-scramble',  'Word Scramble',    'Unscramble the daily marketplace word to pocket the credits.',                   '🔤', TRUE, 20, 20,  1)
    ON CONFLICT (id) DO NOTHING
  `, "reward_games.seed");

  // ── Didit KYC verification ──────────────────────────────────────────────
  await run(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
  `, "users.verification_status");

  await run(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE
  `, "users.verification_date");

  await run(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS didit_verification_id TEXT
  `, "users.didit_verification_id");

  await run(sql`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_account_id TEXT
  `, "users.stripe_account_id");

  await run(sql`
    CREATE TABLE IF NOT EXISTS verification_webhook_logs (
      id          SERIAL PRIMARY KEY,
      session_id  TEXT,
      vendor_data TEXT,
      event_type  TEXT NOT NULL DEFAULT 'webhook',
      status      TEXT NOT NULL DEFAULT 'pending',
      raw_payload JSONB,
      created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "verification_webhook_logs");

  await run(sql`
    CREATE INDEX IF NOT EXISTS idx_vwl_session_id   ON verification_webhook_logs (session_id)
  `, "idx_vwl_session_id");

  await run(sql`
    CREATE INDEX IF NOT EXISTS idx_vwl_created_at   ON verification_webhook_logs (created_at DESC)
  `, "idx_vwl_created_at");

  // Seed default fee rates (5% for all categories) — DO NOTHING if already set
  await run(sql`
    INSERT INTO site_settings (key, value, updated_at) VALUES
      ('fee_rate_default',              '5', NOW()),
      ('fee_listing_free',           'true', NOW()),
      ('fee_rate_electronics',           '5', NOW()),
      ('fee_rate_cell-phones',           '5', NOW()),
      ('fee_rate_clothing-shoes-jewelry','5', NOW()),
      ('fee_rate_automotive',            '5', NOW()),
      ('fee_rate_home-garden',           '5', NOW()),
      ('fee_rate_sports-outdoors',       '5', NOW()),
      ('fee_rate_toys-games',            '5', NOW()),
      ('fee_rate_books',                 '5', NOW()),
      ('fee_rate_cds-vinyl',             '5', NOW()),
      ('fee_rate_beauty-personal-care',  '5', NOW()),
      ('fee_rate_baby-products',         '5', NOW()),
      ('fee_rate_health-household',      '5', NOW()),
      ('fee_rate_arts-crafts-sewing',    '5', NOW()),
      ('fee_rate_appliances',            '5', NOW()),
      ('fee_rate_eco-friendly',          '5', NOW())
    ON CONFLICT (key) DO NOTHING
  `, "site_settings.seed");

  logger.info("App migrations complete");
}

// Start listening immediately so the port is bound and health checks pass
// right away. Migrations and Stripe init run in the background.
app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});

runAppMigrations()
  .then(() => {
    startSyncJob();
    return initStripe();
  })
  .catch((err: unknown) => logger.error({ err }, "Startup initialization error"));

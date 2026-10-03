import app from "./app.js";
import { logger } from "./lib/logger.js";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { startSyncJob } from "./lib/syncJob.js";
import { loadRapidApiKeyFromDb } from "./lib/rapidapi.js";
import { startListingScheduler } from "./lib/scheduler.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
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

  // ── Base tables (mirror lib/db/src/schema + site_settings) ───────────────
  // These used to be created by `drizzle-kit push` on Replit. Creating them
  // here means a brand-new Render Postgres works with no manual step.
  await run(sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      stripe_customer_id TEXT,
      stripe_account_id TEXT,
      credits NUMERIC(10,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      verification_status TEXT NOT NULL DEFAULT 'unverified',
      verification_date TIMESTAMP WITH TIME ZONE,
      didit_verification_id TEXT
    )
  `, "users");

  await run(sql`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      credits_added NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `, "credit_transactions");

  await run(sql`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      public_id TEXT UNIQUE,
      title TEXT NOT NULL,
      price NUMERIC(10,2) NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      description TEXT NOT NULL,
      condition TEXT NOT NULL DEFAULT 'good',
      image TEXT,
      views INTEGER NOT NULL DEFAULT 0,
      watchers INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      seller_email TEXT NOT NULL,
      seller_name TEXT,
      seller_username TEXT,
      tags TEXT,
      extra_categories TEXT,
      specifications TEXT,
      currency TEXT NOT NULL DEFAULT 'GBP',
      price_gbp NUMERIC(10,2),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "listings");

  await run(sql`
    CREATE TABLE IF NOT EXISTS listing_promotions (
      id SERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "listing_promotions");

  await run(sql`
    CREATE TABLE IF NOT EXISTS classified_ads (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT,
      type TEXT NOT NULL DEFAULT 'offer',
      price NUMERIC(10,2),
      price_label TEXT,
      negotiable BOOLEAN NOT NULL DEFAULT FALSE,
      condition TEXT,
      location TEXT NOT NULL,
      contact_name TEXT NOT NULL,
      contact_email TEXT,
      contact_phone TEXT,
      urgency TEXT,
      photos TEXT,
      external_link TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      expires_at TIMESTAMP WITH TIME ZONE,
      posted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "classified_ads");

  await run(sql`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "site_settings");

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

  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT`, "orders.stripe_session_id");
  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS line_no INTEGER`, "orders.line_no");
  await run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS orders_session_line_uniq ON orders (stripe_session_id, line_no)`,
    "orders_session_line_uniq",
  );

  await run(sql`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'general',
      status TEXT NOT NULL DEFAULT 'open',
      priority TEXT NOT NULL DEFAULT 'normal',
      kind TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "support_tickets");
  await run(sql`ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS kind TEXT`, "support_tickets.kind");
  await run(sql`CREATE INDEX IF NOT EXISTS support_tickets_email_idx ON support_tickets (email)`, "support_tickets_email_idx");
  await run(
    sql`CREATE UNIQUE INDEX IF NOT EXISTS support_tickets_email_kind_uniq ON support_tickets (email, kind) WHERE kind IS NOT NULL`,
    "support_tickets_email_kind_uniq",
  );
  await run(sql`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id SERIAL PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      author TEXT NOT NULL,
      author_type TEXT NOT NULL,
      body TEXT NOT NULL,
      read_by_user BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    )
  `, "support_ticket_messages");
  await run(
    sql`ALTER TABLE support_ticket_messages ADD COLUMN IF NOT EXISTS read_by_user BOOLEAN NOT NULL DEFAULT FALSE`,
    "support_ticket_messages.read_by_user",
  );
  await run(
    sql`CREATE INDEX IF NOT EXISTS support_ticket_messages_ticket_idx ON support_ticket_messages (ticket_id)`,
    "support_ticket_messages_ticket_idx",
  );

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
      ('fee_rate_eco-friendly',          '5', NOW()),
      ('fee_rate_digital',               '5', NOW()),
      ('fee_rate_adult',                 '5', NOW())
    ON CONFLICT (key) DO NOTHING
  `, "site_settings.seed");

  // ── Buyer / seller marketplace messaging ──
  await run(sql`CREATE TABLE IF NOT EXISTS marketplace_conversations (
    id BIGSERIAL PRIMARY KEY, listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_email TEXT NOT NULL, seller_email TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id,buyer_email,seller_email)
  )`, "marketplace_conversations");
  await run(sql`CREATE TABLE IF NOT EXISTS marketplace_messages (
    id BIGSERIAL PRIMARY KEY, conversation_id BIGINT NOT NULL REFERENCES marketplace_conversations(id) ON DELETE CASCADE,
    sender_email TEXT NOT NULL, text TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), read_at TIMESTAMPTZ
  )`, "marketplace_messages");
  await run(sql`CREATE INDEX IF NOT EXISTS marketplace_conversations_buyer_idx ON marketplace_conversations (LOWER(buyer_email), updated_at DESC)`, "marketplace_conversations_buyer_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS marketplace_conversations_seller_idx ON marketplace_conversations (LOWER(seller_email), updated_at DESC)`, "marketplace_conversations_seller_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS marketplace_messages_conversation_idx ON marketplace_messages (conversation_id, created_at)`, "marketplace_messages_conversation_idx");

  // ── Reviews & seller reputation ──
  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE`, "orders.shipped_at");
  await run(sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE`, "orders.delivered_at");
  await run(sql`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      order_id TEXT NOT NULL,
      role TEXT NOT NULL,                -- 'buyer_to_seller' | 'seller_to_buyer'
      reviewer_email TEXT NOT NULL,
      reviewee_email TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      item_title TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE (order_id, role)
    )
  `, "reviews");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_reply TEXT`, "reviews.seller_reply");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS seller_replied_at TIMESTAMP WITH TIME ZONE`, "reviews.seller_replied_at");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS removed_at TIMESTAMP WITH TIME ZONE`, "reviews.removed_at");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS removed_reason TEXT`, "reviews.removed_reason");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS item_as_described INTEGER`, "reviews.item_as_described");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS dispatch_rating INTEGER`, "reviews.dispatch_rating");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS packaging_rating INTEGER`, "reviews.packaging_rating");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE`, "reviews.edited_at");
  await run(sql`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS deleted_by_reviewer_at TIMESTAMP WITH TIME ZONE`, "reviews.deleted_by_reviewer_at");
  await run(sql`CREATE TABLE IF NOT EXISTS review_reports (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    reporter_email TEXT NOT NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(review_id, reporter_email)
  )`, "review_reports");
  await run(sql`CREATE INDEX IF NOT EXISTS review_reports_review_idx ON review_reports (review_id, created_at DESC)`, "review_reports_review_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS reviews_reviewee_idx ON reviews (reviewee_email, role)`, "reviews_reviewee_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS orders_seller_idx ON orders (seller_email)`, "orders_seller_idx");
  // Performance indexes for public listing grids and case-insensitive reputation lookups.
  await run(sql`CREATE INDEX IF NOT EXISTS listings_active_created_idx ON listings (status, created_at DESC)`, "listings_active_created_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS listings_active_category_idx ON listings (status, category, subcategory)`, "listings_active_category_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS reviews_reviewee_lower_role_idx ON reviews (LOWER(reviewee_email), role)`, "reviews_reviewee_lower_role_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS orders_seller_lower_status_idx ON orders (LOWER(seller_email), status)`, "orders_seller_lower_status_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email))`, "users_email_lower_idx");
  await run(sql`CREATE INDEX IF NOT EXISTS listings_seller_lower_created_idx ON listings (LOWER(seller_email), created_at DESC)`, "listings_seller_lower_created_idx");

  // ── Promotion tools: admin-editable prices, follows, scheduling, analytics, auction add-ons ──
  await run(sql`
    CREATE TABLE IF NOT EXISTS promotion_settings (
      type TEXT PRIMARY KEY,
      cost NUMERIC(10,2) NOT NULL,
      days_valid INTEGER NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "promotion_settings");
  await run(sql`
    CREATE TABLE IF NOT EXISTS seller_follows (
      follower_email TEXT NOT NULL,
      seller_email TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (follower_email, seller_email)
    )
  `, "seller_follows");
  await run(sql`CREATE INDEX IF NOT EXISTS seller_follows_seller_idx ON seller_follows (seller_email)`, "seller_follows_idx");
  await run(sql`ALTER TABLE listings ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP WITH TIME ZONE`, "listings.publish_at");
  await run(sql`ALTER TABLE auctions ADD COLUMN IF NOT EXISTS extend_enabled BOOLEAN NOT NULL DEFAULT FALSE`, "auctions.extend_enabled");
  await run(sql`
    CREATE TABLE IF NOT EXISTS listing_views (
      id BIGSERIAL PRIMARY KEY,
      listing_id INTEGER NOT NULL,
      visitor TEXT,
      source TEXT NOT NULL DEFAULT 'direct',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    )
  `, "listing_views");
  await run(sql`CREATE INDEX IF NOT EXISTS listing_views_listing_idx ON listing_views (listing_id, created_at)`, "listing_views_idx");

  // Make the Digital and Adult categories available in the admin product category list
  await run(sql`
    INSERT INTO product_categories (id, name, slug, description) VALUES
      ('cat-digital', 'Digital', 'digital', 'Software, ebooks, design assets, courses and other digital goods'),
      ('cat-adult',   'Adult',   'adult',   'Adult (18+) products')
    ON CONFLICT DO NOTHING
  `, "product_categories.seed_digital_adult");

  // One-off tidy: AliExpress imports made before the importer used the Quick Sell category list
  // carry the old short names (fashion, home, gaming …). Map them onto the site's real category slugs.
  // Safe to run on every start: once mapped, nothing matches again. "other" has no equivalent and is left alone.
  await run(sql`
    UPDATE listings l
    SET category = CASE l.category
      WHEN 'fashion' THEN 'clothing-shoes-jewelry'
      WHEN 'home'    THEN 'home-kitchen'
      WHEN 'gaming'  THEN 'video-games'
      WHEN 'sports'  THEN 'sports-outdoors'
      WHEN 'beauty'  THEN 'beauty-personal-care'
      WHEN 'toys'    THEN 'toys-games'
      ELSE l.category
    END
    WHERE l.category IN ('fashion', 'home', 'gaming', 'sports', 'beauty', 'toys')
      AND EXISTS (
        SELECT 1 FROM supplier_imports si
        WHERE si.listing_id = l.id AND si.supplier_source = 'aliexpress'
      )
  `, "listings.map_aliexpress_old_categories");

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
  .then(() => loadRapidApiKeyFromDb())
  .then(() => {
    startListingScheduler();
    startSyncJob();
  })
  .catch((err: unknown) => logger.error({ err }, "Startup initialization error"));

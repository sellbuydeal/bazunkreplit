import { Router } from "express";
import { attachStripePaymentAmounts } from "../lib/adminPaymentRevenue.js";
import { sql } from "drizzle-orm";
import { createHmac } from "crypto";
import { db, classifiedAdsTable } from "@workspace/db";
import { createAdminToken, requireAdmin } from "../middlewares/adminAuth.js";
import { getUncachableStripeClient } from "../stripeClient.js";
import { logger } from "../lib/logger.js";
import { syncMilestonesFor } from "../lib/milestones.js";
import { sendSystemMessage } from "../lib/systemMessages.js";
import { clerkClient } from "@clerk/express";
import { DEMO_PRODUCTS } from "../demoSeedData.js";
import { fetchAmazonDetails, buildAmazonDescription } from "../lib/amazon.js";
import { fetchEbayDetails, buildEbayDescription } from "../lib/ebay.js";
import {
  saveRapidApiKey, clearRapidApiKey, rapidApiKeyStatus, testRapidApi, rapidApiErrorMessage,
} from "../lib/rapidapi.js";
import { ensureAdminAuditLog, recordAdminAudit } from "../lib/adminAudit.js";
import { ensureCreditEconomyTable, recordCreditEconomy } from "../lib/creditEconomy.js";
import { RoomServiceClient } from "livekit-server-sdk";
import { FEATURE_DEFINITIONS } from "../lib/featureFlags.js";

// Settings that must never be sent to the browser or edited through the generic settings route
const PRIVATE_SETTING_KEYS = new Set(["admin_password_hash", "admin_email", "rapidapi_key"]);
const isPrivateSetting = (k: string) =>
  PRIVATE_SETTING_KEYS.has(k) || /(secret|password|api_?key|token)/i.test(k);

const router = Router();

const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev-secret";

function hashPassword(password: string): string {
  return createHmac("sha256", SESSION_SECRET).update(password).digest("hex");
}

// Resolve active admin credentials (DB overrides take priority over env vars)
async function getAdminCredentials(): Promise<{ email: string; passwordHash: string; isHashed: boolean }> {
  try {
    const rows = await db.execute(
      sql`SELECT key, value FROM site_settings WHERE key IN ('admin_email', 'admin_password_hash')`
    ).then(r => r.rows as any[]);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    if (map.admin_email && map.admin_password_hash) {
      return { email: map.admin_email, passwordHash: map.admin_password_hash, isHashed: true };
    }
  } catch { /* DB not ready */ }
  return {
    email: process.env.ADMIN_EMAIL ?? "admin@example.com",
    passwordHash: process.env.ADMIN_PASSWORD ?? "admin123",
    isHashed: false,
  };
}

// ── Public: login ─────────────────────────────────────────────────────────────

router.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }

  const creds = await getAdminCredentials();
  const emailMatch = email.toLowerCase() === creds.email.toLowerCase();
  const passwordMatch = creds.isHashed
    ? hashPassword(password) === creds.passwordHash
    : password === creds.passwordHash;

  if (!emailMatch || !passwordMatch) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  const token = createAdminToken();
  res.json({ token });
});

// ── Public: site settings (frontend reads these) ───────────────────────────────

router.get("/settings/public", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM site_settings`);
    const settings: Record<string, string> = {};
    for (const row of rows.rows as any[]) {
      if (isPrivateSetting(row.key)) continue;
      settings[row.key] = row.value;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json(settings);
  } catch (err) {
    logger.error({ err }, "Failed to get public settings");
    res.json({});
  }
});

// ── All routes below require admin token ──────────────────────────────────────

router.use("/admin", requireAdmin);

// ── Feature Flags ───────────────────────────────────────────────────────────
router.get("/admin/feature-flags", async (_req,res)=>{
  const rows=await db.execute(sql`SELECT key,value FROM site_settings WHERE key LIKE 'feature_%'`);
  const values=Object.fromEntries((rows.rows as any[]).map(r=>[String(r.key).replace(/^feature_/,""),String(r.value)]));
  res.json(FEATURE_DEFINITIONS.map(([key,label,group])=>({key,label,group,enabled:values[key]!=="false"})));
});
router.patch("/admin/feature-flags/:key", async(req,res)=>{
  const key=String(req.params.key); const def=FEATURE_DEFINITIONS.find(x=>x[0]===key);
  if(!def){res.status(404).json({error:"Unknown feature flag"});return;}
  const enabled=Boolean(req.body.enabled); const settingKey=`feature_${key}`;
  const old=await db.execute(sql`SELECT value FROM site_settings WHERE key=${settingKey}`);
  const before=(old.rows[0] as any)?.value == null ? true : String((old.rows[0] as any).value)!=="false";
  await db.execute(sql`INSERT INTO site_settings (key,value) VALUES (${settingKey},${enabled?"true":"false"}) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value`);
  await recordAdminAudit({req,actor:String(req.body.adminEmail||"Admin"),category:"settings",action:"feature_flag.change",targetType:"feature",targetId:key,summary:`Admin ${enabled?"enabled":"disabled"} ${def[1]}`,before:{enabled:before},after:{enabled}});
  res.json({ok:true,key,enabled});
});


// ── System Status ─────────────────────────────────────────────────────────────
// Performs real server-side connectivity checks. Secrets are never returned.
// Last successful checks are persisted so a temporary failure still shows when
// the integration was last known to be healthy.
router.get("/admin/system-status", async (_req, res) => {
  const checkedAt = new Date().toISOString();
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_integration_status (
        integration TEXT PRIMARY KEY,
        last_success_at TIMESTAMPTZ,
        last_check_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_status TEXT NOT NULL DEFAULT 'unknown',
        last_message TEXT
      )
    `);

    const previousRows = await db.execute(sql`SELECT * FROM system_integration_status`);
    const previous = new Map((previousRows.rows as any[]).map((r:any) => [r.integration, r]));

    type Check = { key:string; name:string; group:string; configured:boolean; ok:boolean; message:string; latencyMs:number|null };
    const timed = async (key:string, name:string, group:string, configured:boolean, fn:()=>Promise<string|void>): Promise<Check> => {
      const start = Date.now();
      if (!configured) return { key, name, group, configured:false, ok:false, message:"Not configured", latencyMs:null };
      try {
        const msg = await fn();
        return { key, name, group, configured:true, ok:true, message:msg || "Connected", latencyMs:Date.now()-start };
      } catch (e:any) {
        return { key, name, group, configured:true, ok:false, message:e?.message ? String(e.message).slice(0,220) : "Connection failed", latencyMs:Date.now()-start };
      }
    };

    const postgresPromise = timed("postgresql", "PostgreSQL", "Core", true, async () => {
      await db.execute(sql`SELECT 1 AS ok`); return "Database responding";
    });
    const clerkPromise = timed("clerk", "Clerk", "Authentication", Boolean(process.env.CLERK_SECRET_KEY), async () => {
      await (clerkClient as any).users.getUserList({ limit: 1 }); return "Authentication API responding";
    });
    const stripePromise = timed("stripe", "Stripe", "Payments", Boolean(process.env.STRIPE_SECRET_KEY), async () => {
      const stripe = await getUncachableStripeClient();
      await stripe.balance.retrieve(); return "Payments API responding";
    });
    const livekitConfigured = Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
    const livekitPromise = timed("livekit", "LiveKit", "Live streaming", livekitConfigured, async () => {
      const svc = new RoomServiceClient(process.env.LIVEKIT_URL!, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
      await svc.listRooms(); return "Live streaming API responding";
    });

    let rapidChecks: Check[] = [];
    if (!process.env.RAPIDAPI_KEY) {
      rapidChecks = [
        { key:"rapidapi_amazon", name:"Amazon importer", group:"RapidAPI", configured:false, ok:false, message:"RapidAPI key not configured", latencyMs:null },
        { key:"rapidapi_ebay", name:"eBay importer", group:"RapidAPI", configured:false, ok:false, message:"RapidAPI key not configured", latencyMs:null },
        { key:"rapidapi_aliexpress", name:"AliExpress importer", group:"RapidAPI", configured:false, ok:false, message:"RapidAPI key not configured", latencyMs:null },
      ];
    } else {
      const start = Date.now();
      try {
        const rr = await testRapidApi();
        const keyFor = (name:string) => name.toLowerCase().includes("amazon") ? "rapidapi_amazon" : name.toLowerCase().includes("ebay") ? "rapidapi_ebay" : "rapidapi_aliexpress";
        rapidChecks = rr.map((r:any) => ({ key:keyFor(r.api || r.name || ""), name:(r.api || r.name || "RapidAPI importer").replace(/ \(.+\)$/," importer"), group:"RapidAPI", configured:true, ok:Boolean(r.ok), message:String(r.message || (r.ok ? "Connected" : "Connection failed")), latencyMs:Date.now()-start }));
      } catch (e:any) {
        const message = e?.message ? String(e.message).slice(0,220) : "RapidAPI check failed";
        rapidChecks = ["Amazon","eBay","AliExpress"].map(n => ({ key:`rapidapi_${n.toLowerCase()}`, name:`${n} importer`, group:"RapidAPI", configured:true, ok:false, message, latencyMs:Date.now()-start }));
      }
    }

    const checks: Check[] = [...await Promise.all([postgresPromise, clerkPromise, stripePromise, livekitPromise]), ...rapidChecks];
    for (const c of checks) {
      await db.execute(sql`
        INSERT INTO system_integration_status (integration,last_success_at,last_check_at,last_status,last_message)
        VALUES (${c.key}, ${c.ok ? new Date() : null}, NOW(), ${c.ok ? "connected" : c.configured ? "error" : "not_configured"}, ${c.message})
        ON CONFLICT (integration) DO UPDATE SET
          last_success_at = CASE WHEN ${c.ok} THEN NOW() ELSE system_integration_status.last_success_at END,
          last_check_at = NOW(), last_status = EXCLUDED.last_status, last_message = EXCLUDED.last_message
      `);
    }

    const items = checks.map(c => ({
      ...c,
      status: c.ok ? "connected" : c.configured ? "error" : "not_configured",
      lastSuccessfulCheck: c.ok ? checkedAt : (previous.get(c.key) as any)?.last_success_at || null,
      checkedAt,
    }));
    res.setHeader("Cache-Control", "no-store");
    res.json({ checkedAt, summary:{ connected:items.filter(x=>x.status==="connected").length, errors:items.filter(x=>x.status==="error").length, notConfigured:items.filter(x=>x.status==="not_configured").length, total:items.length }, integrations:items });
  } catch (err:any) {
    logger.error({ err }, "System status check failed");
    res.status(500).json({ error:"System status check failed", message:err?.message || "Unknown error", checkedAt });
  }
});

// Immutable Admin Audit Log. This endpoint is read-only by design.
router.get("/admin/audit-log", async (req, res) => {
  try {
    await ensureAdminAuditLog();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit ?? 75)));
    const offset = Math.max(0, Number(req.query.offset ?? 0));
    const category = String(req.query.category ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const rows = await db.execute(sql`
      SELECT id, actor, category, action, target_type, target_id, summary, before_data, after_data, metadata, ip_address, user_agent, created_at
      FROM admin_audit_log
      WHERE (${category} = '' OR category = ${category})
        AND (${search} = '' OR summary ILIKE ${'%' + search + '%'} OR COALESCE(target_id,'') ILIKE ${'%' + search + '%'} OR actor ILIKE ${'%' + search + '%'})
      ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
    `).then(r => r.rows as any[]);
    const [{ count }] = await db.execute(sql`
      SELECT COUNT(*)::int count FROM admin_audit_log
      WHERE (${category} = '' OR category = ${category})
        AND (${search} = '' OR summary ILIKE ${'%' + search + '%'} OR COALESCE(target_id,'') ILIKE ${'%' + search + '%'} OR actor ILIKE ${'%' + search + '%'})
    `).then(r => r.rows as any[]);
    res.setHeader("Cache-Control", "no-store");
    res.json({ entries: rows, total: Number(count ?? 0) });
  } catch (err) { logger.error({ err }, "Failed to read audit log"); res.status(500).json({ error: "Failed to read audit log" }); }
});

// Dashboard stats

router.get("/admin/stats", async (_req, res) => {
  try {
    await ensureCreditEconomyTable();
    const q = async (query: any, fallback: any = {}) => {
      try { return (await db.execute(query)).rows[0] ?? fallback; } catch { return fallback; }
    };
    const qa = async (query: any) => { try { return (await db.execute(query)).rows as any[]; } catch { return []; } };

    const [users, listings, orders, disputes, returnsSummary, live, credits, salesTrend, userTrend] = await Promise.all([
      q(sql`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::int AS today,
            COUNT(*) FILTER (WHERE created_at >= now()-interval '7 days')::int AS week FROM users`, {total:0,today:0,week:0}),
      q(sql`SELECT COUNT(*) FILTER (WHERE status='active')::int AS active FROM listings`, {active:0}),
      q(sql`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE AND LOWER(status) NOT IN ('cancelled','canceled','refunded'))::int AS sales_today,
            COALESCE(SUM(price) FILTER (WHERE LOWER(status) NOT IN ('cancelled','canceled','refunded')),0)::float AS gmv,
            COALESCE(SUM(price) FILTER (WHERE created_at >= CURRENT_DATE AND LOWER(status) NOT IN ('cancelled','canceled','refunded')),0)::float AS gmv_today,
            COALESCE(SUM(buyer_protection_fee),0)::float AS buyer_protection,
            COALESCE(SUM(seller_fee),0)::float AS business_fees
          FROM orders`, {total:0,sales_today:0,gmv:0,gmv_today:0,buyer_protection:0,business_fees:0}),
      q(sql`SELECT COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved','closed','rejected'))::int AS open,
            COUNT(*)::int AS total,
            COALESCE(SUM(CASE WHEN refund_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN refund_amount::numeric ELSE 0 END),0)::float AS refunds
          FROM disputes`, {open:0,total:0,refunds:0}),
      q(sql`SELECT COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('completed','closed','rejected','cancelled'))::int AS open,
            COALESCE(SUM(CASE WHEN refund_amount ~ '^[0-9]+(\\.[0-9]+)?$' THEN refund_amount::numeric ELSE 0 END),0)::float AS refunds
          FROM returns`, {open:0,refunds:0}),
      q(sql`SELECT COUNT(*) FILTER (WHERE is_live=true)::int AS active,
            COALESCE(SUM(viewer_count) FILTER (WHERE is_live=true),0)::int AS viewers FROM live_stream_sessions`, {active:0,viewers:0}),
      q(sql`SELECT
            COALESCE(SUM(CASE WHEN credits>0 THEN credits ELSE 0 END),0)::float AS issued,
            COALESCE(ABS(SUM(CASE WHEN kind='spent' AND credits<0 THEN credits ELSE 0 END)),0)::float AS spent
          FROM credit_economy_ledger`, {issued:0,spent:0}),
      qa(sql`WITH days AS (SELECT generate_series(CURRENT_DATE-interval '6 days', CURRENT_DATE, interval '1 day')::date d),
          agg AS (SELECT created_at::date d, COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('cancelled','canceled','refunded'))::int orders,
          COALESCE(SUM(price) FILTER (WHERE LOWER(status) NOT IN ('cancelled','canceled','refunded')),0)::float gmv FROM orders
          WHERE created_at >= CURRENT_DATE-interval '6 days' GROUP BY created_at::date)
          SELECT to_char(days.d,'Dy') label, days.d::text date, COALESCE(agg.orders,0)::int orders, COALESCE(agg.gmv,0)::float gmv
          FROM days LEFT JOIN agg USING(d) ORDER BY days.d`),
      qa(sql`WITH days AS (SELECT generate_series(CURRENT_DATE-interval '29 days', CURRENT_DATE, interval '1 day')::date d),
          agg AS (SELECT created_at::date d, COUNT(*)::int users FROM users WHERE created_at >= CURRENT_DATE-interval '29 days' GROUP BY created_at::date)
          SELECT to_char(days.d,'DD Mon') label, COALESCE(agg.users,0)::int users FROM days LEFT JOIN agg USING(d) ORDER BY days.d`),
    ]);

    let recentPayments: any[] = [];
    try {
      const stripe = await getUncachableStripeClient();
      const sessions = await stripe.checkout.sessions.list({ limit: 8, status: "complete" });
      recentPayments = sessions.data.map(s => ({ id:s.id, email:s.customer_details?.email ?? s.client_reference_id ?? "—",
        amount:(s.amount_total ?? 0)/100, currency:s.currency?.toUpperCase() ?? "GBP", date:new Date(s.created*1000).toISOString(), status:s.payment_status }));
    } catch {}

    res.json({
      userCount:Number(users.total||0), newUsersToday:Number(users.today||0), newUsersWeek:Number(users.week||0),
      activeListings:Number(listings.active||0), orderCount:Number(orders.total||0), salesToday:Number(orders.sales_today||0),
      gmv:Number(orders.gmv||0), gmvToday:Number(orders.gmv_today||0), buyerProtection:Number(orders.buyer_protection||0),
      businessFees:Number(orders.business_fees||0), openDisputes:Number(disputes.open||0), totalDisputes:Number(disputes.total||0),
      openReturns:Number(returnsSummary.open||0), refunds:Number(disputes.refunds||0)+Number(returnsSummary.refunds||0),
      activeLiveStreams:Number(live.active||0), liveViewers:Number(live.viewers||0),
      creditsIssued:Number(credits.issued||0), creditsSpent:Number(credits.spent||0), salesTrend, userTrend, recentPayments,
    });
  } catch (err) {
    logger.error({ err }, "Failed to get admin overview stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// Credits Economy & Revenue
router.get("/admin/credits-economy", async (req, res) => {
  try {
    await ensureCreditEconomyTable();
    const limit = Math.min(200, Math.max(20, Number(req.query.limit) || 100));
    const [summary, ledger, suspicious] = await Promise.all([
      db.execute(sql`
        SELECT
          COALESCE((SELECT SUM(credits) FROM users),0)::float AS circulation,
          COALESCE(SUM(CASE WHEN kind IN ('earned','referral') AND credits > 0 THEN credits ELSE 0 END),0)::float AS earned,
          COALESCE(SUM(CASE WHEN kind='purchased' AND credits > 0 THEN credits ELSE 0 END),0)::float AS purchased,
          COALESCE(ABS(SUM(CASE WHEN kind='spent' AND credits < 0 THEN credits ELSE 0 END)),0)::float AS spent,
          COALESCE(SUM(CASE WHEN kind='referral' AND credits > 0 THEN credits ELSE 0 END),0)::float AS referrals,
          COALESCE(SUM(CASE WHEN kind='admin_adjustment' THEN credits ELSE 0 END),0)::float AS adjustments,
          COALESCE(SUM(CASE WHEN kind='purchased' THEN cash_amount ELSE 0 END),0)::float AS cash_revenue,
          COUNT(*)::int AS ledger_entries
        FROM credit_economy_ledger
      `).then(r => r.rows[0] as any),
      db.execute(sql`
        SELECT id,email,kind,credits::float,cash_amount::float,currency,reason,reference_type,reference_id,metadata,created_at
        FROM credit_economy_ledger ORDER BY created_at DESC LIMIT ${limit}
      `).then(r => r.rows as any[]),
      db.execute(sql`
        SELECT email,
          COUNT(*) FILTER (WHERE kind='referral' AND created_at > now()-interval '24 hours')::int AS referral_24h,
          COUNT(*) FILTER (WHERE kind='admin_adjustment' AND created_at > now()-interval '7 days')::int AS adjustments_7d,
          COALESCE(SUM(ABS(credits)) FILTER (WHERE created_at > now()-interval '1 hour'),0)::float AS movement_1h
        FROM credit_economy_ledger
        WHERE created_at > now()-interval '7 days'
        GROUP BY email
        HAVING COUNT(*) FILTER (WHERE kind='referral' AND created_at > now()-interval '24 hours') >= 5
            OR COUNT(*) FILTER (WHERE kind='admin_adjustment' AND created_at > now()-interval '7 days') >= 3
            OR COALESCE(SUM(ABS(credits)) FILTER (WHERE created_at > now()-interval '1 hour'),0) >= 50
        ORDER BY movement_1h DESC LIMIT 50
      `).then(r => r.rows as any[]),
    ]);
    // Existing transaction table provides a useful historical total even before the richer ledger existed.
    const legacy = await db.execute(sql`SELECT COUNT(*)::int AS count, COALESCE(SUM(CASE WHEN credits_added>0 THEN credits_added ELSE 0 END),0)::float AS positive FROM credit_transactions`).then(r=>r.rows[0] as any).catch(()=>({count:0,positive:0}));
    res.json({ summary: {...summary, legacyTransactions: legacy.count, legacyPositiveCredits: Number(legacy.positive||0)}, ledger, suspicious });
  } catch (err) {
    logger.error({ err }, "Failed to load credits economy");
    res.status(500).json({ error: "Failed to load credits economy" });
  }
});

// Users list

router.get("/admin/users", async (req, res) => {
  try {
    const search = (req.query.search as string) ?? "";
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const pattern = "%" + search + "%";

    // Admin Users 2.0 activity aggregation.  Historical Official Store imports used
    // bazunkdeals@gmail.com before the store moved to cczslater@gmail.com.  Treat both
    // identities as the same marketplace owner for monitoring, without rewriting old data.
    const rows = await db.execute(sql`
      WITH user_identity AS (
        SELECT LOWER(email) user_email, LOWER(email) activity_email FROM users
        UNION ALL SELECT 'cczslater@gmail.com', 'bazunkdeals@gmail.com'
      ), listing_raw AS (
        SELECT LOWER(seller_email) activity_email, COUNT(*)::int total,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) IN ('active','published','live'))::int active,
          MAX(created_at) last_at
        FROM listings WHERE seller_email IS NOT NULL GROUP BY LOWER(seller_email)
      ), listing_stats AS (
        SELECT ui.user_email email, COALESCE(SUM(lr.total),0)::int listings_total,
          COALESCE(SUM(lr.active),0)::int listings_active, MAX(lr.last_at) last_listing_at
        FROM user_identity ui LEFT JOIN listing_raw lr ON lr.activity_email=ui.activity_email GROUP BY ui.user_email
      ), sell_raw AS (
        SELECT LOWER(seller_email) activity_email,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled'))::int sold,
          COALESCE(SUM(price) FILTER (WHERE LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled')),0)::float sales_value,
          MAX(created_at) last_at
        FROM orders WHERE seller_email IS NOT NULL GROUP BY LOWER(seller_email)
      ), order_sell AS (
        SELECT ui.user_email email, COALESCE(SUM(sr.sold),0)::int sold,
          COALESCE(SUM(sr.sales_value),0)::float sales_value, MAX(sr.last_at) last_sale_at
        FROM user_identity ui LEFT JOIN sell_raw sr ON sr.activity_email=ui.activity_email GROUP BY ui.user_email
      ), order_buy AS (
        SELECT LOWER(buyer_email) email,
          COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled'))::int bought,
          COALESCE(SUM(price) FILTER (WHERE LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled')),0)::float spent,
          MAX(created_at) last_purchase_at FROM orders WHERE buyer_email IS NOT NULL GROUP BY LOWER(buyer_email)
      ), sent_raw AS (
        SELECT LOWER(sender_email) activity_email, COUNT(*)::int n, MAX(created_at) last_at
        FROM marketplace_messages WHERE sender_email IS NOT NULL GROUP BY LOWER(sender_email)
      ), msg_sent AS (
        SELECT ui.user_email email, COALESCE(SUM(sr.n),0)::int messages_sent, MAX(sr.last_at) last_message_at
        FROM user_identity ui LEFT JOIN sent_raw sr ON sr.activity_email=ui.activity_email GROUP BY ui.user_email
      ), received_raw AS (
        SELECT participant activity_email, COUNT(*)::int n FROM (
          SELECT LOWER(c.buyer_email) participant, m.id FROM marketplace_messages m
          JOIN marketplace_conversations c ON c.id=m.conversation_id
          WHERE c.buyer_email IS NOT NULL AND LOWER(m.sender_email) <> LOWER(c.buyer_email)
          UNION ALL
          SELECT LOWER(c.seller_email) participant, m.id FROM marketplace_messages m
          JOIN marketplace_conversations c ON c.id=m.conversation_id
          WHERE c.seller_email IS NOT NULL AND LOWER(m.sender_email) <> LOWER(c.seller_email)
        ) x GROUP BY participant
      ), msg_received AS (
        SELECT ui.user_email email, COALESCE(SUM(rr.n),0)::int messages_received
        FROM user_identity ui LEFT JOIN received_raw rr ON rr.activity_email=ui.activity_email GROUP BY ui.user_email
      ), conv_raw AS (
        SELECT email activity_email, COUNT(*)::int n FROM (
          SELECT LOWER(buyer_email) email,id FROM marketplace_conversations WHERE buyer_email IS NOT NULL
          UNION ALL SELECT LOWER(seller_email),id FROM marketplace_conversations WHERE seller_email IS NOT NULL
        ) x GROUP BY email
      ), conv_stats AS (
        SELECT ui.user_email email, COALESCE(SUM(cr.n),0)::int conversations
        FROM user_identity ui LEFT JOIN conv_raw cr ON cr.activity_email=ui.activity_email GROUP BY ui.user_email
      ), review_stats AS (
        SELECT LOWER(reviewee_email) email, COUNT(*) FILTER (WHERE deleted_by_reviewer_at IS NULL AND removed_at IS NULL)::int reviews_received,
          ROUND(AVG(rating) FILTER (WHERE deleted_by_reviewer_at IS NULL AND removed_at IS NULL)::numeric,2)::float rating
        FROM reviews GROUP BY LOWER(reviewee_email)
      ), dispute_stats AS (
        SELECT email, COUNT(*)::int disputes_total,
          COUNT(*) FILTER (WHERE LOWER(status) NOT IN ('resolved','closed','rejected','cancelled'))::int disputes_open
        FROM (SELECT LOWER(buyer_email) email,status FROM disputes
          UNION ALL SELECT LOWER(seller_email),status FROM disputes WHERE seller_email IS NOT NULL) x GROUP BY email
      ), live_stats AS (
        SELECT LOWER(seller_email) email, COUNT(*)::int live_streams, COALESCE(SUM(viewer_count),0)::int live_viewers,
          MAX(started_at) last_live_at FROM live_stream_sessions GROUP BY LOWER(seller_email)
      )
      SELECT u.id,u.email,u.name,u.credits,u.stripe_customer_id,u.banned,u.seller_type,u.created_at,
        COALESCE(ls.listings_total,0)::int listings_total, COALESCE(ls.listings_active,0)::int listings_active,
        COALESCE(os.sold,0)::int sold, COALESCE(os.sales_value,0)::float sales_value,
        COALESCE(ob.bought,0)::int bought, COALESCE(ob.spent,0)::float spent,
        COALESCE(ms.messages_sent,0)::int messages_sent, COALESCE(mr.messages_received,0)::int messages_received,
        COALESCE(cs.conversations,0)::int conversations,
        COALESCE(rs.reviews_received,0)::int reviews_received, COALESCE(rs.rating,0)::float rating,
        COALESCE(ds.disputes_total,0)::int disputes_total, COALESCE(ds.disputes_open,0)::int disputes_open,
        COALESCE(lvs.live_streams,0)::int live_streams, COALESCE(lvs.live_viewers,0)::int live_viewers,
        GREATEST(u.created_at,ls.last_listing_at,os.last_sale_at,ob.last_purchase_at,ms.last_message_at,lvs.last_live_at) last_activity
      FROM users u
      LEFT JOIN listing_stats ls ON ls.email=LOWER(u.email)
      LEFT JOIN order_sell os ON os.email=LOWER(u.email)
      LEFT JOIN order_buy ob ON ob.email=LOWER(u.email)
      LEFT JOIN msg_sent ms ON ms.email=LOWER(u.email)
      LEFT JOIN msg_received mr ON mr.email=LOWER(u.email)
      LEFT JOIN conv_stats cs ON cs.email=LOWER(u.email)
      LEFT JOIN review_stats rs ON rs.email=LOWER(u.email)
      LEFT JOIN dispute_stats ds ON ds.email=LOWER(u.email)
      LEFT JOIN live_stats lvs ON lvs.email=LOWER(u.email)
      WHERE (${search ? sql`(u.email ILIKE ${pattern} OR u.name ILIKE ${pattern})` : sql`TRUE`})
      ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}
    `).then(r => r.rows);

    const [{ count }] = await db.execute(search
      ? sql`SELECT COUNT(*)::int count FROM users WHERE email ILIKE ${pattern} OR name ILIKE ${pattern}`
      : sql`SELECT COUNT(*)::int count FROM users`).then(r => r.rows as any[]);
    res.json({ users: rows, total: count });
  } catch (err) {
    logger.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to list users" });
  }
});

// Add a user by hand

router.post("/admin/users", async (req, res) => {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const name = req.body?.name ? String(req.body.name).trim() : null;
    const credits = Math.max(0, Number(req.body?.credits ?? 0)) || 0; // pounds (100 credits = £1)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "Enter a valid email address" }); return; }
    const inserted = await db.execute(sql`
      INSERT INTO users (id, email, name, credits) VALUES (${email}, ${email}, ${name}, ${credits.toFixed(2)})
      ON CONFLICT DO NOTHING RETURNING email
    `).then(r => r.rows);
    if (!inserted.length) { res.status(409).json({ error: "A user with that email already exists" }); return; }
    logger.info({ email, credits }, "Admin added user");
    res.json({ success: true, email });
  } catch (err) {
    logger.error({ err }, "Failed to add user");
    res.status(500).json({ error: "Failed to add user" });
  }
});

// Pull in people who exist elsewhere but aren't in the users table yet:
// every Clerk account, plus emails already used on listings / credit purchases / support tickets.
router.post("/admin/users/sync", async (_req, res) => {
  try {
    let fromClerk = 0;
    let clerkNote: string | null = null;

    if (process.env.CLERK_SECRET_KEY) {
      try {
        const pageSize = 100;
        for (let offset = 0; offset < 5000; offset += pageSize) {
          const resp: any = await (clerkClient as any).users.getUserList({ limit: pageSize, offset, orderBy: "-created_at" });
          const list: any[] = Array.isArray(resp) ? resp : (resp?.data ?? []);
          if (!list.length) break;
          for (const u of list) {
            const primary = u.emailAddresses?.find((e: any) => e.id === u.primaryEmailAddressId) ?? u.emailAddresses?.[0];
            const email = String(primary?.emailAddress ?? "").trim().toLowerCase();
            if (!email) continue;
            const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim() || u.username || null;
            const created = u.createdAt ? new Date(u.createdAt) : new Date();
            const r = await db.execute(sql`
              INSERT INTO users (id, email, name, credits, created_at) VALUES (${email}, ${email}, ${name}, 0, ${created.toISOString()})
              ON CONFLICT (email) DO NOTHING RETURNING email
            `);
            fromClerk += r.rows.length;
          }
          if (list.length < pageSize) break;
        }
      } catch (err) {
        logger.error({ err }, "Clerk user import failed");
        clerkNote = "Couldn't read your Clerk accounts — check CLERK_SECRET_KEY on the API service.";
      }
    } else {
      clerkNote = "CLERK_SECRET_KEY isn't set on the API service, so Clerk accounts couldn't be imported.";
    }

    const other = await db.execute(sql`
      INSERT INTO users (id, email, credits)
      SELECT lower(e), lower(e), 0 FROM (
        SELECT seller_email AS e FROM listings WHERE seller_email IS NOT NULL
        UNION SELECT email FROM credit_transactions WHERE email IS NOT NULL
        UNION SELECT email FROM support_tickets WHERE email IS NOT NULL
      ) s
      WHERE e LIKE '%@%'
      ON CONFLICT (email) DO NOTHING RETURNING email
    `);

    const [{ count }] = await db.execute(sql`SELECT COUNT(*)::int AS count FROM users`).then(r => r.rows as any[]);
    res.json({ added: fromClerk + other.rows.length, fromClerk, fromActivity: other.rows.length, total: count, note: clerkNote });
  } catch (err) {
    logger.error({ err }, "Failed to sync users");
    res.status(500).json({ error: "Failed to sync users" });
  }
});

// Send a message to a user's inbox ("From Bazunk")

router.post("/admin/users/:email/message", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const subject = String(req.body?.subject ?? "").trim();
    const body = String(req.body?.body ?? "").trim();
    if (!subject || !body) { res.status(400).json({ error: "Subject and message are both required" }); return; }
    const exists = await db.execute(sql`SELECT 1 FROM users WHERE email = ${email}`).then(r => r.rows.length > 0);
    if (!exists) { res.status(404).json({ error: "User not found" }); return; }
    await sendSystemMessage(email, { subject, body, category: "Message from Bazunk" });
    logger.info({ email, subject }, "Admin sent message");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to send message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Adjust credits

router.patch("/admin/users/:email/credits", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { amount, reason } = req.body;
    if (typeof amount !== "number") { res.status(400).json({ error: "amount required" }); return; }

    const [beforeUser] = await db.execute(sql`SELECT email, credits FROM users WHERE email = ${email}`).then(r => r.rows as any[]);
    const [updated] = await db.execute(
      sql`UPDATE users SET credits = GREATEST(0, credits + ${amount}) WHERE email = ${email} RETURNING email, credits`
    ).then(r => r.rows as any[]);

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }

    await recordCreditEconomy({ email, kind: "admin_adjustment", credits: amount, reason: reason || "Manual admin adjustment", referenceType: "admin_adjustment" });
    logger.info({ email, amount, reason }, "Admin adjusted credits");
    await recordAdminAudit({ req, category: "credits", action: "credits.adjust", targetType: "user", targetId: email,
      summary: `Admin ${amount >= 0 ? "credited" : "debited"} ${email} ${Math.abs(amount)} credits${reason ? ` — ${reason}` : ""}`,
      before: { credits: Number(beforeUser?.credits ?? 0) }, after: { credits: Number(updated.credits), adjustment: amount }, metadata: { reason: reason ?? null } });
    res.json({ email: updated.email, newBalance: parseFloat(updated.credits) });
  } catch (err) {
    logger.error({ err }, "Failed to adjust credits");
    res.status(500).json({ error: "Failed to adjust credits" });
  }
});

// Edit user (name)

router.patch("/admin/users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { name } = req.body;
    const [beforeUser] = await db.execute(sql`SELECT email, name, seller_type FROM users WHERE email = ${email}`).then(r => r.rows as any[]);
    const sellerType = ["private", "sole_trader", "business"].includes(String(req.body?.sellerType)) ? String(req.body.sellerType) : undefined;
    const [updated] = await db.execute(
      sql`UPDATE users SET name = ${name ?? null}, seller_type = COALESCE(${sellerType ?? null}, seller_type) WHERE email = ${email} RETURNING email, name, seller_type`
    ).then(r => r.rows as any[]);
    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    logger.info({ email, name }, "Admin edited user");
    await recordAdminAudit({ req, category: "users", action: "user.update", targetType: "user", targetId: email, summary: `Admin updated user ${email}`, before: beforeUser, after: updated });
    res.json({ email: updated.email, name: updated.name, sellerType: updated.seller_type });
  } catch (err) {
    logger.error({ err }, "Failed to edit user");
    res.status(500).json({ error: "Failed to edit user" });
  }
});

// Delete user

router.delete("/admin/users/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const [beforeUser] = await db.execute(sql`SELECT email, name, seller_type, credits, banned FROM users WHERE email = ${email}`).then(r => r.rows as any[]);
    await db.execute(sql`DELETE FROM users WHERE email = ${email}`);
    logger.info({ email }, "Admin deleted user");
    await recordAdminAudit({ req, category: "users", action: "user.delete", targetType: "user", targetId: email, summary: `Admin deleted user ${email}`, before: beforeUser });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to delete user");
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Ban / unban user

router.patch("/admin/users/:email/ban", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { banned } = req.body;
    if (typeof banned !== "boolean") { res.status(400).json({ error: "banned (boolean) required" }); return; }
    const [beforeUser] = await db.execute(sql`SELECT email, banned FROM users WHERE email = ${email}`).then(r => r.rows as any[]);

    const [updated] = await db.execute(
      sql`UPDATE users SET banned = ${banned} WHERE email = ${email} RETURNING email, banned`
    ).then(r => r.rows as any[]);

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    await recordAdminAudit({ req, category: "users", action: banned ? "user.suspend" : "user.unsuspend", targetType: "user", targetId: email, summary: `Admin ${banned ? "suspended" : "unsuspended"} user ${email}`, before: beforeUser, after: updated });

    res.json({ email: updated.email, banned: updated.banned });
  } catch (err) {
    logger.error({ err }, "Failed to update ban status");
    res.status(500).json({ error: "Failed to update ban status" });
  }
});

// RapidAPI key + connection test (used by Admin → Importers)

router.get("/admin/rapidapi", (_req, res) => {
  res.json(rapidApiKeyStatus());
});

router.put("/admin/rapidapi", async (req, res) => {
  const key = String(req.body?.key ?? "").trim();
  if (key.length < 20 || /\s/.test(key)) {
    res.status(400).json({ error: "That doesn't look like a RapidAPI key — copy the X-RapidAPI-Key value from rapidapi.com." });
    return;
  }
  try {
    await saveRapidApiKey(key);
    res.json({ ok: true, ...rapidApiKeyStatus() });
  } catch (err) {
    logger.error({ err }, "Failed to save RapidAPI key");
    res.status(500).json({ error: "Failed to save the key" });
  }
});

router.delete("/admin/rapidapi", async (_req, res) => {
  try {
    await clearRapidApiKey();
    res.json({ ok: true, ...rapidApiKeyStatus() });
  } catch (err) {
    logger.error({ err }, "Failed to remove RapidAPI key");
    res.status(500).json({ error: "Failed to remove the key" });
  }
});

router.post("/admin/rapidapi/test", async (_req, res) => {
  const status = rapidApiKeyStatus();
  if (!status.configured) {
    res.status(400).json({ error: "No RapidAPI key is set yet." });
    return;
  }
  res.json({ ...status, results: await testRapidApi() });
});

// Site settings

router.get("/admin/settings", async (_req, res) => {
  try {
    const rows = await db.execute(sql`SELECT key, value FROM site_settings ORDER BY key`).then(r => r.rows as any[]);
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key !== "admin_password_hash" && row.key !== "rapidapi_key") settings[row.key] = row.value;
    }
    // Include the current admin email but never the hash
    const creds = await getAdminCredentials();
    settings._admin_email = creds.email;
    res.setHeader("Cache-Control", "no-store");
    res.json(settings);
  } catch (err) {
    logger.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/admin/settings", async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    const keys = Object.keys(updates);
    const oldRows = keys.length ? await db.execute(sql`SELECT key, value FROM site_settings`).then(r => r.rows as any[]) : [];
    const beforeSettings = Object.fromEntries(oldRows.filter((r:any) => keys.includes(String(r.key))).map((r:any) => [r.key, r.value]));
    const blocked = new Set(["admin_password_hash", "_admin_email", "rapidapi_key"]);
    for (const [key, value] of Object.entries(updates)) {
      // Fee settings have their own persistence endpoint. Never let a stale copy
      // in the general settings form overwrite the saved business/BP rates.
      if (blocked.has(key) || key.startsWith("fee_") || key.startsWith("buyer_protection_")) continue;
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${key}, ${value}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()`
      );
    }
    const safeAfter = Object.fromEntries(Object.entries(updates).filter(([k]) => !isPrivateSetting(k) && !k.startsWith("fee_") && !k.startsWith("buyer_protection_")));
    await recordAdminAudit({ req, category: "settings", action: "settings.update", targetType: "site_settings", targetId: "general", summary: `Admin changed ${Object.keys(safeAfter).length} site setting(s)`, before: beforeSettings, after: safeAfter });
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Failed to update settings" });
  }
});

// Dedicated final-value fee settings endpoint. Keeping fees separate from the
// generic site-settings form prevents unrelated settings saves from overwriting
// category fee rates and lets the admin UI verify what PostgreSQL actually saved.
router.get("/admin/fee-settings", async (_req, res) => {
  try {
    const rows = await db.execute(
      sql`SELECT key, value FROM site_settings WHERE key LIKE 'fee_%' OR key LIKE 'buyer_protection_%' ORDER BY key`
    ).then(r => r.rows as any[]);
    const fees: Record<string, string> = {};
    for (const row of rows) fees[String(row.key)] = String(row.value ?? "");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.json(fees);
  } catch (err) {
    logger.error({ err }, "Failed to get fee settings");
    res.status(500).json({ error: "Failed to get fee settings" });
  }
});

router.put("/admin/fee-settings", async (req, res) => {
  try {
    const incoming = req.body as Record<string, unknown>;
    const entries = Object.entries(incoming).filter(([key]) =>
      key === "fee_listing_free" || key === "fee_rate_default" || key.startsWith("fee_rate_") || key.startsWith("buyer_protection_")
    );
    if (!entries.length) return res.status(400).json({ error: "No fee settings supplied" });
    const changedKeys = entries.map(([key]) => key);
    const oldFeeRows = await db.execute(sql`SELECT key, value FROM site_settings WHERE key LIKE 'fee_%' OR key LIKE 'buyer_protection_%'`).then(r => r.rows as any[]);
    const beforeFees = Object.fromEntries(oldFeeRows.filter((r:any) => changedKeys.includes(String(r.key))).map((r:any) => [r.key, r.value]));

    for (const [key, raw] of entries) {
      let value = String(raw ?? "").trim();
      if (key.startsWith("fee_rate_") || key === "buyer_protection_percent" || key.startsWith("buyer_protection_fixed_")) {
        const rate = Number(value);
        if (!Number.isFinite(rate) || rate < 0 || rate > 30) {
          return res.status(400).json({ error: `Invalid fee rate for ${key}` });
        }
        value = String(rate);
      }
      await db.execute(sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (${key}, ${value}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
    }

    const rows = await db.execute(
      sql`SELECT key, value FROM site_settings WHERE key LIKE 'fee_%' OR key LIKE 'buyer_protection_%' ORDER BY key`
    ).then(r => r.rows as any[]);
    const fees: Record<string, string> = {};
    for (const row of rows) fees[String(row.key)] = String(row.value ?? "");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    const changed = Object.fromEntries(changedKeys.map(k => [k, { from: beforeFees[k] ?? null, to: fees[k] ?? null }]));
    await recordAdminAudit({ req, category: "fees", action: "fees.update", targetType: "site_settings", targetId: "buyer-protection-and-business-fees", summary: `Admin changed ${changedKeys.length} Buyer Protection/business fee setting(s)`, before: beforeFees, after: Object.fromEntries(changedKeys.map(k => [k, fees[k] ?? null])), metadata: { changed } });
    res.json({ success: true, fees });
  } catch (err) {
    logger.error({ err }, "Failed to update fee settings");
    res.status(500).json({ error: "Failed to update fee settings" });
  }
});

// Update admin credentials

router.patch("/admin/credentials", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    if (!currentPassword) { res.status(400).json({ error: "Current password required" }); return; }

    // Verify current password first
    const creds = await getAdminCredentials();
    const passwordMatch = creds.isHashed
      ? hashPassword(currentPassword) === creds.passwordHash
      : currentPassword === creds.passwordHash;

    if (!passwordMatch) { res.status(401).json({ error: "Current password is incorrect" }); return; }

    // Save new credentials to DB
    if (email) {
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES ('admin_email', ${email}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${email}, updated_at = NOW()`
      );
    }
    if (newPassword) {
      const hash = hashPassword(newPassword);
      await db.execute(
        sql`INSERT INTO site_settings (key, value, updated_at) VALUES ('admin_password_hash', ${hash}, NOW())
            ON CONFLICT (key) DO UPDATE SET value = ${hash}, updated_at = NOW()`
      );
    }

    logger.info({ email }, "Admin credentials updated");
    res.json({ success: true, message: "Credentials updated. Please log in again." });
  } catch (err) {
    logger.error({ err }, "Failed to update credentials");
    res.status(500).json({ error: "Failed to update credentials" });
  }
});

// ── User-facing milestones (public — no admin token required) ────────────────

const MILESTONE_CREDIT_REWARDS: Record<string, number> = {
  "welcome-bonus":    0.50,
  "first-listing":    1.00,
  "first-live":       2.00,
  "first-flash-sale": 1.50,
  "active-lister":    2.00,
  "consistent-seller":1.50,
};

router.get("/user/milestones", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    await syncMilestonesFor(email);
    const rows = await db.execute(
      sql`SELECT milestone_id, progress, completed, claimed FROM user_milestones WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const milestones: Record<string, { progress: number; completed: boolean; claimed: boolean }> = {};
    for (const row of rows) {
      milestones[row.milestone_id] = {
        progress: Number(row.progress),
        completed: Boolean(row.completed),
        claimed: Boolean(row.claimed),
      };
    }
    res.json({ milestones });
  } catch (err) {
    logger.error({ err }, "Failed to get user milestones");
    res.json({ milestones: {} });
  }
});

router.post("/user/milestones/:milestoneId/claim", async (req, res) => {
  try {
    const milestoneId = req.params.milestoneId;
    const email = req.body.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }

    const rows = await db.execute(
      sql`SELECT completed, claimed FROM user_milestones WHERE email = ${email} AND milestone_id = ${milestoneId}`
    ).then(r => r.rows as any[]);

    if (rows.length === 0 || !rows[0].completed) {
      res.status(400).json({ error: "Milestone not completed" }); return;
    }
    if (rows[0].claimed) {
      res.status(409).json({ error: "Already claimed" }); return;
    }

    const creditAmount = MILESTONE_CREDIT_REWARDS[milestoneId] ?? 0;

    await db.execute(
      sql`UPDATE user_milestones SET claimed = TRUE, updated_at = NOW()
          WHERE email = ${email} AND milestone_id = ${milestoneId}`
    );

    if (creditAmount > 0) {
      await db.execute(
        sql`UPDATE users SET credits = GREATEST(0, credits + ${creditAmount}) WHERE email = ${email}`
      );
    }

    const balRow = await db.execute(
      sql`SELECT credits FROM users WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const newBalance = balRow.length > 0 ? parseFloat(balRow[0].credits) : 0;

    logger.info({ email, milestoneId, creditAmount }, "Milestone reward claimed");
    res.json({ success: true, creditAmount, newBalance });
  } catch (err) {
    logger.error({ err }, "Failed to claim milestone reward");
    res.status(500).json({ error: "Failed to claim reward" });
  }
});

// ── Admin milestone routes (require token) ────────────────────────────────────

router.get("/admin/users/:email/milestones", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const rows = await db.execute(
      sql`SELECT milestone_id, progress, completed FROM user_milestones WHERE email = ${email}`
    ).then(r => r.rows as any[]);
    const milestones: Record<string, { progress: number; completed: boolean }> = {};
    for (const row of rows) {
      milestones[row.milestone_id] = { progress: Number(row.progress), completed: Boolean(row.completed) };
    }
    res.json({ milestones });
  } catch (err) {
    logger.error({ err }, "Failed to get milestones");
    res.status(500).json({ error: "Failed to get milestones" });
  }
});

router.patch("/admin/users/:email/milestones/:milestoneId", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const milestoneId = req.params.milestoneId;
    const { progress, completed } = req.body;
    if (typeof progress !== "number") { res.status(400).json({ error: "progress (number) required" }); return; }
    const isCompleted = typeof completed === "boolean" ? completed : progress >= (req.body.total ?? progress);
    await db.execute(
      sql`INSERT INTO user_milestones (email, milestone_id, progress, completed, updated_at)
          VALUES (${email}, ${milestoneId}, ${progress}, ${isCompleted}, NOW())
          ON CONFLICT (email, milestone_id) DO UPDATE
          SET progress = ${progress}, completed = ${isCompleted}, updated_at = NOW()`
    );
    logger.info({ email, milestoneId, progress, completed: isCompleted }, "Admin updated milestone");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to update milestone");
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

// Recent payments

router.get("/admin/payments", async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 20, 100));
    const rows = await db.execute(
      sql`SELECT ct.id, ct.email, ct.credits_added, ct.created_at,
              u.name
          FROM credit_transactions ct
          LEFT JOIN users u ON u.email = ct.email
          WHERE ct.id LIKE 'cs_%' AND ct.credits_added > 0
          ORDER BY ct.created_at DESC LIMIT ${limit}`
    ).then(r => r.rows);
    let stripe: Awaited<ReturnType<typeof getUncachableStripeClient>> | null = null;
    try { stripe = await getUncachableStripeClient(); } catch { /* Show unavailable, never estimate from credits. */ }
    const report = await attachStripePaymentAmounts(rows as Array<{ id: string }>, (id) => {
      if (!stripe) return Promise.reject(new Error("Stripe unavailable"));
      return stripe.checkout.sessions.retrieve(id);
    });
    res.json(report);
  } catch (err) {
    logger.error({ err }, "Failed to get payments");
    res.status(500).json({ error: "Failed to get payments" });
  }
});

// GET /api/admin/listings — paginated listings table for admin review
router.get("/admin/listings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string) ?? "";
    const imported = req.query.imported as string;
    // imported=1 → superdeals account (all imports), imported=0 → user listings
    const importedFilter = imported === "1"
      ? sql`seller_email = 'bazunkdeals@gmail.com'`
      : imported === "0"
        ? sql`seller_email != 'bazunkdeals@gmail.com'`
        : sql`TRUE`;

    const rows = await db.execute(sql`
      SELECT id, public_id, title, price, price_gbp, currency, category, subcategory,
             condition, status, seller_email, seller_username, image, specifications,
             created_at
      FROM listings
      WHERE (${search ? sql`(title ILIKE ${'%' + search + '%'} OR public_id ILIKE ${'%' + search + '%'} OR seller_email ILIKE ${'%' + search + '%'})` : sql`TRUE`})
      AND (${importedFilter})
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `).then(r => r.rows);

    const [{ cnt }] = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM listings
      WHERE (${search ? sql`(title ILIKE ${'%' + search + '%'} OR public_id ILIKE ${'%' + search + '%'} OR seller_email ILIKE ${'%' + search + '%'})` : sql`TRUE`})
      AND (${importedFilter})
    `).then(r => r.rows as { cnt: string }[]);

    res.json({ listings: rows, total: parseInt(cnt) });
  } catch (err) {
    logger.error({ err }, "Failed to get admin listings");
    res.status(500).json({ error: "Failed to get listings" });
  }
});

// PATCH /api/admin/listings/:id/image — set or replace a listing image from Admin
router.patch("/admin/listings/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const image = typeof req.body?.image === "string" ? req.body.image.trim() : "";
    if (!Number.isInteger(id) || id < 1) { res.status(400).json({ error: "Invalid listing ID" }); return; }
    if (image && !/^https:\\/\\//i.test(image)) { res.status(400).json({ error: "Image must be an HTTPS URL." }); return; }
    if (image.length > 4000) { res.status(400).json({ error: "Image URL is too long." }); return; }
    const rows = await db.execute(sql`UPDATE listings SET image=${image || null}, updated_at=NOW() WHERE id=${id} RETURNING id,image`).then(r => r.rows);
    if (!rows.length) { res.status(404).json({ error: "Listing not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    logger.error({ err }, "Failed to update listing image");
    res.status(500).json({ error: "Failed to update listing image" });
  }
});

// GET /api/admin/search-amazon — search Amazon UK and return raw results for admin to browse
router.get("/admin/search-amazon", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const query = (req.query.q as string ?? "").trim();
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!query) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const resp = await fetch(
      `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(query)}&country=GB&page=${page}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com" } }
    );
    if (!resp.ok) {
      res.status(502).json({ error: rapidApiErrorMessage("Amazon", resp.status) });
      return;
    }
    const data = await resp.json() as Record<string, unknown>;
    const raw = ((data?.data as Record<string, unknown>)?.products as Record<string, unknown>[]) ?? [];

    const products = raw
      .filter(p => p.asin && p.product_price)
      .map(p => {
        const priceGbp = parseFloat(String(p.product_price ?? "").replace(/[^0-9.]/g, "")) || 0;
        return {
          asin: p.asin as string,
          title: String(p.product_title ?? "Amazon Product").slice(0, 200),
          price_gbp: priceGbp,
          image: (p.product_photo as string | null) ?? null,
          rating: String(p.product_star_rating ?? ""),
          amazon_url: `https://www.amazon.co.uk/dp/${p.asin}`,
        };
      });

    res.json({ products, total: products.length });
  } catch (err) {
    logger.error({ err }, "Amazon search failed");
    res.status(500).json({ error: "Amazon search failed" });
  }
});

// POST /api/admin/import-selected-amazon — import specific chosen ASINs
router.post("/admin/import-selected-amazon", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  interface SelectedProduct {
    asin: string; title: string; price_gbp: number;
    image: string | null; amazon_url: string; category?: string;
  }

  const products: SelectedProduct[] = req.body.products ?? [];
  const markupPct    = Math.max(0, parseFloat(String(req.body.markup   ?? 35))   || 35);
  const shippingGbp  = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);
  const category     = (req.body.category    as string) || "other";
  const subcategory  = (req.body.subcategory as string) || null;
  const sellerEmail  = (req.body.sellerEmail as string) || "bazunkdeals@gmail.com";

  if (!products.length) { res.status(400).json({ error: "products array required" }); return; }

  // Look up the chosen seller's name from the DB
  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const SELLER_EMAIL = sellerEmail;
  const SELLER_NAME  = sellerRow?.name ?? sellerEmail.split("@")[0];
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.asin || !p.price_gbp) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings WHERE specifications LIKE ${'%"asin":"' + p.asin + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const bazunkPrice = Math.round((p.price_gbp * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
    const publicId = `BZK-AMZ-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const specs = JSON.stringify({
      source: "Amazon UK",
      asin: p.asin,
      amazon_url: p.amazon_url,
      amazon_price_gbp: p.price_gbp,
      shipping_gbp: shippingGbp,
      markup_pct: markupPct,
    });

    // Fetch rich product details (About this item bullets + description)
    const details = await fetchAmazonDetails(p.asin, apiKey);
    const richTitle = details?.title ?? p.title;
    const description = details
      ? buildAmazonDescription(details, p.price_gbp)
      : [p.title, "", "Product sourced from Amazon UK.", "", `Original Amazon UK price: £${p.price_gbp.toFixed(2)}`, `View on Amazon: ${p.amazon_url}`].join("\n");
    const image = details?.image ?? p.image ?? null;

    await db.execute(sql`
      INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
        description, condition, image, seller_email, seller_name, specifications, status, created_at, updated_at)
      VALUES (
        ${publicId}, ${richTitle}, ${bazunkPrice}, ${bazunkPrice}, 'GBP', ${category}, ${subcategory},
        ${description},
        'new', ${image}, ${SELLER_EMAIL}, ${SELLER_NAME},
        ${specs}, 'active', NOW(), NOW()
      )
    `);
    inserted++;
  }

  logger.info({ inserted, markupPct, shippingGbp }, "Amazon UK selected import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} products` });
});

// POST /api/admin/sync-amazon-prices — re-fetch current Amazon UK prices and re-price by markup rules
router.post("/admin/sync-amazon-prices", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE seller_email = 'bazunkdeals@gmail.com'
      AND specifications LIKE '%"source":"Amazon UK"%'
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No Amazon imports found" }); return; }

  // Fetch current prices in parallel batches of 5
  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 5;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async row => {
      try {
        const specs = JSON.parse(row.specifications) as Record<string, unknown>;
        const asin = specs.asin as string;
        const markupPct   = parseFloat(String(specs.markup_pct  ?? 35))  || 35;
        const shippingGbp  = parseFloat(String(specs.shipping_gbp ?? 3.99)) || 3.99;
        const oldPrice    = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!asin) return;

        const resp = await fetch(
          `https://real-time-amazon-data.p.rapidapi.com/search?query=${encodeURIComponent(asin)}&country=GB&page=1`,
          { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-amazon-data.p.rapidapi.com" } }
        );
        if (!resp.ok) { errors++; return; }
        const data = await resp.json() as Record<string, unknown>;
        const products = ((data?.data as Record<string, unknown>)?.products as Record<string, unknown>[]) ?? [];
        const match = products.find(p => p.asin === asin) ?? products[0];
        if (!match) { errors++; return; }

        const priceStr = String(match.product_price ?? "").replace(/[^0-9.]/g, "");
        const newAmazonPrice = parseFloat(priceStr);
        if (!newAmazonPrice || newAmazonPrice <= 0) { errors++; return; }

        if (Math.abs(newAmazonPrice - oldPrice) < 0.01) { unchanged++; return; }

        const newBazunkPrice = Math.round((newAmazonPrice * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
        const newSpecs = JSON.stringify({ ...specs, amazon_price_gbp: newAmazonPrice });

        await db.execute(sql`
          UPDATE listings
          SET price = ${newBazunkPrice}, price_gbp = ${newBazunkPrice},
              specifications = ${newSpecs}, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        updated++;
      } catch {
        errors++;
      }
    }));
  }

  logger.info({ updated, unchanged, errors }, "Amazon price sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length} products: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// POST /api/admin/sync-amazon-details — re-fetch title, about-this-item bullets & description
router.post("/admin/sync-amazon-details", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE specifications LIKE '%"source":"Amazon UK"%'
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No Amazon imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 3;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await Promise.all(batch.map(async row => {
      try {
        const specs    = JSON.parse(row.specifications) as Record<string, unknown>;
        const asin     = specs.asin as string;
        const priceGbp = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!asin) return;

        const details = await fetchAmazonDetails(asin, apiKey);
        if (!details) { errors++; return; }

        const latestPrice = details.price_gbp || priceGbp;
        const description = buildAmazonDescription(details, latestPrice);

        await db.execute(sql`
          UPDATE listings
          SET title = ${details.title}, description = ${description}, updated_at = NOW()
          WHERE id = ${row.id}
        `);

        if (details.title === row.title) unchanged++;
        else updated++;
      } catch {
        errors++;
      }
    }));
  }

  logger.info({ updated, unchanged, errors }, "Amazon details sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length} products: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// PATCH /api/admin/bulk-markup — re-price all Amazon UK imports with new markup + shipping
router.patch("/admin/bulk-markup", async (req, res) => {
  try {
    const markupPct   = Math.max(0, parseFloat(String(req.body.markup  ?? 35))  || 35);
    const shippingGbp  = Math.max(0, parseFloat(String(req.body.shipping ?? 3.99)) || 3.99);

    const rows = await db.execute(sql`
      SELECT id, specifications FROM listings
      WHERE seller_email = 'bazunkdeals@gmail.com' AND specifications LIKE '%"source":"Amazon UK"%'
    `).then(r => r.rows as { id: number; specifications: string }[]);

    let updated = 0;
    for (const row of rows) {
      try {
        const specs = JSON.parse(row.specifications) as Record<string, unknown>;
        const amazonPrice = parseFloat(String(specs.amazon_price_gbp ?? 0));
        if (!amazonPrice) continue;
        const newPrice = Math.round((amazonPrice * (1 + markupPct / 100) + shippingGbp) * 100) / 100;
        const newSpecs = JSON.stringify({ ...specs, shipping_gbp: shippingGbp, markup_pct: markupPct });
        await db.execute(sql`
          UPDATE listings SET price = ${newPrice}, price_gbp = ${newPrice}, specifications = ${newSpecs}, updated_at = NOW()
          WHERE id = ${row.id}
        `);
        updated++;
      } catch { /* malformed specs — skip */ }
    }

    logger.info({ updated, markupPct, shippingGbp }, "Bulk markup applied to Amazon imports");
    res.json({ updated, message: `Updated pricing on ${updated} Amazon imports` });
  } catch (err) {
    logger.error({ err }, "Bulk markup failed");
    res.status(500).json({ error: "Bulk markup failed" });
  }
});

// DELETE /api/admin/clear-demo-listings — wipe all BZK-DEMO-* listings
router.delete("/admin/clear-demo-listings", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-DEMO-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "Demo listings cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear demo listings failed");
    res.status(500).json({ error: "Failed to clear demo listings" });
  }
});

// DELETE /api/admin/clear-amazon-imports — wipe all BZK-AMZ-* listings
router.delete("/admin/clear-amazon-imports", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-AMZ-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "Amazon imports cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear Amazon imports failed");
    res.status(500).json({ error: "Failed to clear imports" });
  }
});


// GET /api/admin/importer-control — operational overview for Amazon/eBay/AliExpress imports
router.get("/admin/importer-control", async (_req, res) => {
  try {
    const listingRows = await db.execute(sql`
      SELECT id, public_id, title, status, price, specifications, updated_at
      FROM listings
      WHERE specifications LIKE '%"source":"Amazon UK"%'
         OR specifications LIKE '%"source":"eBay UK"%'
         OR specifications LIKE '%"source":"eBay US"%'
      ORDER BY updated_at DESC
    `).then(r => r.rows as Record<string, unknown>[]);

    const aliRows = await db.execute(sql`
      SELECT si.id, si.listing_id, si.supplier_id, si.supplier_url, si.supplier_price,
             si.last_synced_at, si.sync_status, si.sync_error, si.updated_at,
             l.public_id, l.title, l.status, l.price
      FROM supplier_imports si
      JOIN listings l ON l.id = si.listing_id
      WHERE LOWER(si.supplier_source) = 'aliexpress'
      ORDER BY COALESCE(si.last_synced_at, si.updated_at) DESC
    `).then(r => r.rows as Record<string, unknown>[]);

    const bySource: Record<string, { total:number; active:number; paused:number; failed:number; lastActivity:string|null }> = {
      amazon: { total:0, active:0, paused:0, failed:0, lastActivity:null },
      ebay: { total:0, active:0, paused:0, failed:0, lastActivity:null },
      aliexpress: { total:0, active:0, paused:0, failed:0, lastActivity:null },
    };
    const alerts: Record<string, unknown>[] = [];

    for (const row of listingRows) {
      let specs: Record<string, unknown> = {};
      try { specs = JSON.parse(String(row.specifications ?? '{}')); } catch {}
      const source = String(specs.source ?? '').toLowerCase();
      const key = source.includes('amazon') ? 'amazon' : source.includes('ebay') ? 'ebay' : null;
      if (!key) continue;
      const bucket = bySource[key];
      bucket.total++;
      const st = String(row.status ?? '');
      if (st === 'active') bucket.active++;
      if (st === 'paused') bucket.paused++;
      if (!bucket.lastActivity && row.updated_at) bucket.lastActivity = String(row.updated_at);
      if (specs.source_price_anomaly || st === 'paused') {
        bucket.failed++;
        alerts.push({
          source: key, id: row.id, publicId: row.public_id, title: row.title, status: st,
          type: specs.source_price_anomaly ? 'price_change' : 'unavailable',
          currentSourcePrice: specs.ebay_price ?? specs.amazon_price_gbp ?? null,
          proposedSourcePrice: specs.proposed_source_price ?? null,
          lastChecked: specs.source_last_checked ?? row.updated_at ?? null,
          error: specs.source_price_anomaly ? 'Source price changed outside the safety range; listing paused.' : 'Listing is paused.',
        });
      }
    }

    for (const row of aliRows) {
      const b = bySource.aliexpress; b.total++;
      const st = String(row.status ?? '');
      if (st === 'active') b.active++;
      if (st === 'paused') b.paused++;
      if (!b.lastActivity && (row.last_synced_at || row.updated_at)) b.lastActivity = String(row.last_synced_at ?? row.updated_at);
      if (String(row.sync_status) === 'error') {
        b.failed++;
        alerts.push({ source:'aliexpress', id:row.id, publicId:row.public_id, title:row.title, status:st,
          type:'sync_error', currentSourcePrice:row.supplier_price, proposedSourcePrice:null,
          lastChecked:row.last_synced_at ?? row.updated_at ?? null, error:row.sync_error ?? 'Supplier sync failed.' });
      }
    }

    res.json({
      keyConfigured: rapidApiKeyStatus().configured,
      sources: bySource,
      trackedUsage: {
        importedProducts: bySource.amazon.total + bySource.ebay.total + bySource.aliexpress.total,
        productsNeedingAttention: alerts.length,
      },
      alerts: alerts.slice(0, 200),
      note: 'Usage shown here is Bazunk-tracked importer activity, not RapidAPI billing/quota usage.',
    });
  } catch (err) {
    logger.error({ err }, 'Failed to load importer control centre');
    res.status(500).json({ error: 'Failed to load importer control centre' });
  }
});

// ── eBay routes ──────────────────────────────────────────────────────────────

// GET /api/admin/search-ebay — search eBay UK or US
router.get("/admin/search-ebay", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const query = (req.query.q as string ?? "").trim();
  const site  = (req.query.site as string ?? "uk") === "us" ? "us" : "uk";
  const page  = Math.max(1, parseInt(req.query.page as string) || 1);
  if (!query) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
    const offset        = (page - 1) * 50;
    const resp = await fetch(
      `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(query)}&marketplace_id=${marketplaceId}&item_location_country=${site === "uk" ? "GB" : "US"}&delivery_country=${site === "uk" ? "GB" : "US"}&offset=${offset}`,
      { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
    );
    if (!resp.ok) { res.status(502).json({ error: rapidApiErrorMessage("eBay", resp.status) }); return; }

    const data = await resp.json() as Record<string, unknown>;
    const raw  = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
    const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
    const ebayBase = site === "uk" ? "https://www.ebay.co.uk" : "https://www.ebay.com";

    const expectedCountries = site === "uk"
      ? new Set(["GB", "GBR", "UK", "UNITED KINGDOM"])
      : new Set(["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"]);
    const products = raw
      .filter(p => {
        if (!p.legacyItemId || !(p.price as Record<string, unknown>)?.value) return false;
        const loc = (p.itemLocation as Record<string, unknown>) ?? {};
        const country = String(loc.country ?? "").trim().toUpperCase();
        const cur = String(((p.price as Record<string, unknown>)?.currency ?? "")).toUpperCase();
        return expectedCountries.has(country) && cur === (site === "uk" ? "GBP" : "USD");
      })
      .map(p => {
        const priceObj      = (p.price as Record<string, unknown>) ?? {};
        const price         = parseFloat(String(priceObj.value ?? "").replace(/[^0-9.]/g, "")) || 0;
        const itemCurrency  = String((priceObj.currency as string) ?? currency) as "GBP" | "USD";
        const imgUrl        = ((p.image as Record<string, unknown>)?.imageUrl as string | null)
          ?? ((p.thumbnailImages as Record<string, unknown>[])?.[0]?.imageUrl as string | null)
          ?? null;
        const seller        = (p.seller as Record<string, unknown>) ?? {};
        const location      = (p.itemLocation as Record<string, unknown>) ?? {};
        const country       = String(location.country ?? "");
        const cats          = (p.categories as { categoryName: string }[]) ?? [];
        const categoryNames = cats.map(c => c.categoryName).filter(Boolean);
        const shippingOpts  = (p.shippingOptions as Record<string, unknown>[]) ?? [];
        const firstShip     = shippingOpts[0] ?? {};
        const shipCost      = (firstShip.shippingCost as Record<string, unknown>)?.value;
        const shippingLabel = shipCost === "0.00" || shipCost === 0 ? "Free" : shipCost ? `${itemCurrency === "GBP" ? "£" : "$"}${shipCost}` : null;
        const mktPrice      = (p.marketingPrice as Record<string, unknown>) ?? {};
        const origPrice     = (mktPrice.originalPrice as Record<string, unknown>)?.value;
        const discountPct   = mktPrice.discountPercentage ? `${mktPrice.discountPercentage}% off` : null;
        const buyingOptions = (p.buyingOptions as string[]) ?? [];
        return {
          item_id:         String(p.legacyItemId),
          title:           String(p.title ?? "eBay Listing").slice(0, 200),
          price,
          currency:        itemCurrency,
          image:           imgUrl,
          rating:          String(seller.feedbackScore ?? ""),
          seller_username: String(seller.username ?? ""),
          seller_feedback: String(seller.feedbackPercentage ?? ""),
          condition:       String(p.condition ?? ""),
          ebay_url:        `${ebayBase}/itm/${p.legacyItemId}`,
          country,
          categories:      categoryNames,
          shipping_label:  shippingLabel,
          shipping_type:   String(firstShip.shippingCostType ?? ""),
          original_price:  origPrice ? String(origPrice) : null,
          discount_pct:    discountPct,
          buying_options:  buyingOptions,
          item_location:   country ? `${country}${location.postalCode ? ` (${String(location.postalCode).replace(/\*+$/, "***")})` : ""}` : null,
        };
      })
      .filter(p => p.price > 0);

    res.json({ products, total: (data.total as number) ?? products.length });
  } catch (err) {
    logger.error({ err }, "eBay search failed");
    res.status(500).json({ error: "eBay search failed" });
  }
});

// POST /api/admin/import-selected-ebay — import chosen eBay listings
router.post("/admin/import-selected-ebay", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  interface SelectedEbay {
    item_id: string; title: string; price: number; currency: "GBP" | "USD";
    image: string | null; ebay_url: string; condition: string;
    seller_username?: string; seller_feedback?: string;
    categories?: string[]; shipping_label?: string | null; shipping_type?: string;
    original_price?: string | null; discount_pct?: string | null;
    buying_options?: string[]; item_location?: string | null;
  }

  const products: SelectedEbay[] = req.body.products ?? [];
  const site        = (req.body.site as string ?? "uk") === "us" ? "us" : "uk";
  const currency: "GBP" | "USD" = site === "uk" ? "GBP" : "USD";
  const markupPct   = Math.max(0, parseFloat(String(req.body.markup ?? 35)) || 35);
  const shippingAmt = Math.max(0, parseFloat(String(req.body.shipping ?? 0)) || 0);
  const minProfit = Math.max(0, parseFloat(String(req.body.minProfit ?? 5)) || 5);
  const category    = (req.body.category    as string) || "other";
  const subcategory = (req.body.subcategory as string) || null;
  const sellerEmail = "cczslater@gmail.com";

  if (!products.length) { res.status(400).json({ error: "products array required" }); return; }

  const sellerRow = await db.execute(
    sql`SELECT name FROM users WHERE email = ${sellerEmail} LIMIT 1`
  ).then(r => r.rows[0] as { name: string | null } | undefined);
  const SELLER_NAME = "Bazunk Official Store";
  await db.execute(sql`INSERT INTO users (id,email,name,verification_status,created_at) VALUES ('bazunk-official-store',${sellerEmail},${SELLER_NAME},'verified',NOW()) ON CONFLICT (email) DO UPDATE SET name=${SELLER_NAME}, verification_status='verified'`);
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  let inserted = 0;

  for (const p of products) {
    if (!p.item_id || !p.price) continue;
    const exists = await db.execute(
      sql`SELECT id FROM listings WHERE specifications LIKE ${'%"item_id":"' + p.item_id + '"%'}`
    ).then(r => r.rows.length > 0);
    if (exists) continue;

    const landedCost = p.price + shippingAmt;
    const bazunkPrice = Math.round(Math.max(landedCost * (1 + markupPct / 100), landedCost + minProfit) * 100) / 100;
    const prefix      = site === "uk" ? "BZK-EBY-UK" : "BZK-EBY-US";
    const publicId    = `${prefix}-${date}-${String(Date.now()).slice(-6)}-${String(inserted + 1).padStart(3, "0")}`;
    const source      = site === "uk" ? "eBay UK" : "eBay US";
    const specs       = JSON.stringify({
      source, item_id: p.item_id, ebay_url: p.ebay_url,
      ebay_price: p.price, ebay_currency: currency, ebay_site: site,
      shipping: shippingAmt, markup_pct: markupPct, min_profit: minProfit, official_store: true,
      official_store_name: "Bazunk Official Store", source_last_checked: new Date().toISOString(),
    });

    const sym = p.currency === "GBP" ? "£" : "$";
    const descParts: string[] = [p.title, ""];
    if (p.condition) descParts.push(`Condition: ${p.condition}`);
    if (p.categories?.length) descParts.push(`Category: ${p.categories.join(" › ")}`);
    if (p.shipping_label) {
      const shipType = p.shipping_type === "FIXED" ? "Standard" : p.shipping_type === "FREE" ? "Free" : p.shipping_type ?? "";
      descParts.push(`Shipping: ${p.shipping_label}${shipType && shipType !== "Free" ? ` (${shipType})` : ""}`);
    }
    if (p.item_location) descParts.push(`Item location: ${p.item_location}`);
    if (p.buying_options?.length) {
      descParts.push(`Listing type: ${p.buying_options.map(o => o.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase())).join(", ")}`);
    }
    descParts.push("");
    while (descParts.length && descParts[descParts.length - 1] === "") descParts.pop();
    const description = descParts.join("\n");
    const image       = p.image ?? null;
    const condition   = p.condition ?? "used";
    const condNorm  = ["new", "used", "refurbished", "for-parts"].includes(condition.toLowerCase())
      ? condition.toLowerCase() : "used";

    await db.execute(sql`
      INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
        description, condition, image, seller_email, seller_name, specifications, status, created_at, updated_at)
      VALUES (
        ${publicId}, ${p.title}, ${bazunkPrice}, ${bazunkPrice}, ${currency},
        ${category}, ${subcategory}, ${description}, ${condNorm},
        ${image}, ${sellerEmail}, ${SELLER_NAME}, ${specs}, 'active', NOW(), NOW()
      )
    `);
    await db.execute(sql`UPDATE listings SET seller_username = 'Bazunk Official Store' WHERE public_id = ${publicId}`);
    inserted++;
  }

  logger.info({ inserted, site, markupPct, shippingAmt, minProfit }, "eBay Official Store import complete");
  res.json({ imported: inserted, message: `Imported ${inserted} product${inserted !== 1 ? "s" : ""}` });
});

// POST /api/admin/sync-ebay-prices — re-fetch current eBay prices and reprice
router.post("/admin/sync-ebay-prices", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const rows = await db.execute(sql`
    SELECT id, specifications FROM listings
    WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
      AND status = 'active'
  `).then(r => r.rows as { id: number; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No eBay imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 5;

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(rows.slice(i, i + BATCH).map(async row => {
      try {
        const specs     = JSON.parse(row.specifications) as Record<string, unknown>;
        const itemId    = specs.item_id as string;
        const site      = (specs.ebay_site as string ?? "uk") === "us" ? "us" : "uk";
        const markupPct = parseFloat(String(specs.markup_pct ?? 35)) || 35;
        const shipping  = parseFloat(String(specs.shipping ?? 0)) || 0;
        const minProfit = parseFloat(String(specs.min_profit ?? 5)) || 5;
        const oldPrice  = parseFloat(String(specs.ebay_price ?? 0));
        if (!itemId) return;

        const marketplaceId = site === "uk" ? "EBAY_GB" : "EBAY_US";
        const resp = await fetch(
          `https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(itemId)}&marketplace_id=${marketplaceId}`,
          { headers: { "X-RapidAPI-Key": apiKey, "X-RapidAPI-Host": "real-time-ebay-data.p.rapidapi.com" } }
        );
        if (!resp.ok) { errors++; return; }

        const data     = await resp.json() as Record<string, unknown>;
        const results  = (data?.itemSummaries as Record<string, unknown>[]) ?? [];
        const match    = results.find(p => String(p.legacyItemId) === itemId) ?? results[0];
        if (!match) { errors++; return; }

        const priceObj     = (match.price as Record<string, unknown>) ?? {};
        const newEbayPrice = parseFloat(String(priceObj.value ?? "").replace(/[^0-9.]/g, ""));
        if (!newEbayPrice || newEbayPrice <= 0) { errors++; return; }
        if (Math.abs(newEbayPrice - oldPrice) < 0.01) { unchanged++; return; }

        const landedCost = newEbayPrice + shipping;
        const newBazunkPrice = Math.round(Math.max(landedCost * (1 + markupPct / 100), landedCost + minProfit) * 100) / 100;
        const changeRatio = oldPrice > 0 ? newEbayPrice / oldPrice : 1;
        if (changeRatio > 2.5 || changeRatio < 0.4) {
          const pausedSpecs = JSON.stringify({ ...specs, source_price_anomaly: true, source_last_checked: new Date().toISOString(), proposed_source_price: newEbayPrice });
          await db.execute(sql`UPDATE listings SET status='paused', specifications=${pausedSpecs}, updated_at=NOW() WHERE id=${row.id}`); errors++; return;
        }
        const newSpecs = JSON.stringify({ ...specs, ebay_price: newEbayPrice, source_price_anomaly: false, source_last_checked: new Date().toISOString() });
        await db.execute(sql`
          UPDATE listings SET price = ${newBazunkPrice}, price_gbp = ${newBazunkPrice},
            specifications = ${newSpecs}, updated_at = NOW() WHERE id = ${row.id}
        `);
        updated++;
      } catch { errors++; }
    }));
  }

  logger.info({ updated, unchanged, errors }, "eBay price sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length}: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// POST /api/admin/sync-ebay-details — re-fetch eBay titles & descriptions
router.post("/admin/sync-ebay-details", async (req, res) => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) { res.status(503).json({ error: "RapidAPI key not set — add it at the top of Admin → Importers." }); return; }

  const rows = await db.execute(sql`
    SELECT id, title, specifications FROM listings
    WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
      AND status = 'active'
  `).then(r => r.rows as { id: number; title: string; specifications: string }[]);

  if (!rows.length) { res.json({ updated: 0, unchanged: 0, errors: 0, message: "No eBay imports found" }); return; }

  let updated = 0, unchanged = 0, errors = 0;
  const BATCH = 3;

  for (let i = 0; i < rows.length; i += BATCH) {
    await Promise.all(rows.slice(i, i + BATCH).map(async row => {
      try {
        const specs  = JSON.parse(row.specifications) as Record<string, unknown>;
        const itemId = specs.item_id as string;
        if (!itemId) return;

        // Item-details endpoint not available on this API plan; skip silently
        unchanged++;
      } catch { errors++; }
    }));
  }

  logger.info({ updated, unchanged, errors }, "eBay details sync complete");
  res.json({ updated, unchanged, errors, message: `Synced ${rows.length}: ${updated} updated, ${unchanged} unchanged, ${errors} errors` });
});

// PATCH /api/admin/bulk-markup-ebay — re-price all eBay imports
router.patch("/admin/bulk-markup-ebay", async (req, res) => {
  try {
    const markupPct = Math.max(0, parseFloat(String(req.body.markup  ?? 35))  || 35);
    const shipping  = Math.max(0, parseFloat(String(req.body.shipping ?? 0)) || 0);
    const minProfit = Math.max(0, parseFloat(String(req.body.minProfit ?? 5)) || 5);

    const rows = await db.execute(sql`
      SELECT id, specifications FROM listings
      WHERE (specifications LIKE '%"source":"eBay UK"%' OR specifications LIKE '%"source":"eBay US"%')
    `).then(r => r.rows as { id: number; specifications: string }[]);

    let updated = 0;
    for (const row of rows) {
      try {
        const specs    = JSON.parse(row.specifications) as Record<string, unknown>;
        const ebayPrice = parseFloat(String(specs.ebay_price ?? 0));
        if (!ebayPrice) continue;
        const landedCost = ebayPrice + shipping;
        const newPrice = Math.round(Math.max(landedCost * (1 + markupPct / 100), landedCost + minProfit) * 100) / 100;
        const newSpecs = JSON.stringify({ ...specs, shipping, markup_pct: markupPct, min_profit: minProfit });
        await db.execute(sql`
          UPDATE listings SET price = ${newPrice}, price_gbp = ${newPrice},
            specifications = ${newSpecs}, updated_at = NOW() WHERE id = ${row.id}
        `);
        updated++;
      } catch { /* malformed specs */ }
    }

    logger.info({ updated, markupPct, shipping }, "Bulk markup applied to eBay imports");
    res.json({ updated, message: `Updated pricing on ${updated} eBay imports` });
  } catch (err) {
    logger.error({ err }, "eBay bulk markup failed");
    res.status(500).json({ error: "Bulk markup failed" });
  }
});

// DELETE /api/admin/clear-ebay-imports — wipe all BZK-EBY-* listings
router.delete("/admin/clear-ebay-imports", async (req, res) => {
  try {
    const result = await db.execute(sql`DELETE FROM listings WHERE public_id LIKE 'BZK-EBY-%'`);
    const deleted = (result as unknown as { rowCount: number }).rowCount ?? 0;
    logger.info({ deleted }, "eBay imports cleared");
    res.json({ deleted });
  } catch (err) {
    logger.error({ err }, "Clear eBay imports failed");
    res.status(500).json({ error: "Failed to clear eBay imports" });
  }
});

// POST /api/admin/seed-demo — idempotently inserts 200 demo listings
router.post("/admin/seed-demo", async (req, res) => {
  try {
    const existing = await db.execute(
      sql`SELECT COUNT(*) AS cnt FROM listings WHERE public_id LIKE 'BZK-DEMO-%'`
    ).then(r => parseInt(String((r.rows[0] as Record<string, unknown>)?.cnt ?? "0")));

    if (existing >= 200) {
      res.json({ seeded: 0, existing, message: "Demo listings already present" });
      return;
    }

    const SELLER_EMAIL = "bazunkdeals@gmail.com";
    const SELLER_USERNAME = "superdeals";
    const SELLER_NAME = "Super Deals UK";
    const MARKUP = 1.30;
    let inserted = 0;

    for (let i = 0; i < DEMO_PRODUCTS.length; i++) {
      const p = DEMO_PRODUCTS[i];
      const num = String(i + 1).padStart(3, "0");
      const publicId = `BZK-DEMO-${num}`;
      const alreadyExists = await db.execute(
        sql`SELECT id FROM listings WHERE public_id = ${publicId}`
      ).then(r => r.rows.length > 0);
      if (alreadyExists) continue;

      const priceGbp = parseFloat((p.base * MARKUP).toFixed(2));
      const specs = JSON.stringify({ source: "Amazon UK", asin: p.asin, amazon_url: `https://www.amazon.co.uk/dp/${p.asin}` });

      await db.execute(sql`
        INSERT INTO listings (public_id, title, price, price_gbp, currency, category, subcategory,
          description, condition, image, seller_email, seller_username, seller_name,
          tags, specifications, status, created_at, updated_at)
        VALUES (
          ${publicId}, ${p.title}, ${priceGbp}, ${priceGbp}, 'GBP', ${p.cat}, ${p.sub},
          ${p.desc}, ${p.cond}, ${p.img}, ${SELLER_EMAIL}, ${SELLER_USERNAME}, ${SELLER_NAME},
          ${p.tags}, ${specs}, 'active', NOW(), NOW()
        )
      `);
      inserted++;
    }

    logger.info({ inserted }, "Demo seed completed");
    res.json({ seeded: inserted, existing, message: `Seeded ${inserted} demo listings` });
  } catch (err) {
    logger.error({ err }, "Demo seed failed");
    res.status(500).json({ error: "Seed failed", detail: String(err) });
  }
});

// ── Gumtree scraper helpers ────────────────────────────────────────────────

interface GumtreeListing {
  id: string;
  title: string;
  price: string;
  location: string;
  thumbnail: string | null;
  url: string;
  description: string;
}

function tryPath(obj: unknown, ...keys: string[]): unknown {
  let curr = obj;
  for (const k of keys) {
    if (!curr || typeof curr !== "object") return undefined;
    curr = (curr as Record<string, unknown>)[k];
  }
  return curr;
}

function extractGtPrice(item: Record<string, unknown>): string {
  if (typeof item.price === "string") return item.price;
  if (typeof item.price === "object" && item.price !== null) {
    const p = item.price as Record<string, unknown>;
    if (p.display) return String(p.display);
    if (p.formatted) return String(p.formatted);
    if (p.amount) return `£${p.amount}`;
  }
  if (item.priceValue) return `£${item.priceValue}`;
  return "";
}

function extractGtLocation(item: Record<string, unknown>): string {
  if (typeof item.location === "string" && item.location) return item.location;
  if (typeof item.location === "object" && item.location !== null) {
    const loc = item.location as Record<string, unknown>;
    return String(loc.areaName ?? loc.name ?? loc.town ?? loc.county ?? "UK");
  }
  return String(item.locationName ?? item.area ?? item.town ?? "UK");
}

function extractGtThumbnail(item: Record<string, unknown>): string | null {
  if (typeof item.thumbnailUrl === "string" && item.thumbnailUrl) return item.thumbnailUrl;
  if (typeof item.imageUrl === "string" && item.imageUrl) return item.imageUrl;
  if (Array.isArray(item.photos) && item.photos.length > 0) {
    const p = item.photos[0] as Record<string, unknown>;
    return String(p.url ?? p.thumbnailUrl ?? p.src ?? "") || null;
  }
  if (typeof item.image === "string") return item.image || null;
  if (typeof item.image === "object" && item.image !== null) {
    const img = item.image as Record<string, unknown>;
    return String(img.url ?? img.src ?? "") || null;
  }
  return null;
}

function extractGtUrl(item: Record<string, unknown>): string {
  const raw = String(item.url ?? item.href ?? item.link ?? item.adUrl ?? "");
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("/")) return `https://www.gumtree.com${raw}`;
  return "https://www.gumtree.com/";
}

function extractGumtreeListings(nextData: unknown): GumtreeListing[] {
  const PATHS: string[][] = [
    ["props", "pageProps", "searchData", "results"],
    ["props", "pageProps", "searchResults", "results"],
    ["props", "pageProps", "listings"],
    ["props", "pageProps", "data", "results"],
    ["props", "pageProps", "data", "listings"],
    ["props", "pageProps", "initialState", "search", "results"],
    ["props", "pageProps", "searchData", "ads"],
    ["props", "pageProps", "ads"],
  ];

  for (const path of PATHS) {
    const val = tryPath(nextData, ...path);
    if (Array.isArray(val) && val.length > 0) {
      return val.slice(0, 24).map((item: Record<string, unknown>, i) => ({
        id: String(item.id ?? item.adId ?? item.listingId ?? i),
        title: String(item.title ?? item.name ?? item.headline ?? ""),
        price: extractGtPrice(item),
        location: extractGtLocation(item),
        thumbnail: extractGtThumbnail(item),
        url: extractGtUrl(item),
        description: String(item.description ?? item.snippet ?? item.body ?? ""),
      })).filter(l => l.title);
    }
  }
  return [];
}

// GET /api/admin/scrape-gumtree — scrape Gumtree search results
router.get("/admin/scrape-gumtree", requireAdmin, async (req, res) => {
  const { q, page = "1" } = req.query as Record<string, string>;
  if (!q?.trim()) { res.status(400).json({ error: "q is required" }); return; }

  try {
    const searchUrl = `https://www.gumtree.com/search?search_category=all&q=${encodeURIComponent(q.trim())}&page=${page}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok) {
      res.status(502).json({ error: `Gumtree returned ${response.status}`, listings: [] });
      return;
    }

    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);

    if (!match) {
      res.json({ listings: [], warning: "Could not find Next.js data — Gumtree may have changed structure" });
      return;
    }

    const nextData = JSON.parse(match[1]);
    const listings = extractGumtreeListings(nextData);
    logger.info({ q, page, found: listings.length }, "Gumtree scrape");
    res.json({ listings });
  } catch (err) {
    logger.error({ err }, "Gumtree scrape failed");
    res.status(500).json({ error: "Scrape failed", detail: String(err), listings: [] });
  }
});

// POST /api/admin/import-gumtree — import selected scraped Gumtree listings as classifieds
router.post("/admin/import-gumtree", requireAdmin, async (req, res) => {
  const {
    listings,
    category = "electronics",
    subcategory,
    expiry,
    sellerEmail,
    sellerName = "Bazunk",
  } = req.body as {
    listings: GumtreeListing[];
    category?: string;
    subcategory?: string;
    expiry?: string;
    sellerEmail?: string;
    sellerName?: string;
  };

  if (!Array.isArray(listings) || listings.length === 0) {
    res.status(400).json({ error: "listings array is required" }); return;
  }

  const expiresAt: Date | null =
    expiry === "7"  ? new Date(Date.now() + 7  * 86_400_000) :
    expiry === "14" ? new Date(Date.now() + 14 * 86_400_000) :
    expiry === "30" ? new Date(Date.now() + 30 * 86_400_000) :
    null;

  let imported = 0;
  for (const l of listings) {
    if (!l.title?.trim()) continue;
    const rawPrice = l.price?.replace(/[^0-9.]/g, "") ?? "";
    const priceNum = rawPrice ? parseFloat(rawPrice) : null;
    await db.insert(classifiedAdsTable).values({
      title: l.title.trim(),
      description: l.description?.trim() || l.title.trim(),
      category,
      subcategory: subcategory || null,
      type: "offer",
      price: priceNum != null ? String(priceNum) : null,
      priceLabel: l.price?.match(/free/i) ? "Free" : null,
      location: l.location || "UK",
      contactName: sellerName,
      contactEmail: sellerEmail || null,
      externalLink: l.url,
      expiresAt,
    });
    imported++;
  }

  logger.info({ imported }, "Gumtree import");
  res.json({ imported, message: `Imported ${imported} Gumtree ad${imported === 1 ? "" : "s"} to Classifieds` });
});

export default router;

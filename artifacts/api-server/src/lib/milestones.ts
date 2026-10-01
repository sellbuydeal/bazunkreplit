import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

/**
 * Monthly seller milestones whose progress is a count we can derive from data.
 * `total` must match the `total` for the same id in DashboardPage.tsx MILESTONES.
 */
const LISTING_MILESTONES = [
  { id: "active-lister", total: 5 },
  { id: "inventory-master", total: 20 },
];
const SALES_MILESTONES = [
  { id: "quick-seller", total: 3 },
  { id: "power-seller", total: 10 },
];

async function setProgress(email: string, id: string, count: number, total: number) {
  const progress = Math.min(count, total);
  // Completion is sticky (never un-completes) and `claimed` is never touched here.
  await db.execute(sql`
    INSERT INTO user_milestones (email, milestone_id, progress, completed, claimed, updated_at)
    VALUES (${email}, ${id}, ${progress}, ${progress >= total}, FALSE, NOW())
    ON CONFLICT (email, milestone_id) DO UPDATE SET
      progress = CASE WHEN user_milestones.completed THEN user_milestones.progress ELSE EXCLUDED.progress END,
      completed = user_milestones.completed OR EXCLUDED.completed,
      updated_at = NOW()
  `);
}

/**
 * Recomputes this calendar month's listing and sales counts for a seller and
 * updates their milestone progress. Safe to call repeatedly.
 */
export async function refreshSellerMilestones(email: string): Promise<void> {
  if (!email) return;
  try {
    const listed = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM listings
      WHERE seller_email = ${email} AND created_at >= date_trunc('month', NOW())
    `);
    const listedCount = Number((listed.rows[0] as Record<string, unknown>)?.n ?? 0);
    for (const m of LISTING_MILESTONES) await setProgress(email, m.id, listedCount, m.total);

    const sold = await db.execute(sql`
      SELECT COUNT(*)::int AS n FROM orders
      WHERE seller_email = ${email}
        AND status <> 'cancelled'
        AND created_at >= date_trunc('month', NOW())
    `);
    const soldCount = Number((sold.rows[0] as Record<string, unknown>)?.n ?? 0);
    for (const m of SALES_MILESTONES) await setProgress(email, m.id, soldCount, m.total);
  } catch (err) {
    logger.error({ err, email }, "Failed to refresh seller milestones");
  }
}

/**
 * Brings a user's milestones up to date from data that already exists, so
 * listings/sales/accounts created BEFORE the triggers were added still count.
 * Called every time the Rewards page loads. Safe to call repeatedly.
 */
export async function syncMilestonesFor(email: string): Promise<void> {
  if (!email) return;
  await refreshSellerMilestones(email);
  const oneTime: Array<[string, ReturnType<typeof sql>]> = [
    ["welcome-bonus", sql`SELECT 1 FROM users WHERE email = ${email}`],
    ["first-listing", sql`SELECT 1 FROM listings WHERE seller_email = ${email}`],
    ["first-flash-sale", sql`SELECT 1 FROM flash_sales WHERE seller_email = ${email}`],
  ];
  for (const [id, exists] of oneTime) {
    try {
      await db.execute(sql`
        INSERT INTO user_milestones (email, milestone_id, progress, completed, claimed, updated_at)
        SELECT ${email}::text, ${id}::text, 1, TRUE, FALSE, NOW()
        WHERE EXISTS (${exists})
        ON CONFLICT (email, milestone_id) DO UPDATE SET
          progress = GREATEST(user_milestones.progress, 1),
          completed = TRUE,
          updated_at = NOW()
      `);
    } catch (err) {
      logger.error({ err, email, id }, "Failed to sync one-time milestone");
    }
  }
}

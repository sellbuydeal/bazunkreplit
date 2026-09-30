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

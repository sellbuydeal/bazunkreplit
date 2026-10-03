import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

/** Publishes listings whose scheduled time has arrived. Runs every minute. */
export function startListingScheduler(): void {
  async function tick() {
    try {
      const r = await db.execute(sql`
        UPDATE listings
        SET status = 'active', publish_at = NULL, created_at = NOW(), updated_at = NOW()
        WHERE status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= NOW()
        RETURNING id
      `);
      if (r.rows.length) logger.info({ count: r.rows.length }, "Published scheduled listings");
    } catch (err) {
      logger.error({ err }, "Scheduled listing publish failed");
    }
  }
  void tick();
  setInterval(() => void tick(), 60_000).unref();
}

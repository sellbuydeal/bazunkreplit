import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "./logger.js";

let ready = false;
export async function ensureAdminAuditLog() {
  if (ready) return;
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS admin_audit_log (
      id BIGSERIAL PRIMARY KEY,
      actor VARCHAR(320) NOT NULL DEFAULT 'Admin',
      category VARCHAR(64) NOT NULL,
      action VARCHAR(120) NOT NULL,
      target_type VARCHAR(80),
      target_id VARCHAR(320),
      summary TEXT NOT NULL,
      before_data JSONB,
      after_data JSONB,
      metadata JSONB,
      ip_address VARCHAR(80),
      user_agent TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_category ON admin_audit_log(category, created_at DESC)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id)`);
  ready = true;
}

export async function recordAdminAudit(input: {
  actor?: string; category: string; action: string; targetType?: string; targetId?: string;
  summary: string; before?: unknown; after?: unknown; metadata?: unknown; req?: any;
}) {
  try {
    await ensureAdminAuditLog();
    const ip = input.req?.headers?.["x-forwarded-for"]?.toString().split(",")[0]?.trim() || input.req?.ip || null;
    const ua = input.req?.headers?.["user-agent"]?.toString() || null;
    await db.execute(sql`
      INSERT INTO admin_audit_log
        (actor, category, action, target_type, target_id, summary, before_data, after_data, metadata, ip_address, user_agent)
      VALUES
        (${input.actor ?? "Admin"}, ${input.category}, ${input.action}, ${input.targetType ?? null}, ${input.targetId ?? null},
         ${input.summary}, ${JSON.stringify(input.before ?? null)}::jsonb, ${JSON.stringify(input.after ?? null)}::jsonb,
         ${JSON.stringify(input.metadata ?? null)}::jsonb, ${ip}, ${ua})
    `);
  } catch (err) {
    logger.error({ err, action: input.action }, "Failed to write admin audit log");
  }
}

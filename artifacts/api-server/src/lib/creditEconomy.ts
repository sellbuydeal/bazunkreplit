import { randomUUID } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

export type CreditKind = "earned" | "purchased" | "spent" | "referral" | "admin_adjustment" | "refund" | "expired";

let ready: Promise<void> | null = null;
export function ensureCreditEconomyTable() {
  if (!ready) ready = (async () => {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS credit_economy_ledger (
        id text PRIMARY KEY,
        email text NOT NULL,
        kind text NOT NULL,
        credits numeric(12,2) NOT NULL,
        cash_amount numeric(12,2),
        currency text,
        reason text,
        reference_type text,
        reference_id text,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS credit_economy_email_idx ON credit_economy_ledger (lower(email), created_at DESC)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS credit_economy_kind_idx ON credit_economy_ledger (kind, created_at DESC)`);
    await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS credit_economy_reference_idx ON credit_economy_ledger (reference_type, reference_id, email) WHERE reference_id IS NOT NULL`);
  })();
  return ready;
}

export async function recordCreditEconomy(input: {
  email: string; kind: CreditKind; credits: number; cashAmount?: number | null; currency?: string | null;
  reason?: string | null; referenceType?: string | null; referenceId?: string | null; metadata?: Record<string, unknown>;
}) {
  await ensureCreditEconomyTable();
  const id = randomUUID();
  await db.execute(sql`
    INSERT INTO credit_economy_ledger(id,email,kind,credits,cash_amount,currency,reason,reference_type,reference_id,metadata)
    VALUES (${id},${input.email.toLowerCase()},${input.kind},${input.credits},${input.cashAmount ?? null},${input.currency ?? null},${input.reason ?? null},${input.referenceType ?? null},${input.referenceId ?? null},${JSON.stringify(input.metadata ?? {})}::jsonb)
    ON CONFLICT DO NOTHING
  `);
}

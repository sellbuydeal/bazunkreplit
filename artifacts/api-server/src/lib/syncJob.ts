import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";
import { fetchAliExpressProduct, calculateBazunkPrice } from "./aliexpress.js";

const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface ImportRow {
  id: number;
  listingId: number;
  supplierId: string;
  supplierSource: string;
  markupType: string;
  markupValue: string;
}

export async function syncImport(importId: number): Promise<{ ok: boolean; error?: string }> {
  const rows = await db.execute(sql`
    SELECT id, listing_id, supplier_id, supplier_source, markup_type, markup_value
    FROM supplier_imports WHERE id = ${importId}
  `);

  const row = rows.rows[0] as unknown as ImportRow | undefined;
  if (!row) return { ok: false, error: "Import not found" };

  return syncRow(row);
}

export async function syncAllImports(): Promise<{ synced: number; errors: number }> {
  const rows = await db.execute(sql`
    SELECT id, listing_id, supplier_id, supplier_source, markup_type, markup_value
    FROM supplier_imports
    ORDER BY last_synced_at ASC NULLS FIRST
  `);

  let synced = 0;
  let errors = 0;

  for (const row of rows.rows as unknown as ImportRow[]) {
    const result = await syncRow(row);
    if (result.ok) synced++;
    else errors++;
    // Small delay to avoid hammering the API
    await new Promise((r) => setTimeout(r, 300));
  }

  logger.info({ synced, errors }, "Supplier sync complete");
  return { synced, errors };
}

async function syncRow(row: ImportRow): Promise<{ ok: boolean; error?: string }> {
  try {
    if (row.supplierSource !== "aliexpress") {
      return { ok: false, error: `Unsupported source: ${row.supplierSource}` };
    }

    const product = await fetchAliExpressProduct(row.supplierId);
    const bazunkPrice = calculateBazunkPrice(
      product.priceUsd,
      row.markupType,
      parseFloat(row.markupValue),
    );

    await db.execute(sql`
      UPDATE supplier_imports SET
        supplier_price = ${product.priceUsd},
        last_synced_at = NOW(),
        sync_status = 'ok',
        sync_error = NULL,
        supplier_data = ${JSON.stringify(product.rawData)}::jsonb,
        updated_at = NOW()
      WHERE id = ${row.id}
    `);

    await db.execute(sql`
      UPDATE listings SET
        price = ${bazunkPrice},
        updated_at = NOW()
      WHERE id = ${row.listingId}
    `);

    logger.info({ importId: row.id, supplierId: row.supplierId, bazunkPrice }, "Import synced");
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn({ importId: row.id, err }, "Sync failed");

    await db.execute(sql`
      UPDATE supplier_imports SET
        sync_status = 'error',
        sync_error = ${message},
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = ${row.id}
    `);

    return { ok: false, error: message };
  }
}

export function startSyncJob(): void {
  if (!process.env.RAPIDAPI_KEY) {
    logger.info("RAPIDAPI_KEY not set — supplier auto-sync disabled");
    return;
  }

  logger.info({ intervalMs: SYNC_INTERVAL_MS }, "Supplier sync job started");

  setInterval(async () => {
    logger.info("Running scheduled supplier sync");
    await syncAllImports().catch((err: unknown) =>
      logger.error({ err }, "Scheduled sync error"),
    );
  }, SYNC_INTERVAL_MS);
}

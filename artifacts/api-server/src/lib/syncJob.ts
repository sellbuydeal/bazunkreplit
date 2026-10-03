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

export async function syncOfficialEbayStore(): Promise<{updated:number; paused:number; errors:number}> {
  const key = process.env.RAPIDAPI_KEY?.trim();
  if (!key) return { updated:0, paused:0, errors:0 };
  const rows = await db.execute(sql`SELECT id,status,specifications FROM listings WHERE seller_email='cczslater@gmail.com' AND specifications LIKE '%"official_store":true%' AND specifications LIKE '%"item_id"%'`).then(r=>r.rows as any[]);
  let updated=0, paused=0, errors=0;
  for (const row of rows) {
    try {
      const x=JSON.parse(row.specifications||'{}'); const itemId=String(x.item_id||''); if(!itemId) continue;
      const marketplaceId=x.ebay_site==='us'?'EBAY_US':'EBAY_GB';
      const resp=await fetch(`https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=${encodeURIComponent(itemId)}&marketplace_id=${marketplaceId}`,{headers:{'X-RapidAPI-Key':key,'X-RapidAPI-Host':'real-time-ebay-data.p.rapidapi.com'}});
      if(!resp.ok){errors++; continue;}
      const data:any=await resp.json(); const items:any[]=data?.itemSummaries??[]; const match=items.find(v=>String(v.legacyItemId)===itemId);
      if(!match){ await db.execute(sql`UPDATE listings SET status='paused', updated_at=NOW() WHERE id=${row.id}`); paused++; continue; }
      const sourcePrice=parseFloat(String(match?.price?.value??0)); if(!sourcePrice){errors++;continue;}
      const old=parseFloat(String(x.ebay_price??0)); const ratio=old>0?sourcePrice/old:1;
      if(ratio>2.5||ratio<0.4){ const specs=JSON.stringify({...x,source_price_anomaly:true,proposed_source_price:sourcePrice,source_last_checked:new Date().toISOString()}); await db.execute(sql`UPDATE listings SET status='paused',specifications=${specs},updated_at=NOW() WHERE id=${row.id}`); paused++; continue; }
      const shipping=parseFloat(String(x.shipping??0))||0, markup=parseFloat(String(x.markup_pct??35))||35, minProfit=parseFloat(String(x.min_profit??5))||5;
      const landed=sourcePrice+shipping; const price=Math.round(Math.max(landed*(1+markup/100),landed+minProfit)*100)/100;
      const specs=JSON.stringify({...x,ebay_price:sourcePrice,source_price_anomaly:false,source_last_checked:new Date().toISOString()});
      await db.execute(sql`UPDATE listings SET price=${price},price_gbp=${price},status='active',specifications=${specs},updated_at=NOW() WHERE id=${row.id}`); updated++;
    } catch { errors++; }
    await new Promise(v=>setTimeout(v,250));
  }
  logger.info({updated,paused,errors},'Bazunk Official Store eBay sync complete'); return {updated,paused,errors};
}

export function startSyncJob(): void {
  if (!process.env.RAPIDAPI_KEY) {
    logger.info("RAPIDAPI_KEY not set — supplier auto-sync disabled");
    return;
  }

  logger.info({ intervalMs: SYNC_INTERVAL_MS }, "Supplier sync job started");
  void syncOfficialEbayStore().catch((err: unknown) => logger.error({ err }, "Initial Official Store eBay sync error"));

  setInterval(async () => {
    logger.info("Running scheduled supplier sync");
    await syncAllImports().catch((err: unknown) => logger.error({ err }, "Scheduled supplier sync error"));
    await syncOfficialEbayStore().catch((err: unknown) => logger.error({ err }, "Scheduled Official Store eBay sync error"));
  }, SYNC_INTERVAL_MS);
}

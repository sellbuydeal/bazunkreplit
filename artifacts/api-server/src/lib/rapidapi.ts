import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger.js";

/**
 * RapidAPI key handling for all importers (Amazon, eBay, AliExpress).
 *
 * The key can come from either place:
 *   1. the RAPIDAPI_KEY environment variable on the Render API service, or
 *   2. a key pasted into Admin → Importers (saved in site_settings.rapidapi_key).
 *
 * The existing importer code reads process.env.RAPIDAPI_KEY, so a saved key is
 * copied into process.env on startup and whenever it is changed. If both exist,
 * the environment variable wins on startup; a key pasted in the admin panel
 * takes effect immediately for the running server.
 */

const SETTING_KEY = "rapidapi_key";

export type RapidApiKeySource = "env" | "admin" | "none";
let envKeyAtBoot: string | undefined = process.env.RAPIDAPI_KEY?.trim() || undefined;
let source: RapidApiKeySource = envKeyAtBoot ? "env" : "none";

/** Call once after migrations, before the sync job starts. */
export async function loadRapidApiKeyFromDb(): Promise<void> {
  if (envKeyAtBoot) { source = "env"; return; }
  try {
    const rows = await db
      .execute(sql`SELECT value FROM site_settings WHERE key = ${SETTING_KEY}`)
      .then((r) => r.rows as { value: string }[]);
    const saved = rows[0]?.value?.trim();
    if (saved) {
      process.env.RAPIDAPI_KEY = saved;
      source = "admin";
      logger.info("RapidAPI key loaded from admin settings");
    }
  } catch (err) {
    logger.error({ err }, "Could not load RapidAPI key from database");
  }
}

export async function saveRapidApiKey(key: string): Promise<void> {
  const clean = key.trim();
  await db.execute(
    sql`INSERT INTO site_settings (key, value, updated_at) VALUES (${SETTING_KEY}, ${clean}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${clean}, updated_at = NOW()`,
  );
  process.env.RAPIDAPI_KEY = clean;
  source = "admin";
}

export async function clearRapidApiKey(): Promise<void> {
  await db.execute(sql`DELETE FROM site_settings WHERE key = ${SETTING_KEY}`);
  if (envKeyAtBoot) {
    process.env.RAPIDAPI_KEY = envKeyAtBoot;
    source = "env";
  } else {
    delete process.env.RAPIDAPI_KEY;
    source = "none";
  }
}

export function rapidApiKeyStatus(): { configured: boolean; source: RapidApiKeySource; hint: string | null } {
  const key = process.env.RAPIDAPI_KEY?.trim();
  return {
    configured: !!key,
    source: key ? source : "none",
    hint: key ? `…${key.slice(-4)}` : null,
  };
}

/** Plain-English explanation of a RapidAPI HTTP failure. */
export function rapidApiErrorMessage(apiName: string, status: number): string {
  switch (status) {
    case 401:
      return `${apiName}: RapidAPI rejected the key (401). Check the RAPIDAPI_KEY is copied correctly.`;
    case 403:
      return `${apiName}: access denied (403). Your RapidAPI key isn't subscribed to this API — open it on rapidapi.com and click Subscribe (the free plan is fine).`;
    case 404:
      return `${apiName}: endpoint not found (404). The API may have changed — check the API's page on RapidAPI.`;
    case 429:
      return `${apiName}: monthly or per-second request limit reached (429). Wait a bit or upgrade the plan on RapidAPI.`;
    default:
      return `${apiName}: RapidAPI returned an error (${status}).`;
  }
}

export interface ApiTestResult {
  api: string;
  ok: boolean;
  status: number | null;
  message: string;
}

async function ping(api: string, url: string, host: string, key: string): Promise<ApiTestResult> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const resp = await fetch(url, {
      headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": host },
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (resp.ok) return { api, ok: true, status: resp.status, message: "Working" };
    return { api, ok: false, status: resp.status, message: rapidApiErrorMessage(api, resp.status) };
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "AbortError";
    return {
      api,
      ok: false,
      status: null,
      message: timedOut ? `${api}: no reply within 15 seconds.` : `${api}: could not reach RapidAPI.`,
    };
  }
}

/** Makes one tiny request to each importer API so the admin can see which are subscribed. */
export async function testRapidApi(): Promise<ApiTestResult[]> {
  const key = process.env.RAPIDAPI_KEY?.trim();
  if (!key) return [];
  return Promise.all([
    ping(
      "Amazon (Real-Time Amazon Data)",
      "https://real-time-amazon-data.p.rapidapi.com/search?query=usb&country=GB&page=1",
      "real-time-amazon-data.p.rapidapi.com",
      key,
    ),
    ping(
      "eBay (Real-Time eBay Data)",
      "https://real-time-ebay-data.p.rapidapi.com/ebay_search?q=usb&marketplace_id=EBAY_GB&offset=0",
      "real-time-ebay-data.p.rapidapi.com",
      key,
    ),
    ping(
      "AliExpress (DataHub)",
      "https://aliexpress-datahub.p.rapidapi.com/item_detail_2?itemId=1005006000000000&currency=USD&locale=en_US&region=GB&country=GB",
      "aliexpress-datahub.p.rapidapi.com",
      key,
    ),
  ]);
}

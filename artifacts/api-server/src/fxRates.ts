import { logger } from "./lib/logger.js";

interface CacheEntry { rateToGbp: number; cachedAt: number }
const cache: Record<string, CacheEntry> = {};
const CACHE_TTL_MS = 60 * 60 * 1000;

const ZERO_DECIMAL = new Set(["KRW", "VND", "CLP", "ISK", "UGX"]);

export function smallestUnit(amount: number, currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? Math.round(amount) : Math.round(amount * 100);
}

async function fetchRate(fromCurrency: string): Promise<number> {
  const key = fromCurrency.toUpperCase();
  if (key === "GBP") return 1;
  const now = Date.now();
  if (cache[key] && now - cache[key].cachedAt < CACHE_TTL_MS) {
    return cache[key].rateToGbp;
  }
  try {
    const resp = await fetch(`https://api.frankfurter.app/latest?from=${key}&to=GBP`);
    if (!resp.ok) throw new Error(`Frankfurter HTTP ${resp.status}`);
    const data = await resp.json() as { rates?: Record<string, number> };
    const rate = data.rates?.["GBP"];
    if (!rate) throw new Error(`No GBP rate returned for ${key}`);
    cache[key] = { rateToGbp: rate, cachedAt: now };
    return rate;
  } catch (err) {
    logger.warn({ err, fromCurrency }, "FX rate fetch failed — falling back to cached or 1:1");
    return cache[key]?.rateToGbp ?? 1;
  }
}

export async function toGbp(amount: number, fromCurrency: string): Promise<number> {
  if (fromCurrency.toUpperCase() === "GBP") return amount;
  const rate = await fetchRate(fromCurrency);
  return amount * rate;
}

export async function convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency.toUpperCase() === toCurrency.toUpperCase()) return amount;
  const gbp = await toGbp(amount, fromCurrency);
  if (toCurrency.toUpperCase() === "GBP") return gbp;
  const rate = await fetchRate(toCurrency);
  return gbp / rate;
}

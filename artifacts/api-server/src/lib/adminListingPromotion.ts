import type { PromoConfig } from "./promoConfig.js";

export function canGrantListingPromotion(config: PromoConfig): boolean {
  return config.kind === "listing" && config.enabled && !config.oneShot && !config.comingSoon && !config.hidden;
}

export function validateAdminPromotion(body: unknown): { type: string; days: number } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const { type, days } = body as Record<string, unknown>;
  if (typeof type !== "string" || !type || typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > 365) return null;
  return { type, days };
}

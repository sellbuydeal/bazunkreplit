import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/**
 * The promotion catalogue. Prices (in £, 100 credits = £1) and durations here are only the
 * DEFAULTS — admins can override cost, duration and on/off in Admin → Promotions, and the
 * override is stored in the promotion_settings table.
 */
export type PromoKind = "listing" | "auction";

export interface PromoDefault {
  cost: number;
  daysValid: number;
  label: string;
  kind: PromoKind;
  /** One-off action (days don't apply) */
  oneShot?: boolean;
  /** Listed for sellers as "Coming soon"; can't be bought yet */
  comingSoon?: boolean;
  /** Not shown in the admin pricing table (old aliases) */
  hidden?: boolean;
}

const L = (cost: number, daysValid: number, label: string, extra: Partial<PromoDefault> = {}): PromoDefault =>
  ({ cost, daysValid, label, kind: "listing", ...extra });

export const PROMO_DEFAULTS: Record<string, PromoDefault> = {
  "move-to-top":          L(1.99, 3,  "Move to Top"),
  "featured-badge":       L(2.99, 7,  "Featured Badge"),
  "homepage-spotlight":   L(4.99, 7,  "Homepage Spotlight"),
  "visibility-boost":     L(3.49, 5,  "Visibility Boost"),
  "premium-placement":    L(5.99, 10, "Premium Placement"),
  "urgent-badge":         L(1.49, 3,  "Urgent Badge"),
  "related-listings-5d":  L(2.49, 5,  "Related Listings Spotlight (5 days)"),
  "related-listings-10d": L(4.49, 10, "Related Listings Spotlight (10 days)"),
  "newsletter-feature":   L(2.99, 7,  "Newsletter & Blog Feature"),
  "badge-new-listing":    L(0.99, 30, "Hot Seller Badge"),
  "badge-price-reduced":  L(0.99, 30, "Price Reduced Badge"),
  "badge-renovated":      L(0.99, 30, "Recently Renovated Badge"),
  "badge-best-seller":    L(0.99, 30, "Best Seller Badge"),
  "engagement-boost":     L(1.79, 14, "Engagement Features"),
  "product-video":        L(1.49, 3650, "Product Video", { oneShot: true }),

  // ── New seller tools ──
  "follower-notify":      L(1.49, 1,  "Follower Notifications", { oneShot: true }),
  "scheduled-listing":    L(0.99, 1,  "Scheduled Listing",      { oneShot: true }),
  "advanced-analytics":   L(1.99, 30, "Advanced Analytics"),
  "social-share":         L(0.99, 30, "Social Sharing Boost"),
  "reserve-auction":      { cost: 0.99, daysValid: 1, label: "Reserve Price Auction", kind: "auction", oneShot: true },
  "auction-extension":    { cost: 0.99, daysValid: 1, label: "Auction Extensions",    kind: "auction", oneShot: true },

  // ── Listed, not buyable yet ──
  "auto-relist":          L(1.49, 30, "Auto-relist",        { comingSoon: true }),
  "seller-promo":         L(1.99, 30, "Seller Promotions",  { comingSoon: true }),
  "shipping-discount":    L(0.99, 30, "Shipping Discounts", { comingSoon: true }),
  "auto-replies":         L(1.49, 30, "Auto-replies",       { comingSoon: true }),

  // Old aliases still accepted by /promotions/apply
  featured:               L(2.99, 7, "Featured Listing",   { hidden: true }),
  spotlight:              L(4.99, 1, "Homepage Spotlight", { hidden: true }),
  flash:                  L(1.49, 7, "Flash Sale Slot",    { hidden: true }),
};

export interface PromoConfig extends PromoDefault {
  type: string;
  enabled: boolean;
  overridden: boolean;
}

export async function getAllPromoConfigs(): Promise<Record<string, PromoConfig>> {
  let overrides: Record<string, { cost: string; days_valid: number; enabled: boolean }> = {};
  try {
    const r = await db.execute(sql`SELECT type, cost, days_valid, enabled FROM promotion_settings`);
    for (const row of r.rows as any[]) overrides[row.type] = row;
  } catch {
    overrides = {};
  }
  const out: Record<string, PromoConfig> = {};
  for (const [type, d] of Object.entries(PROMO_DEFAULTS)) {
    const o = overrides[type];
    out[type] = {
      ...d,
      type,
      cost: o ? parseFloat(o.cost) : d.cost,
      daysValid: o ? o.days_valid : d.daysValid,
      enabled: o ? o.enabled : !d.comingSoon,
      overridden: !!o,
    };
  }
  return out;
}

export async function getPromoConfig(type: string): Promise<PromoConfig | null> {
  const all = await getAllPromoConfigs();
  return all[type] ?? null;
}

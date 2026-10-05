import test from "node:test";
import assert from "node:assert/strict";
import { validateAdminPromotion, canGrantListingPromotion } from "../src/lib/adminListingPromotion.js";
import type { PromoConfig } from "../src/lib/promoConfig.js";

test("admin durations are bounded whole days and never coerced", () => {
  for (const days of [0, -1, 366, 1.5, NaN, Infinity, "7", null, undefined]) {
    assert.equal(validateAdminPromotion({ type: "featured-badge", days }), null);
  }
  assert.deepEqual(validateAdminPromotion({ type: "featured-badge", days: 1 }), { type: "featured-badge", days: 1 });
  assert.deepEqual(validateAdminPromotion({ type: "homepage-spotlight", days: 365 }), { type: "homepage-spotlight", days: 365 });
  for (const body of [null, [], {}, { type: 1, days: 7 }, { type: "", days: 7 }]) assert.equal(validateAdminPromotion(body), null);
});

test("only available timed listing promotions can be granted", () => {
  const config: PromoConfig = { type: "featured-badge", label: "Featured Badge", cost: 2.99, daysValid: 7, kind: "listing", enabled: true, overridden: false };
  assert.equal(canGrantListingPromotion(config), true);
  for (const overrides of [{ kind: "auction" as const }, { enabled: false }, { oneShot: true }, { comingSoon: true }, { hidden: true }]) {
    assert.equal(canGrantListingPromotion({ ...config, ...overrides }), false);
  }
});

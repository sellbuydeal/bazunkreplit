import { strict as assert } from "node:assert";
import { test } from "node:test";
import { attachStripePaymentAmounts } from "../src/lib/adminPaymentRevenue.js";

test("revenue uses paid live Stripe amounts, never bonus credits, and separates currencies", async () => {
  const rows = ["bonus", "usd", "unpaid", "test", "missing", "free"].map(id => ({ id, credits_added: "999" }));
  const report = await attachStripePaymentAmounts(rows, async id => {
    if (id === "missing") throw new Error("Stripe outage");
    return { amount_total: id === "free" ? 0 : id === "usd" ? 700 : 500, currency: id === "usd" ? "usd" : "gbp", payment_status: id === "unpaid" ? "unpaid" : "paid", livemode: id !== "test" };
  });
  assert.deepEqual(report.totals, { gbp: 500, usd: 700 });
  assert.equal(report.unavailable, 1);
  assert.equal(report.payments.find(p => p.id === "missing")?.amount_minor, null);
  assert.equal(report.payments.find(p => p.id === "bonus")?.amount_minor, 500);
});

test("all failed lookups produce no estimated revenue and concurrency is bounded", async () => {
  let active = 0, maxActive = 0;
  const report = await attachStripePaymentAmounts(Array.from({ length: 12 }, (_, i) => ({ id: String(i) })), async () => {
    active++; maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 1));
    active--; throw new Error("No credentials");
  });
  assert.deepEqual(report.totals, {});
  assert.equal(report.unavailable, 12);
  assert.ok(maxActive <= 5);
});

// Credit balances (including bonuses) are never evidence of money received.
export async function attachStripePaymentAmounts<T extends { id: string }>(
  rows: T[],
  retrieve: (id: string) => Promise<{ amount_total: number | null; currency: string | null; payment_status: string; livemode: boolean }>,
) {
  const payments: Array<T & { amount_minor: number | null; currency: string | null; payment_status: string; livemode: boolean | null }> = [];
  for (let offset = 0; offset < rows.length; offset += 5) {
    payments.push(...await Promise.all(rows.slice(offset, offset + 5).map(async (row) => {
      try {
        const session = await retrieve(row.id);
        return { ...row, amount_minor: session.amount_total, currency: session.currency, payment_status: session.payment_status, livemode: session.livemode };
      } catch {
        return { ...row, amount_minor: null, currency: null, payment_status: "unavailable", livemode: null };
      }
    })));
  }
  const totals: Record<string, number> = {};
  for (const payment of payments) {
    if (payment.payment_status === "paid" && payment.livemode === true && payment.amount_minor !== null && payment.currency) {
      totals[payment.currency] = (totals[payment.currency] ?? 0) + payment.amount_minor;
    }
  }
  return { payments, totals, unavailable: payments.filter(p => p.payment_status === "unavailable").length };
}

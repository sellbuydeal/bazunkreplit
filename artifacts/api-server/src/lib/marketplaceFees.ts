/** All amounts are integer GBP pence. Protection's fixed fee applies once per checkout. */
export type FeeItem = { id: number; quantity: number; priceMinor: number; sellerType: string; businessRate: number; title: string; image: string | null; sellerEmail: string; category: string };
export type FeeUnit = Omit<FeeItem, "quantity"> & { sellerFeeMinor: number; sellerNetMinor: number; protectionMinor: number; deliveryMinor: number; buyerTotalMinor: number };
export const FEE_POLICY = "private-buyer-business-seller-v1";
export function percentage(value: unknown, fallback: number): number {
  const n = value == null || value === "" ? NaN : Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 100) return fallback;
  return n;
}
export function minor(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error("Invalid monetary amount");
  return Math.round(n * 100);
}
export function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum || !total) return weights.map(() => 0);
  const exact = weights.map(w => total * w / sum);
  const values = exact.map(Math.floor);
  const order = exact.map((value, index) => ({index, remainder: value - values[index]})).sort((a,b) => b.remainder - a.remainder || a.index - b.index);
  const left = total - values.reduce((a,b) => a+b,0);
  for (let i=0; i<left; i++) values[order[i].index]++;
  return values;
}
export function calculateFees(items: FeeItem[], protectionPercent = 5, fixedMinor = 70, deliveryMinor = 0) {
  const units: FeeUnit[] = items.flatMap(item => Array.from({length:item.quantity}, () => {
    const {quantity: _, ...unit} = item;
    const sellerFeeMinor = item.sellerType === "private" ? 0 : Math.round(item.priceMinor * item.businessRate / 100);
    return {...unit, sellerFeeMinor, sellerNetMinor:item.priceMinor-sellerFeeMinor, protectionMinor:0, deliveryMinor:0, buyerTotalMinor:item.priceMinor};
  }));
  const privateSubtotalMinor = units.reduce((sum,u) => sum + (u.sellerType === "private" ? u.priceMinor : 0), 0);
  const buyerProtectionMinor = privateSubtotalMinor > 0 ? Math.round(privateSubtotalMinor * protectionPercent / 100) + fixedMinor : 0;
  const protectionShares = allocate(buyerProtectionMinor, units.map(u => u.sellerType === "private" ? u.priceMinor : 0));
  const deliveryShares = allocate(deliveryMinor, units.map(u => u.priceMinor));
  units.forEach((u,i) => { u.protectionMinor=protectionShares[i]; u.deliveryMinor=deliveryShares[i]; u.buyerTotalMinor=u.priceMinor+u.protectionMinor+u.deliveryMinor; });
  const subtotalMinor = units.reduce((sum,u)=>sum+u.priceMinor,0);
  return {policy:FEE_POLICY, currency:"GBP" as const, units, subtotalMinor, privateSubtotalMinor, buyerProtectionMinor, deliveryMinor, totalMinor:subtotalMinor+buyerProtectionMinor+deliveryMinor, protectionPercent, fixedMinor};
}

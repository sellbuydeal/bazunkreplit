import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CreditCard, RefreshCw, Percent, Info } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Payment {
  id: string; email: string; name: string | null;
  credits_added: string; created_at: string;
}

const FEE_CATEGORIES = [
  { name: "Electronics", slug: "electronics", defaultRate: "10" },
  { name: "Phones & Tablets", slug: "cell-phones", defaultRate: "10" },
  { name: "Fashion, Clothing & Jewellery", slug: "clothing-shoes-jewelry", defaultRate: "12" },
  { name: "Automotive", slug: "automotive", defaultRate: "5" },
  { name: "Home & Garden", slug: "home-garden", defaultRate: "10" },
  { name: "Sports & Outdoors", slug: "sports-outdoors", defaultRate: "10" },
  { name: "Toys & Games", slug: "toys-games", defaultRate: "10" },
  { name: "Books", slug: "books", defaultRate: "12" },
  { name: "CDs, Vinyl & Music", slug: "cds-vinyl", defaultRate: "12" },
  { name: "Beauty & Personal Care", slug: "beauty-personal-care", defaultRate: "12" },
  { name: "Baby Products", slug: "baby-products", defaultRate: "10" },
  { name: "Health & Household", slug: "health-household", defaultRate: "10" },
  { name: "Arts, Crafts & Sewing", slug: "arts-crafts-sewing", defaultRate: "10" },
  { name: "Appliances", slug: "appliances", defaultRate: "8" },
  { name: "Eco-Friendly", slug: "eco-friendly", defaultRate: "8" },
];

type PayTab = "credits" | "fees";

export function AdminPaymentsPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeRates, setFeeRates] = useState<Record<string, string>>({});
  const [payTab, setPayTab] = useState<PayTab>("credits");

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [paymentsRes, settingsRes] = await Promise.all([
        authFetch("/api/admin/payments?limit=50"),
        authFetch("/api/admin/settings"),
      ]);
      if (paymentsRes.ok) { const d = await paymentsRes.json(); setPayments(d.payments); }
      if (settingsRes.ok) {
        const d = await settingsRes.json() as Record<string, string>;
        const rates: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => { if (k.startsWith("fee_rate_")) rates[k] = v; });
        setFeeRates(rates);
      }
    } finally { setLoading(false); }
  }

  const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.credits_added), 0);

  function getRate(slug: string, def: string) {
    return feeRates[`fee_rate_${slug}`] ?? feeRates["fee_rate_default"] ?? def;
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Payments & Fees</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {payments.length} credit transactions · £{totalRevenue.toFixed(2)} revenue
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 max-w-xs">
        {([
          { id: "credits" as PayTab, label: "Credit Purchases", icon: CreditCard },
          { id: "fees" as PayTab, label: "Fee Rates", icon: Percent },
        ]).map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setPayTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
              payTab === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {payTab === "credits" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Email", "Name", "Credits Added", "Date", "Session ID"].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-10">Loading…</td></tr>
                )}
                {!loading && payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <CreditCard className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-gray-400 text-sm">No transactions yet</p>
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 font-medium text-gray-800">{p.email}</td>
                    <td className="px-5 py-3 text-gray-500">{p.name ?? "—"}</td>
                    <td className="px-5 py-3">
                      <span className="font-black text-emerald-600">+{Math.round(parseFloat(p.credits_added) * 100).toLocaleString()} cr</span>
                      <span className="ml-1 text-[10px] text-gray-400">≈ £{parseFloat(p.credits_added).toFixed(2)}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleDateString()} {new Date(p.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-5 py-3">
                      <code className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded">{p.id.slice(0, 20)}…</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {payTab === "fees" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-3 text-sm text-blue-700 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold">Platform (Final Value) Fees</p>
              <p className="text-xs text-blue-500 mt-0.5">
                Fees are deducted from the seller's payout when a sale completes. Listings are free to post.
                Change rates in <button onClick={() => setLocation("/admin/settings")} className="underline font-semibold">Site Settings → Fees</button>.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Default Rate</p>
              <p className="text-3xl font-black text-gray-900">{feeRates["fee_rate_default"] ?? "10"}%</p>
              <p className="text-xs text-gray-400 mt-1">Applied to unconfigured categories</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Listing Fee</p>
              <p className="text-3xl font-black text-emerald-600">Free</p>
              <p className="text-xs text-gray-400 mt-1">No charge to post a listing</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-1">Categories</p>
              <p className="text-3xl font-black text-gray-900">{FEE_CATEGORIES.length}</p>
              <p className="text-xs text-gray-400 mt-1">With configurable rates</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900">Current Fee Rates by Category</h2>
              <p className="text-xs text-gray-400 mt-0.5">These rates are shown to sellers in their dashboard</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rate</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Example: £100 sale</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {FEE_CATEGORIES.map((cat, i) => {
                    const hasOverride = `fee_rate_${cat.slug}` in feeRates;
                    const rate = parseFloat(getRate(cat.slug, cat.defaultRate)) || 0;
                    return (
                      <tr key={cat.slug} className={`border-t border-gray-50 ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                        <td className="px-6 py-3 font-medium text-gray-800">{cat.name}</td>
                        <td className="px-6 py-3">
                          <span className="font-black text-gray-900">{rate}%</span>
                        </td>
                        <td className="px-6 py-3 font-mono text-xs text-gray-500">
                          £{rate.toFixed(2)} fee · £{(100 - rate).toFixed(2)} to seller
                        </td>
                        <td className="px-6 py-3">
                          {hasOverride ? (
                            <span className="text-xs font-semibold text-[#4A5CE8] bg-blue-50 px-2 py-0.5 rounded-full">Custom</span>
                          ) : (
                            <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Default</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

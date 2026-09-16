import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Megaphone, Loader2, Trash2, RefreshCw, Package } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

interface PromoRow {
  id: number;
  listing_id: number;
  type: string;
  expires_at: string;
  created_at: string;
  listing_title: string | null;
  listing_image: string | null;
  category: string | null;
  seller_email: string | null;
  seller_name: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  "move-to-top":          "Move to Top",
  "featured-badge":       "Featured Badge",
  "homepage-spotlight":   "Homepage Spotlight",
  "visibility-boost":     "Visibility Boost",
  "premium-placement":    "Premium Placement",
  "urgent-badge":         "Urgent Badge",
  "related-listings-5d":  "Related Listings (5d)",
  "related-listings-10d": "Related Listings (10d)",
  "newsletter-feature":   "Newsletter Feature",
  "badge-new-listing":    "Hot Seller Badge",
  "badge-price-reduced":  "Price Reduced Badge",
  "badge-renovated":      "Renovated Badge",
  "badge-best-seller":    "Best Seller Badge",
  "engagement-boost":     "Engagement Tools",
  "featured":             "Featured Listing",
  "spotlight":            "Homepage Spotlight",
  "flash":                "Flash Sale Slot",
};

const TYPE_COLORS: Record<string, string> = {
  "related-listings-5d":  "bg-indigo-50 text-indigo-600 border-indigo-100",
  "related-listings-10d": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "newsletter-feature":   "bg-violet-50 text-violet-600 border-violet-100",
  "badge-new-listing":    "bg-orange-50 text-orange-600 border-orange-100",
  "badge-price-reduced":  "bg-teal-50 text-teal-600 border-teal-100",
  "badge-renovated":      "bg-teal-50 text-teal-600 border-teal-100",
  "badge-best-seller":    "bg-teal-50 text-teal-600 border-teal-100",
  "engagement-boost":     "bg-cyan-50 text-cyan-600 border-cyan-100",
  "featured-badge":       "bg-amber-50 text-amber-600 border-amber-100",
  "homepage-spotlight":   "bg-purple-50 text-purple-600 border-purple-100",
  "premium-placement":    "bg-pink-50 text-pink-600 border-pink-100",
  "move-to-top":          "bg-blue-50 text-blue-600 border-blue-100",
  "urgent-badge":         "bg-orange-50 text-orange-600 border-orange-100",
  "visibility-boost":     "bg-emerald-50 text-emerald-600 border-emerald-100",
};

function daysLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const days = Math.ceil(ms / 86400000);
  return days > 0 ? `${days}d left` : "Expired";
}

export function AdminPromotionsPage() {
  const { authFetch } = useAdmin();
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  function load() {
    setLoading(true);
    authFetch(`/api/admin/promotions?_t=${Date.now()}`)
      .then(async r => {
        if (!r.ok) { setError(`API error ${r.status}`); return []; }
        return r.json();
      })
      .then((rows: PromoRow[]) => { if (rows) setPromos(rows); })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [authFetch]);

  async function cancel(id: number) {
    if (!confirm("Cancel this promotion early? This cannot be undone.")) return;
    setCancelling(id);
    try {
      await authFetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
      setPromos(prev => prev.filter(p => p.id !== id));
    } finally {
      setCancelling(null);
    }
  }

  const filterTypes = [...new Set(promos.map(p => p.type))].sort();
  const displayed = filter === "all" ? promos : promos.filter(p => p.type === filter);
  const relatedListings = promos.filter(p => p.type === "related-listings-5d" || p.type === "related-listings-10d");

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F26B21]/10 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-[#F26B21]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">Active Promotions</h1>
              <p className="text-sm text-gray-500">Manage all live seller promotions. Cancel any early if needed.</p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        {/* Related Listings summary */}
        {relatedListings.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
            <p className="text-sm font-bold text-indigo-700 mb-1">🔄 Related Listings Sidebar Rotation</p>
            <p className="text-xs text-indigo-600">
              {relatedListings.length} listing{relatedListings.length !== 1 ? "s" : ""} currently in the sidebar rotation.
              They appear randomly on listing detail pages in the same category.
              Cancel any below to remove from rotation immediately.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            <strong>Failed to load promotions:</strong> {error}
          </div>
        ) : promos.length === 0 ? (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-10 text-center">
            <Megaphone className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-semibold">No active promotions</p>
            <p className="text-xs text-gray-400 mt-1">Promotions appear here when sellers apply them to their listings.</p>
          </div>
        ) : (
          <>
            {/* Filter bar */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${filter === "all" ? "bg-[#1A1D2E] text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
              >
                All ({promos.length})
              </button>
              {filterTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors border ${filter === type ? "bg-[#1A1D2E] text-white border-transparent" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                >
                  {TYPE_LABELS[type] ?? type} ({promos.filter(p => p.type === type).length})
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {displayed.map(promo => (
                <div key={promo.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                  {/* Listing thumbnail */}
                  <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {promo.listing_image
                      ? <img src={promo.listing_image} alt={promo.listing_title ?? ""} className="w-full h-full object-contain p-1" />
                      : <Package className="w-6 h-6 text-gray-300" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{promo.listing_title ?? `Listing #${promo.listing_id}`}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{promo.seller_name ?? promo.seller_email ?? "Unknown seller"} · {promo.category ?? "Uncategorised"}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${TYPE_COLORS[promo.type] ?? "bg-gray-50 text-gray-500 border-gray-100"}`}>
                        {TYPE_LABELS[promo.type] ?? promo.type}
                      </span>
                      <span className="text-[10px] text-gray-400">{daysLeft(promo.expires_at)}</span>
                      <span className="text-[10px] text-gray-400">Applied {new Date(promo.created_at).toLocaleDateString("en-GB")}</span>
                    </div>
                  </div>

                  {/* Cancel */}
                  <button
                    onClick={() => cancel(promo.id)}
                    disabled={cancelling === promo.id}
                    title="Cancel promotion early"
                    className="flex-shrink-0 w-9 h-9 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-center"
                  >
                    {cancelling === promo.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Trash2 className="w-4 h-4" />
                    }
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

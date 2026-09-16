import { useState, useEffect } from "react";
import { Zap, TrendingDown, Clock, RefreshCw, ChevronDown, CalendarClock, CheckCircle2, XCircle } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Live",      color: "bg-orange-100 text-orange-700",  icon: Zap          },
  upcoming:  { label: "Upcoming",  color: "bg-amber-100 text-amber-700",    icon: CalendarClock },
  ended:     { label: "Ended",     color: "bg-gray-100 text-gray-500",      icon: CheckCircle2  },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600",        icon: XCircle       },
};

type FlashSale = {
  id: string; seller_name: string; seller_email: string;
  title: string; category: string | null; discount_percent: number;
  original_price: string; sale_price: string; status: string;
  starts_at: string; ends_at: string; created_at: string;
};

export function AdminFlashSalesPage() {
  const { token } = useAdmin();
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "upcoming" | "ended" | "cancelled">("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/flash-sales", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setSales(await res.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/admin/flash-sales/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      await load();
      setExpanded(null);
    } finally { setUpdating(null); }
  }

  const filtered = filter === "all" ? sales : sales.filter(s => s.status === filter);
  const liveCount = sales.filter(s => s.status === "active").length;
  const upcomingCount = sales.filter(s => s.status === "upcoming").length;
  const totalSaved = sales.filter(s => s.status === "active" || s.status === "ended")
    .reduce((acc, s) => acc + (parseFloat(s.original_price) - parseFloat(s.sale_price)), 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Flash Sales</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor live and scheduled flash sales</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Live Now",    value: liveCount,           color: "text-orange-600",  bg: "bg-orange-50" },
            { label: "Upcoming",    value: upcomingCount,       color: "text-amber-600",   bg: "bg-amber-50"  },
            { label: "Total Deals", value: sales.length,        color: "text-gray-700",    bg: "bg-gray-50"   },
            { label: "Avg Saving",  value: `£${totalSaved > 0 && sales.length > 0 ? (totalSaved / sales.length).toFixed(0) : 0}`, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(["all", "active", "upcoming", "ended", "cancelled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                filter === f ? "bg-[#1A1D2E] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}>
              {f === "all" ? `All (${sales.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${sales.filter(s => s.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">No flash sales</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(s => {
              const meta = STATUS_META[s.status] ?? STATUS_META["ended"];
              const isOpen = expanded === s.id;
              const orig = parseFloat(s.original_price);
              const sp = parseFloat(s.sale_price);
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : s.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors">
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                      <meta.icon className="w-3 h-3" /> {meta.label}
                    </span>
                    <span className="bg-[#F26B21]/10 text-[#F26B21] text-xs font-black px-2 py-0.5 rounded-full flex-shrink-0">
                      -{s.discount_percent}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.seller_name} · {s.category ?? "Uncategorised"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <p className="text-sm font-black text-[#F26B21]">£{sp.toFixed(2)}</p>
                        <p className="text-xs text-gray-400 line-through">£{orig.toFixed(2)}</p>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(s.ends_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400 mb-0.5">Seller</p><p className="font-medium">{s.seller_name}</p><p className="text-xs text-gray-400">{s.seller_email}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Category</p><p className="font-medium">{s.category ?? "—"}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Starts</p><p className="font-medium">{new Date(s.starts_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Ends</p><p className="font-medium">{new Date(s.ends_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Original</p><p className="font-medium">£{orig.toFixed(2)}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Sale Price</p><p className="font-medium text-[#F26B21]">£{sp.toFixed(2)} <span className="text-emerald-600">(-{s.discount_percent}%)</span></p></div>
                      </div>
                      {(s.status === "active" || s.status === "upcoming") && (
                        <div className="border-t border-gray-100 pt-4 flex gap-3">
                          {s.status === "upcoming" && (
                            <button onClick={() => updateStatus(s.id, "active")} disabled={updating === s.id}
                              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50">
                              {updating === s.id ? "…" : "Activate Now"}
                            </button>
                          )}
                          <button onClick={() => updateStatus(s.id, "ended")} disabled={updating === s.id}
                            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50">
                            {updating === s.id ? "…" : "End Sale"}
                          </button>
                          <button onClick={() => updateStatus(s.id, "cancelled")} disabled={updating === s.id}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50">
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

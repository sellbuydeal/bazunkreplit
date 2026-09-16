import { useState, useEffect } from "react";
import { Gavel, Clock, CheckCircle2, XCircle, ChevronDown, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:    { label: "Active",    color: "bg-emerald-100 text-emerald-700", icon: TrendingUp   },
  ended:     { label: "Ended",     color: "bg-gray-100 text-gray-500",       icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-600",         icon: XCircle      },
};

type Auction = {
  id: string; title: string; category: string | null; condition: string;
  seller_name: string; seller_email: string;
  starting_bid: string; current_bid: string | null; bid_count: number;
  end_time: string; status: string; created_at: string;
};

export function AdminAuctionsPage() {
  const { token } = useAdmin();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "ended" | "cancelled">("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auctions", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAuctions(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await fetch(`/api/admin/auctions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      await load();
      setExpanded(null);
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === "all" ? auctions : auctions.filter((a) => a.status === filter);
  const activeCount = auctions.filter((a) => a.status === "active").length;
  const endedCount = auctions.filter((a) => a.status === "ended").length;
  const totalBids = auctions.reduce((s, a) => s + a.bid_count, 0);

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Auction Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Monitor, cancel, or end active auctions</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Active",     value: activeCount,    color: "text-emerald-600", bg: "bg-emerald-50"  },
            { label: "Ended",      value: endedCount,     color: "text-gray-600",    bg: "bg-gray-50"     },
            { label: "Total Bids", value: totalBids,      color: "text-[#4A5CE8]",   bg: "bg-blue-50"     },
            { label: "Total",      value: auctions.length,color: "text-gray-700",    bg: "bg-gray-50"     },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "active", "ended", "cancelled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold capitalize transition-colors ${
                filter === f ? "bg-[#4A5CE8] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f === "all" ? `All (${auctions.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${auctions.filter(a => a.status === f).length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Gavel className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">No auctions</p>
            <p className="text-sm mt-1">Auctions created by sellers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const meta = STATUS_META[a.status] ?? STATUS_META["active"];
              const isOpen = expanded === a.id;
              const isExpiring = a.status === "active" && new Date(a.end_time).getTime() - Date.now() < 3600000;
              return (
                <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : a.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                      <meta.icon className="w-3 h-3" /> {meta.label}
                    </span>
                    {isExpiring && (
                      <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                        <AlertTriangle className="w-3 h-3" /> Ending Soon
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{a.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{a.seller_name} · {a.bid_count} bid{a.bid_count !== 1 ? "s" : ""} · {a.category ?? "Uncategorised"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#F26B21]">£{a.current_bid ? parseFloat(a.current_bid).toFixed(2) : parseFloat(a.starting_bid).toFixed(2)}</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
                        <Clock className="w-3 h-3" />
                        {new Date(a.end_time).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400 mb-0.5">Seller</p><p className="font-medium text-gray-800">{a.seller_name}</p><p className="text-xs text-gray-400">{a.seller_email}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Condition</p><p className="font-medium text-gray-800">{a.condition}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Starting Bid</p><p className="font-medium text-gray-800">£{parseFloat(a.starting_bid).toFixed(2)}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Current Bid</p><p className="font-medium text-gray-800">{a.current_bid ? `£${parseFloat(a.current_bid).toFixed(2)}` : "No bids yet"}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Listed</p><p className="font-medium text-gray-800">{new Date(a.created_at).toLocaleDateString("en-GB")}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Ends</p><p className="font-medium text-gray-800">{new Date(a.end_time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
                      </div>

                      {a.status === "active" && (
                        <div className="border-t border-gray-100 pt-4 flex gap-3">
                          <button
                            onClick={() => updateStatus(a.id, "ended")}
                            disabled={updating === a.id}
                            className="flex-1 py-2.5 rounded-xl bg-gray-800 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
                          >
                            {updating === a.id ? "Updating…" : "End Auction Now"}
                          </button>
                          <button
                            onClick={() => updateStatus(a.id, "cancelled")}
                            disabled={updating === a.id}
                            className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:opacity-90 disabled:opacity-50"
                          >
                            Cancel Auction
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

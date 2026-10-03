import { useCallback, useEffect, useState } from "react";
import { Star, Trash2, Loader2, RefreshCw } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Row {
  id: number; order_id: string; role: "buyer_to_seller" | "seller_to_buyer";
  reviewer_email: string; reviewee_email: string; rating: number;
  comment: string | null; item_title: string | null; created_at: string;
}

/** Admin → Reviews: read every review and remove ones that break the rules. */
export function AdminReviewsPage() {
  const { authFetch } = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "low">("all");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = await authFetch("/api/admin/reviews");
      if (!r.ok) { setError(`Couldn't load reviews (error ${r.status})`); return; }
      setRows(await r.json());
    } catch { setError("Couldn't reach the server"); }
  }, [authFetch]);
  useEffect(() => { void load(); }, [load]);

  async function remove(id: number) {
    if (!confirm("Remove this review permanently? Seller profile scores will update straight away.")) return;
    setBusyId(id);
    try {
      const r = await authFetch(`/api/admin/reviews/${id}`, { method: "DELETE" });
      if (r.ok) setRows(prev => prev?.filter(x => x.id !== id) ?? prev);
    } finally { setBusyId(null); }
  }

  const shown = (rows ?? []).filter(r => filter === "all" || r.rating <= 2);

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Reviews</h1>
            <p className="text-sm text-gray-400">{rows ? `${rows.length} reviews` : "Loading…"} — buyers reviewing sellers and sellers reviewing buyers</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value as "all" | "low")} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
              <option value="all">All reviews</option>
              <option value="low">1–2 stars only</option>
            </select>
            <button onClick={load} className="p-2 text-gray-500 hover:text-gray-700"><RefreshCw className="w-4 h-4" /></button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        {!rows && !error && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>}

        <div className="space-y-3">
          {shown.map(r => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex">{[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />)}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.role === "buyer_to_seller" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
                    {r.role === "buyer_to_seller" ? "Buyer → Seller" : "Seller → Buyer"}
                  </span>
                  <span className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
                </div>
                {r.comment && <p className="text-sm text-gray-700 mt-1.5">{r.comment}</p>}
                <p className="text-[11px] text-gray-400 mt-1.5 break-all">
                  {r.reviewer_email} → {r.reviewee_email} · {r.item_title ?? "Order"} · {r.order_id}
                </p>
              </div>
              <button onClick={() => remove(r.id)} disabled={busyId === r.id} title="Remove review"
                className="self-start p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40">
                {busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          ))}
          {rows && shown.length === 0 && <p className="text-center text-sm text-gray-400 py-12">No reviews to show yet.</p>}
        </div>
      </div>
    </AdminLayout>
  );
}

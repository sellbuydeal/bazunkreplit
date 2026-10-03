import { useCallback, useEffect, useState } from "react";
import { Star, Trash2, Loader2, RefreshCw, Flag, RotateCcw, MessageSquareReply } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Report { reason: string; details: string | null; reporter: string; created_at: string }
interface Row {
  id: number; order_id: string; role: "buyer_to_seller" | "seller_to_buyer";
  reviewer_email: string; reviewee_email: string; rating: number;
  comment: string | null; item_title: string | null; created_at: string;
  seller_reply?: string | null; seller_replied_at?: string | null;
  removed_at?: string | null; removed_reason?: string | null;
  report_count: number; reports: Report[];
}

type Filter = "all" | "reported" | "low" | "removed";

export function AdminReviewsPage() {
  const { authFetch } = useAdmin();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

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
    const reason = prompt("Why is this review being removed?", "Breaks Bazunk review rules");
    if (reason === null) return;
    setBusyId(id);
    try {
      const r = await authFetch(`/api/admin/reviews/${id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
      if (r.ok) setRows(prev => prev?.map(x => x.id === id ? { ...x, removed_at: new Date().toISOString(), removed_reason: reason } : x) ?? prev);
    } finally { setBusyId(null); }
  }

  async function restore(id: number) {
    if (!confirm("Restore this review to the public seller score?")) return;
    setBusyId(id);
    try {
      const r = await authFetch(`/api/admin/reviews/${id}/restore`, { method: "POST" });
      if (r.ok) setRows(prev => prev?.map(x => x.id === id ? { ...x, removed_at: null, removed_reason: null } : x) ?? prev);
    } finally { setBusyId(null); }
  }

  const shown = (rows ?? []).filter(r => filter === "all" || (filter === "reported" && r.report_count > 0) || (filter === "low" && r.rating <= 2) || (filter === "removed" && !!r.removed_at));
  const reportedCount = (rows ?? []).filter(r => r.report_count > 0).length;

  return <AdminLayout><div className="p-6 max-w-5xl">
    <div className="flex items-center justify-between mb-5 gap-4 flex-wrap">
      <div><h1 className="text-2xl font-black text-gray-900">Reviews</h1><p className="text-sm text-gray-400">{rows ? `${rows.length} reviews · ${reportedCount} reported` : "Loading…"}</p></div>
      <div className="flex items-center gap-2"><select value={filter} onChange={e => setFilter(e.target.value as Filter)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"><option value="all">All reviews</option><option value="reported">Reported</option><option value="low">1–2 stars</option><option value="removed">Removed</option></select><button onClick={load} className="p-2 text-gray-500 hover:text-gray-700"><RefreshCw className="w-4 h-4" /></button></div>
    </div>
    {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
    {!rows && !error && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>}
    <div className="space-y-3">{shown.map(r => <div key={r.id} className={`bg-white rounded-2xl border p-4 ${r.removed_at ? "border-red-200 opacity-75" : r.report_count ? "border-amber-200" : "border-gray-100"}`}>
      <div className="flex gap-4"><div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap"><span className="inline-flex">{[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />)}</span><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.role === "buyer_to_seller" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>{r.role === "buyer_to_seller" ? "Buyer → Seller" : "Seller → Buyer"}</span>{r.report_count > 0 && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700"><Flag className="w-3 h-3" /> {r.report_count} report{r.report_count === 1 ? "" : "s"}</span>}{r.removed_at && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Removed</span>}<span className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div>
        {r.comment && <p className="text-sm text-gray-700 mt-1.5">{r.comment}</p>}
        {r.seller_reply && <div className="mt-2 border-l-2 border-[#4A5CE8] pl-3"><p className="text-[10px] font-bold text-gray-500 flex items-center gap-1"><MessageSquareReply className="w-3 h-3" /> Seller response</p><p className="text-sm text-gray-600">{r.seller_reply}</p></div>}
        <p className="text-[11px] text-gray-400 mt-1.5 break-all">{r.reviewer_email} → {r.reviewee_email} · {r.item_title ?? "Order"} · {r.order_id}</p>
        {r.reports?.length > 0 && <div className="mt-3 rounded-xl bg-amber-50 p-3 space-y-2"><p className="text-xs font-black text-amber-800">Reports</p>{r.reports.map((rp,i) => <div key={i} className="text-xs text-amber-900"><b>{rp.reason.replaceAll("_", " ")}</b>{rp.details ? ` — ${rp.details}` : ""}<span className="text-amber-600"> · {rp.reporter}</span></div>)}</div>}
        {r.removed_at && <p className="text-xs text-red-500 mt-2">Removal reason: {r.removed_reason || "Not specified"}</p>}
      </div><div>{r.removed_at ? <button onClick={() => restore(r.id)} disabled={busyId === r.id} title="Restore review" className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}</button> : <button onClick={() => remove(r.id)} disabled={busyId === r.id} title="Remove review" className="p-2 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40">{busyId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}</button>}</div></div>
    </div>)}{rows && shown.length === 0 && <p className="text-center text-sm text-gray-400 py-12">No reviews in this view.</p>}</div>
  </div></AdminLayout>;
}

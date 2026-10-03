import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2, Package, Truck, Star, TrendingUp, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ReviewModal } from "./ReviewModal";

interface SaleRow {
  id: string; item_title: string; item_image: string | null; price: string; status: string;
  tracking_number: string | null; carrier: string | null; address: string | null;
  created_at: string; shipped_at: string | null; buyer_name: string; buyer_email: string;
  my_review_rating: number | null; buyer_review_rating: number | null;
}

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-amber-100 text-amber-700" },
  confirmed: { label: "Needs dispatching", cls: "bg-blue-100 text-blue-700" },
  preparing: { label: "Needs dispatching", cls: "bg-blue-100 text-blue-700" },
  shipped: { label: "Dispatched", cls: "bg-indigo-100 text-indigo-700" },
  out_for_delivery: { label: "Out for delivery", cls: "bg-purple-100 text-purple-700" },
  delivered: { label: "Delivered", cls: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelled", cls: "bg-red-100 text-red-700" },
};
const CARRIERS = ["Royal Mail", "Evri", "DPD", "DHL", "UPS", "Yodel", "Parcelforce", "Other"];

/** Seller dashboard → Sales: see orders, dispatch them, and review buyers. */
export function SellerSales() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SaleRow[] | null>(null);
  const [error, setError] = useState("");
  const [dispatching, setDispatching] = useState<SaleRow | null>(null);
  const [carrier, setCarrier] = useState(CARRIERS[0]);
  const [tracking, setTracking] = useState("");
  const [busy, setBusy] = useState(false);
  const [dError, setDError] = useState("");
  const [reviewFor, setReviewFor] = useState<SaleRow | null>(null);

  const load = useCallback(async () => {
    if (!user?.email) return;
    try {
      const r = await fetch(`/api/orders/seller?email=${encodeURIComponent(user.email)}`);
      if (!r.ok) { setError("Couldn't load your sales."); return; }
      setRows(await r.json());
    } catch { setError("Couldn't reach the server."); }
  }, [user?.email]);
  useEffect(() => { void load(); }, [load]);

  async function dispatch() {
    if (!dispatching || !user?.email) return;
    setBusy(true); setDError("");
    try {
      const r = await fetch(`/api/orders/${dispatching.id}/dispatch`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerEmail: user.email, carrier, trackingNumber: tracking }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setDError(d.error ?? "Couldn't dispatch"); return; }
      setDispatching(null); setTracking("");
      await load();
    } catch { setDError("Network error — try again"); }
    finally { setBusy(false); }
  }

  const sent = (rows ?? []).filter(r => ["shipped", "out_for_delivery", "delivered"].includes(r.status));
  const gross = sent.reduce((s, r) => s + parseFloat(r.price), 0);
  const toDispatch = (rows ?? []).filter(r => ["confirmed", "preparing", "pending"].includes(r.status)).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Sales</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {rows ? `${sent.length} sent · £${gross.toFixed(2)} sold${toDispatch ? ` · ${toDispatch} waiting to be dispatched` : ""}` : "Loading…"}
        </p>
      </div>

      {error && <p className="p-5 text-sm text-red-600">{error}</p>}
      {!rows && !error && <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>}

      {rows && rows.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4"><TrendingUp className="w-8 h-8 text-gray-200" /></div>
          <p className="font-semibold text-gray-700 mb-1">No sales yet</p>
          <p className="text-sm text-gray-400 mb-5">List your first item to start selling</p>
          <Link href="/sell/quick" className="px-6 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90">Create a Listing</Link>
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="divide-y divide-gray-50">
          {rows.map(s => {
            const st = STATUS[s.status] ?? STATUS.pending;
            const canDispatch = ["confirmed", "preparing", "pending"].includes(s.status);
            const canReview = ["shipped", "out_for_delivery", "delivered"].includes(s.status);
            return (
              <div key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                  {s.item_image ? <img src={s.item_image} alt="" className="w-full h-full object-contain p-1.5" /> : <Package className="w-6 h-6 text-gray-300 m-4" />}
                </div>
                <div className="flex-1 min-w-[180px]">
                  <p className="text-sm font-semibold text-gray-800 line-clamp-1">{s.item_title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Buyer: {s.buyer_name} · {new Date(s.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  <p className="text-xs text-gray-400">{s.id}{s.tracking_number ? ` · ${s.carrier ?? "Tracking"}: ${s.tracking_number}` : ""}</p>
                  {s.buyer_review_rating !== null && (
                    <p className="text-xs text-amber-500 mt-0.5 flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400" /> Buyer rated you {s.buyer_review_rating}/5</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">£{parseFloat(s.price).toFixed(2)}</p>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {canDispatch && (
                    <button onClick={() => { setDispatching(s); setDError(""); }} className="px-3 py-2 rounded-lg bg-[#4A5CE8] text-white text-xs font-bold flex items-center gap-1.5 hover:opacity-90">
                      <Truck className="w-3.5 h-3.5" /> Mark dispatched
                    </button>
                  )}
                  {canReview && (s.my_review_rating !== null
                    ? <span className="px-3 py-2 text-xs font-semibold text-gray-400">You rated the buyer {s.my_review_rating}/5</span>
                    : <button onClick={() => setReviewFor(s)} className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100">Review buyer</button>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {dispatching && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDispatching(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-black text-gray-900">Mark as dispatched</h3>
              <button onClick={() => setDispatching(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-4 line-clamp-1">{dispatching.item_title}</p>
            {dispatching.address && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2.5 mb-4 whitespace-pre-line">Ship to: {dispatching.address}</p>}
            <label className="block text-xs font-semibold text-gray-600 mb-1">Carrier</label>
            <select value={carrier} onChange={e => setCarrier(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 bg-white">
              {CARRIERS.map(c => <option key={c}>{c}</option>)}
            </select>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Tracking number <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={tracking} onChange={e => setTracking(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3" />
            {dError && <p className="text-sm text-red-600 mb-2">{dError}</p>}
            <button onClick={dispatch} disabled={busy} className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm dispatch
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">The buyer gets a message straight away. Quick dispatch improves your seller profile.</p>
          </div>
        </div>
      )}

      {reviewFor && user?.email && (
        <ReviewModal orderId={reviewFor.id} itemTitle={reviewFor.item_title} reviewerEmail={user.email} role="seller"
          onClose={() => setReviewFor(null)}
          onDone={rating => setRows(prev => prev?.map(r => r.id === reviewFor.id ? { ...r, my_review_rating: rating } : r) ?? prev)} />
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { RotateCcw, Clock, CheckCircle2, XCircle, ChevronDown, RefreshCw, Truck, PackageCheck } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

const REASON_LABELS: Record<string, string> = {
  changed_mind:      "Changed My Mind",
  not_as_described:  "Not As Described",
  damaged:           "Arrived Damaged",
  wrong_item:        "Wrong Item Sent",
  faulty:            "Item Is Faulty",
  other:             "Other",
};

const CONDITION_LABELS: Record<string, string> = {
  unopened: "Unopened / Sealed",
  like_new: "Like New",
  used:     "Used (minor wear)",
  damaged:  "Damaged",
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  requested:     { label: "Requested",      color: "bg-amber-100 text-amber-700",   icon: Clock },
  approved:      { label: "Approved",       color: "bg-blue-100 text-blue-700",     icon: CheckCircle2 },
  declined:      { label: "Declined",       color: "bg-red-100 text-red-600",       icon: XCircle },
  return_shipped:{ label: "Return Shipped", color: "bg-purple-100 text-purple-700", icon: Truck },
  received:      { label: "Received",       color: "bg-indigo-100 text-indigo-700", icon: PackageCheck },
  refund_issued: { label: "Refund Issued",  color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  closed:        { label: "Closed",         color: "bg-gray-100 text-gray-500",     icon: XCircle },
};

type Return = {
  id: string; order_id: string; buyer_email: string; seller_email: string | null;
  item_title: string; reason: string; condition: string; description: string;
  status: string; admin_notes: string | null; refund_amount: string | null;
  return_tracking: string | null; created_at: string; updated_at: string;
};

export function AdminReturnsPage() {
  const { token } = useAdmin();
  const [returns, setReturns] = useState<Return[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, { status: string; notes: string; refund: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/returns", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setReturns(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function getForm(id: string, current: Return) {
    return formState[id] ?? { status: current.status, notes: current.admin_notes ?? "", refund: current.refund_amount ?? "" };
  }

  function setForm(id: string, patch: Partial<{ status: string; notes: string; refund: string }>) {
    setFormState((prev) => ({ ...prev, [id]: { ...getForm(id, returns.find((r) => r.id === id)!), ...patch } }));
  }

  async function save(ret: Return) {
    const f = getForm(ret.id, ret);
    setUpdating(ret.id);
    try {
      await fetch(`/api/admin/returns/${ret.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: f.status, adminNotes: f.notes, refundAmount: f.refund }),
      });
      await load();
      setExpanded(null);
    } finally {
      setUpdating(null);
    }
  }

  const pendingCount = returns.filter((r) => r.status === "requested").length;
  const shippedCount = returns.filter((r) => r.status === "return_shipped").length;
  const refundedCount = returns.filter((r) => r.status === "refund_issued").length;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Returns Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review, approve, and process buyer return requests</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Awaiting Review", value: pendingCount,       color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Return Shipped",  value: shippedCount,       color: "text-purple-600",  bg: "bg-purple-50" },
            { label: "Refunds Issued",  value: refundedCount,      color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Total",           value: returns.length,     color: "text-gray-700",    bg: "bg-gray-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : returns.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RotateCcw className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">No return requests yet</p>
            <p className="text-sm mt-1">Return requests submitted by buyers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {returns.map((r) => {
              const meta = STATUS_META[r.status] ?? STATUS_META["requested"];
              const isOpen = expanded === r.id;
              const form = getForm(r.id, r);
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : r.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                      <meta.icon className="w-3 h-3" /> {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{r.item_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {REASON_LABELS[r.reason] ?? r.reason} · {r.buyer_email} · Order {r.order_id}
                      </p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{new Date(r.created_at).toLocaleDateString("en-GB")}</p>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400 mb-0.5">Buyer</p><p className="font-medium text-gray-800">{r.buyer_email}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Order ID</p><p className="font-medium text-gray-800 font-mono">{r.order_id}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Reason</p><p className="font-medium text-gray-800">{REASON_LABELS[r.reason] ?? r.reason}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Condition</p><p className="font-medium text-gray-800">{CONDITION_LABELS[r.condition] ?? r.condition}</p></div>
                        {r.return_tracking && (
                          <div className="col-span-2">
                            <p className="text-xs text-gray-400 mb-0.5">Return Tracking</p>
                            <p className="font-medium text-gray-800 font-mono">{r.return_tracking}</p>
                          </div>
                        )}
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Buyer's description</p>
                        <p className="text-sm text-gray-700">{r.description}</p>
                      </div>

                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Admin Action</p>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Update Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => setForm(r.id, { status: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#4A5CE8]"
                          >
                            {Object.entries(STATUS_META).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                        {(form.status === "approved" || form.status === "refund_issued") && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Refund Amount (£)</label>
                            <input
                              type="number" step="0.01" min="0"
                              value={form.refund}
                              onChange={(e) => setForm(r.id, { refund: e.target.value })}
                              placeholder="e.g. 49.99"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Admin Notes (visible to buyer)</label>
                          <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm(r.id, { notes: e.target.value })}
                            placeholder="Instructions for the buyer, reason for decision…"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none"
                          />
                        </div>
                        <button
                          onClick={() => save(r)}
                          disabled={updating === r.id}
                          className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {updating === r.id ? "Saving…" : "Save Decision"}
                        </button>
                      </div>
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

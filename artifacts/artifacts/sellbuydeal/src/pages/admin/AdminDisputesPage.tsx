import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Clock, CheckCircle2, XCircle, ChevronDown, RefreshCw } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

const REASON_LABELS: Record<string, string> = {
  item_not_received: "Item Not Received",
  not_as_described:  "Not As Described",
  damaged:           "Damaged in Transit",
  wrong_item:        "Wrong Item Sent",
  other:             "Other",
};

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open:                 { label: "Open",            color: "bg-amber-100 text-amber-700",   icon: AlertTriangle },
  under_review:         { label: "Under Review",    color: "bg-blue-100 text-blue-700",     icon: Clock },
  resolved_refund:      { label: "Refund Issued",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  resolved_no_action:   { label: "No Action",       color: "bg-gray-100 text-gray-600",     icon: XCircle },
  closed:               { label: "Closed",          color: "bg-gray-100 text-gray-400",     icon: XCircle },
};

type Dispute = {
  id: string; order_id: string | null; buyer_email: string; seller_email: string | null;
  item_title: string; reason: string; description: string; status: string;
  resolution_notes: string | null; refund_amount: string | null; seller_response: string | null;
  created_at: string; resolved_at: string | null;
};

export function AdminDisputesPage() {
  const { token } = useAdmin();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [formState, setFormState] = useState<Record<string, { status: string; notes: string; refund: string }>>({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/disputes", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setDisputes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function getForm(id: string, current: Dispute) {
    return formState[id] ?? { status: current.status, notes: current.resolution_notes ?? "", refund: current.refund_amount ?? "" };
  }

  function setForm(id: string, patch: Partial<{ status: string; notes: string; refund: string }>) {
    setFormState((prev) => ({ ...prev, [id]: { ...getForm(id, disputes.find((d) => d.id === id)!), ...patch } }));
  }

  async function save(dispute: Dispute) {
    const f = getForm(dispute.id, dispute);
    setUpdating(dispute.id);
    try {
      await fetch(`/api/admin/disputes/${dispute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: f.status, resolutionNotes: f.notes, refundAmount: f.refund }),
      });
      await load();
      setExpanded(null);
    } finally {
      setUpdating(null);
    }
  }

  const openCount = disputes.filter((d) => d.status === "open").length;
  const reviewCount = disputes.filter((d) => d.status === "under_review").length;

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Dispute Resolution</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and resolve buyer/seller disputes</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Open",         value: openCount,            color: "text-amber-600",   bg: "bg-amber-50" },
            { label: "Under Review", value: reviewCount,          color: "text-blue-600",    bg: "bg-blue-50" },
            { label: "Total",        value: disputes.length,      color: "text-gray-700",    bg: "bg-gray-50" },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading…</div>
        ) : disputes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p className="font-semibold">No disputes yet</p>
            <p className="text-sm mt-1">Disputes raised by buyers will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {disputes.map((d) => {
              const meta = STATUS_META[d.status] ?? STATUS_META["open"];
              const isOpen = expanded === d.id;
              const form = getForm(d.id, d);
              return (
                <div key={d.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : d.id)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${meta.color}`}>
                      <meta.icon className="w-3 h-3" /> {meta.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{d.item_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{REASON_LABELS[d.reason] ?? d.reason} · {d.buyer_email}</p>
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{new Date(d.created_at).toLocaleDateString("en-GB")}</p>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 p-5 space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><p className="text-xs text-gray-400 mb-0.5">Buyer</p><p className="font-medium text-gray-800">{d.buyer_email}</p></div>
                        <div><p className="text-xs text-gray-400 mb-0.5">Seller</p><p className="font-medium text-gray-800">{d.seller_email ?? "—"}</p></div>
                        {d.order_id && <div><p className="text-xs text-gray-400 mb-0.5">Order ID</p><p className="font-medium text-gray-800">{d.order_id}</p></div>}
                        <div><p className="text-xs text-gray-400 mb-0.5">Reason</p><p className="font-medium text-gray-800">{REASON_LABELS[d.reason] ?? d.reason}</p></div>
                      </div>

                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-xs text-gray-400 mb-1">Buyer's description</p>
                        <p className="text-sm text-gray-700">{d.description}</p>
                      </div>

                      {d.seller_response && (
                        <div className="bg-blue-50 rounded-xl p-3">
                          <p className="text-xs text-blue-400 mb-1">Seller's response</p>
                          <p className="text-sm text-blue-800">{d.seller_response}</p>
                        </div>
                      )}

                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Admin Action</p>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Update Status</label>
                          <select
                            value={form.status}
                            onChange={(e) => setForm(d.id, { status: e.target.value })}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#4A5CE8]"
                          >
                            {Object.entries(STATUS_META).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}</option>
                            ))}
                          </select>
                        </div>
                        {form.status === "resolved_refund" && (
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Refund Amount (£)</label>
                            <input
                              type="number" step="0.01" min="0"
                              value={form.refund}
                              onChange={(e) => setForm(d.id, { refund: e.target.value })}
                              placeholder="e.g. 49.99"
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                            />
                          </div>
                        )}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Resolution Notes</label>
                          <textarea
                            rows={3}
                            value={form.notes}
                            onChange={(e) => setForm(d.id, { notes: e.target.value })}
                            placeholder="Explain the decision to both parties…"
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none"
                          />
                        </div>
                        <button
                          onClick={() => save(d)}
                          disabled={updating === d.id}
                          className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {updating === d.id ? "Saving…" : "Save Decision"}
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

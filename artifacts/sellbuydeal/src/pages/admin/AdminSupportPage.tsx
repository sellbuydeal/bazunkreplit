import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Search, RefreshCw, LifeBuoy, ChevronLeft, Send, Loader2,
  Clock, CheckCircle, AlertCircle, X,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

type Ticket = {
  id: number; email: string; subject: string; category: string;
  status: string; priority: string; created_at: string; updated_at: string;
  message_count: number;
};

type TicketMessage = {
  id: number; author: string; author_type: "user" | "admin"; body: string; created_at: string;
};

const STATUS_STYLES: Record<string, { label: string; cls: string; dot: string }> = {
  open:          { label: "Open",        cls: "bg-blue-100 text-blue-700",    dot: "bg-blue-500"    },
  "in-progress": { label: "In Progress", cls: "bg-amber-100 text-amber-700",  dot: "bg-amber-500"   },
  closed:        { label: "Closed",      cls: "bg-gray-100 text-gray-500",    dot: "bg-gray-400"    },
};

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  low:    { label: "Low",    cls: "bg-gray-100 text-gray-500"   },
  normal: { label: "Normal", cls: "bg-blue-50 text-blue-600"    },
  high:   { label: "High",   cls: "bg-orange-100 text-orange-600" },
  urgent: { label: "Urgent", cls: "bg-red-100 text-red-600"     },
};

const STATUS_TABS = ["all", "open", "in-progress", "closed"] as const;

export function AdminSupportPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyOk, setReplyOk] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { loadTickets(); }, [statusFilter, search]);

  async function loadTickets() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await authFetch(`/api/admin/support/tickets?${params}`);
      if (res.ok) { const d = await res.json(); setTickets(d.tickets ?? []); setTotal(d.total ?? 0); }
    } finally { setLoading(false); }
  }

  async function openTicket(t: Ticket) {
    setSelected(t);
    setThreadLoading(true);
    setReplyBody("");
    setReplyOk(false);
    try {
      const res = await authFetch(`/api/admin/support/tickets/${t.id}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages ?? []); }
    } finally { setThreadLoading(false); }
  }

  async function sendReply() {
    if (!selected || !replyBody.trim()) return;
    setReplySending(true);
    try {
      const res = await authFetch(`/api/admin/support/tickets/${selected.id}/reply`, {
        method: "POST", body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (res.ok) {
        setReplyBody("");
        setReplyOk(true);
        setTimeout(() => setReplyOk(false), 2500);
        const r2 = await authFetch(`/api/admin/support/tickets/${selected.id}`);
        if (r2.ok) { const d = await r2.json(); setMessages(d.messages ?? []); }
        setSelected(prev => prev ? { ...prev, status: "in-progress" } : prev);
        await loadTickets();
      }
    } finally { setReplySending(false); }
  }

  async function updateTicket(field: "status" | "priority", value: string) {
    if (!selected) return;
    setUpdating(true);
    try {
      const res = await authFetch(`/api/admin/support/tickets/${selected.id}`, {
        method: "PATCH", body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setSelected(prev => prev ? { ...prev, [field]: value } : prev);
        await loadTickets();
      }
    } finally { setUpdating(false); }
  }

  const openCount = tickets.filter(t => t.status === "open").length;

  if (selected) {
    const s = STATUS_STYLES[selected.status] ?? STATUS_STYLES.open;
    const p = PRIORITY_STYLES[selected.priority] ?? PRIORITY_STYLES.normal;

    return (
      <AdminLayout>
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setSelected(null)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to tickets
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-500 truncate">#{selected.id} {selected.subject}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Thread */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 520 }}>
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 text-sm">{selected.subject}</h2>
              <p className="text-xs text-gray-400 mt-0.5">From: <strong className="text-gray-600">{selected.email}</strong></p>
            </div>

            <div className="flex-1 p-5 space-y-4 overflow-auto">
              {threadLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No messages yet</p>
              ) : messages.map((m) => (
                <div key={m.id} className={`flex ${m.author_type === "admin" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    m.author_type === "admin"
                      ? "bg-[#F26B21] text-white"
                      : "bg-gray-50 border border-gray-200 text-gray-800"
                  }`}>
                    <p className={`text-[10px] font-bold mb-1 ${m.author_type === "admin" ? "text-white/70" : "text-gray-400"}`}>
                      {m.author_type === "admin" ? "Support Team (you)" : m.author}
                    </p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                    <p className={`text-[10px] mt-1.5 ${m.author_type === "admin" ? "text-white/50" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {selected.status !== "closed" ? (
              <div className="p-5 border-t border-gray-100">
                <div className="flex gap-2">
                  <textarea
                    rows={3}
                    placeholder="Type your reply to the user…"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 resize-none"
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  {replyOk ? (
                    <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" /> Reply sent — ticket moved to In Progress
                    </p>
                  ) : <span />}
                  <button
                    onClick={sendReply}
                    disabled={replySending || !replyBody.trim()}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {replySending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    Send Reply
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">This ticket is closed.</p>
                <button
                  onClick={() => updateTicket("status", "open")}
                  disabled={updating}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors disabled:opacity-40"
                >
                  Reopen Ticket
                </button>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Ticket Details</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Status</p>
                  <select
                    value={selected.status}
                    onChange={(e) => updateTicket("status", e.target.value)}
                    disabled={updating}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 disabled:opacity-60"
                  >
                    <option value="open">Open</option>
                    <option value="in-progress">In Progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Priority</p>
                  <select
                    value={selected.priority}
                    onChange={(e) => updateTicket("priority", e.target.value)}
                    disabled={updating}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 disabled:opacity-60"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Category</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{selected.category}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">User</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 break-all">{selected.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Opened</p>
                  <p className="text-sm text-gray-700">{new Date(selected.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              {selected.status !== "closed" && (
                <button
                  onClick={() => updateTicket("status", "closed")}
                  disabled={updating}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors disabled:opacity-40"
                >
                  {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                  Close Ticket
                </button>
              )}
            </div>

            <div className={`rounded-2xl border px-4 py-3 flex items-start gap-3 ${
              s.cls.includes("blue") ? "bg-blue-50 border-blue-100" :
              s.cls.includes("amber") ? "bg-amber-50 border-amber-100" :
              "bg-gray-50 border-gray-200"
            }`}>
              <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
              <div>
                <p className="text-xs font-bold text-gray-700">{s.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  Priority: <strong>{p.label}</strong> · {messages.length} message{messages.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Support Tickets</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {total} ticket{total !== 1 ? "s" : ""}
            {openCount > 0 && statusFilter !== "open" && (
              <span className="ml-2 text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{openCount} open</span>
            )}
          </p>
        </div>
        <button onClick={loadTickets} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_TABS.map(tab => (
          <button key={tab} onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-colors ${
              statusFilter === tab
                ? "bg-[#1A1D2E] text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"
            }`}>
            {tab === "all" ? "All" : STATUS_STYLES[tab]?.label ?? tab}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email or subject…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 text-gray-300 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
              <LifeBuoy className="w-7 h-7 text-gray-200" />
            </div>
            <p className="text-sm font-semibold text-gray-500">No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tickets.map((t) => {
              const s = STATUS_STYLES[t.status] ?? STATUS_STYLES.open;
              const p = PRIORITY_STYLES[t.priority] ?? PRIORITY_STYLES.normal;
              return (
                <button key={t.id} onClick={() => openTicket(t)}
                  className="w-full text-left px-5 py-4 hover:bg-gray-50/60 transition-colors flex items-start gap-4">
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${s.dot}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] font-bold text-gray-400 font-mono">#{t.id}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.cls}`}>{p.label}</span>
                      <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-full">{t.category}</span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{t.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(t.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                    <p className="text-[10px] text-gray-300 mt-0.5">{t.message_count} msg{t.message_count !== 1 ? "s" : ""}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

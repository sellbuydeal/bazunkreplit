import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "./AdminLayout";
import {
  ShieldCheck, ShieldX, Clock, User2, BadgeCheck,
  RefreshCw, Loader2, AlertCircle, CheckCircle2, XCircle, ScrollText,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

type VerificationStatus = "pending" | "verified" | "rejected" | "unverified";

interface VerificationUser {
  id: string;
  email: string;
  name: string | null;
  verification_status: VerificationStatus;
  verification_date: string | null;
  didit_verification_id: string | null;
  created_at: string;
}

interface WebhookLog {
  id: number;
  session_id: string | null;
  vendor_data: string | null;
  event_type: string;
  status: string;
  created_at: string;
}

const STATUS_CONFIG: Record<VerificationStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending:    { label: "Pending",  color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",   icon: Clock },
  verified:   { label: "Verified", color: "text-[#4A5CE8]",   bg: "bg-blue-50 border-blue-200",     icon: BadgeCheck },
  rejected:   { label: "Rejected", color: "text-red-600",     bg: "bg-red-50 border-red-200",       icon: XCircle },
  unverified: { label: "None",     color: "text-gray-500",    bg: "bg-gray-50 border-gray-200",     icon: User2 },
};

type Tab = "pending" | "verified" | "rejected" | "logs";

export function AdminVerificationPage() {
  const { authFetch } = useAdmin();
  const [tab, setTab] = useState<Tab>("pending");
  const [users, setUsers] = useState<VerificationUser[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = useCallback(
    async (status: Tab) => {
      if (status === "logs") return;
      setLoading(true);
      setError(null);
      try {
        const res = await authFetch(`/api/admin/verification/users?status=${status}&_t=${Date.now()}`);
        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data: VerificationUser[] = await res.json();
        setUsers(data);
      } catch (e: unknown) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  const loadLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const res = await authFetch(`/api/admin/verification/logs?_t=${Date.now()}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data: WebhookLog[] = await res.json();
      setLogs(data);
    } catch {
      // no-op
    } finally {
      setLogsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (tab === "logs") {
      loadLogs();
    } else {
      loadUsers(tab);
    }
  }, [tab, loadUsers, loadLogs]);

  async function updateStatus(email: string, status: VerificationStatus) {
    setUpdating(email);
    try {
      const res = await authFetch(
        `/api/admin/verification/users/${encodeURIComponent(email)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      );
      if (!res.ok) throw new Error(`API error ${res.status}`);
      showToast(`${email} set to ${status}`);
      await loadUsers(tab as Tab);
    } catch (e: unknown) {
      showToast(`Error: ${(e as Error).message}`);
    } finally {
      setUpdating(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType; color: string }[] = [
    { id: "pending",  label: "Pending",  icon: Clock,        color: "text-amber-600" },
    { id: "verified", label: "Verified", icon: BadgeCheck,   color: "text-[#4A5CE8]" },
    { id: "rejected", label: "Rejected", icon: ShieldX,      color: "text-red-600" },
    { id: "logs",     label: "Event Log",icon: ScrollText,   color: "text-gray-500" },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4A5CE8] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900">Identity Verification</h1>
              <p className="text-sm text-gray-400">Manage Didit KYC results and override statuses</p>
            </div>
          </div>
          <button
            onClick={() => tab === "logs" ? loadLogs() : loadUsers(tab)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mb-4 px-4 py-3 bg-[#1A1D2E] text-white rounded-xl text-sm font-medium">
            {toast}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit mb-6">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  tab === t.id
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className={`w-4 h-4 ${tab === t.id ? t.color : ""}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab !== "logs" ? (
          <>
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ShieldCheck className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold">No {tab} users</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((u) => {
                  const cfg = STATUS_CONFIG[u.verification_status];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={u.email}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {(u.name ?? u.email).charAt(0).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{u.name ?? "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email}</p>
                        {u.didit_verification_id && (
                          <p className="text-xs text-gray-300 font-mono truncate mt-0.5">{u.didit_verification_id}</p>
                        )}
                      </div>

                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold ${cfg.color} ${cfg.bg}`}>
                        <Icon className="w-3.5 h-3.5" /> {cfg.label}
                      </div>

                      {u.verification_date && (
                        <p className="text-xs text-gray-400 hidden md:block whitespace-nowrap">
                          {new Date(u.verification_date).toLocaleDateString("en-GB")}
                        </p>
                      )}

                      {/* Override buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        {u.verification_status !== "verified" && (
                          <button
                            onClick={() => updateStatus(u.email, "verified")}
                            disabled={updating === u.email}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#4A5CE8] bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                          >
                            {updating === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
                            Approve
                          </button>
                        )}
                        {u.verification_status !== "rejected" && (
                          <button
                            onClick={() => updateStatus(u.email, "rejected")}
                            disabled={updating === u.email}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            {updating === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Webhook event log */
          <>
            {logsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-gray-300 animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <ScrollText className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-semibold">No webhook events yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Time", "User", "Event", "Status", "Session ID"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const s = log.status as VerificationStatus;
                      const cfg = STATUS_CONFIG[s] ?? STATUS_CONFIG.unverified;
                      const Icon = cfg.icon;
                      return (
                        <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-GB")}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-700 truncate max-w-[180px]">
                            {log.vendor_data ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-mono text-gray-600">
                              {log.event_type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1 w-fit px-2 py-1 rounded-lg border text-xs font-bold ${cfg.color} ${cfg.bg}`}>
                              <Icon className="w-3 h-3" /> {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-300 truncate max-w-[160px]">
                            {log.session_id ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}

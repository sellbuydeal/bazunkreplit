import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  Search, Ban, CheckCircle, RefreshCw, Trophy,
  ChevronDown, ChevronUp, Save, Loader2, Pencil, Trash2, X, AlertTriangle,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface User {
  id: string; email: string; name: string | null;
  credits: string; banned: boolean; created_at: string;
}

const MILESTONE_DEFS = [
  { id: "welcome-bonus",     name: "Welcome to Bazunk!", task: "Join Bazunk (one-time)",        total: 1  },
  { id: "first-listing",     name: "First Listing",      task: "Post first item for sale",      total: 1  },
  { id: "first-live",        name: "Go Live!",           task: "Host first live stream",        total: 1  },
  { id: "first-flash-sale",  name: "Flash Sale Pro",     task: "Run first flash sale",          total: 1  },
  { id: "quick-seller",      name: "Quick Seller",       task: "Sell 3 items this month",       total: 3  },
  { id: "power-seller",      name: "Power Seller",       task: "Sell 10 items this month",      total: 10 },
  { id: "trusted-seller",    name: "Trusted Seller",     task: "5 positive reviews in a row",   total: 5  },
  { id: "top-rated",         name: "Top Rated",          task: "10 positive reviews in a row",  total: 10 },
  { id: "active-lister",     name: "Active Lister",      task: "List 5 items this month",       total: 5  },
  { id: "inventory-master",  name: "Inventory Master",   task: "List 20 items this month",      total: 20 },
  { id: "consistent-seller", name: "Consistent Seller",  task: "7-day active streak",           total: 7  },
  { id: "dedicated-seller",  name: "Dedicated Seller",   task: "30-day active streak",          total: 30 },
];

export function AdminUsersPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Credits
  const [creditInput, setCreditInput] = useState<Record<string, string>>({});
  const [creditReason, setCreditReason] = useState<Record<string, string>>({});
  const [creditSaving, setCreditSaving] = useState<string | null>(null);
  const [creditResult, setCreditResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  // Ban
  const [banSaving, setBanSaving] = useState<string | null>(null);

  // Edit user modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirmation
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  // Milestones
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [milestoneData, setMilestoneData] = useState<Record<string, { progress: number; completed: boolean }>>({});
  const [milestoneInputs, setMilestoneInputs] = useState<Record<string, string>>({});
  const [milestoneLoading, setMilestoneLoading] = useState(false);
  const [milestoneSaving, setMilestoneSaving] = useState<string | null>(null);
  const [milestoneSaved, setMilestoneSaved] = useState<Record<string, boolean>>({});

  useEffect(() => { if (!isAdmin) setLocation("/admin"); }, [isAdmin]);
  useEffect(() => { load(); }, [search]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      const res = await authFetch(`/api/admin/users?${params}`);
      if (res.ok) { const d = await res.json(); setUsers(d.users); setTotal(d.total); }
    } finally { setLoading(false); }
  }

  async function saveCredits(email: string, sign: 1 | -1) {
    const raw = creditInput[email] ?? "";
    const credits = parseFloat(raw);
    if (!raw || isNaN(credits) || credits <= 0) {
      setCreditResult(prev => ({ ...prev, [email]: { ok: false, msg: "Enter a valid credit amount" } }));
      return;
    }
    const amount = (credits / 100) * sign;
    setCreditSaving(email);
    setCreditResult(prev => ({ ...prev, [email]: { ok: true, msg: "" } }));
    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/credits`, {
        method: "PATCH",
        body: JSON.stringify({ amount, reason: creditReason[email] || "Admin adjustment" }),
      });
      if (res.ok) {
        const data = await res.json();
        const newCr = Math.round(data.newBalance * 100);
        setCreditResult(prev => ({ ...prev, [email]: { ok: true, msg: `✓ Saved — new balance: ${newCr.toLocaleString()} cr` } }));
        setCreditInput(prev => ({ ...prev, [email]: "" }));
        setCreditReason(prev => ({ ...prev, [email]: "" }));
        await load();
      } else {
        const err = await res.json().catch(() => ({}));
        setCreditResult(prev => ({ ...prev, [email]: { ok: false, msg: err.error ?? "Failed to save" } }));
      }
    } finally {
      setCreditSaving(null);
      setTimeout(() => setCreditResult(prev => { const n = { ...prev }; delete n[email]; return n; }), 3500);
    }
  }

  async function toggleBan(email: string, banned: boolean) {
    setBanSaving(email);
    await authFetch(`/api/admin/users/${encodeURIComponent(email)}/ban`, {
      method: "PATCH", body: JSON.stringify({ banned: !banned }),
    });
    await load();
    setBanSaving(null);
  }

  async function saveEdit() {
    if (!editUser) return;
    setEditSaving(true);
    setEditError("");
    const res = await authFetch(`/api/admin/users/${encodeURIComponent(editUser.email)}`, {
      method: "PATCH", body: JSON.stringify({ name: editName.trim() || null }),
    });
    if (res.ok) {
      setEditUser(null);
      await load();
    } else {
      const err = await res.json().catch(() => ({}));
      setEditError(err.error ?? "Failed to save");
    }
    setEditSaving(false);
  }

  async function confirmDelete() {
    if (!deleteUser) return;
    setDeleteSaving(true);
    await authFetch(`/api/admin/users/${encodeURIComponent(deleteUser.email)}`, { method: "DELETE" });
    setDeleteUser(null);
    setDeleteSaving(false);
    await load();
  }

  async function toggleMilestones(email: string) {
    if (expandedEmail === email) { setExpandedEmail(null); return; }
    setExpandedEmail(email);
    setMilestoneLoading(true);
    setMilestoneSaved({});
    try {
      const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/milestones`);
      if (res.ok) {
        const data = await res.json();
        setMilestoneData(data.milestones ?? {});
        const inputs: Record<string, string> = {};
        for (const def of MILESTONE_DEFS) inputs[def.id] = String(data.milestones?.[def.id]?.progress ?? 0);
        setMilestoneInputs(inputs);
      }
    } finally { setMilestoneLoading(false); }
  }

  async function saveMilestone(email: string, milestoneId: string, total: number) {
    const progress = Math.min(Math.max(0, parseInt(milestoneInputs[milestoneId] ?? "0") || 0), total);
    const completed = progress >= total;
    setMilestoneSaving(milestoneId);
    const res = await authFetch(`/api/admin/users/${encodeURIComponent(email)}/milestones/${milestoneId}`, {
      method: "PATCH", body: JSON.stringify({ progress, completed, total }),
    });
    if (res.ok) {
      setMilestoneData(prev => ({ ...prev, [milestoneId]: { progress, completed } }));
      setMilestoneInputs(prev => ({ ...prev, [milestoneId]: String(progress) }));
      setMilestoneSaved(prev => ({ ...prev, [milestoneId]: true }));
      setTimeout(() => setMilestoneSaved(prev => ({ ...prev, [milestoneId]: false })), 2000);
    }
    setMilestoneSaving(null);
  }

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Users</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} registered users</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by email…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["User", "Credits", "Joined", "Adjust Credits", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-10">Loading…</td></tr>
              )}
              {!loading && users.length === 0 && (
                <tr><td colSpan={5} className="text-center text-gray-400 py-10">No users found</td></tr>
              )}
              {users.map((u) => (
                <>
                  <tr key={u.email} className={`border-t border-gray-50 ${u.banned ? "bg-red-50/40" : "hover:bg-gray-50/40"}`}>
                    {/* User */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-xs">{u.email}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{u.name ?? <span className="italic">No name</span>}</p>
                      {u.banned && <span className="inline-block mt-1 text-[9px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">BANNED</span>}
                    </td>

                    {/* Credits */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="font-bold text-[#4A5CE8] text-xs">{Math.round(parseFloat(u.credits) * 100).toLocaleString()} cr</p>
                      <p className="text-[10px] text-gray-400">£{parseFloat(u.credits).toFixed(2)}</p>
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>

                    {/* Adjust Credits */}
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number" min="0" step="1"
                            value={creditInput[u.email] ?? ""}
                            onChange={(e) => setCreditInput(prev => ({ ...prev, [u.email]: e.target.value }))}
                            placeholder="Credits"
                            className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]"
                          />
                          <button
                            onClick={() => saveCredits(u.email, 1)}
                            disabled={creditSaving === u.email}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            {creditSaving === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Add
                          </button>
                          <button
                            onClick={() => saveCredits(u.email, -1)}
                            disabled={creditSaving === u.email}
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors disabled:opacity-40 whitespace-nowrap"
                          >
                            {creditSaving === u.email ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Deduct
                          </button>
                        </div>
                        <input
                          type="text"
                          value={creditReason[u.email] ?? ""}
                          onChange={(e) => setCreditReason(prev => ({ ...prev, [u.email]: e.target.value }))}
                          placeholder="Reason (optional)"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#4A5CE8] text-gray-600"
                        />
                        {creditResult[u.email] && (
                          <p className={`text-[10px] font-semibold ${creditResult[u.email].ok ? "text-emerald-600" : "text-red-500"}`}>
                            {creditResult[u.email].msg}
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Edit */}
                        <button
                          onClick={() => { setEditUser(u); setEditName(u.name ?? ""); setEditError(""); }}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Edit user"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>

                        {/* Ban/Unban */}
                        <button
                          onClick={() => toggleBan(u.email, u.banned)}
                          disabled={banSaving === u.email}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                            u.banned
                              ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                              : "bg-red-50 text-red-600 hover:bg-red-100"
                          }`}
                        >
                          {banSaving === u.email
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : u.banned ? <CheckCircle className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          {u.banned ? "Unban" : "Ban"}
                        </button>

                        {/* Milestones */}
                        <button
                          onClick={() => toggleMilestones(u.email)}
                          className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${
                            expandedEmail === u.email
                              ? "bg-[#4A5CE8] text-white"
                              : "bg-[#4A5CE8]/10 text-[#4A5CE8] hover:bg-[#4A5CE8]/20"
                          }`}
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          {expandedEmail === u.email ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedEmail === u.email && (
                    <tr key={`${u.email}-milestones`} className="bg-[#4A5CE8]/3 border-t border-[#4A5CE8]/10">
                      <td colSpan={5} className="px-4 py-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-[#4A5CE8]" />
                            <span className="text-sm font-bold text-gray-900">Milestones — {u.email}</span>
                          </div>
                          {milestoneLoading && <Loader2 className="w-4 h-4 text-[#4A5CE8] animate-spin" />}
                        </div>

                        {milestoneLoading ? (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {MILESTONE_DEFS.map((def) => {
                              const current = milestoneData[def.id] ?? { progress: 0, completed: false };
                              const inputVal = milestoneInputs[def.id] ?? "0";
                              const pct = Math.min(100, Math.round((current.progress / def.total) * 100));
                              const isSaving = milestoneSaving === def.id;
                              const isSaved = milestoneSaved[def.id];

                              return (
                                <div key={def.id} className={`bg-white rounded-xl border p-3 ${current.completed ? "border-emerald-200" : "border-gray-100"}`}>
                                  <div className="flex items-start justify-between mb-1">
                                    <div>
                                      <p className="text-xs font-bold text-gray-900 leading-tight">{def.name}</p>
                                      <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{def.task}</p>
                                    </div>
                                    {current.completed && (
                                      <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">DONE</span>
                                    )}
                                  </div>

                                  <div className="my-2">
                                    <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                                      <span>Progress</span>
                                      <span className="font-bold">{current.progress}/{def.total}</span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${current.completed ? "bg-emerald-500" : "bg-[#4A5CE8]"}`}
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 mt-2">
                                    <input
                                      type="number" min="0" max={def.total}
                                      value={inputVal}
                                      onChange={(e) => setMilestoneInputs(prev => ({ ...prev, [def.id]: e.target.value }))}
                                      className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]"
                                      placeholder="0"
                                    />
                                    <span className="text-[10px] text-gray-400">/ {def.total}</span>
                                    <button
                                      onClick={() => saveMilestone(u.email, def.id, def.total)}
                                      disabled={isSaving}
                                      className={`ml-auto flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors disabled:opacity-40 ${
                                        isSaved
                                          ? "bg-emerald-100 text-emerald-600"
                                          : "bg-[#4A5CE8]/10 text-[#4A5CE8] hover:bg-[#4A5CE8]/20"
                                      }`}
                                    >
                                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : isSaved ? <CheckCircle className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                      {isSaved ? "Saved" : "Save"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Edit User Modal ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-black text-gray-900">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Email</label>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5">{editUser.email}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Enter display name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  autoFocus
                />
              </div>

              {editError && (
                <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2">{editError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteUser(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Delete User</h2>
                <p className="text-xs text-gray-400 mt-0.5">This cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              You are about to permanently delete:
            </p>
            <p className="text-sm font-bold text-gray-900 bg-gray-50 rounded-xl px-3 py-2 mb-5">
              {deleteUser.email}
            </p>
            <p className="text-xs text-gray-400 mb-5">
              All their data (credits, listings, orders) will remain in the database but their account login will be removed.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUser(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteSaving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

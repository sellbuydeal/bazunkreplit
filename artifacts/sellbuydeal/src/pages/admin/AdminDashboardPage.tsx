import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Users, Coins, CreditCard, TrendingUp, RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink, Package, Settings, ShieldCheck, Download, ArrowDownToLine } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";

interface Check { ok: boolean; label: string; hint: string }
interface SetupStatus { checks: Record<string, Check>; setupComplete: boolean }

interface Stats {
  userCount: number;
  creditsInCirculation: number;
  totalTransactions: number;
  totalRevenue: number;
  stripeBalance: number;
  recentPayments: Array<{ id: string; email: string; amount: number; currency: string; date: string; status: string }>;
}

export function AdminDashboardPage() {
  const { isAdmin, authFetch } = useAdmin();
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    if (!isAdmin) { setLocation("/admin"); return; }
    load();
    fetch("/api/setup/status").then(r => r.ok ? r.json() : null).then(d => { if (d) setSetupStatus(d); });
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }

  const cards = stats ? [
    { label: "Total Users",          value: stats.userCount.toLocaleString(),                       icon: Users,      color: "bg-blue-500" },
    { label: `Credits in Circulation · £${stats.creditsInCirculation.toFixed(2)}`, value: `${Math.round(stats.creditsInCirculation * 100).toLocaleString()} cr`, icon: Coins, color: "bg-[#F26B21]" },
    { label: "Total Transactions",   value: stats.totalTransactions.toLocaleString(),               icon: CreditCard, color: "bg-emerald-500" },
    { label: "Total Revenue Paid",   value: `£${stats.totalRevenue.toFixed(2)}`,                    icon: TrendingUp, color: "bg-purple-500" },
  ] : [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">Overview of your marketplace</p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-40">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900">{value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Installation checklist */}
      {setupStatus && !setupStatus.setupComplete && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h2 className="font-bold text-amber-900">Installation Checklist</h2>
            </div>
            <a href="/setup" className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1">
              Open Setup Wizard <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(setupStatus.checks).map(([key, check]) => (
              <div key={key} className="flex items-center gap-2">
                {check.ok
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : key === "adminPassword"
                    ? <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                <span className={`text-xs font-medium ${check.ok ? "text-gray-600" : "text-red-700"}`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      {setupStatus && setupStatus.setupComplete && Object.values(setupStatus.checks).some(c => !c.ok) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <h2 className="font-bold text-red-900">Configuration Issues</h2>
          </div>
          <div className="space-y-1.5">
            {Object.entries(setupStatus.checks).filter(([, c]) => !c.ok).map(([key, check]) => (
              <div key={key} className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-semibold text-red-700">{check.label}</span>
                  <span className="text-xs text-red-400 ml-2">{check.hint}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Manage Products", icon: Package,     href: "/admin/products",     color: "text-[#F26B21]",   bg: "bg-orange-50 hover:bg-orange-100" },
            { label: "Manage Users",    icon: Users,       href: "/admin/users",        color: "text-blue-600",    bg: "bg-blue-50 hover:bg-blue-100" },
            { label: "Imports",         icon: ArrowDownToLine, href: "/admin/imports",  color: "text-amber-600",   bg: "bg-amber-50 hover:bg-amber-100" },
            { label: "View Payments",   icon: CreditCard,  href: "/admin/payments",     color: "text-emerald-600", bg: "bg-emerald-50 hover:bg-emerald-100" },
            { label: "Verification",    icon: ShieldCheck, href: "/admin/verification", color: "text-[#4A5CE8]",   bg: "bg-indigo-50 hover:bg-indigo-100" },
            { label: "Settings",        icon: Settings,    href: "/admin/settings",     color: "text-purple-600",  bg: "bg-purple-50 hover:bg-purple-100" },
          ].map(({ label, icon: Icon, href, color, bg }) => (
            <button key={href} onClick={() => setLocation(href)}
              className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-2 border border-transparent transition-colors text-center`}>
              <Icon className={`w-6 h-6 ${color}`} />
              <span className={`text-sm font-bold ${color}`}>{label}</span>
            </button>
          ))}
          <a href="/bazunk-demo-listings.xml" download="bazunk-demo-listings.xml"
            className="bg-gray-50 hover:bg-gray-100 rounded-2xl p-4 flex flex-col items-center gap-2 border border-transparent transition-colors text-center">
            <Download className="w-6 h-6 text-gray-500" />
            <span className="text-sm font-bold text-gray-500">Demo Listings XML</span>
          </a>
        </div>
      </div>

      {/* Recent payments */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900">Recent Payments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Email</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentPayments.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-8 text-sm">No payments yet</td></tr>
              )}
              {stats?.recentPayments.map((p) => (
                <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-5 py-3 text-gray-700 font-medium">{p.email}</td>
                  <td className="px-5 py-3 font-bold text-gray-900">£{p.amount.toFixed(2)}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                      {p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(p.date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, CircleAlert, Database, KeyRound, Radio, RefreshCw, Server, CreditCard, Cloud, Clock3 } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
type Item = { key:string; name:string; group:string; configured:boolean; status:"connected"|"error"|"not_configured"; message:string; latencyMs:number|null; lastSuccessfulCheck:string|null; checkedAt:string };
type Payload = { checkedAt:string; summary:{connected:number;errors:number;notConfigured:number;total:number}; integrations:Item[] };

const iconFor = (key:string) => key === "postgresql" ? Database : key === "clerk" ? KeyRound : key === "stripe" ? CreditCard : key === "livekit" ? Radio : key.startsWith("rapidapi") ? Cloud : Server;
const when = (v:string|null) => v ? new Date(v).toLocaleString() : "Never";

export function AdminSystemStatusPage() {
  const { token } = useAdmin();
  const [data,setData] = useState<Payload|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch(`${API}/api/admin/system-status`, { headers:{ Authorization:`Bearer ${token}` }, cache:"no-store" });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || j.message || "Status check failed"); setData(j);
    } catch(e:any) { setError(e?.message || "Status check failed"); } finally { setLoading(false); }
  };
  useEffect(()=>{ load(); },[]);
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Activity className="w-6 h-6 text-[#F26B21]"/>System Status</h1><p className="text-sm text-gray-500 mt-1">Live server-side checks for Bazunk's core services and integrations. No secret keys are exposed here.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1D2E] text-white text-sm font-semibold disabled:opacity-60"><RefreshCw className={`w-4 h-4 ${loading?"animate-spin":""}`}/>Run checks</button>
    </div>
    {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    {data && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Summary label="Connected" value={data.summary.connected} cls="text-emerald-700"/><Summary label="Errors" value={data.summary.errors} cls="text-red-700"/><Summary label="Not configured" value={data.summary.notConfigured} cls="text-amber-700"/><Summary label="Integrations" value={data.summary.total} cls="text-gray-900"/>
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.integrations.map(item => { const Icon=iconFor(item.key); const good=item.status==="connected"; const missing=item.status==="not_configured"; return <div key={item.key} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3"><div className="flex gap-3"><div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Icon className="w-5 h-5 text-gray-700"/></div><div><div className="font-bold text-gray-900">{item.name}</div><div className="text-xs text-gray-500">{item.group}</div></div></div><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${good?"bg-emerald-50 text-emerald-700":missing?"bg-amber-50 text-amber-700":"bg-red-50 text-red-700"}`}>{good?<CheckCircle2 className="w-3.5 h-3.5"/>:<CircleAlert className="w-3.5 h-3.5"/>}{good?"Connected":missing?"Not configured":"Error"}</span></div>
          <p className="text-sm text-gray-600 mt-4 min-h-10">{item.message}</p>
          <div className="border-t border-gray-100 mt-4 pt-3 space-y-1.5 text-xs text-gray-500"><div className="flex justify-between"><span>Last successful check</span><span className="font-medium text-gray-700">{when(item.lastSuccessfulCheck)}</span></div><div className="flex justify-between"><span>Response time</span><span className="font-medium text-gray-700">{item.latencyMs == null ? "—" : `${item.latencyMs} ms`}</span></div></div>
        </div>})}
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500"><Clock3 className="w-3.5 h-3.5"/>Last full check: {when(data.checkedAt)}. RapidAPI checks make a small real request to each importer API.</div>
    </>}
    {!data && loading && <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-500">Checking Bazunk services…</div>}
  </div>;
}
function Summary({label,value,cls}:{label:string;value:number;cls:string}) { return <div className="bg-white border border-gray-200 rounded-2xl p-4"><div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{label}</div><div className={`text-2xl font-bold mt-1 ${cls}`}>{value}</div></div> }

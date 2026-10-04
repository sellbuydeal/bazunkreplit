import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { Coins, ShoppingCart, Gift, ArrowDownCircle, PoundSterling, SlidersHorizontal, ShieldAlert, RefreshCw } from "lucide-react";

const API = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "";
const fmtCredits=(v:any)=>Math.round(Number(v||0)*100).toLocaleString();
const money=(v:any,c="GBP")=>new Intl.NumberFormat("en-GB",{style:"currency",currency:c||"GBP"}).format(Number(v||0));

export function AdminCreditsEconomyPage(){
  const { token }=useAdmin() as any;
  const [data,setData]=useState<any>(null); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
  const load=async()=>{setLoading(true);setError("");try{const r=await fetch(`${API}/api/admin/credits-economy?limit=150`,{headers:{Authorization:`Bearer ${token}`}});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`HTTP ${r.status}`);setData(await r.json())}catch(e:any){setError(e.message||"Could not load credit economy")}finally{setLoading(false)}};
  useEffect(()=>{if(token)load()},[token]);
  const s=data?.summary||{};
  const cards=useMemo(()=>[
    [Coins,"Credits in circulation",fmtCredits(s.circulation),"Current balances across all users"],
    [Gift,"Earned / free",fmtCredits(s.earned),"Rewards + referrals recorded in ledger"],
    [ShoppingCart,"Paid credits sold",fmtCredits(s.purchased),"Credits issued from real-money purchases"],
    [PoundSterling,"Credit sales revenue",money(s.cash_revenue),"Actual money recorded for credit purchases"],
    [ArrowDownCircle,"Credits spent",fmtCredits(s.spent),"Promotions, orders, video and other tracked spending"],
    [SlidersHorizontal,"Admin adjustments",fmtCredits(s.adjustments),"Net manual changes made by Admin"],
  ],[data]);
  return <AdminLayout><div className="max-w-7xl mx-auto space-y-5">
    <div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-black text-gray-900">Credits Economy & Revenue</h1><p className="text-sm text-gray-500 mt-1">Separate earned, purchased and spent credits while keeping a permanent audit trail.</p></div><button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-xl bg-[#1A1D2E] text-white px-4 py-2 text-sm font-bold"><RefreshCw className={`w-4 h-4 ${loading?'animate-spin':''}`}/>Refresh</button></div>
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 text-red-700 p-4">{error}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([I,t,v,d]:any)=><div key={t} className="bg-white border rounded-2xl p-5"><div className="flex items-center gap-2 text-gray-500 text-sm font-semibold"><I className="w-4 h-4"/>{t}</div><div className="text-3xl font-black mt-2 text-gray-900">{v}</div><p className="text-xs text-gray-400 mt-1">{d}</p></div>)}</div>
    <div className="grid xl:grid-cols-[1fr_320px] gap-5">
      <section className="bg-white border rounded-2xl overflow-hidden"><div className="p-5 border-b"><h2 className="font-black text-lg">Credit ledger</h2><p className="text-xs text-gray-500 mt-1">100 Bazunk credits = £1 of wallet value. Paid purchases retain their cash amount separately.</p></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-gray-500"><tr><th className="text-left p-3">User</th><th className="text-left p-3">Type</th><th className="text-right p-3">Credits</th><th className="text-right p-3">Cash</th><th className="text-left p-3">Reason</th><th className="text-left p-3">Date</th></tr></thead><tbody>{!data?.ledger?.length?<tr><td colSpan={6} className="p-8 text-center text-gray-400">No rich-ledger transactions yet. New activity will appear here.</td></tr>:data.ledger.map((x:any)=><tr key={x.id} className="border-t"><td className="p-3 font-medium">{x.email}</td><td className="p-3"><span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-bold capitalize">{String(x.kind).replaceAll('_',' ')}</span></td><td className={`p-3 text-right font-black ${Number(x.credits)>=0?'text-emerald-600':'text-red-600'}`}>{Number(x.credits)>=0?'+':''}{fmtCredits(x.credits)}</td><td className="p-3 text-right">{x.cash_amount!=null?money(x.cash_amount,x.currency||'GBP'):'—'}</td><td className="p-3 max-w-[260px] truncate">{x.reason||'—'}</td><td className="p-3 whitespace-nowrap text-gray-500">{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
      <aside className="space-y-4"><div className="bg-white border rounded-2xl p-5"><div className="flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500"/><h2 className="font-black">Fraud signals</h2></div><p className="text-xs text-gray-500 mt-1">Flags unusual referral, adjustment or rapid credit movement. Review required; flags do not prove fraud.</p><div className="mt-4 space-y-3">{!data?.suspicious?.length?<div className="rounded-xl bg-emerald-50 text-emerald-700 p-3 text-sm font-semibold">No current automatic flags.</div>:data.suspicious.map((x:any)=><div key={x.email} className="rounded-xl border border-amber-200 bg-amber-50 p-3"><b className="text-sm break-all">{x.email}</b><div className="text-xs text-amber-800 mt-1">Referrals 24h: {x.referral_24h} · Adjustments 7d: {x.adjustments_7d} · Movement 1h: {fmtCredits(x.movement_1h)} credits</div></div>)}</div></div>
      <div className="bg-[#1A1D2E] text-white rounded-2xl p-5"><h3 className="font-black">Historical data</h3><p className="text-xs text-white/60 mt-2">The richer ledger starts recording source/type details after this update. Existing balances remain unchanged. Bazunk also found <b className="text-white">{Number(s.legacyTransactions||0).toLocaleString()}</b> older credit transaction records; they are retained rather than guessed into paid/free categories.</p></div></aside>
    </div>
  </div></AdminLayout>
}

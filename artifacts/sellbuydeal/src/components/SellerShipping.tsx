import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@clerk/react";
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, Package, RotateCcw, Search, Truck } from "lucide-react";

type Shipment = {
 id:string; item_title:string; item_image?:string|null; status:string; buyer_email:string; address?:string|null;
 created_at:string; shipped_at?:string|null; delivered_at?:string|null; tracking_number?:string|null; carrier?:string|null;
 tracking_status?:string|null; tracking_last_event?:string|null; tracking_updated_at?:string|null; tracking_eta?:string|null;
 return_status?:string|null; label_status?:string|null; label_url?:string|null; label_amount_pence?:number|null; label_currency?:string|null; label_error?:string|null;
};
const API_BASE=(import.meta.env.VITE_API_URL||import.meta.env.VITE_API_BASE_URL||"https://bazunk-api.onrender.com").replace(/\/$/,"");
type Tab="all"|"action"|"labels"|"transit"|"delivered"|"returns"|"problems";
const returnOpen=(s:Shipment)=>!!s.return_status&&!["closed","declined","refund_issued","completed"].includes(String(s.return_status).toLowerCase());
const problem=(s:Shipment)=>s.label_status==="needs_review"||/exception|failure|failed|error|returned|undeliver/i.test(String(s.tracking_status||"")+" "+String(s.tracking_last_event||""));
const inTransit=(s:Shipment)=>["shipped","out_for_delivery"].includes(s.status)&&s.status!=="delivered";
export function SellerShipping(){
 const {session}=useSession(); const [rows,setRows]=useState<Shipment[]|null>(null); const [error,setError]=useState(""); const [tab,setTab]=useState<Tab>("all"); const [q,setQ]=useState("");
 const load=useCallback(async()=>{if(!session)return;setError("");try{const token=await session.getToken();const r=await fetch(API_BASE+"/api/shipping/seller",{headers:{Authorization:"Bearer "+token}});const d=await r.json().catch(()=>[]);if(!r.ok)throw new Error(d.error||"Could not load shipments");setRows(d);}catch(e:any){setError(e.message||"Could not load shipments");}},[session]);
 useEffect(()=>{void load();},[load]);
 const counts=useMemo(()=>{const a=rows||[];return{all:a.length,action:a.filter(s=>["pending","confirmed","preparing"].includes(s.status)&&!s.label_url).length,labels:a.filter(s=>!!s.label_url).length,transit:a.filter(inTransit).length,delivered:a.filter(s=>s.status==="delivered").length,returns:a.filter(returnOpen).length,problems:a.filter(problem).length}},[rows]);
 const filtered=useMemo(()=>{let a=rows||[];if(tab==="action")a=a.filter(s=>["pending","confirmed","preparing"].includes(s.status)&&!s.label_url);if(tab==="labels")a=a.filter(s=>!!s.label_url);if(tab==="transit")a=a.filter(inTransit);if(tab==="delivered")a=a.filter(s=>s.status==="delivered");if(tab==="returns")a=a.filter(returnOpen);if(tab==="problems")a=a.filter(problem);const z=q.trim().toLowerCase();return z?a.filter(s=>[s.id,s.item_title,s.buyer_email,s.tracking_number,s.carrier].some(v=>String(v||"").toLowerCase().includes(z))):a},[rows,tab,q]);
 const tabs:[Tab,string,number][]=[["all","All shipments",counts.all],["action","Needs action",counts.action],["labels","Labels bought",counts.labels],["transit","In transit",counts.transit],["delivered","Delivered",counts.delivered],["returns","Returns",counts.returns],["problems","Problems",counts.problems]];
 return <div className="space-y-5">
  <div><h2 className="text-xl font-black text-gray-900">Shipping Centre</h2><p className="text-sm text-gray-500 mt-1">Labels, dispatch, tracking, delivery and returns in one place.</p></div>
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
   {[[counts.action,"Needs action",Clock],[counts.labels,"Labels bought",Package],[counts.transit,"In transit",Truck],[counts.delivered,"Delivered",CheckCircle2]].map(([n,l,I]:any)=><div key={l} className="bg-white border border-gray-100 rounded-2xl p-4"><I className="w-5 h-5 text-[#4A5CE8] mb-3"/><p className="text-2xl font-black">{n}</p><p className="text-xs text-gray-500">{l}</p></div>)}
  </div>
  <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
   <div className="p-4 border-b flex flex-wrap gap-2 items-center justify-between"><div className="flex gap-1 flex-wrap">{tabs.map(([id,l,n])=><button key={id} onClick={()=>setTab(id)} className={`px-3 py-2 rounded-lg text-xs font-bold ${tab===id?"bg-[#1A1D2E] text-white":"bg-gray-50 text-gray-600"}`}>{l} <span className="opacity-70">{n}</span></button>)}</div><div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Order, item, tracking…" className="pl-9 pr-3 py-2 border rounded-xl text-sm"/></div></div>
   {error&&<div className="p-6 text-red-600 text-sm">{error}<button onClick={()=>void load()} className="ml-3 underline">Retry</button></div>}
   {!rows&&!error&&<div className="p-16 flex justify-center"><Loader2 className="animate-spin text-gray-300"/></div>}
   {rows&&filtered.length===0&&<div className="p-14 text-center text-gray-400"><Package className="w-8 h-8 mx-auto mb-2 text-gray-200"/><p>No shipments in this view.</p></div>}
   {filtered.map(s=><div key={s.id} className="p-4 border-t first:border-t-0 flex flex-wrap gap-4 items-center">
    <div className="w-12 h-12 rounded-xl border bg-gray-50 overflow-hidden flex items-center justify-center">{s.item_image?<img src={s.item_image} className="w-full h-full object-contain" alt=""/>:<Package className="text-gray-300"/>}</div>
    <div className="min-w-0 flex-1"><p className="font-bold text-sm truncate">{s.item_title}</p><p className="text-xs text-gray-400">Order {s.id} · {s.buyer_email}</p><p className="text-xs mt-1 text-gray-600">{s.carrier||"Carrier not set"}{s.tracking_number?" · "+s.tracking_number:" · No tracking yet"}</p>{s.tracking_last_event&&<p className="text-xs text-blue-600 mt-1">{s.tracking_last_event}</p>}</div>
    <div className="text-xs min-w-[150px]"><p className="font-bold capitalize">{s.return_status?"Return: "+s.return_status.replaceAll("_"," "):(s.tracking_status||s.status).replaceAll("_"," ")}</p>{s.tracking_eta&&<p className="text-gray-400 mt-1">ETA {new Date(s.tracking_eta).toLocaleDateString("en-GB")}</p>}{s.label_url&&<p className="text-emerald-600 mt-1">Label bought{s.label_amount_pence!=null?" · £"+(Number(s.label_amount_pence)/100).toFixed(2):""}</p>}{problem(s)&&<p className="text-red-600 mt-1 flex gap-1 items-center"><AlertTriangle className="w-3 h-3"/>Needs attention</p>}</div>
    <div className="flex gap-2">{s.label_url&&<a href={s.label_url} target="_blank" rel="noreferrer" className="px-3 py-2 rounded-lg border text-xs font-bold flex gap-1 items-center">Label <ExternalLink className="w-3 h-3"/></a>}{returnOpen(s)&&<span className="px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold flex gap-1 items-center"><RotateCcw className="w-3 h-3"/>Return active</span>}</div>
   </div>)}
  </div>
 </div>;
}

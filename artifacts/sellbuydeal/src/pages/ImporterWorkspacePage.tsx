import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { useAuth as useClerkAuth } from "@clerk/react";
import { ArrowLeft, ExternalLink, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { FreeEbayImporter } from "@/components/FreeEbayImporter";
import { UserAmazonImporterSection } from "@/components/UserAmazonImporterSection";
import { UserEbayImporterSection } from "@/components/UserEbayImporterSection";
import { ImporterSection } from "@/components/ImporterSection";

type Source="ebay"|"amazon"|"aliexpress";
const info:any={
 ebay:{name:"eBay",subtitle:"UK & USA",gradient:"from-blue-600 to-cyan-400",api:"https://rapidapi.com/mahmudulhasandev/api/real-time-ebay-data"},
 amazon:{name:"Amazon",subtitle:"Product importer",gradient:"from-orange-500 to-yellow-400",api:"https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data"},
 aliexpress:{name:"AliExpress",subtitle:"Global products",gradient:"from-rose-600 to-orange-400",api:"https://rapidapi.com/ecommdatahub/api/aliexpress-datahub"}
};
export function ImporterWorkspacePage(){
 const [,params]=useRoute("/importers/:source"); const source=(params?.source||"ebay") as Source; const cfg=info[source];
 const {user}=useAuth(); const {getToken}=useClerkAuth(); const [status,setStatus]=useState<any>(null); const [key,setKey]=useState(""); const [msg,setMsg]=useState(""); const [busy,setBusy]=useState(false); const [ebayMode,setEbayMode]=useState<"url"|"search">("url");
 const af=async(url:string,init:RequestInit={})=>{const t=await getToken();return fetch(url,{...init,headers:{"Content-Type":"application/json",...(init.headers||{}),...(t?{Authorization:`Bearer ${t}`}:{})}})};
 const load=async()=>{try{const r=await af("/api/user/rapidapi");if(r.ok)setStatus(await r.json())}catch{}}; useEffect(()=>{if(user)void load()},[user?.email]);
 if(!cfg)return <div className="max-w-4xl mx-auto px-4 py-16"><Link href="/importers" className="font-bold text-indigo-600">← Importer Hub</Link><h1 className="text-3xl font-black mt-6">Importer not found</h1></div>;
 if(!user)return <div className="max-w-4xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-black">Sign in to use {cfg.name}</h1></div>;
 const ready=status?.bazunk||status?.connected;
 const connect=async()=>{setBusy(true);setMsg("");try{const r=await af("/api/user/rapidapi",{method:"PUT",body:JSON.stringify({key})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not save key");setKey("");setMsg("RapidAPI key connected.");await load()}catch(e){setMsg(e instanceof Error?e.message:"Could not connect")}finally{setBusy(false)}};
 return <div className="min-h-screen bg-slate-50 dark:bg-slate-950"><div className="max-w-7xl mx-auto px-4 py-10">
  <Link href="/importers" className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-xl border bg-white text-slate-800 dark:bg-slate-900 dark:text-white font-bold text-sm"><ArrowLeft className="w-4 h-4"/>Importer Hub</Link>
  <div className={`rounded-[2rem] bg-gradient-to-r ${cfg.gradient} text-white p-7 md:p-9 mb-7 shadow-lg`}><p className="uppercase text-xs font-black tracking-widest text-white/75">{cfg.subtitle}</p><h1 className="text-4xl font-black mt-1">{cfg.name} Importer</h1><p className="mt-3 text-white/80 max-w-2xl">A dedicated workspace for previewing, pricing and importing {cfg.name} inventory into Bazunk.</p></div>
  {source==="ebay"&&<><div className="grid sm:grid-cols-2 gap-3 mb-6"><button onClick={()=>setEbayMode("url")} className={`rounded-2xl border-2 p-4 text-left ${ebayMode==="url"?"border-blue-500 bg-blue-50 dark:bg-blue-950/30":"bg-white dark:bg-slate-900"}`}><b>Import from eBay URL</b><p className="text-sm text-gray-500 mt-1">Paste individual listings or batches. No RapidAPI key required.</p></button><button onClick={()=>setEbayMode("search")} className={`rounded-2xl border-2 p-4 text-left ${ebayMode==="search"?"border-blue-500 bg-blue-50 dark:bg-blue-950/30":"bg-white dark:bg-slate-900"}`}><b>Search eBay</b><p className="text-sm text-gray-500 mt-1">Search inventory through your connected marketplace API.</p></button></div>{ebayMode==="url"?<FreeEbayImporter/>:<>{ready?<UserEbayImporterSection/>:<Connection/>}</>}</>}
  {source!=="ebay"&&(ready?(source==="amazon"?<UserAmazonImporterSection/>:<ImporterSection/>):<Connection/>)}
 </div></div>;
 function Connection(){return <div className="rounded-3xl border bg-white dark:bg-slate-900 p-6 shadow-sm"><div className="flex gap-3"><KeyRound className="w-6 h-6 text-indigo-600"/><div className="flex-1"><h2 className="text-xl font-black">Connect RapidAPI</h2>{status?.bazunk?<p className="mt-2 text-green-700"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Bazunk server credentials are connected.</p>:<><p className="text-sm text-gray-500 mt-1">Connect your RapidAPI key to use this search importer.</p><div className="flex flex-col sm:flex-row gap-2 mt-4"><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder={status?.masked||"Paste X-RapidAPI-Key"} className="flex-1 border rounded-xl px-3 py-2"/><button onClick={connect} disabled={!key||busy} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-black disabled:opacity-40">{busy?"Connecting…":"Connect"}</button></div></>}{msg&&<p className="text-sm mt-3">{msg}</p>}<a href={cfg.api} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 font-bold mt-4">Open required API <ExternalLink className="w-4 h-4"/></a>{!ready&&!status?.bazunk&&<p className="mt-3 text-xs text-gray-500"><AlertCircle className="inline w-3.5 h-3.5 mr-1"/>API provider plans and request charges are controlled by RapidAPI/provider.</p>}</div></div></div>}
}

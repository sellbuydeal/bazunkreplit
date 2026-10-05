import { useEffect, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { Link } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { UserAmazonImporterSection } from "@/components/UserAmazonImporterSection";
import { UserEbayImporterSection } from "@/components/UserEbayImporterSection";
import { ImporterSection } from "@/components/ImporterSection";
import { FreeEbayImporter } from "@/components/FreeEbayImporter";
import { KeyRound, CheckCircle2, AlertCircle, ExternalLink, PackageSearch, ArrowLeft } from "lucide-react";

type Tab="amazon"|"ebay"|"aliexpress";
const links={amazon:"https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data",ebay:"https://rapidapi.com/mahmudulhasandev/api/real-time-ebay-data",aliexpress:"https://rapidapi.com/ecommdatahub/api/aliexpress-datahub"};
export function ImportersPage(){
 const [mode,setMode]=useState<"free"|"rapid">("free"); const [statusError,setStatusError]=useState(""); const [connecting,setConnecting]=useState(false);
 const {user}=useAuth(); const {getToken}=useClerkAuth(); const [tab,setTab]=useState<Tab>("ebay"); const [status,setStatus]=useState<any>(null); const [key,setKey]=useState(""); const [msg,setMsg]=useState(""); const [testing,setTesting]=useState(false);
 const af=async(url:string,init:RequestInit={})=>{const t=await getToken();return fetch(url,{...init,headers:{"Content-Type":"application/json",...(init.headers||{}),...(t?{Authorization:`Bearer ${t}`}:{})}})};
 const load=async()=>{if(!user)return;setStatusError("");try{const r=await af('/api/user/rapidapi');if(!r.ok)throw new Error("Could not load your API connection.");setStatus(await r.json());}catch(e){setStatusError(e instanceof Error?e.message:"Could not load connection.")}}; useEffect(()=>{void load()},[user?.email]);
 const save=async()=>{setConnecting(true);setMsg("");try{const r=await af('/api/user/rapidapi',{method:'PUT',body:JSON.stringify({key})});const d=await r.json();if(!r.ok)throw new Error(d.error||'Could not save key');setMsg('RapidAPI key saved securely.');setKey('');await load();}catch(e){setMsg(e instanceof Error?e.message:'Could not save key')}finally{setConnecting(false)}};
 const test=async()=>{setTesting(true);setMsg('');try{const r=await af('/api/user/rapidapi/test',{method:'POST'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Test failed');setStatus((x:any)=>({...x,tests:d.results}));}catch(e){setMsg(e instanceof Error?e.message:'Test failed')}finally{setTesting(false)}};
 if(!user) return <div className="max-w-5xl mx-auto px-4 py-16 text-center"><h1 className="text-3xl font-black">Product Importers</h1><p className="mt-3 text-gray-500">Sign in to use marketplace importers.</p></div>;
 const ready=status?.bazunk || status?.connected;
 return <div className="max-w-7xl mx-auto px-4 py-10">
  <Link href="/" className="inline-flex items-center gap-2 mb-5 px-4 py-2 rounded-xl border bg-white text-sm font-bold text-gray-700 hover:text-[#4A5CE8] hover:border-[#4A5CE8]/40 transition-colors"><ArrowLeft className="w-4 h-4"/>Back to Home</Link>
  <div className="flex items-center gap-3 mb-2"><PackageSearch className="w-8 h-8 text-[#F26B21]"/><h1 className="text-3xl font-black">Product Importers</h1></div><p className="text-gray-500 mb-7">Bring your own inventory to Bazunk for free, or connect your own RapidAPI account for marketplace search and supported refresh tools.</p>
  <div className="grid md:grid-cols-2 gap-4 mb-6" role="group" aria-label="Choose import method">
    <button aria-pressed={mode==='free'} onClick={()=>setMode('free')} className={`text-left rounded-3xl p-6 border-2 ${mode==='free'?'border-emerald-500 bg-emerald-50':'border-gray-200 bg-white'}`}><span className="text-xs font-bold text-emerald-700 uppercase">Free · No RapidAPI key</span><h2 className="text-xl font-black mt-2">Import your own eBay listings</h2><p className="text-sm text-gray-500 mt-2">Unlimited CSV imports. Keep your own prices and manage inventory manually.</p></button>
    <button aria-pressed={mode==='rapid'} onClick={()=>setMode('rapid')} className={`text-left rounded-3xl p-6 border-2 ${mode==='rapid'?'border-[#4A5CE8] bg-blue-50':'border-gray-200 bg-white'}`}><span className="text-xs font-bold text-[#4A5CE8] uppercase">Your RapidAPI account</span><h2 className="text-xl font-black mt-2">Search & import products</h2><p className="text-sm text-gray-500 mt-2">Amazon, eBay and AliExpress search. Import items you can supply; use supported refresh controls.</p></button>
  </div>
  <div className="overflow-x-auto rounded-2xl border bg-white mb-7"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Feature</th><th className="p-3 text-left">Free eBay import</th><th className="p-3 text-left">RapidAPI import</th></tr></thead><tbody>{[['Source','Your own listing export','Marketplace search'],['Monthly allowance','Unlimited imports','Your API provider’s plan'],['API key','Not needed','Your own key'],['Updates','Manual updates','Supported refresh tools'],['API charges','None','Charged by your provider']].map(row=><tr key={row[0]} className="border-t">{row.map((value,i)=><td key={i} className="p-3">{value}</td>)}</tr>)}</tbody></table></div>
  {mode==='free'?<FreeEbayImporter/>:<>
  {statusError&&<div role="alert" className="mb-4 rounded-xl p-4 bg-red-50 text-red-700">{statusError} <button onClick={load} className="underline font-bold">Retry</button></div>}
  <div className="rounded-2xl border bg-white p-5 mb-7 shadow-sm">
   <div className="flex items-start gap-3"><KeyRound className="w-6 h-6 text-[#4A5CE8] mt-1"/><div className="flex-1"><h2 className="font-black text-lg">RapidAPI Connection</h2>
    {status?.bazunk ? <p className="text-sm mt-1 text-green-700"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Bazunk account — using Bazunk's configured server credentials.</p> : <><p className="text-sm text-gray-500 mt-1">Other sellers use their own RapidAPI account, so your searches and imports never use Bazunk's paid allowance.</p><div className="flex gap-2 mt-3"><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder={status?.masked||'Paste X-RapidAPI-Key'} className="flex-1 border rounded-xl px-3 py-2"/><button onClick={save} disabled={!key||connecting} className="px-4 py-2 rounded-xl bg-[#F26B21] text-white font-bold disabled:opacity-40">Connect</button>{status?.connected&&<button onClick={test} disabled={testing} className="px-4 py-2 rounded-xl border font-bold">{testing?'Testing…':'Test APIs'}</button>}</div></>}
    {msg&&<p className="text-sm mt-2">{msg}</p>}
    {status?.tests&&<div className="grid md:grid-cols-3 gap-2 mt-4">{(['amazon','ebay','aliexpress'] as const).map(n=><div className="border rounded-xl p-3" key={n}><div className="font-bold capitalize">{n}</div><div className={status.tests[n]?.ok?'text-green-700 text-sm':'text-red-600 text-sm'}>{status.tests[n]?.ok?'✓ Connected':`✕ ${status.tests[n]?.message}`}</div><a href={links[n]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex gap-1 mt-1">RapidAPI subscription <ExternalLink className="w-3 h-3"/></a></div>)}</div>}
   </div></div>
  </div>
  {!ready ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><AlertCircle className="inline w-5 h-5 mr-2"/>Connect your RapidAPI key above to unlock the importers.</div> : <><div className="flex gap-2 mb-6 flex-wrap">{(['amazon','ebay','aliexpress'] as Tab[]).map(x=><button key={x} onClick={()=>setTab(x)} className={`px-5 py-2.5 rounded-xl font-bold ${tab===x?'bg-[#1A1D2E] text-white':'bg-white border'}`}>{x==='ebay'?'eBay UK / USA':x==='amazon'?'Amazon':'AliExpress'}</button>)}</div>{tab==='amazon'&&<UserAmazonImporterSection/>}{tab==='ebay'&&<UserEbayImporterSection/>}{tab==='aliexpress'&&<ImporterSection/>}</>}
 </>}
 </div>
}

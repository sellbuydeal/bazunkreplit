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
 const [mode,setMode]=useState<"free"|"rapid">("free"); const [statusError,setStatusError]=useState(""); const [connecting,setConnecting]=useState(false); const [preview,setPreview]=useState(false);
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
    <button aria-pressed={mode==='free'} onClick={()=>setMode('free')} className={`text-left rounded-3xl p-6 border-2 ${mode==='free'?'border-emerald-500 bg-emerald-50':'border-gray-200 bg-white'}`}><span className="text-xs font-bold text-emerald-700 uppercase">Free · No RapidAPI key</span><h2 className="text-xl font-black mt-2">Import your own eBay listings</h2><p className="text-sm text-gray-500 mt-2">Single URLs, batches and public eBay pages with markup, shipping and automatic sync.</p></button>
    <button aria-pressed={mode==='rapid'} onClick={()=>setMode('rapid')} className={`text-left rounded-3xl p-6 border-2 ${mode==='rapid'?'border-[#4A5CE8] bg-blue-50':'border-gray-200 bg-white'}`}><span className="text-xs font-bold text-[#4A5CE8] uppercase">Your RapidAPI account</span><h2 className="text-xl font-black mt-2">Search & import products</h2><p className="text-sm text-gray-500 mt-2">Amazon, eBay and AliExpress search. Import items you can supply; use supported refresh controls.</p></button>
  </div>
  <div className="overflow-x-auto rounded-2xl border bg-white mb-7"><table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Feature</th><th className="p-3 text-left">Free eBay import</th><th className="p-3 text-left">RapidAPI import</th></tr></thead><tbody>{[['Source','eBay URL / public page','Marketplace search'],['Monthly allowance','No Bazunk request fee','Your API provider’s plan'],['API key','Not needed','Your own key'],['Updates','Automatic eBay re-check every 6 hours','Supported refresh tools'],['API charges','No RapidAPI charge','Charged by your provider']].map(row=><tr key={row[0]} className="border-t">{row.map((value,i)=><td key={i} className="p-3">{value}</td>)}</tr>)}</tbody></table></div>
  {mode==='free'?<FreeEbayImporter/>:<>
  {statusError&&<div role="alert" className="mb-4 rounded-xl p-4 bg-red-50 text-red-700">{statusError} <button onClick={load} className="underline font-bold">Retry</button></div>}
  <div className="rounded-2xl border bg-white p-5 mb-7 shadow-sm">
   <div className="flex items-start gap-3"><KeyRound className="w-6 h-6 text-[#4A5CE8] mt-1"/><div className="flex-1"><h2 className="font-black text-lg">RapidAPI Connection</h2>
    {status?.bazunk ? <p className="text-sm mt-1 text-green-700"><CheckCircle2 className="inline w-4 h-4 mr-1"/>Bazunk account — using Bazunk's configured server credentials.</p> : <><p className="text-sm text-gray-500 mt-1">RapidAPI offers a free request allowance on some plans, depending on the website and API you import from. Check the provider’s current allowance and any charges before subscribing.</p><div className="flex gap-2 mt-3"><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder={status?.masked||'Paste X-RapidAPI-Key'} className="flex-1 border rounded-xl px-3 py-2"/><button onClick={save} disabled={!key||connecting} className="px-4 py-2 rounded-xl bg-[#F26B21] text-white font-bold disabled:opacity-40">Connect</button>{status?.connected&&<button onClick={test} disabled={testing} className="px-4 py-2 rounded-xl border font-bold">{testing?'Testing…':'Test APIs'}</button>}</div></>}
    {msg&&<p className="text-sm mt-2">{msg}</p>}
    {status?.tests&&<div className="grid md:grid-cols-3 gap-2 mt-4">{(['amazon','ebay','aliexpress'] as const).map(n=><div className="border rounded-xl p-3" key={n}><div className="font-bold capitalize">{n}</div><div className={status.tests[n]?.ok?'text-green-700 text-sm':'text-red-600 text-sm'}>{status.tests[n]?.ok?'✓ Connected':`✕ ${status.tests[n]?.message}`}</div><a href={links[n]} target="_blank" rel="noreferrer" className="text-xs text-blue-600 inline-flex gap-1 mt-1">RapidAPI subscription <ExternalLink className="w-3 h-3"/></a></div>)}</div>}
   </div></div>
  </div>
  <div className="rounded-2xl border bg-white p-5 mb-6">
    <h2 className="text-lg font-black">Connect the APIs you want to use</h2>
    <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-gray-600">
      <li>Create or sign in to your RapidAPI account.</li>
      <li>Open the matching API below and subscribe to its plan. You only need subscriptions for the marketplaces you use; similar API names from other providers will not work with these importers.</li>
      <li>Copy the X-RapidAPI-Key from that API’s example request, using the same RapidAPI app/key for your selected subscriptions. Paste it above and click Connect.</li>
      <li>Click Test APIs to check access, then select your importer. Testing and searching can use your request allowance.</li>
    </ol>
    <div className="grid md:grid-cols-3 gap-3 mt-4">{(['amazon','ebay','aliexpress'] as Tab[]).map(n=><a key={n} href={links[n]} target="_blank" rel="noreferrer" className="block rounded-xl border p-4 hover:border-[#4A5CE8]"><b className="capitalize">{n==='ebay'?'eBay':n==='aliexpress'?'AliExpress':'Amazon'}</b><p className="text-sm text-gray-500 mt-1">{n==='aliexpress'?'AliExpress DataHub':n==='ebay'?'Real-Time eBay Data':'Real-Time Amazon Data'}</p><span className="text-xs text-blue-600 inline-flex items-center gap-1 mt-2">Open API & pricing <ExternalLink className="w-3 h-3"/></span></a>)}</div>
    <p className="text-xs text-gray-500 mt-3">Allowances are API requests, not necessarily products. Search pages, detail lookups and refreshes may each use requests. Review overage charges and monitor usage in RapidAPI.</p>
    <button onClick={()=>setPreview(!preview)} aria-expanded={preview} className="mt-4 rounded-xl bg-[#4A5CE8] text-white px-4 py-2 font-bold">{preview?'Hide importer preview':'Preview importers before connecting'}</button>
  </div>
  {preview&&<div className="rounded-3xl border border-blue-200 bg-blue-50 p-5 mb-6">
    <p className="text-xs uppercase font-bold text-blue-700">Layout preview · Example data · No API requests</p>
    <div className="flex gap-2 my-4 flex-wrap">{(['amazon','ebay','aliexpress'] as Tab[]).map(n=><button key={n} onClick={()=>setTab(n)} className={`rounded-xl px-4 py-2 font-bold ${tab===n?'bg-[#1A1D2E] text-white':'bg-white border'}`}>{n==='ebay'?'eBay UK / USA':n==='amazon'?'Amazon':'AliExpress'}</button>)}</div>
    <div className="rounded-2xl bg-white border p-5 space-y-4"><h3 className="text-xl font-black">{tab==='ebay'?'eBay':tab==='amazon'?'Amazon':'AliExpress'} importer</h3>
      <div className="flex flex-wrap gap-3"><input aria-label="Example search" disabled value="wireless headphones" className="flex-1 min-w-0 border rounded-xl p-3" readOnly/>{tab==='ebay'&&<span className="border rounded-xl p-3 text-sm">UK / USA</span>}<button disabled className="bg-orange-500 text-white rounded-xl px-5 py-3">Search</button></div>
      <div className="grid md:grid-cols-3 gap-3">{['Marketplace price','Markup','Shipping allowance'].map((label,i)=><div className="border rounded-xl p-3" key={label}><p className="text-xs text-gray-500">{label}</p><b>{['£25.00','20%','£3.00'][i]}</b></div>)}</div>
      <div className="border rounded-xl p-4 flex gap-4 items-center"><PackageSearch className="w-12 h-12 text-[#4A5CE8] shrink-0"/><div className="flex-1"><b>Example wireless headphones</b><p className="text-sm text-gray-500">Product details, source price and image appear here after a search.</p><p className="font-bold mt-1">Example Bazunk price: £33.00</p></div><input type="checkbox" checked disabled aria-label="Example selected product"/></div>
      <div className="grid sm:grid-cols-2 gap-3"><div className="border rounded-xl p-3 text-sm">Category: Electronics</div><div className="border rounded-xl p-3 text-sm">Subcategory: Headphones</div></div>
      <button disabled className="bg-[#4A5CE8] text-white rounded-xl px-5 py-3 font-bold opacity-60">Import selected products</button>
      <p className="text-xs text-gray-500">This illustrates the search, selection and pricing workflow. Exact controls vary by marketplace; connect your key to use the live importer below.</p>
    </div>
  </div>}
  {!ready ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><AlertCircle className="inline w-5 h-5 mr-2"/>Connect your RapidAPI key above to unlock the importers.</div> : <><div className="flex gap-2 mb-6 flex-wrap">{(['amazon','ebay','aliexpress'] as Tab[]).map(x=><button key={x} onClick={()=>setTab(x)} className={`px-5 py-2.5 rounded-xl font-bold ${tab===x?'bg-[#1A1D2E] text-white':'bg-white border'}`}>{x==='ebay'?'eBay UK / USA':x==='amazon'?'Amazon':'AliExpress'}</button>)}</div>{tab==='amazon'&&<UserAmazonImporterSection/>}{tab==='ebay'&&<UserEbayImporterSection/>}{tab==='aliexpress'&&<ImporterSection/>}</>}
 </>}
 </div>
}

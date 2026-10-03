import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@clerk/react";
import { CheckCircle2, ExternalLink, KeyRound, Loader2, Trash2, XCircle } from "lucide-react";

type Status={admin:boolean;configured:boolean;hint:string|null};
type Test={api:string;ok:boolean;status:number|null;message:string};
const APIs=[
 {name:"Amazon — Real-Time Amazon Data",url:"https://rapidapi.com/letscrape-6bRBa3QguO5/api/real-time-amazon-data"},
 {name:"eBay UK/USA — Real-Time eBay Data",url:"https://rapidapi.com/mahmudulhasandev/api/real-time-ebay-data"},
 {name:"AliExpress — AliExpress DataHub",url:"https://rapidapi.com/ecommdatahub/api/aliexpress-datahub"},
];
export function RapidApiSellerSetup({children}:{children:ReactNode}){
 const { getToken, isLoaded, isSignedIn } = useAuth();
 const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => { const token = await getToken(); const headers = new Headers(init.headers || {}); if (token) headers.set("Authorization", `Bearer ${token}`); return fetch(input, { ...init, headers }); };
 const [status,setStatus]=useState<Status|null>(null),[key,setKey]=useState(""),[tests,setTests]=useState<Test[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){const r=await authFetch("/api/user/rapidapi"); if(r.ok)setStatus(await r.json());}
 useEffect(()=>{ if(isLoaded && isSignedIn) load(); },[isLoaded,isSignedIn]);
 async function connect(){setBusy(true);setMsg("");const r=await authFetch("/api/user/rapidapi",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({key})});const d=await r.json().catch(()=>({}));if(r.ok){setKey("");setMsg("Key saved securely.");await load();await test();}else setMsg(d.error||"Could not save key");setBusy(false)}
 async function test(){setBusy(true);const r=await authFetch("/api/user/rapidapi/test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(key?{key}:{})});const d=await r.json().catch(()=>({}));setTests(d.results||[]);if(!r.ok)setMsg(d.error||"Test failed");setBusy(false)}
 async function remove(){if(!confirm("Remove your RapidAPI key? Your live import searches and supplier syncing will stop."))return;await authFetch("/api/user/rapidapi",{method:"DELETE"});setTests([]);await load()}
 if(isLoaded && !isSignedIn)return <div className="p-6 text-sm text-red-600">Sign in to use the importers.</div>;
 if(!status)return <div className="p-6 text-sm text-gray-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2"/>Checking importer access…</div>;
 if(status.admin)return <>{!status.configured&&<div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Bazunk Admin uses the server RapidAPI key. Add it in <b>Admin → Importers</b>.</div>}{children}</>;
 if(!status.configured)return <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-6">
   <div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center"><KeyRound className="w-5 h-5 text-[#4A5CE8]"/></div><div><h2 className="text-xl font-black text-gray-900">Connect RapidAPI to use Importers</h2><p className="text-sm text-gray-500 mt-1">Bazunk does not use the platform's paid API allowance for seller imports. Connect your own RapidAPI account and subscribe only to the importers you want.</p></div></div>
   <div className="mt-5 space-y-2">{APIs.map(a=><a key={a.url} href={a.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border p-3 text-sm font-semibold hover:bg-gray-50"><span>{a.name}</span><span className="text-[#4A5CE8] flex items-center gap-1">Subscribe <ExternalLink className="w-3.5 h-3.5"/></span></a>)}</div>
   <ol className="mt-5 text-sm text-gray-600 space-y-1 list-decimal pl-5"><li>Create/sign in to RapidAPI.</li><li>Open each importer above that you want and choose a subscription plan.</li><li>Copy your <b>X-RapidAPI-Key</b> from RapidAPI.</li><li>Paste it below. Bazunk encrypts it server-side and never displays the full key again.</li></ol>
   <div className="mt-5 flex gap-2"><input type="password" value={key} onChange={e=>setKey(e.target.value)} placeholder="Paste X-RapidAPI-Key" className="flex-1 border rounded-xl px-3 py-2.5"/><button onClick={connect} disabled={busy||key.trim().length<20} className="bg-[#F26B21] text-white rounded-xl px-5 font-bold disabled:opacity-50">{busy?"Connecting…":"Test & Connect"}</button></div>{msg&&<p className="text-sm mt-2 text-gray-600">{msg}</p>}
 </div>;
 return <><div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-wrap items-center gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-600"/><div className="flex-1"><p className="font-bold text-emerald-900">Your RapidAPI key is connected <span className="font-mono text-xs">{status.hint}</span></p><p className="text-xs text-emerald-700">Your searches/imports use your own RapidAPI account, not Bazunk's API allowance.</p></div><button onClick={test} disabled={busy} className="px-3 py-2 rounded-lg bg-white border text-sm font-bold">Test subscriptions</button><button onClick={remove} className="p-2 text-red-600" title="Remove key"><Trash2 className="w-4 h-4"/></button></div>{tests.length>0&&<div className="mb-5 grid md:grid-cols-3 gap-2">{tests.map(t=><div key={t.api} className="border rounded-xl p-3 text-xs"><div className="flex gap-1.5 font-bold">{t.ok?<CheckCircle2 className="w-4 h-4 text-emerald-600"/>:<XCircle className="w-4 h-4 text-red-500"/>}{t.api}</div><p className="mt-1 text-gray-500">{t.message}</p></div>)}</div>}{children}</>;
}

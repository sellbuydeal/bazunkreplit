import { useMemo, useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { CATEGORIES } from "@/data/categories";
import { CheckCircle2, ExternalLink, Link2, Loader2, Package, Percent, RefreshCw, Search, Truck } from "lucide-react";

type Item={itemId:string;url:string;title:string;price:number;currency:string;image:string|null;condition:string;description:string;shipping:number|null;shippingLabel:string|null;available:boolean;categoryPath:string[]};
const categories=CATEGORIES.filter(c=>c.slug!=="digital-products");
const money=(currency:string,n:number)=>new Intl.NumberFormat(undefined,{style:"currency",currency:currency||"GBP"}).format(n);

export function FreeEbayImporter(){
 const {getToken}=useClerkAuth(); const [mode,setMode]=useState<"urls"|"page">("urls"),[input,setInput]=useState(""),[items,setItems]=useState<Item[]>([]),[selected,setSelected]=useState<Set<string>>(new Set());
 const [category,setCategory]=useState(""),[sub,setSub]=useState(""),[markupType,setMarkupType]=useState<"percentage"|"fixed">("percentage"),[markup,setMarkup]=useState("25");
 const [shippingMode,setShippingMode]=useState("source"),[shippingExtra,setShippingExtra]=useState("0"),[fixedShipping,setFixedShipping]=useState("3.99"),[syncEnabled,setSyncEnabled]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState(""),[failures,setFailures]=useState<{input:string;error:string}[]>([]);
 const subs=category==="digital"?[...CATEGORIES.find(c=>c.slug==="digital")!.subcategories,...CATEGORIES.find(c=>c.slug==="digital-products")!.subcategories.filter(s=>!CATEGORIES.find(c=>c.slug==="digital")!.subcategories.some(t=>t.name===s.name))]:categories.find(c=>c.slug===category)?.subcategories??[];
 const urls=useMemo(()=>input.split(/\r?\n|,\s*/).map(x=>x.trim()).filter(Boolean),[input]);
 async function af(url:string,init:RequestInit={}){const token=await getToken();return fetch(url,{...init,headers:{"Content-Type":"application/json",...(init.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})}})}
 async function preview(){
  setBusy(true);setError("");setMessage("");setFailures([]);
  try{
   let list=urls;if(mode==="page"){if(urls.length!==1)throw new Error("Paste one eBay search, category or seller page URL.");const d=await af("/api/user/ebay-public/discover",{method:"POST",body:JSON.stringify({url:urls[0],limit:200})}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||"Could not discover listings.");return j});list=d.urls;if(!list.length)throw new Error("No public eBay item links were found on that page.");}
   if(!list.length)throw new Error("Paste at least one eBay item URL.");if(list.length>200)throw new Error("Import up to 200 URLs at a time.");
   const r=await af("/api/user/ebay-public/preview",{method:"POST",body:JSON.stringify({urls:list})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Could not read eBay listings.");
   setItems(d.items??[]);setFailures(d.errors??[]);setSelected(new Set((d.items??[]).map((x:Item)=>x.itemId)));setMessage(`Found ${d.items?.length??0} listing(s).`);
  }catch(e){setError(e instanceof Error?e.message:"Could not read eBay.")}finally{setBusy(false)}
 }
 function calc(i:Item){const m=Math.max(0,Number(markup)||0),product=markupType==="fixed"?i.price+m:i.price*(1+m/100),source=i.shipping??0,ship=shippingMode==="free"?0:shippingMode==="fixed"?Math.max(0,Number(fixedShipping)||0):shippingMode==="source_plus"?source+Math.max(0,Number(shippingExtra)||0):source;return{product:Math.round(product*100)/100,ship:Math.round(ship*100)/100}}
 async function publish(){
  if(!category||!selected.size)return;setBusy(true);setError("");setMessage("");
  try{const chosen=items.filter(i=>selected.has(i.itemId));const r=await af("/api/user/ebay-public/import",{method:"POST",body:JSON.stringify({items:chosen,category,subcategory:sub,markupType,markupValue:Number(markup)||0,shippingMode,shippingExtra:Number(shippingExtra)||0,fixedShipping:Number(fixedShipping)||0,syncEnabled})}),d=await r.json();if(!r.ok)throw new Error(d.error||"Import failed.");setMessage(d.message||"Listings imported.");setSelected(new Set())}catch(e){setError(e instanceof Error?e.message:"Import failed.")}finally{setBusy(false)}
 }
 return <section className="rounded-3xl border border-emerald-200 bg-white p-5 md:p-7 shadow-sm space-y-5">
  <div><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Bazunk eBay Import & Sync · No RapidAPI key</span><h2 className="text-2xl font-black mt-2">Import eBay listings by URL</h2><p className="text-gray-500 mt-2">Paste one item, a batch of item URLs, or a public eBay search/category/seller page. Bazunk reads available public listing data, imports it and can re-check it every six hours.</p></div>
  <div className="flex gap-2"><button onClick={()=>setMode("urls")} className={`px-4 py-2 rounded-xl font-bold border ${mode==="urls"?"bg-emerald-600 text-white":"bg-white"}`}><Link2 className="inline w-4 h-4 mr-1"/>Single / batch URLs</button><button onClick={()=>setMode("page")} className={`px-4 py-2 rounded-xl font-bold border ${mode==="page"?"bg-emerald-600 text-white":"bg-white"}`}><Search className="inline w-4 h-4 mr-1"/>eBay page</button></div>
  <textarea rows={mode==="urls"?6:2} value={input} onChange={e=>setInput(e.target.value)} placeholder={mode==="urls"?"Paste one eBay item URL per line…":"Paste an eBay search, category or seller page URL…"} className="w-full border rounded-2xl p-4 font-mono text-sm"/>
  <button onClick={preview} disabled={busy||!input.trim()} className="bg-[#4A5CE8] text-white px-5 py-3 rounded-xl font-bold disabled:opacity-40">{busy?<Loader2 className="inline w-4 h-4 animate-spin mr-2"/>:<Search className="inline w-4 h-4 mr-2"/>}{mode==="page"?"Discover & preview":"Preview listings"}</button>
  {error&&<p className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</p>}{message&&<p className="bg-emerald-50 text-emerald-800 p-4 rounded-xl"><CheckCircle2 className="inline w-4 h-4 mr-2"/>{message}</p>}
  {failures.length>0&&<details className="bg-amber-50 p-4 rounded-xl text-sm"><summary className="font-bold cursor-pointer">{failures.length} URL(s) could not be read</summary>{failures.map((x,i)=><p key={i} className="mt-2 break-all">{x.input} — {x.error}</p>)}</details>}
  {items.length>0&&<>
   <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
    <label className="text-sm font-bold">Category<select value={category} onChange={e=>{setCategory(e.target.value);setSub("")}} className="block w-full border rounded-xl p-2 mt-1 bg-white text-gray-900"><option value="">Choose…</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.slug==="digital"?"Digital Products":c.name}</option>)}</select></label>
    <label className="text-sm font-bold">Subcategory<select value={sub} onChange={e=>setSub(e.target.value)} disabled={!category} className="block w-full border rounded-xl p-2 mt-1 bg-white text-gray-900"><option value="">None</option>{subs.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label>
    <label className="text-sm font-bold">Markup<select value={markupType} onChange={e=>setMarkupType(e.target.value as any)} className="block w-full border rounded-xl p-2 mt-1 bg-white"><option value="percentage">Percentage %</option><option value="fixed">Fixed amount</option></select></label>
    <label className="text-sm font-bold">{markupType==="percentage"?"Markup %":"Markup amount"}<div className="relative"><Percent className="absolute left-2 top-3 w-4 h-4 text-gray-400"/><input type="number" min="0" step="0.01" value={markup} onChange={e=>setMarkup(e.target.value)} className="block w-full border rounded-xl p-2 pl-8 mt-1"/></div></label>
   </div>
   <div className="grid md:grid-cols-3 gap-3">
    <label className="text-sm font-bold">Shipping mode<select value={shippingMode} onChange={e=>setShippingMode(e.target.value)} className="block w-full border rounded-xl p-2 mt-1 bg-white"><option value="source">Use detected eBay shipping</option><option value="source_plus">eBay shipping + extra</option><option value="fixed">My fixed shipping</option><option value="free">Free shipping</option></select></label>
    {shippingMode==="source_plus"&&<label className="text-sm font-bold">Extra shipping<input type="number" min="0" step="0.01" value={shippingExtra} onChange={e=>setShippingExtra(e.target.value)} className="block w-full border rounded-xl p-2 mt-1"/></label>}
    {shippingMode==="fixed"&&<label className="text-sm font-bold">Fixed shipping<input type="number" min="0" step="0.01" value={fixedShipping} onChange={e=>setFixedShipping(e.target.value)} className="block w-full border rounded-xl p-2 mt-1"/></label>}
    <label className="flex items-center gap-2 text-sm font-bold mt-6"><input type="checkbox" checked={syncEnabled} onChange={e=>setSyncEnabled(e.target.checked)}/><RefreshCw className="w-4 h-4"/>Auto-sync price, availability, image & shipping every 6 hours</label>
   </div>
   <div className="flex justify-between text-sm"><b>{selected.size} of {items.length} selected</b><button className="underline" onClick={()=>setSelected(selected.size===items.length?new Set():new Set(items.map(i=>i.itemId)))}>{selected.size===items.length?"Deselect all":"Select all"}</button></div>
   <div className="max-h-[32rem] overflow-auto border rounded-xl divide-y">{items.map(i=>{const p=calc(i);return <label key={i.itemId} className="p-3 flex gap-3 items-center cursor-pointer"><input type="checkbox" checked={selected.has(i.itemId)} onChange={()=>setSelected(s=>{const n=new Set(s);n.has(i.itemId)?n.delete(i.itemId):n.add(i.itemId);return n})}/>{i.image?<img src={i.image} onError={e=>{e.currentTarget.style.display="none"}} className="w-16 h-16 object-contain bg-gray-50 rounded-lg" alt=""/>:<div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center"><Package className="text-gray-300"/></div>}<div className="min-w-0 flex-1"><b className="line-clamp-1">{i.title}</b><p className="text-xs text-gray-500">eBay {money(i.currency,i.price)} · Shipping {i.shipping==null?"not detected":money(i.currency,i.shipping)} · {i.available?"Available":"Unavailable"}</p>{i.categoryPath?.length>0&&<p className="text-xs text-gray-400 truncate">{i.categoryPath.join(" › ")}</p>}<a href={i.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600" onClick={e=>e.stopPropagation()}>Original eBay listing <ExternalLink className="inline w-3 h-3"/></a></div><div className="text-right text-xs"><p>Product <b>{money(i.currency,p.product)}</b></p><p><Truck className="inline w-3 h-3"/> {money(i.currency,p.ship)}</p></div></label>})}</div>
   <button onClick={publish} disabled={busy||!category||!selected.size} className="bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold disabled:opacity-40">{busy?"Importing…":`Import ${selected.size} selected & ${syncEnabled?"enable sync":"keep manual"}`}</button>
  </>}
  <p className="text-xs text-gray-500">Public eBay retrieval is best-effort and respects access restrictions. If eBay cannot be read during a sync, Bazunk keeps the last known price rather than overwriting it. Automatic updates run while your Bazunk service is online.</p>
 </section>
}
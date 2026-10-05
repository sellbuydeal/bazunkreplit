import { useState } from "react";
import { useAuth as useClerkAuth } from "@clerk/react";
import { CATEGORIES } from "@/data/categories";
import { parseEbayCsv, type EbayOwnItem } from "@/lib/ebayCsv";
import { Upload, Download, CheckCircle2 } from "lucide-react";

const categories = CATEGORIES.filter(c => c.slug !== "digital-products");
export function FreeEbayImporter() {
  const { getToken } = useClerkAuth();
  const [items, setItems] = useState<EbayOwnItem[]>([]), [selected, setSelected] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState(""), [sub, setSub] = useState(""), [owns, setOwns] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState(""), [progress, setProgress] = useState("");
  function template() {
    const blob = new Blob(['Item number,Title,Current price,Currency,Available quantity,Description,Image URL,Condition\n123456789012,Example item,12.50,GBP,1,Replace this example with your own listing,,used\n'], { type: "text/csv" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "bazunk-ebay-own-listings-template.csv"; a.click(); URL.revokeObjectURL(url);
  }
  async function read(file?: File) {
    if (!file) return; setError(""); setMessage(""); setItems([]); setSelected(new Set()); setOwns(false);
    try { if (file.size > 5 * 1024 * 1024) throw new Error("Use files under 5 MB. You can import as many files as you need."); const rows = parseEbayCsv(await file.text()); setItems(rows); setSelected(new Set(rows.map((_, i) => i))); }
    catch(e) { setError(e instanceof Error ? e.message : "Could not read this CSV."); }
  }
  async function publish() {
    if(busy || !category || !owns || !selected.size) return;
    setBusy(true); setError(""); setMessage(""); let imported=0, skipped=0;
    const indexes = [...selected];
    try {
      const token = await getToken(); if(!token) throw new Error("Sign in again to import your listings.");
      for(let offset=0; offset<indexes.length; offset+=50) {
        const batch = indexes.slice(offset, offset+50); setProgress(`Processing ${Math.min(offset+50,indexes.length)} of ${indexes.length} listings…`);
        const r = await fetch("/api/user/import-ebay-own", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ products: batch.map(i=>items[i]), category, subcategory: sub, ownsItems: owns }) });
        const d = await r.json().catch(()=>null);
        if(!r.ok || !d || !Number.isInteger(d.imported) || !Number.isInteger(d.skipped)) throw new Error(d?.error || "Could not import this batch. Retry; existing imports are skipped.");
        imported+=d.imported; skipped+=d.skipped;
        setSelected(prev=>{const next=new Set(prev);batch.forEach(i=>next.delete(i));return next});
      }
      setMessage(`${imported} listings published. ${skipped} existing listings skipped. Manage prices, photos and stock in My Listings.`);
    } catch(e) { setError(`${e instanceof Error ? e.message : "Import failed."}${imported ? ` ${imported} listings were already published.` : ""}`); }
    finally { setBusy(false); setProgress(""); }
  }
  const subs = category === "digital" ? [...CATEGORIES.find(c=>c.slug==="digital")!.subcategories,...CATEGORIES.find(c=>c.slug==="digital-products")!.subcategories.filter(s=>!CATEGORIES.find(c=>c.slug==="digital")!.subcategories.some(t=>t.name===s.name))] : categories.find(c=>c.slug===category)?.subcategories ?? [];
  return <section className="rounded-3xl border border-emerald-200 bg-white p-5 md:p-7 shadow-sm space-y-5">
    <div><span className="text-xs font-bold uppercase tracking-wide text-emerald-700">Free · Unlimited imports · No API key</span><h2 className="text-2xl font-black mt-2">Bring your own eBay listings to Bazunk</h2><p className="text-gray-500 mt-2">Upload your active-listings CSV export, review it, then publish the items you own. Prices are copied as supplied; there is no markup or automatic refresh.</p></div>
    <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">Export your active listings from eBay or use our CSV template. Required columns: Item number, Title and Current price. Optional: Currency, Available quantity, Description, Image URL and Condition. Sold-out rows must be removed. Missing images can be added after import.</div>
    <div className="flex flex-wrap gap-3"><button onClick={template} disabled={busy} className="border rounded-xl px-4 py-3 font-bold inline-flex gap-2 items-center"><Download className="w-4 h-4"/>Download template</button><label className={`bg-emerald-600 text-white rounded-xl px-4 py-3 font-bold inline-flex gap-2 items-center ${busy?'opacity-50':'cursor-pointer'}`}><Upload className="w-4 h-4"/>Upload eBay CSV<input type="file" accept=".csv,text/csv" className="sr-only" disabled={busy} onChange={e=>{void read(e.target.files?.[0]);e.target.value=""}}/></label></div>
    {error&&<p role="alert" className="bg-red-50 text-red-700 p-4 rounded-xl">{error}</p>}{message&&<p role="status" className="bg-emerald-50 text-emerald-800 p-4 rounded-xl"><CheckCircle2 className="inline w-4 h-4 mr-2"/>{message}</p>}
    {items.length>0&&<><div className="grid sm:grid-cols-2 gap-4"><label className="font-bold text-sm">Bazunk category<select disabled={busy} className="block w-full border rounded-xl p-3 mt-1" value={category} onChange={e=>{setCategory(e.target.value);setSub("")}}><option value="">Choose category</option>{categories.map(c=><option key={c.slug} value={c.slug}>{c.slug==="digital"?"Digital Products":c.name}</option>)}</select></label><label className="font-bold text-sm">Subcategory<select disabled={busy||!category} className="block w-full border rounded-xl p-3 mt-1" value={sub} onChange={e=>setSub(e.target.value)}><option value="">No subcategory</option>{subs.map(s=><option key={s.slug} value={s.slug}>{s.name}</option>)}</select></label></div><p className="text-sm text-gray-500">The selected category applies to this batch. Import separate batches for different categories.</p>
    <div className="flex justify-between text-sm"><b>{selected.size} of {items.length} selected</b><button disabled={busy} onClick={()=>setSelected(selected.size===items.length?new Set():new Set(items.map((_,i)=>i)))} className="underline">{selected.size===items.length?'Deselect all':'Select all'}</button></div>
    <div className="max-h-80 overflow-auto border rounded-xl"><table className="w-full text-sm"><thead className="bg-gray-50 sticky top-0"><tr>{['Select','Item','Price','Stock'].map(x=><th className="p-3 text-left" key={x}>{x}</th>)}</tr></thead><tbody>{items.map((item,i)=><tr key={i} className="border-t"><td className="p-3"><input aria-label={`Select ${item.title}`} type="checkbox" disabled={busy} checked={selected.has(i)} onChange={()=>setSelected(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n})}/></td><td className="p-3"><b>{item.title}</b><p className="text-xs text-gray-500">eBay #{item.itemId} · {item.condition}{!item.image?' · No image':''}</p></td><td className="p-3 whitespace-nowrap">{item.currency} {item.price.toFixed(2)}</td><td className="p-3">{item.quantity}</td></tr>)}</tbody></table></div>
    <label className="flex gap-3 text-sm"><input disabled={busy} type="checkbox" checked={owns} onChange={e=>setOwns(e.target.checked)}/><span>I own these listings and inventory, have the right to use their photos and descriptions, and will update availability on both sites when an item sells.</span></label>
    <button disabled={busy||!owns||!category||!selected.size} onClick={publish} className="bg-emerald-600 text-white rounded-xl px-6 py-3 font-bold disabled:opacity-40">{busy?'Importing…':`Publish ${selected.size} selected listings`}</button>{progress&&<p role="status" className="text-sm text-gray-500">{progress}</p>}</>}
    <p className="text-xs text-gray-500">No monthly import limit. Files are processed in small batches. This is a one-time copy: changes and sales on eBay do not update Bazunk. Standard marketplace selling fees still apply.</p>
  </section>;
}

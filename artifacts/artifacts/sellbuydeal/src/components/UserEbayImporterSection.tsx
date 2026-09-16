import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Package, Star, ExternalLink,
  CheckCircle2, AlertCircle, Percent, Truck, ChevronLeft,
  ChevronRight, CheckSquare, Square, ArrowDownToLine, RefreshCw,
  Globe,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES as SITE_CATEGORIES } from "@/data/categories";

type EbaySite = "uk" | "us";

interface SearchResult {
  item_id: string;
  title: string;
  price: number;
  currency: "GBP" | "USD";
  image: string | null;
  rating: string;
  condition: string;
  ebay_url: string;
  country?: string;
  seller_username?: string;
  seller_feedback?: string;
  categories?: string[];
  shipping_label?: string | null;
  shipping_type?: string;
  original_price?: string | null;
  discount_pct?: string | null;
  buying_options?: string[];
  item_location?: string | null;
}

interface MyImport {
  id: number;
  public_id: string;
  title: string;
  price: string;
  currency: string;
  image: string | null;
  category: string;
  specifications: string;
  status: string;
  created_at: string;
}

function parseSpecs(raw: string): { ebay_price?: number; markup_pct?: number; shipping?: number; ebay_currency?: string; ebay_site?: string } {
  try { return JSON.parse(raw); } catch { return {}; }
}

const inputCls = "px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-white";

export function UserEbayImporterSection() {
  const { user } = useAuth();

  const [site, setSite] = useState<EbaySite>("uk");
  const [query, setQuery]             = useState("");
  const [page, setPage]               = useState(1);
  const [searching, setSearching]     = useState(false);
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [searchErr, setSearchErr]     = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [markup, setMarkup]         = useState("35");
  const [shipping, setShipping]     = useState("3.99");
  const [importCat, setImportCat]   = useState(SITE_CATEGORIES[0].slug);
  const [importSub, setImportSub]   = useState(SITE_CATEGORIES[0].subcategories[0]?.slug ?? "");
  const [importing, setImporting]   = useState(false);
  const [importMsg, setImportMsg]   = useState<{ ok: boolean; text: string } | null>(null);

  const [myImports, setMyImports]           = useState<MyImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  useEffect(() => {
    const cat = SITE_CATEGORIES.find(c => c.slug === importCat);
    setImportSub(cat?.subcategories[0]?.slug ?? "");
  }, [importCat]);

  const siteSymbol = site === "uk" ? "£" : "$";

  const loadMyImports = useCallback(async () => {
    if (!user?.email) return;
    setLoadingImports(true);
    try {
      const r = await fetch(`/api/listings?seller_email=${encodeURIComponent(user.email)}&limit=40&offset=0`);
      if (r.ok) {
        const d = await r.json() as { listings?: MyImport[] } | MyImport[];
        const list = Array.isArray(d) ? d : (d.listings ?? []);
        setMyImports(list.filter(l => {
          try { const s = JSON.parse(l.specifications ?? "{}"); return s.source === "eBay UK" || s.source === "eBay US"; }
          catch { return false; }
        }));
      }
    } finally {
      setLoadingImports(false);
    }
  }, [user?.email]);

  useEffect(() => { loadMyImports(); }, [loadMyImports]);

  async function doSearch(q: string, currentSite: EbaySite, currentPage: number) {
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    setSelected(new Set());
    setImportMsg(null);
    try {
      const r = await fetch(`/api/user/search-ebay?q=${encodeURIComponent(q)}&site=${currentSite}&page=${currentPage}`);
      const d = await r.json() as { products?: SearchResult[]; error?: string };
      if (!r.ok) { setSearchErr(d.error ?? "Search failed"); setResults([]); }
      else { setResults(d.products ?? []); setHasSearched(true); }
    } catch {
      setSearchErr("Network error — check your connection");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    setPage(1);
    doSearch(q, site, 1);
  }

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === results.length ? new Set() : new Set(results.map(p => p.item_id)));
  }

  async function handleImport() {
    if (!user?.email) return;
    const products = results.filter(p => selected.has(p.item_id));
    if (!products.length) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await fetch("/api/user/import-ebay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          site,
          markup:      parseFloat(markup)   || 35,
          shipping:    parseFloat(shipping) || 3.99,
          category:    importCat,
          subcategory: importSub,
          sellerEmail: user.email,
        }),
      });
      const d = await r.json() as { imported?: number; message?: string; error?: string };
      if (r.ok) {
        setImportMsg({ ok: true, text: d.message ?? `Imported ${d.imported} products` });
        setSelected(new Set());
        loadMyImports();
      } else {
        setImportMsg({ ok: false, text: d.error ?? "Import failed" });
      }
    } catch {
      setImportMsg({ ok: false, text: "Network error — try again" });
    } finally {
      setImporting(false);
    }
  }

  const allSelected = results.length > 0 && selected.size === results.length;
  const subs = SITE_CATEGORIES.find(c => c.slug === importCat)?.subcategories ?? [];

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-black text-gray-900">eBay Importer</h2>
        <p className="text-sm text-gray-400 mt-0.5">Search eBay, pick listings, set your markup and list them in your store</p>
      </div>

      {/* Site toggle */}
      <div className="flex items-center gap-3">
        <Globe className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
          {(["uk", "us"] as EbaySite[]).map(s => (
            <button key={s} onClick={() => { setSite(s); setResults([]); setHasSearched(false); setSelected(new Set()); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                site === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {s === "uk" ? "🇬🇧 eBay.co.uk (£)" : "🇺🇸 eBay.com ($)"}
            </button>
          ))}
        </div>
      </div>

      {/* Search card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={`Search ${site === "uk" ? "eBay.co.uk" : "eBay.com"}…`}
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button type="submit" disabled={searching || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:bg-[#3a4cd8] transition-colors disabled:opacity-50 flex items-center gap-2">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {searching ? "Searching…" : "Search"}
            </button>
          </form>

          {searchErr && (
            <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {searchErr}
            </div>
          )}
        </div>

        {!hasSearched && !searching && (
          <div className="py-16 text-center text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Search {site === "uk" ? "eBay.co.uk" : "eBay.com"} above to see results</p>
          </div>
        )}

        {hasSearched && !searching && results.length === 0 && !searchErr && (
          <div className="py-16 text-center text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-semibold text-gray-600">No results found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={toggleAll}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                  {allSelected ? <CheckSquare className="w-4 h-4 text-[#4A5CE8]" /> : <Square className="w-4 h-4" />}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                {selected.size > 0 && (
                  <span className="text-xs font-bold text-[#4A5CE8] bg-indigo-50 px-2 py-0.5 rounded-full">
                    {selected.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select value={importCat} onChange={e => setImportCat(e.target.value)}
                  className={inputCls + " py-1.5 text-xs max-w-[130px]"}>
                  {SITE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                </select>
                {subs.length > 0 && (
                  <select value={importSub} onChange={e => setImportSub(e.target.value)}
                    className={inputCls + " py-1.5 text-xs max-w-[140px]"}>
                    <option value="">— subcategory —</option>
                    {subs.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                )}
                <div className="flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-gray-400" />
                  <input type="number" min="0" step="1" value={markup} onChange={e => setMarkup(e.target.value)}
                    className={inputCls + " w-20 py-1.5 text-xs"} placeholder="35%" />
                </div>
                <div className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-gray-400" />
                  <input type="number" min="0" step="0.01" value={shipping} onChange={e => setShipping(e.target.value)}
                    className={inputCls + " w-20 py-1.5 text-xs"} placeholder={`${siteSymbol}3.99`} />
                </div>
                <button onClick={handleImport} disabled={importing || selected.size === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:bg-[#3a4cd8] transition-colors disabled:opacity-50">
                  {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                  {importing ? "Importing…" : `Import${selected.size > 0 ? ` (${selected.size})` : ""}`}
                </button>
              </div>
            </div>

            {importMsg && (
              <div className={`mx-5 mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                importMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}>
                {importMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                {importMsg.text}
              </div>
            )}

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map(p => {
                const isSel = selected.has(p.item_id);
                const preview = markup && shipping
                  ? Math.round((p.price * (1 + parseFloat(markup) / 100) + parseFloat(shipping)) * 100) / 100
                  : null;
                return (
                  <button key={p.item_id} onClick={() => toggleSelect(p.item_id)}
                    className={`relative text-left rounded-xl border-2 transition-all p-3 flex flex-col gap-2 ${
                      isSel ? "border-[#4A5CE8] bg-indigo-50/50" : "border-gray-100 bg-white hover:border-gray-300"
                    }`}>
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSel ? "bg-[#4A5CE8]" : "bg-gray-100"
                    }`}>
                      {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    {p.image
                      ? <img src={p.image} alt="" className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                      : <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
                    }
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.title}</p>
                    {(p.rating || p.condition) && (
                      <div className="flex items-center gap-2">
                        {p.rating && (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-500">{p.rating}</span>
                          </div>
                        )}
                        {p.condition && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{p.condition}</span>}
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">eBay: <span className="font-bold text-gray-700">{p.currency === "GBP" ? "£" : "$"}{p.price.toFixed(2)}</span></span>
                      {preview !== null && <span className="text-xs font-black text-[#4A5CE8]">{p.currency === "GBP" ? "£" : "$"}{preview.toFixed(2)}</span>}
                    </div>
                    <a href={p.ebay_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 w-fit">
                      {p.item_id} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </button>
                );
              })}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{results.length} results on this page</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { const n = Math.max(1, page - 1); if (n !== page) { setPage(n); doSearch(query.trim(), site, n); } }} disabled={page === 1 || searching}
                  className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <span className="text-xs text-gray-500">Page {page}</span>
                <button onClick={() => { const n = page + 1; setPage(n); doSearch(query.trim(), site, n); }} disabled={searching || results.length < 5}
                  className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* My eBay imports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">My eBay Imports</p>
            <p className="text-xs text-gray-400 mt-0.5">Products you've imported from eBay</p>
          </div>
          <button onClick={loadMyImports} disabled={loadingImports}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40">
            <RefreshCw className={`w-3.5 h-3.5 ${loadingImports ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loadingImports ? (
          <div className="py-10 text-center"><Loader2 className="w-5 h-5 text-gray-300 animate-spin mx-auto" /></div>
        ) : myImports.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No eBay imports yet — search and import listings above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myImports.map(item => {
              const specs = parseSpecs(item.specifications ?? "{}");
              const sym = specs.ebay_currency === "USD" ? "$" : "£";
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  {item.image
                    ? <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-gray-300" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {specs.ebay_price ? `eBay ${sym}${Number(specs.ebay_price).toFixed(2)} · ` : ""}
                      Your price: <span className="font-bold text-[#4A5CE8]">{sym}{parseFloat(item.price).toFixed(2)}</span>
                      {specs.markup_pct ? ` · ${specs.markup_pct}% markup` : ""}
                      {specs.ebay_site ? ` · ${specs.ebay_site === "uk" ? "eBay UK" : "eBay US"}` : ""}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    item.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

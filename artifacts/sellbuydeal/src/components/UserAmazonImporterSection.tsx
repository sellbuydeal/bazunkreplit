import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Loader2, Package, Star, ExternalLink,
  CheckCircle2, AlertCircle, Percent, Truck, ChevronLeft,
  ChevronRight, CheckSquare, Square, ArrowDownToLine, RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES as SITE_CATEGORIES } from "@/data/categories";

interface SearchResult {
  asin: string;
  title: string;
  price_gbp: number;
  image: string | null;
  rating: string;
  amazon_url: string;
}

interface MyImport {
  id: number;
  public_id: string;
  title: string;
  price: string;
  image: string | null;
  category: string;
  specifications: string;
  status: string;
  created_at: string;
}

function parseSpecs(raw: string): { amazon_price_gbp?: number; markup_pct?: number; shipping_gbp?: number } {
  try { return JSON.parse(raw); } catch { return {}; }
}

const inputCls = "px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white";

export function UserAmazonImporterSection() {
  const { user } = useAuth();

  // ── Search state ──────────────────────────────────────────────
  const [query, setQuery]           = useState("");
  const [page, setPage]             = useState(1);
  const [searching, setSearching]   = useState(false);
  const [results, setResults]       = useState<SearchResult[]>([]);
  const [searchErr, setSearchErr]   = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Selection & import state ──────────────────────────────────
  const [selected, setSelected]           = useState<Set<string>>(new Set());
  const [markup, setMarkup]               = useState("35");
  const [shipping, setShipping]           = useState("3.99");
  const [importCat, setImportCat]         = useState(SITE_CATEGORIES[0].slug);
  const [importSub, setImportSub]         = useState(SITE_CATEGORIES[0].subcategories[0]?.slug ?? "");
  const [importing, setImporting]         = useState(false);
  const [importMsg, setImportMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  // ── My imports table ──────────────────────────────────────────
  const [myImports, setMyImports]         = useState<MyImport[]>([]);
  const [loadingImports, setLoadingImports] = useState(false);

  // Reset subcategory when top-level category changes
  useEffect(() => {
    const cat = SITE_CATEGORIES.find(c => c.slug === importCat);
    setImportSub(cat?.subcategories[0]?.slug ?? "");
  }, [importCat]);

  const loadMyImports = useCallback(async () => {
    if (!user?.email) return;
    setLoadingImports(true);
    try {
      const r = await fetch(
        `/api/admin/listings?imported=1&limit=20&offset=0&sellerEmail=${encodeURIComponent(user.email)}`
      );
      if (r.ok) {
        const d = await r.json() as { listings?: MyImport[] };
        setMyImports(d.listings ?? []);
      }
    } finally {
      setLoadingImports(false);
    }
  }, [user?.email]);

  // Load my imports using general listings endpoint filtered by email
  const loadMyImportsViaListings = useCallback(async () => {
    if (!user?.email) return;
    setLoadingImports(true);
    try {
      const r = await fetch(
        `/api/listings?seller_email=${encodeURIComponent(user.email)}&limit=20&offset=0`
      );
      if (r.ok) {
        const d = await r.json() as { listings?: MyImport[] } | MyImport[];
        const list = Array.isArray(d) ? d : (d.listings ?? []);
        setMyImports(list.filter(l => {
          try { const s = JSON.parse(l.specifications ?? "{}"); return s.source === "Amazon UK"; }
          catch { return false; }
        }));
      }
    } finally {
      setLoadingImports(false);
    }
  }, [user?.email]);

  useEffect(() => { loadMyImportsViaListings(); }, [loadMyImportsViaListings]);

  // ── Search ────────────────────────────────────────────────────
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setSearchErr(null);
    setSelected(new Set());
    setImportMsg(null);
    try {
      const r = await fetch(`/api/user/search-amazon?q=${encodeURIComponent(q)}&page=${page}`);
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

  function toggleSelect(asin: string) {
    setSelected(prev => { const n = new Set(prev); n.has(asin) ? n.delete(asin) : n.add(asin); return n; });
  }
  function toggleAll() {
    setSelected(selected.size === results.length ? new Set() : new Set(results.map(p => p.asin)));
  }

  // ── Import ────────────────────────────────────────────────────
  async function handleImport() {
    if (!user?.email) return;
    const products = results.filter(p => selected.has(p.asin));
    if (!products.length) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await fetch("/api/user/import-amazon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
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
        loadMyImportsViaListings();
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-gray-900">Amazon UK Importer</h2>
        <p className="text-sm text-gray-400 mt-0.5">Search Amazon UK, pick products, set your markup and list them in your store</p>
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
                placeholder='e.g. "air fryer", "gaming chair", "bluetooth speaker"…'
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); setResults([]); setHasSearched(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button type="submit" disabled={searching || !query.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:bg-[#e0601d] transition-colors disabled:opacity-50 flex items-center gap-2">
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

        {/* Results */}
        {!hasSearched && !searching && (
          <div className="py-16 text-center text-gray-400">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Search for a product above to see Amazon UK results</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            {/* Controls bar */}
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button onClick={toggleAll}
                  className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                  {allSelected
                    ? <CheckSquare className="w-4 h-4 text-[#F26B21]" />
                    : <Square className="w-4 h-4" />}
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
                {selected.size > 0 && (
                  <span className="text-xs font-bold text-[#F26B21] bg-orange-50 px-2 py-0.5 rounded-full">
                    {selected.size} selected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category cascade */}
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
                    className={inputCls + " w-20 py-1.5 text-xs"} placeholder="£3.99" />
                </div>
                <button onClick={handleImport} disabled={importing || selected.size === 0}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#e0601d] transition-colors disabled:opacity-50">
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

            {/* Product grid */}
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {results.map(p => {
                const isSel = selected.has(p.asin);
                const preview = markup && shipping
                  ? Math.round((p.price_gbp * (1 + parseFloat(markup) / 100) + parseFloat(shipping)) * 100) / 100
                  : null;
                return (
                  <button key={p.asin} onClick={() => toggleSelect(p.asin)}
                    className={`relative text-left rounded-xl border-2 transition-all p-3 flex flex-col gap-2 ${
                      isSel ? "border-[#F26B21] bg-orange-50/50" : "border-gray-100 bg-white hover:border-gray-300"
                    }`}>
                    <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isSel ? "bg-[#F26B21]" : "bg-gray-100"
                    }`}>
                      {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    {p.image
                      ? <img src={p.image} alt="" className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                      : <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-8 h-8 text-gray-300" /></div>
                    }
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.title}</p>
                    {p.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-500">{p.rating}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Amazon: <span className="font-bold text-gray-700">£{p.price_gbp.toFixed(2)}</span></span>
                      {preview !== null && <span className="text-xs font-black text-[#F26B21]">£{preview.toFixed(2)}</span>}
                    </div>
                    <a href={p.amazon_url} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 w-fit">
                      {p.asin} <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </button>
                );
              })}
            </div>

            {/* Page nav */}
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-400">{results.length} results on this page</span>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPage(p => Math.max(1, p - 1)); }} disabled={page === 1 || searching}
                  className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                <span className="text-xs text-gray-500">Page {page}</span>
                <button onClick={() => { setPage(p => p + 1); }} disabled={searching || results.length < 5}
                  className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* My Amazon imports */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="font-bold text-gray-900">My Amazon Imports</p>
            <p className="text-xs text-gray-400 mt-0.5">Products you've imported from Amazon UK</p>
          </div>
          <button onClick={loadMyImportsViaListings} disabled={loadingImports}
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
            <p className="text-sm">No Amazon imports yet — search and import products above</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {myImports.map(item => {
              const specs = parseSpecs(item.specifications ?? "{}");
              return (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  {item.image
                    ? <img src={item.image} alt="" className="w-12 h-12 rounded-lg object-contain bg-gray-50 flex-shrink-0" />
                    : <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-gray-300" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      {specs.amazon_price_gbp ? `Amazon £${specs.amazon_price_gbp.toFixed(2)} · ` : ""}
                      Your price: <span className="font-bold text-[#F26B21]">£{parseFloat(item.price).toFixed(2)}</span>
                      {specs.markup_pct ? ` · ${specs.markup_pct}% markup` : ""}
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

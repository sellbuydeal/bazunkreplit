import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, RefreshCw, ExternalLink, Trash2, Loader2,
  AlertCircle, CheckCircle2, Package, Percent, Truck,
  ChevronLeft, ChevronRight, Search, X, RefreshCcw, Star,
  CheckSquare, Square, ArrowDownToLine, User, Globe, Plus, FileText,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { CATEGORIES as SITE_CATEGORIES } from "@/data/categories";
import { CLASSIFIED_CATEGORIES } from "@/data/classifieds";

type Tab = "amazon" | "aliexpress" | "ebay" | "gumtree";

interface GumtreeListing {
  id: string;
  title: string;
  price: string;
  location: string;
  thumbnail: string | null;
  url: string;
  description: string;
}

type GtExpiry = "7" | "14" | "30" | "unlimited";
type EbaySite = "uk" | "us";

interface SearchResult {
  asin: string;
  title: string;
  price_gbp: number;
  image: string | null;
  rating: string;
  amazon_url: string;
}

interface EbaySearchResult {
  item_id: string;
  title: string;
  price: number;
  currency: "GBP" | "USD";
  image: string | null;
  rating: string;
  condition: string;
  ebay_url: string;
}

interface AmazonListing {
  id: number;
  public_id: string;
  title: string;
  price: string;
  image: string | null;
  category: string;
  status: string;
  specifications: string;
  created_at: string;
}

interface Specs {
  source?: string;
  asin?: string;
  amazon_url?: string;
  amazon_price_gbp?: number;
  shipping_gbp?: number;
  markup_pct?: number;
}

function parseSpecs(raw: string | null): Specs {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

interface UserOption { email: string; name: string | null; }

export function AdminImportsPage() {
  const { authFetch } = useAdmin();
  const [tab, setTab] = useState<Tab>("amazon");

  // ── Search state ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchPage, setSearchPage] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Selection & import state ──────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [markup, setMarkup] = useState("35");
  const [shipping, setShipping] = useState("3.99");
  const [importCategory, setImportCategory] = useState(SITE_CATEGORIES[0].slug);
  const [importSubcategory, setImportSubcategory] = useState(SITE_CATEGORIES[0].subcategories[0]?.slug ?? "");
  const [sellerEmail, setSellerEmail] = useState("bazunkdeals@gmail.com");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Bulk markup state ─────────────────────────────────────────
  const [bulkMarkup, setBulkMarkup] = useState("35");
  const [bulkShipping, setBulkShipping] = useState("3.99");
  const [bulkApplying, setBulkApplying] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Price sync state ──────────────────────────────────────────
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Details sync state ────────────────────────────────────────
  const [syncingDetails, setSyncingDetails] = useState(false);
  const [syncDetailsMsg, setSyncDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Demo clear state ──────────────────────────────────────────
  const [clearingDemo, setClearingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Listings table state ──────────────────────────────────────
  const [listings, setListings] = useState<AmazonListing[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const [loadingList, setLoadingList] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  // ── eBay state ────────────────────────────────────────────────
  const [ebaySite, setEbaySite]             = useState<EbaySite>("uk");
  const [ebayQuery, setEbayQuery]           = useState("");
  const [ebayPage, setEbayPage]             = useState(1);
  const [ebaySearching, setEbaySearching]   = useState(false);
  const [ebayResults, setEbayResults]       = useState<EbaySearchResult[]>([]);
  const [ebaySearchErr, setEbaySearchErr]   = useState<string | null>(null);
  const [ebayHasSearched, setEbayHasSearched] = useState(false);
  const [ebaySelected, setEbaySelected]     = useState<Set<string>>(new Set());
  const [ebayMarkup, setEbayMarkup]         = useState("35");
  const [ebayShipping, setEbayShipping]     = useState("3.99");
  const [ebayCat, setEbayCat]               = useState(SITE_CATEGORIES[0].slug);
  const [ebaySub, setEbaySub]               = useState(SITE_CATEGORIES[0].subcategories[0]?.slug ?? "");
  const [ebaySellerEmail, setEbaySellerEmail] = useState("bazunkdeals@gmail.com");
  const [ebayImporting, setEbayImporting]   = useState(false);
  const [ebayImportMsg, setEbayImportMsg]   = useState<{ ok: boolean; text: string } | null>(null);
  const [ebaySyncing, setEbaySyncing]       = useState(false);
  const [ebaySyncMsg, setEbaySyncMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [ebaySyncingDetails, setEbaySyncingDetails] = useState(false);
  const [ebaySyncDetailsMsg, setEbaySyncDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [ebayBulkMarkup, setEbayBulkMarkup] = useState("35");
  const [ebayBulkShipping, setEbayBulkShipping] = useState("3.99");
  const [ebayBulkApplying, setEbayBulkApplying] = useState(false);
  const [ebayBulkMsg, setEbayBulkMsg]       = useState<{ ok: boolean; text: string } | null>(null);
  const [ebayListings, setEbayListings]     = useState<AmazonListing[]>([]);
  const [ebayTotal, setEbayTotal]           = useState(0);
  const [ebayListPage, setEbayListPage]     = useState(0);
  const [ebayTableSearch, setEbayTableSearch] = useState("");
  const [ebayLoadingList, setEbayLoadingList] = useState(false);
  const [ebayClearingAll, setEbayClearingAll] = useState(false);

  // ── Gumtree scraper state ─────────────────────────────────────
  const [gtQuery, setGtQuery] = useState("");
  const [gtPage, setGtPage] = useState(1);
  const [gtSearching, setGtSearching] = useState(false);
  const [gtResults, setGtResults] = useState<GumtreeListing[]>([]);
  const [gtSearchErr, setGtSearchErr] = useState<string | null>(null);
  const [gtHasSearched, setGtHasSearched] = useState(false);
  const [gtSelected, setGtSelected] = useState<Set<string>>(new Set());
  const [gtCat, setGtCat] = useState(CLASSIFIED_CATEGORIES[0].slug);
  const [gtSub, setGtSub] = useState("");
  const [gtExpiry, setGtExpiry] = useState<GtExpiry>("30");
  const [gtSellerEmail, setGtSellerEmail] = useState("bazunkdeals@gmail.com");
  const [gtSellerName, setGtSellerName] = useState("Bazunk");
  const [gtImporting, setGtImporting] = useState(false);
  const [gtMsg, setGtMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const PAGE_SIZE = 50;

  // ── Load users for seller picker ─────────────────────────────
  useEffect(() => {
    authFetch("/api/admin/users?limit=200")
      .then(r => r.json())
      .then((d: { users?: UserOption[] }) => {
        const list = d.users ?? [];
        setUsers(list);
        // Default to superdeals account if it exists, otherwise first user
        const superdeals = list.find(u => u.email === "bazunkdeals@gmail.com");
        if (!superdeals && list.length > 0) setSellerEmail(list[0].email);
      })
      .catch(() => {});
  }, [authFetch]);

  // ── Subcategory reset when top-level category changes ────────
  useEffect(() => {
    const cat = SITE_CATEGORIES.find(c => c.slug === importCategory);
    setImportSubcategory(cat?.subcategories[0]?.slug ?? "");
  }, [importCategory]);

  const loadListings = useCallback(async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        imported: "1",
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(tableSearch ? { search: tableSearch } : {}),
      });
      const r = await authFetch(`/api/admin/listings?${params}`);
      if (r.ok) {
        const d = await r.json() as { listings: AmazonListing[]; total: number };
        setListings(d.listings ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoadingList(false);
    }
  }, [authFetch, page, tableSearch]);

  useEffect(() => { loadListings(); }, [loadListings]);

  // ── Search ────────────────────────────────────────────────────
  async function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    setSearching(true);
    setSearchError(null);
    setSelected(new Set());
    setImportMsg(null);
    try {
      const r = await authFetch(`/api/admin/search-amazon?q=${encodeURIComponent(q)}&page=${searchPage}`);
      const d = await r.json() as { products?: SearchResult[]; error?: string };
      if (!r.ok) { setSearchError(d.error ?? "Search failed"); setSearchResults([]); }
      else { setSearchResults(d.products ?? []); setHasSearched(true); }
    } catch {
      setSearchError("Network error — check your connection");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function toggleSelect(asin: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(asin) ? next.delete(asin) : next.add(asin);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === searchResults.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(searchResults.map(p => p.asin)));
    }
  }

  // ── Import selected ───────────────────────────────────────────
  async function handleImportSelected() {
    const products = searchResults.filter(p => selected.has(p.asin));
    if (!products.length) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const r = await authFetch("/api/admin/import-selected-amazon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products,
          markup: parseFloat(markup) || 35,
          shipping: parseFloat(shipping) || 3.99,
          category: importCategory,
          subcategory: importSubcategory,
          sellerEmail,
        }),
      });
      const d = await r.json() as { imported?: number; message?: string; error?: string };
      if (r.ok) {
        setImportMsg({ ok: true, text: d.message ?? `Imported ${d.imported} products` });
        setSelected(new Set());
        loadListings();
      } else {
        setImportMsg({ ok: false, text: d.error ?? "Import failed" });
      }
    } catch {
      setImportMsg({ ok: false, text: "Network error — try again" });
    } finally {
      setImporting(false);
    }
  }

  // ── Bulk markup ───────────────────────────────────────────────
  async function handleBulkMarkup() {
    setBulkApplying(true);
    setBulkMsg(null);
    try {
      const r = await authFetch("/api/admin/bulk-markup", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup: parseFloat(bulkMarkup) || 35, shipping: parseFloat(bulkShipping) || 3.99 }),
      });
      const d = await r.json() as { updated?: number; message?: string; error?: string };
      setBulkMsg(r.ok
        ? { ok: true, text: d.message ?? `Updated ${d.updated} listings` }
        : { ok: false, text: d.error ?? "Failed" }
      );
      if (r.ok) loadListings();
    } catch {
      setBulkMsg({ ok: false, text: "Network error" });
    } finally {
      setBulkApplying(false);
    }
  }

  // ── Price sync ────────────────────────────────────────────────
  async function handleSyncPrices() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await authFetch("/api/admin/sync-amazon-prices", { method: "POST" });
      const d = await r.json() as { updated?: number; unchanged?: number; errors?: number; message?: string; error?: string };
      setSyncMsg(r.ok
        ? { ok: true, text: d.message ?? `Updated ${d.updated}` }
        : { ok: false, text: d.error ?? "Sync failed" }
      );
      if (r.ok) loadListings();
    } catch {
      setSyncMsg({ ok: false, text: "Network error" });
    } finally {
      setSyncing(false);
    }
  }

  // ── Details sync ──────────────────────────────────────────────
  async function handleSyncDetails() {
    setSyncingDetails(true);
    setSyncDetailsMsg(null);
    try {
      const r = await authFetch("/api/admin/sync-amazon-details", { method: "POST" });
      const d = await r.json() as { updated?: number; unchanged?: number; errors?: number; message?: string; error?: string };
      setSyncDetailsMsg(r.ok
        ? { ok: true, text: d.message ?? `Updated ${d.updated}` }
        : { ok: false, text: d.error ?? "Sync failed" }
      );
      if (r.ok) loadListings();
    } catch {
      setSyncDetailsMsg({ ok: false, text: "Network error" });
    } finally {
      setSyncingDetails(false);
    }
  }

  // ── Clear demo ────────────────────────────────────────────────
  async function handleClearDemo() {
    if (!confirm("Delete all BZK-DEMO-* demo listings from the site? This cannot be undone.")) return;
    setClearingDemo(true);
    setDemoMsg(null);
    try {
      const r = await authFetch("/api/admin/clear-demo-listings", { method: "DELETE" });
      const d = await r.json() as { deleted?: number; error?: string };
      setDemoMsg(r.ok
        ? { ok: true, text: `Deleted ${d.deleted ?? 0} demo listings` }
        : { ok: false, text: d.error ?? "Failed" }
      );
      if (r.ok) loadListings();
    } finally {
      setClearingDemo(false);
    }
  }

  // ── Clear all Amazon imports ──────────────────────────────────
  async function handleClearAll() {
    if (!confirm("Delete ALL Amazon UK imports? This cannot be undone.")) return;
    setClearingAll(true);
    try {
      const r = await authFetch("/api/admin/clear-amazon-imports", { method: "DELETE" });
      const d = await r.json() as { deleted?: number };
      setImportMsg({ ok: true, text: `Deleted ${d.deleted ?? 0} Amazon imports` });
      setPage(0);
      loadListings();
    } finally {
      setClearingAll(false);
    }
  }

  // ── eBay subcategory reset ────────────────────────────────────
  useEffect(() => {
    const cat = SITE_CATEGORIES.find(c => c.slug === ebayCat);
    setEbaySub(cat?.subcategories[0]?.slug ?? "");
  }, [ebayCat]);

  // ── Load eBay listings ────────────────────────────────────────
  const loadEbayListings = useCallback(async () => {
    setEbayLoadingList(true);
    try {
      const r = await authFetch(`/api/admin/listings?imported=1&limit=${PAGE_SIZE}&offset=${ebayListPage * PAGE_SIZE}${ebayTableSearch ? `&search=${encodeURIComponent(ebayTableSearch)}` : ""}`);
      if (r.ok) {
        const d = await r.json() as { listings: AmazonListing[]; total: number };
        const ebayOnly = (d.listings ?? []).filter(l => {
          try { const s = JSON.parse(l.specifications ?? "{}"); return s.source === "eBay UK" || s.source === "eBay US"; }
          catch { return false; }
        });
        setEbayListings(ebayOnly);
        setEbayTotal(ebayOnly.length);
      }
    } finally {
      setEbayLoadingList(false);
    }
  }, [authFetch, ebayListPage, ebayTableSearch]);

  useEffect(() => { if (tab === "ebay") loadEbayListings(); }, [tab, loadEbayListings]);

  // ── eBay search ───────────────────────────────────────────────
  async function handleEbaySearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = ebayQuery.trim();
    if (!q) return;
    setEbaySearching(true);
    setEbaySearchErr(null);
    setEbaySelected(new Set());
    setEbayImportMsg(null);
    try {
      const r = await authFetch(`/api/admin/search-ebay?q=${encodeURIComponent(q)}&site=${ebaySite}&page=${ebayPage}`);
      const d = await r.json() as { products?: EbaySearchResult[]; error?: string };
      if (!r.ok) { setEbaySearchErr(d.error ?? "Search failed"); setEbayResults([]); }
      else { setEbayResults(d.products ?? []); setEbayHasSearched(true); }
    } catch {
      setEbaySearchErr("Network error — check your connection");
      setEbayResults([]);
    } finally {
      setEbaySearching(false);
    }
  }

  function toggleEbaySelect(id: string) {
    setEbaySelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllEbay() {
    setEbaySelected(ebaySelected.size === ebayResults.length ? new Set() : new Set(ebayResults.map(p => p.item_id)));
  }

  // ── eBay import ───────────────────────────────────────────────
  async function handleEbayImport() {
    const products = ebayResults.filter(p => ebaySelected.has(p.item_id));
    if (!products.length) return;
    setEbayImporting(true);
    setEbayImportMsg(null);
    try {
      const r = await authFetch("/api/admin/import-selected-ebay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          products, site: ebaySite,
          markup: parseFloat(ebayMarkup) || 35,
          shipping: parseFloat(ebayShipping) || 3.99,
          category: ebayCat, subcategory: ebaySub,
          sellerEmail: ebaySellerEmail,
        }),
      });
      const d = await r.json() as { imported?: number; message?: string; error?: string };
      if (r.ok) {
        setEbayImportMsg({ ok: true, text: d.message ?? `Imported ${d.imported} products` });
        setEbaySelected(new Set());
        loadEbayListings();
      } else {
        setEbayImportMsg({ ok: false, text: d.error ?? "Import failed" });
      }
    } catch {
      setEbayImportMsg({ ok: false, text: "Network error — try again" });
    } finally {
      setEbayImporting(false);
    }
  }

  // ── eBay sync prices ──────────────────────────────────────────
  async function handleEbaySyncPrices() {
    setEbaySyncing(true);
    setEbaySyncMsg(null);
    try {
      const r = await authFetch("/api/admin/sync-ebay-prices", { method: "POST" });
      const d = await r.json() as { updated?: number; unchanged?: number; errors?: number; message?: string; error?: string };
      setEbaySyncMsg(r.ok ? { ok: true, text: d.message ?? `Updated ${d.updated}` } : { ok: false, text: d.error ?? "Sync failed" });
      if (r.ok) loadEbayListings();
    } catch { setEbaySyncMsg({ ok: false, text: "Network error" }); }
    finally { setEbaySyncing(false); }
  }

  async function handleEbaySyncDetails() {
    setEbaySyncingDetails(true);
    setEbaySyncDetailsMsg(null);
    try {
      const r = await authFetch("/api/admin/sync-ebay-details", { method: "POST" });
      const d = await r.json() as { updated?: number; unchanged?: number; errors?: number; message?: string; error?: string };
      setEbaySyncDetailsMsg(r.ok ? { ok: true, text: d.message ?? `Updated ${d.updated}` } : { ok: false, text: d.error ?? "Sync failed" });
      if (r.ok) loadEbayListings();
    } catch { setEbaySyncDetailsMsg({ ok: false, text: "Network error" }); }
    finally { setEbaySyncingDetails(false); }
  }

  async function handleEbayBulkMarkup() {
    setEbayBulkApplying(true);
    setEbayBulkMsg(null);
    try {
      const r = await authFetch("/api/admin/bulk-markup-ebay", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markup: parseFloat(ebayBulkMarkup) || 35, shipping: parseFloat(ebayBulkShipping) || 3.99 }),
      });
      const d = await r.json() as { updated?: number; message?: string; error?: string };
      setEbayBulkMsg(r.ok ? { ok: true, text: d.message ?? `Updated ${d.updated}` } : { ok: false, text: d.error ?? "Failed" });
      if (r.ok) loadEbayListings();
    } catch { setEbayBulkMsg({ ok: false, text: "Network error" }); }
    finally { setEbayBulkApplying(false); }
  }

  async function handleEbayClearAll() {
    if (!confirm("Delete ALL eBay imports? This cannot be undone.")) return;
    setEbayClearingAll(true);
    try {
      const r = await authFetch("/api/admin/clear-ebay-imports", { method: "DELETE" });
      const d = await r.json() as { deleted?: number };
      setEbayImportMsg({ ok: true, text: `Deleted ${d.deleted ?? 0} eBay imports` });
      loadEbayListings();
    } finally { setEbayClearingAll(false); }
  }

  // ── Gumtree helpers ───────────────────────────────────────────
  async function handleGtSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = gtQuery.trim();
    if (!q) return;
    setGtSearching(true);
    setGtSearchErr(null);
    setGtSelected(new Set());
    setGtMsg(null);
    try {
      const r = await authFetch(`/api/admin/scrape-gumtree?q=${encodeURIComponent(q)}&page=${gtPage}`);
      const d = await r.json() as { listings?: GumtreeListing[]; error?: string; warning?: string };
      if (!r.ok) { setGtSearchErr(d.error ?? "Scrape failed"); setGtResults([]); }
      else if (d.warning && (!d.listings || d.listings.length === 0)) {
        setGtSearchErr(d.warning); setGtResults([]);
      } else { setGtResults(d.listings ?? []); setGtHasSearched(true); }
    } catch { setGtSearchErr("Network error — check your connection"); setGtResults([]); }
    finally { setGtSearching(false); }
  }

  function toggleGtSelect(id: string) {
    setGtSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAllGt() {
    setGtSelected(gtSelected.size === gtResults.length ? new Set() : new Set(gtResults.map(l => l.id)));
  }

  async function handleGtImport() {
    const listings = gtResults.filter(l => gtSelected.has(l.id));
    if (!listings.length) return;
    setGtImporting(true);
    setGtMsg(null);
    try {
      const r = await authFetch("/api/admin/import-gumtree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listings,
          category: gtCat,
          subcategory: gtSub || null,
          expiry: gtExpiry,
          sellerEmail: gtSellerEmail,
          sellerName: gtSellerName,
        }),
      });
      const d = await r.json() as { imported?: number; message?: string; error?: string };
      if (r.ok) {
        setGtMsg({ ok: true, text: d.message ?? `Imported ${d.imported} ads` });
        setGtSelected(new Set());
      } else {
        setGtMsg({ ok: false, text: d.error ?? "Import failed" });
      }
    } catch { setGtMsg({ ok: false, text: "Network error — try again" }); }
    finally { setGtImporting(false); }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const allResultsSelected = searchResults.length > 0 && selected.size === searchResults.length;
  const allEbaySelected = ebayResults.length > 0 && ebaySelected.size === ebayResults.length;
  const ebaySymbol = ebaySite === "uk" ? "£" : "$";
  const inputCls = "px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white";
  const ebayInputCls = "px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-white";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Imports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Search Amazon UK or eBay, choose products, import with your markup</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit flex-wrap">
        {(["amazon", "ebay", "aliexpress", "gumtree"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "amazon" ? "🛒 Amazon UK" : t === "ebay" ? "🏷️ eBay" : t === "aliexpress" ? "📦 AliExpress" : "📋 Gumtree"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "amazon" && (
          <motion.div key="amazon" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Demo cleanup banner */}
            <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3 flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-800">Remove Demo Listings</p>
                  <p className="text-xs text-red-500">Deletes all BZK-DEMO-* placeholder listings</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {demoMsg && (
                  <span className={`text-xs font-semibold ${demoMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{demoMsg.text}</span>
                )}
                <button onClick={handleClearDemo} disabled={clearingDemo}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                  {clearingDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  {clearingDemo ? "Deleting…" : "Clear Demo Listings"}
                </button>
              </div>
            </div>

            {/* ── Search & pick ─────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#F26B21] flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Search Amazon UK</p>
                    <p className="text-xs text-gray-400">Find products, tick the ones you want, set your markup and import</p>
                  </div>
                </div>

                {/* Search bar */}
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      ref={searchInputRef}
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder='e.g. "dyson vacuum", "air fryer", "gaming chair"…'
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => { setSearchQuery(""); setSearchResults([]); setHasSearched(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button type="submit" disabled={searching || !searchQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:bg-[#e0601d] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {searching ? "Searching…" : "Search"}
                  </button>
                </form>

                {searchError && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {searchError}
                  </div>
                )}
              </div>

              {/* Results grid */}
              {searchResults.length > 0 && (
                <>
                  {/* Controls bar */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleAll}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                        {allResultsSelected
                          ? <CheckSquare className="w-4 h-4 text-[#F26B21]" />
                          : <Square className="w-4 h-4" />}
                        {allResultsSelected ? "Deselect all" : "Select all"}
                      </button>
                      {selected.size > 0 && (
                        <span className="text-xs font-bold text-[#F26B21] bg-orange-50 px-2 py-0.5 rounded-full">
                          {selected.size} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Seller picker */}
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select value={sellerEmail} onChange={e => setSellerEmail(e.target.value)}
                          className={inputCls + " py-1.5 text-xs max-w-[160px]"}>
                          {users.length === 0
                            ? <option value="bazunkdeals@gmail.com">bazunkdeals@gmail.com</option>
                            : users.map(u => (
                                <option key={u.email} value={u.email}>
                                  {u.name ? `${u.name} (${u.email})` : u.email}
                                </option>
                              ))
                          }
                        </select>
                      </div>
                      {/* Category → Subcategory cascade */}
                      <select value={importCategory} onChange={e => setImportCategory(e.target.value)}
                        className={inputCls + " py-1.5 text-xs max-w-[140px]"}>
                        {SITE_CATEGORIES.map(c => (
                          <option key={c.slug} value={c.slug}>{c.name}</option>
                        ))}
                      </select>
                      {(() => {
                        const subs = SITE_CATEGORIES.find(c => c.slug === importCategory)?.subcategories ?? [];
                        return subs.length > 0 ? (
                          <select value={importSubcategory} onChange={e => setImportSubcategory(e.target.value)}
                            className={inputCls + " py-1.5 text-xs max-w-[150px]"}>
                            <option value="">— subcategory —</option>
                            {subs.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                          </select>
                        ) : null;
                      })()}
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
                      <button onClick={handleImportSelected} disabled={importing || selected.size === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#e0601d] transition-colors disabled:opacity-50">
                        {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                        {importing ? "Importing…" : `Import ${selected.size > 0 ? `(${selected.size})` : ""}`}
                      </button>
                    </div>
                  </div>

                  {importMsg && (
                    <div className={`mx-5 mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                      importMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {importMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {importMsg.text}
                      {markup && shipping && selected.size > 0 && (
                        <span className="ml-auto text-xs text-gray-400">
                          e.g. £50 → £{(50 * (1 + parseFloat(markup) / 100) + parseFloat(shipping)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {searchResults.map(p => {
                      const isSelected = selected.has(p.asin);
                      const bazunkPreview = markup && shipping
                        ? Math.round((p.price_gbp * (1 + parseFloat(markup) / 100) + parseFloat(shipping)) * 100) / 100
                        : null;
                      return (
                        <button
                          key={p.asin}
                          onClick={() => toggleSelect(p.asin)}
                          className={`relative text-left rounded-xl border-2 transition-all p-3 flex flex-col gap-2 ${
                            isSelected
                              ? "border-[#F26B21] bg-orange-50/50"
                              : "border-gray-100 bg-white hover:border-gray-300"
                          }`}
                        >
                          {/* Selection tick */}
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? "bg-[#F26B21]" : "bg-gray-100"
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>

                          {/* Image */}
                          {p.image ? (
                            <img src={p.image} alt="" className="w-full aspect-square object-contain rounded-lg bg-gray-50" />
                          ) : (
                            <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}

                          {/* Title */}
                          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.title}</p>

                          {/* Rating */}
                          {p.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-xs text-gray-500">{p.rating}</span>
                            </div>
                          )}

                          {/* Prices */}
                          <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
                            <span className="text-xs text-gray-500">Amazon: <span className="font-bold text-gray-700">£{p.price_gbp.toFixed(2)}</span></span>
                            {bazunkPreview !== null && (
                              <span className="text-xs font-black text-[#F26B21]">£{bazunkPreview.toFixed(2)}</span>
                            )}
                          </div>

                          {/* Amazon link */}
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
                    <span className="text-xs text-gray-400">{searchResults.length} results on this page</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setSearchPage(p => Math.max(1, p - 1)); }}
                        disabled={searchPage === 1 || searching}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> Prev
                      </button>
                      <span className="text-xs text-gray-500">Page {searchPage}</span>
                      <button onClick={() => { setSearchPage(p => p + 1); }}
                        disabled={searching || searchResults.length < 5}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        Next <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {hasSearched && searchResults.length === 0 && !searching && !searchError && (
                <div className="py-10 text-center text-gray-400 text-sm">No results found. Try a different search.</div>
              )}

              {!hasSearched && !searching && (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Search for a product above to see Amazon UK results
                </div>
              )}
            </div>

            {/* ── Universal markup update ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#4A5CE8] flex items-center justify-center flex-shrink-0">
                  <Percent className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Universal Price Update</p>
                  <p className="text-xs text-gray-400">Re-price all {total} imports from their stored Amazon price + new markup</p>
                </div>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Markup %</label>
                  <input type="number" min="0" step="1" value={bulkMarkup} onChange={e => setBulkMarkup(e.target.value)}
                    className={inputCls + " w-24"} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Shipping £</label>
                  <input type="number" min="0" step="0.01" value={bulkShipping} onChange={e => setBulkShipping(e.target.value)}
                    className={inputCls + " w-24"} />
                </div>
                <button onClick={handleBulkMarkup} disabled={bulkApplying || total === 0}
                  className="px-5 py-2 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:bg-[#3a4cd8] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {bulkApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Apply to All {total > 0 ? `(${total})` : ""}
                </button>
                {bulkMsg && (
                  <span className={`text-sm font-semibold ${bulkMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{bulkMsg.text}</span>
                )}
              </div>
            </div>

            {/* ── Imported products table ───────────────────────── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900">{total} Amazon Imports</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Price sync */}
                  <button onClick={handleSyncPrices} disabled={syncing || syncingDetails || total === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#4A5CE8] border border-[#4A5CE8]/30 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40">
                    <RefreshCcw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Syncing prices…" : "Sync Prices"}
                  </button>

                  {/* Description & name sync */}
                  <button onClick={handleSyncDetails} disabled={syncingDetails || syncing || total === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40">
                    <RefreshCcw className={`w-3.5 h-3.5 ${syncingDetails ? "animate-spin" : ""}`} />
                    {syncingDetails ? "Syncing…" : "Sync Name & Description"}
                  </button>

                  {(syncMsg || syncDetailsMsg) && (
                    <span className={`text-xs font-semibold ${(syncMsg ?? syncDetailsMsg)!.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {(syncDetailsMsg ?? syncMsg)!.text}
                    </span>
                  )}

                  {/* Table search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={tableSearch} onChange={e => { setTableSearch(e.target.value); setPage(0); }}
                      placeholder="Search imports…"
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] w-44" />
                    {tableSearch && (
                      <button onClick={() => { setTableSearch(""); setPage(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <button onClick={loadListings} disabled={loadingList}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? "animate-spin" : ""}`} />
                  </button>

                  {total > 0 && (
                    <button onClick={handleClearAll} disabled={clearingAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-500">No Amazon imports yet</p>
                  <p className="text-sm mt-1">Search above and pick products to import</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12"></th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cat.</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Amazon £</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bazunk £</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rules</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">ASIN</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listings.map(l => {
                        const specs = parseSpecs(l.specifications);
                        const amazonPrice = specs.amazon_price_gbp;
                        const bazunkPrice = parseFloat(l.price);
                        return (
                          <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              {l.image
                                ? <img src={l.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium text-gray-900 truncate leading-tight">{l.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{l.public_id}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold capitalize">{l.category}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700">
                              {amazonPrice != null ? `£${amazonPrice.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-black text-[#F26B21]">
                              £{bazunkPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {specs.markup_pct != null ? `${specs.markup_pct}% + £${specs.shipping_gbp ?? 0}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{specs.asin ?? "—"}</code>
                            </td>
                            <td className="px-4 py-3">
                              {specs.amazon_url && (
                                <a href={specs.amazon_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-colors">
                                  Amazon <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <p className="text-xs text-gray-400">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-gray-500 px-2">{page + 1} / {totalPages}</span>
                    <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                      className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "ebay" && (
          <motion.div key="ebay" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Site toggle */}
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-gray-400" />
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
                {(["uk", "us"] as EbaySite[]).map(s => (
                  <button key={s} onClick={() => { setEbaySite(s); setEbayResults([]); setEbayHasSearched(false); setEbaySelected(new Set()); }}
                    className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                      ebaySite === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}>
                    {s === "uk" ? "🇬🇧 eBay.co.uk (£)" : "🇺🇸 eBay.com ($)"}
                  </button>
                ))}
              </div>
            </div>

            {/* Search & pick */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#4A5CE8] flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Search {ebaySite === "uk" ? "eBay.co.uk" : "eBay.com"}</p>
                    <p className="text-xs text-gray-400">Find listings, tick the ones you want, set your markup and import</p>
                  </div>
                </div>
                <form onSubmit={handleEbaySearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={ebayQuery} onChange={e => setEbayQuery(e.target.value)}
                      placeholder={`Search ${ebaySite === "uk" ? "eBay.co.uk" : "eBay.com"}…`}
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" />
                    {ebayQuery && (
                      <button type="button" onClick={() => { setEbayQuery(""); setEbayResults([]); setEbayHasSearched(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button type="submit" disabled={ebaySearching || !ebayQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:bg-[#3a4cd8] transition-colors disabled:opacity-50 flex items-center gap-2">
                    {ebaySearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {ebaySearching ? "Searching…" : "Search"}
                  </button>
                </form>
                {ebaySearchErr && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {ebaySearchErr}
                  </div>
                )}
              </div>

              {/* Results */}
              {ebayResults.length > 0 && (
                <>
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleAllEbay}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                        {allEbaySelected ? <CheckSquare className="w-4 h-4 text-[#4A5CE8]" /> : <Square className="w-4 h-4" />}
                        {allEbaySelected ? "Deselect all" : "Select all"}
                      </button>
                      {ebaySelected.size > 0 && (
                        <span className="text-xs font-bold text-[#4A5CE8] bg-indigo-50 px-2 py-0.5 rounded-full">{ebaySelected.size} selected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Seller picker */}
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select value={ebaySellerEmail} onChange={e => setEbaySellerEmail(e.target.value)}
                          className={ebayInputCls + " py-1.5 text-xs max-w-[160px]"}>
                          {users.length === 0
                            ? <option value="bazunkdeals@gmail.com">bazunkdeals@gmail.com</option>
                            : users.map(u => <option key={u.email} value={u.email}>{u.name ? `${u.name} (${u.email})` : u.email}</option>)
                          }
                        </select>
                      </div>
                      <select value={ebayCat} onChange={e => setEbayCat(e.target.value)}
                        className={ebayInputCls + " py-1.5 text-xs max-w-[140px]"}>
                        {SITE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                      {(() => {
                        const subs = SITE_CATEGORIES.find(c => c.slug === ebayCat)?.subcategories ?? [];
                        return subs.length > 0 ? (
                          <select value={ebaySub} onChange={e => setEbaySub(e.target.value)}
                            className={ebayInputCls + " py-1.5 text-xs max-w-[150px]"}>
                            <option value="">— subcategory —</option>
                            {subs.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                          </select>
                        ) : null;
                      })()}
                      <div className="flex items-center gap-1">
                        <Percent className="w-3.5 h-3.5 text-gray-400" />
                        <input type="number" min="0" step="1" value={ebayMarkup} onChange={e => setEbayMarkup(e.target.value)}
                          className={ebayInputCls + " w-20 py-1.5 text-xs"} placeholder="35%" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Truck className="w-3.5 h-3.5 text-gray-400" />
                        <input type="number" min="0" step="0.01" value={ebayShipping} onChange={e => setEbayShipping(e.target.value)}
                          className={ebayInputCls + " w-20 py-1.5 text-xs"} placeholder={`${ebaySymbol}3.99`} />
                      </div>
                      <button onClick={handleEbayImport} disabled={ebayImporting || ebaySelected.size === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:bg-[#3a4cd8] transition-colors disabled:opacity-50">
                        {ebayImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                        {ebayImporting ? "Importing…" : `Import${ebaySelected.size > 0 ? ` (${ebaySelected.size})` : ""}`}
                      </button>
                    </div>
                  </div>

                  {ebayImportMsg && (
                    <div className={`mx-5 mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                      ebayImportMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {ebayImportMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {ebayImportMsg.text}
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {ebayResults.map(p => {
                      const isSel = ebaySelected.has(p.item_id);
                      const preview = ebayMarkup && ebayShipping
                        ? Math.round((p.price * (1 + parseFloat(ebayMarkup) / 100) + parseFloat(ebayShipping)) * 100) / 100
                        : null;
                      return (
                        <button key={p.item_id} onClick={() => toggleEbaySelect(p.item_id)}
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
                              {p.rating && <div className="flex items-center gap-0.5"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /><span className="text-xs text-gray-500">{p.rating}</span></div>}
                              {p.condition && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{p.condition}</span>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
                            <span className="text-xs text-gray-500">eBay: <span className="font-bold text-gray-700">{ebaySymbol}{p.price.toFixed(2)}</span></span>
                            {preview !== null && <span className="text-xs font-black text-[#4A5CE8]">{ebaySymbol}{preview.toFixed(2)}</span>}
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
                    <span className="text-xs text-gray-400">{ebayResults.length} results on this page</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setEbayPage(p => Math.max(1, p - 1))} disabled={ebayPage === 1 || ebaySearching}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> Prev
                      </button>
                      <span className="text-xs text-gray-500">Page {ebayPage}</span>
                      <button onClick={() => setEbayPage(p => p + 1)} disabled={ebaySearching || ebayResults.length < 5}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        Next <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {ebayHasSearched && ebayResults.length === 0 && !ebaySearching && !ebaySearchErr && (
                <div className="py-10 text-center text-gray-400 text-sm">No results found. Try a different search.</div>
              )}
              {!ebayHasSearched && !ebaySearching && (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Search {ebaySite === "uk" ? "eBay.co.uk" : "eBay.com"} above to see results
                </div>
              )}
            </div>

            {/* Bulk markup */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#4A5CE8] flex items-center justify-center flex-shrink-0">
                  <Percent className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Universal Price Update</p>
                  <p className="text-xs text-gray-400">Re-price all {ebayTotal} eBay imports from stored eBay price + new markup</p>
                </div>
              </div>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Markup %</label>
                  <input type="number" min="0" step="1" value={ebayBulkMarkup} onChange={e => setEbayBulkMarkup(e.target.value)}
                    className={ebayInputCls + " w-24"} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Shipping {ebaySymbol}</label>
                  <input type="number" min="0" step="0.01" value={ebayBulkShipping} onChange={e => setEbayBulkShipping(e.target.value)}
                    className={ebayInputCls + " w-24"} />
                </div>
                <button onClick={handleEbayBulkMarkup} disabled={ebayBulkApplying || ebayTotal === 0}
                  className="px-5 py-2 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:bg-[#3a4cd8] transition-colors disabled:opacity-50 flex items-center gap-2">
                  {ebayBulkApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Apply to All {ebayTotal > 0 ? `(${ebayTotal})` : ""}
                </button>
                {ebayBulkMsg && <span className={`text-sm font-semibold ${ebayBulkMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{ebayBulkMsg.text}</span>}
              </div>
            </div>

            {/* eBay imports table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900">{ebayTotal} eBay Imports</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={handleEbaySyncPrices} disabled={ebaySyncing || ebaySyncingDetails || ebayTotal === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-[#4A5CE8] border border-[#4A5CE8]/30 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-40">
                    <RefreshCcw className={`w-3.5 h-3.5 ${ebaySyncing ? "animate-spin" : ""}`} />
                    {ebaySyncing ? "Syncing prices…" : "Sync Prices"}
                  </button>
                  <button onClick={handleEbaySyncDetails} disabled={ebaySyncingDetails || ebaySyncing || ebayTotal === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors disabled:opacity-40">
                    <RefreshCcw className={`w-3.5 h-3.5 ${ebaySyncingDetails ? "animate-spin" : ""}`} />
                    {ebaySyncingDetails ? "Syncing…" : "Sync Name & Description"}
                  </button>
                  {(ebaySyncMsg || ebaySyncDetailsMsg) && (
                    <span className={`text-xs font-semibold ${(ebaySyncMsg ?? ebaySyncDetailsMsg)!.ok ? "text-emerald-600" : "text-red-600"}`}>
                      {(ebaySyncDetailsMsg ?? ebaySyncMsg)!.text}
                    </span>
                  )}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input value={ebayTableSearch} onChange={e => { setEbayTableSearch(e.target.value); setEbayListPage(0); }}
                      placeholder="Search eBay imports…"
                      className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] w-44" />
                    {ebayTableSearch && (
                      <button onClick={() => { setEbayTableSearch(""); setEbayListPage(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <button onClick={loadEbayListings} disabled={ebayLoadingList}
                    className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    <RefreshCw className={`w-3.5 h-3.5 ${ebayLoadingList ? "animate-spin" : ""}`} />
                  </button>
                  {ebayTotal > 0 && (
                    <button onClick={handleEbayClearAll} disabled={ebayClearingAll}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Clear All
                    </button>
                  )}
                </div>
              </div>

              {ebayLoadingList ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
              ) : ebayListings.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold text-gray-500">No eBay imports yet</p>
                  <p className="text-sm mt-1">Search above and pick listings to import</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide w-12"></th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Product</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Cat.</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">eBay Price</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Bazunk Price</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rules</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Site</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ebayListings.map(l => {
                        const specs = parseSpecs(l.specifications) as { source?: string; item_id?: string; ebay_url?: string; ebay_price?: number; ebay_currency?: string; ebay_site?: string; shipping?: number; markup_pct?: number };
                        const sym = specs.ebay_currency === "USD" ? "$" : "£";
                        const bazPrice = parseFloat(l.price);
                        return (
                          <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                            <td className="px-4 py-3">
                              {l.image
                                ? <img src={l.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-gray-100" />
                                : <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>}
                            </td>
                            <td className="px-4 py-3 max-w-xs">
                              <p className="font-medium text-gray-900 truncate leading-tight">{l.title}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{l.public_id}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold capitalize">{l.category}</span>
                            </td>
                            <td className="px-4 py-3 font-semibold text-gray-700">
                              {specs.ebay_price != null ? `${sym}${Number(specs.ebay_price).toFixed(2)}` : "—"}
                            </td>
                            <td className="px-4 py-3 font-black text-[#4A5CE8]">
                              {sym}{bazPrice.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                              {specs.markup_pct != null ? `${specs.markup_pct}% + ${sym}${specs.shipping ?? 0}` : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                specs.ebay_site === "uk" ? "bg-blue-50 text-blue-600" : "bg-indigo-50 text-indigo-600"
                              }`}>
                                {specs.ebay_site === "uk" ? "🇬🇧 UK" : "🇺🇸 US"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {specs.ebay_url && (
                                <a href={specs.ebay_url} target="_blank" rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100 transition-colors">
                                  eBay <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {tab === "aliexpress" && (
          <motion.div key="ali" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center max-w-lg mx-auto mt-8">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📦</span>
              </div>
              <h2 className="font-black text-gray-900 text-lg mb-2">AliExpress Importer</h2>
              <p className="text-sm text-gray-500 mb-6">
                AliExpress importing is available from the seller dashboard. Log in as the seller and use the{" "}
                <strong>Import</strong> section to add individual products with automatic markup and price syncing.
              </p>
              <a href="/sell" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:bg-[#e0601d] transition-colors">
                Open Seller Dashboard <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </motion.div>
        )}

        {tab === "gumtree" && (
          <motion.div key="gumtree" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">

            {/* Search panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Search className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Search Gumtree.com</p>
                    <p className="text-xs text-gray-400">Find listings, tick the ones you want, set expiry and import to Bazunk Classifieds</p>
                  </div>
                </div>
                <form onSubmit={handleGtSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input value={gtQuery} onChange={e => setGtQuery(e.target.value)}
                      placeholder='e.g. "mountain bike", "sofa", "iPhone"…'
                      className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500" />
                    {gtQuery && (
                      <button type="button" onClick={() => { setGtQuery(""); setGtResults([]); setGtHasSearched(false); }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <button type="submit" disabled={gtSearching || !gtQuery.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2">
                    {gtSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {gtSearching ? "Scraping…" : "Search"}
                  </button>
                </form>
                {gtSearchErr && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {gtSearchErr}
                  </div>
                )}
              </div>

              {/* Results */}
              {gtResults.length > 0 && (
                <>
                  {/* Controls bar */}
                  <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <button onClick={toggleAllGt}
                        className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                        {gtSelected.size === gtResults.length
                          ? <CheckSquare className="w-4 h-4 text-emerald-500" />
                          : <Square className="w-4 h-4" />}
                        {gtSelected.size === gtResults.length ? "Deselect all" : "Select all"}
                      </button>
                      {gtSelected.size > 0 && (
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {gtSelected.size} selected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Seller name */}
                      <input value={gtSellerName} onChange={e => setGtSellerName(e.target.value)}
                        placeholder="Contact name"
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500 bg-white w-32" />
                      {/* Seller email */}
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <select value={gtSellerEmail} onChange={e => setGtSellerEmail(e.target.value)}
                          className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500 bg-white max-w-[160px]">
                          {users.length === 0
                            ? <option value="bazunkdeals@gmail.com">bazunkdeals@gmail.com</option>
                            : users.map(u => <option key={u.email} value={u.email}>{u.name ? `${u.name} (${u.email})` : u.email}</option>)
                          }
                        </select>
                      </div>
                      {/* Category */}
                      <select value={gtCat} onChange={e => { setGtCat(e.target.value as typeof gtCat); setGtSub(""); }}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500 bg-white max-w-[140px]">
                        {CLASSIFIED_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                      </select>
                      {/* Subcategory */}
                      <select value={gtSub} onChange={e => setGtSub(e.target.value)}
                        className="px-3 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-500 bg-white max-w-[150px]">
                        <option value="">— subcategory —</option>
                        {CLASSIFIED_CATEGORIES.find(c => c.slug === gtCat)?.subcategoryGroups.map(g => (
                          <optgroup key={g.label} label={g.label}>
                            {g.items.map(item => <option key={item} value={item}>{item}</option>)}
                          </optgroup>
                        ))}
                      </select>
                      {/* Expiry */}
                      <div className="flex gap-0.5 bg-gray-100 rounded-xl p-0.5">
                        {(["7", "14", "30", "unlimited"] as GtExpiry[]).map(e => (
                          <button key={e} onClick={() => setGtExpiry(e)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                              gtExpiry === e ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            }`}>
                            {e === "unlimited" ? "∞" : `${e}d`}
                          </button>
                        ))}
                      </div>
                      {/* Import button */}
                      <button onClick={handleGtImport} disabled={gtImporting || gtSelected.size === 0}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50">
                        {gtImporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                        {gtImporting ? "Importing…" : `Import${gtSelected.size > 0 ? ` (${gtSelected.size})` : ""}`}
                      </button>
                    </div>
                  </div>

                  {gtMsg && (
                    <div className={`mx-5 mt-3 flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
                      gtMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                    }`}>
                      {gtMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                      {gtMsg.text}
                      {gtMsg.ok && (
                        <span className="ml-auto text-xs text-gray-400">
                          Expiry: {gtExpiry === "unlimited" ? "No expiry" : `${gtExpiry} days`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Cards grid */}
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {gtResults.map(listing => {
                      const isSel = gtSelected.has(listing.id);
                      return (
                        <button key={listing.id} onClick={() => toggleGtSelect(listing.id)}
                          className={`relative text-left rounded-xl border-2 transition-all p-3 flex flex-col gap-2 ${
                            isSel ? "border-emerald-500 bg-emerald-50/50" : "border-gray-100 bg-white hover:border-gray-300"
                          }`}>
                          <div className={`absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                            isSel ? "bg-emerald-500" : "bg-gray-100"
                          }`}>
                            {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          {/* Image */}
                          {listing.thumbnail ? (
                            <img src={listing.thumbnail} alt="" className="w-full aspect-square object-cover rounded-lg bg-gray-50" />
                          ) : (
                            <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center">
                              <FileText className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          {/* Title */}
                          <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{listing.title}</p>
                          {/* Price + location */}
                          <div className="flex items-center justify-between gap-1">
                            {listing.price ? (
                              <span className="text-xs font-black text-emerald-600">{listing.price}</span>
                            ) : (
                              <span className="text-xs text-gray-400">No price</span>
                            )}
                            {listing.location && (
                              <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">{listing.location}</span>
                            )}
                          </div>
                          {/* Link */}
                          <a href={listing.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 w-fit">
                            Gumtree <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </button>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-400">{gtResults.length} results on this page</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setGtPage(p => Math.max(1, p - 1))} disabled={gtPage === 1 || gtSearching}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        <ChevronLeft className="w-3 h-3" /> Prev
                      </button>
                      <span className="text-xs text-gray-500">Page {gtPage}</span>
                      <button onClick={() => setGtPage(p => p + 1)} disabled={gtSearching || gtResults.length < 4}
                        className="px-3 py-1 text-xs font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-colors flex items-center gap-1">
                        Next <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {gtHasSearched && gtResults.length === 0 && !gtSearching && !gtSearchErr && (
                <div className="py-10 text-center text-gray-400 text-sm">No results found. Try a different search.</div>
              )}
              {!gtHasSearched && !gtSearching && (
                <div className="py-10 text-center text-gray-400 text-sm">
                  <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                  Search Gumtree above to see listings
                </div>
              )}
            </div>

            {/* Expiry info panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Ad Expiry</p>
                  <p className="text-xs text-gray-400">Set how long imported classifieds remain active on Bazunk</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {([["7", "7 days"], ["14", "14 days"], ["30", "30 days"], ["unlimited", "No expiry (∞)"]] as [GtExpiry, string][]).map(([val, label]) => (
                  <button key={val} onClick={() => setGtExpiry(val)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                      gtExpiry === val
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-600"
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {gtExpiry === "unlimited"
                  ? "Ads will stay active until manually removed."
                  : `Ads will automatically expire ${gtExpiry} days after import.`}
              </p>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}

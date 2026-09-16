import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, RefreshCw, Trash2, ExternalLink, Edit2, Plus, X,
  AlertCircle, CheckCircle2, Clock, Loader2, ShoppingBag, Info,
  ChevronDown, ChevronUp, Search, Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface SupplierImport {
  id: number;
  listing_id: number;
  public_id: string;
  title: string;
  bazunk_price: string;
  image: string | null;
  listing_status: string;
  supplier_source: string;
  supplier_id: string;
  supplier_url: string;
  supplier_price: string;
  supplier_currency: string;
  markup_type: string;
  markup_value: string;
  last_synced_at: string | null;
  sync_status: string;
  sync_error: string | null;
  created_at: string;
}

const USD_TO_GBP = 0.79;

function calcBazunkPrice(supplierUsd: number, markupType: string, markupValue: number): number {
  const gbp = supplierUsd * USD_TO_GBP;
  if (markupType === "fixed") return Math.round((gbp + markupValue) * 100) / 100;
  return Math.round(gbp * (1 + markupValue / 100) * 100) / 100;
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatusBadge({ status, error }: { status: string; error?: string | null }) {
  if (status === "ok") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
      <CheckCircle2 className="w-3 h-3" /> Synced
    </span>
  );
  if (status === "error") return (
    <span title={error ?? undefined} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-600 text-xs font-semibold cursor-help">
      <AlertCircle className="w-3 h-3" /> Error
    </span>
  );
  if (status === "syncing") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 text-xs font-semibold">
      <Loader2 className="w-3 h-3 animate-spin" /> Syncing
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
}

interface ImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  userEmail: string;
  userName: string;
}

const CATEGORIES = [
  "electronics", "fashion", "home", "gaming", "sports",
  "beauty", "books", "automotive", "toys", "other",
];
const CONDITIONS = ["new", "like new", "good", "fair", "poor"];

function ImportModal({ onClose, onSuccess, userEmail, userName }: ImportModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [supplierPriceUsd, setSupplierPriceUsd] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [category, setCategory] = useState("other");
  const [condition, setCondition] = useState("new");
  const [description, setDescription] = useState("");
  const [markupType, setMarkupType] = useState<"percentage" | "fixed">("percentage");
  const [markupValue, setMarkupValue] = useState("30");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [importedTitle, setImportedTitle] = useState("");

  const usd = parseFloat(supplierPriceUsd) || 0;
  const mv = parseFloat(markupValue) || 0;
  const bazunkPreview = usd > 0 ? calcBazunkPrice(usd, markupType, mv) : null;

  const canSubmit = url.trim() && title.trim() && usd > 0 && !loading;

  async function handleImport() {
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/supplier/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          sellerEmail: userEmail,
          sellerName: userName || null,
          title: title.trim(),
          supplierPriceUsd: usd,
          imageUrl: imageUrl.trim() || null,
          category,
          condition,
          description: description.trim() || null,
          markupType,
          markupValue: mv,
        }),
      });
      const data = await r.json() as Record<string, unknown>;
      if (!r.ok) {
        setError((data.error as string) ?? "Import failed");
      } else {
        setImportedTitle(title.trim());
        setSuccess(true);
        onSuccess();
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F26B21] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Import from AliExpress</p>
              <p className="text-xs text-gray-400">Fill in the details from the AliExpress listing</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="px-6 py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <p className="font-bold text-gray-900 text-lg">Imported!</p>
            <p className="text-sm text-gray-400 mt-1 mb-6 truncate px-4">{importedTitle}</p>
            <div className="flex gap-3">
              <button onClick={() => { setSuccess(false); setUrl(""); setTitle(""); setSupplierPriceUsd(""); setImageUrl(""); setDescription(""); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                Import Another
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors">
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
            {/* How-to tip */}
            <div className="bg-blue-50 rounded-xl px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>Open the AliExpress product page, copy the URL and the details below. Bazunk will track this supplier link and manage your markup automatically.</span>
            </div>

            {/* AliExpress URL */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">AliExpress Product URL <span className="text-red-400">*</span></label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.aliexpress.com/item/1005007123456789.html" className={inputCls} />
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Product Title <span className="text-red-400">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Waterproof LED Strip Lights 5m RGB" className={inputCls} />
            </div>

            {/* Price + Image */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Supplier Price (USD) <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">$</span>
                  <input type="number" min="0.01" step="0.01" value={supplierPriceUsd} onChange={e => setSupplierPriceUsd(e.target.value)} placeholder="4.99" className={`${inputCls} pl-7`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className={`${inputCls} bg-white capitalize`}>
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Condition + Image URL */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Condition</label>
                <select value={condition} onChange={e => setCondition(e.target.value)} className={`${inputCls} bg-white`}>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Image URL <span className="text-gray-400 font-normal">(optional)</span></label>
                <input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://ae01.alicdn.com/..." className={inputCls} />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Copy the product description from AliExpress…" rows={2} className={`${inputCls} resize-none`} />
            </div>

            {/* Markup */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Markup Type</label>
                <select value={markupType} onChange={e => setMarkupType(e.target.value as "percentage" | "fixed")} className={`${inputCls} bg-white`}>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount (£)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{markupType === "percentage" ? "Markup %" : "Add £"}</label>
                <input type="number" min="0" step={markupType === "percentage" ? "1" : "0.01"} value={markupValue} onChange={e => setMarkupValue(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Live price preview */}
            {bazunkPreview !== null && (
              <div className="bg-[#F26B21]/8 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-500 text-xs">
                  ${usd.toFixed(2)} USD → £{(usd * 0.79).toFixed(2)} GBP
                  {markupType === "percentage" ? ` +${mv}%` : ` +£${mv.toFixed(2)}`}
                </span>
                <span className="font-black text-[#F26B21] text-base">£{bazunkPreview.toFixed(2)}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!canSubmit}
              className="w-full py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:bg-[#e0601d] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {loading ? "Importing…" : "Create Listing"}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface MarkupEditProps {
  item: SupplierImport;
  onSave: (markupType: string, markupValue: number) => Promise<void>;
  onClose: () => void;
}

function MarkupEditModal({ item, onSave, onClose }: MarkupEditProps) {
  const [markupType, setMarkupType] = useState(item.markup_type);
  const [markupValue, setMarkupValue] = useState(item.markup_value);
  const [saving, setSaving] = useState(false);

  const preview = calcBazunkPrice(parseFloat(item.supplier_price), markupType, parseFloat(markupValue) || 0);

  async function handleSave() {
    setSaving(true);
    await onSave(markupType, parseFloat(markupValue));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-gray-900">Edit Markup</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-500 truncate mb-4">{item.title}</p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Markup Type</label>
            <select
              value={markupType}
              onChange={e => setMarkupType(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed amount (£)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              {markupType === "percentage" ? "Markup %" : "Add £"}
            </label>
            <input
              type="number" min="0" step={markupType === "percentage" ? "1" : "0.01"}
              value={markupValue} onChange={e => setMarkupValue(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
            />
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-sm">
            <span className="text-gray-500">Supplier price: </span>
            <span className="font-semibold">${item.supplier_price} USD</span>
            <span className="text-gray-400 mx-2">→</span>
            <span className="text-gray-500">Bazunk price: </span>
            <span className="font-bold text-[#F26B21]">£{preview.toFixed(2)}</span>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-4 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:bg-[#e0601d] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Changes
        </button>
      </motion.div>
    </div>
  );
}

export function ImporterSection() {
  const { user } = useAuth();
  const [imports, setImports] = useState<SupplierImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierImport | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [apiKeyMissing, setApiKeyMissing] = useState(false);

  const fetchImports = useCallback(async () => {
    if (!user?.email) return;
    try {
      const r = await fetch(`/api/supplier/imports?email=${encodeURIComponent(user.email)}`);
      const data = await r.json() as SupplierImport[];
      setImports(Array.isArray(data) ? data : []);
    } catch {
      setImports([]);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => { fetchImports(); }, [fetchImports]);

  async function handleSync(id: number) {
    setSyncingIds(s => new Set(s).add(id));
    try {
      const r = await fetch(`/api/supplier/imports/${id}/sync`, { method: "POST" });
      const data = await r.json() as Record<string, unknown>;
      if (r.status === 503) setApiKeyMissing(true);
      if (r.ok) await fetchImports();
      else if (data.error && !r.ok && r.status !== 503) console.warn(data.error);
    } finally {
      setSyncingIds(s => { const n = new Set(s); n.delete(id); return n; });
    }
  }

  async function handleSyncAll() {
    setSyncingAll(true);
    try {
      const r = await fetch("/api/supplier/sync", { method: "POST" });
      if (r.status === 503) setApiKeyMissing(true);
      setTimeout(fetchImports, 3000);
    } finally {
      setSyncingAll(false);
    }
  }

  async function handleDelete(id: number, deleteListing: boolean) {
    setDeletingId(id);
    try {
      await fetch(`/api/supplier/imports/${id}?sellerEmail=${encodeURIComponent(user?.email ?? "")}&deleteListing=${deleteListing}`, {
        method: "DELETE",
      });
      await fetchImports();
    } finally {
      setDeletingId(null);
    }
  }

  async function handleMarkupSave(id: number, markupType: string, markupValue: number) {
    await fetch(`/api/supplier/imports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markupType, markupValue, sellerEmail: user?.email }),
    });
    await fetchImports();
  }

  const filtered = imports.filter(i =>
    !search || i.title.toLowerCase().includes(search.toLowerCase()) || i.supplier_id.includes(search)
  );

  const stats = {
    total: imports.length,
    synced: imports.filter(i => i.sync_status === "ok").length,
    errors: imports.filter(i => i.sync_status === "error").length,
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black text-gray-900">AliExpress Importer</h2>
          <p className="text-sm text-gray-400 mt-0.5">Import, markup and auto-sync products from AliExpress</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || imports.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${syncingAll ? "animate-spin" : ""}`} />
            Sync All
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#e0601d] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Import
          </button>
        </div>
      </div>

      {/* API Key missing banner */}
      <AnimatePresence>
        {apiKeyMissing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">RapidAPI key not configured</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Add your <strong>RAPIDAPI_KEY</strong> secret to enable live imports and price syncing.
                Get a free key at <a href="https://rapidapi.com" target="_blank" rel="noopener noreferrer" className="underline">rapidapi.com</a> —
                subscribe to <strong>"Real-Time AliExpress Data"</strong>.
              </p>
            </div>
            <button onClick={() => setApiKeyMissing(false)} className="ml-auto text-amber-400 hover:text-amber-600"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats row */}
      {imports.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: "Imported", value: stats.total, color: "bg-[#4A5CE8]/10 text-[#4A5CE8]" },
            { label: "Synced OK", value: stats.synced, color: "bg-emerald-50 text-emerald-700" },
            { label: "Errors", value: stats.errors, color: stats.errors > 0 ? "bg-red-50 text-red-600" : "bg-gray-50 text-gray-400" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400">{s.label}</p>
              <p className={`text-2xl font-black mt-1 ${s.color.split(" ")[1]}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {imports.length > 3 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search imports…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
          />
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#F26B21]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F26B21]/10 flex items-center justify-center mx-auto mb-4">
            <Package className="w-7 h-7 text-[#F26B21]" />
          </div>
          <p className="font-bold text-gray-900">
            {search ? "No matching imports" : "No imports yet"}
          </p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search ? "Try a different search term" : "Paste an AliExpress URL to import your first product"}
          </p>
          {!search && (
            <button
              onClick={() => setShowImportModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#e0601d] transition-colors"
            >
              <Plus className="w-4 h-4" /> Import First Product
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const isSyncing = syncingIds.has(item.id);
            const isDeleting = deletingId === item.id;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4"
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className="font-semibold text-gray-900 text-sm truncate flex-1">{item.title}</p>
                    <StatusBadge status={item.sync_status} error={item.sync_error} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                    <span>
                      Supplier: <span className="font-medium text-gray-600">${parseFloat(item.supplier_price).toFixed(2)} USD</span>
                    </span>
                    <span>
                      Markup: <span className="font-medium text-gray-600">
                        {item.markup_type === "percentage" ? `+${item.markup_value}%` : `+£${item.markup_value}`}
                      </span>
                    </span>
                    <span className="font-semibold text-[#F26B21]">
                      Bazunk: £{parseFloat(item.bazunk_price).toFixed(2)}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>Synced {timeAgo(item.last_synced_at)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <a
                    href={item.supplier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View on AliExpress"
                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#4A5CE8] hover:bg-[#4A5CE8]/10 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href={`/listing/${item.public_id}`}
                    title="View Bazunk listing"
                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-[#F26B21] hover:bg-[#F26B21]/10 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setEditingItem(item)}
                    title="Edit markup"
                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleSync(item.id)}
                    disabled={isSyncing}
                    title="Sync price now"
                    className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                  >
                    {isSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                  <DeleteButton
                    disabled={isDeleting}
                    onDelete={(withListing) => handleDelete(item.id, withListing)}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Sync info footer */}
      {imports.length > 0 && (
        <p className="mt-4 text-xs text-gray-400 flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Prices auto-sync every 6 hours. Last import: {timeAgo(imports[0]?.created_at ?? null)}.
        </p>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showImportModal && (
          <ImportModal
            onClose={() => setShowImportModal(false)}
            onSuccess={fetchImports}
            userEmail={user.email}
            userName={user.name ?? ""}
          />
        )}
        {editingItem && (
          <MarkupEditModal
            item={editingItem}
            onSave={(mt, mv) => handleMarkupSave(editingItem.id, mt, mv)}
            onClose={() => setEditingItem(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeleteButton({ onDelete, disabled }: { onDelete: (withListing: boolean) => void; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={disabled}
        title="Delete import"
        className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute right-0 top-10 z-50 bg-white border border-gray-100 rounded-xl shadow-lg p-3 w-52"
            >
              <p className="text-xs font-semibold text-gray-700 mb-2">Remove import?</p>
              <button
                onClick={() => { setOpen(false); onDelete(false); }}
                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-gray-50 text-gray-600"
              >
                Keep listing, remove tracking
              </button>
              <button
                onClick={() => { setOpen(false); onDelete(true); }}
                className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-red-50 text-red-600 font-semibold"
              >
                Delete listing too
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

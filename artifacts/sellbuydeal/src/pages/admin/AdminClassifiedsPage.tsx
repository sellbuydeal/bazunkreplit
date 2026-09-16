import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Loader2, AlertCircle, CheckCircle2,
  ExternalLink, ChevronLeft, ChevronRight, Search, X,
  RefreshCw, FileText, ArrowDownToLine, Package,
} from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { useAdmin } from "@/context/AdminContext";
import { CLASSIFIED_CATEGORIES } from "@/data/classifieds";


interface AdRow {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  type: "offer" | "wanted";
  price: string;
  priceLabel: string;
  negotiable: boolean;
  condition: string;
  location: string;
  contactName: string;
  contactPhone: string;
  externalLink: string;
}

interface ClassifiedRow {
  id: number;
  title: string;
  category: string;
  subcategory: string | null;
  type: string;
  price: string | null;
  price_label: string | null;
  location: string;
  contact_name: string;
  contact_phone: string | null;
  external_link: string | null;
  posted_at: string;
  status: string;
}

function makeBlankRow(): AdRow {
  return {
    id: Math.random().toString(36).slice(2),
    category: CLASSIFIED_CATEGORIES[0].slug,
    subcategory: "",
    title: "",
    description: "",
    type: "offer",
    price: "",
    priceLabel: "",
    negotiable: false,
    condition: "",
    location: "",
    contactName: "",
    contactPhone: "",
    externalLink: "",
  };
}

const inputCls = "px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] bg-white w-full";
const PAGE_SIZE = 50;

export function AdminClassifiedsPage() {
  const { authFetch } = useAdmin();

  // ── Batch-import rows ─────────────────────────────────────────
  const [rows, setRows] = useState<AdRow[]>([makeBlankRow()]);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Existing ads table ────────────────────────────────────────
  const [ads, setAds] = useState<ClassifiedRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [tableSearch, setTableSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadAds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        ...(tableSearch ? { search: tableSearch } : {}),
      });
      const r = await authFetch(`/api/admin/classifieds?${params}`);
      if (r.ok) {
        const d = await r.json() as { ads: ClassifiedRow[]; total: number };
        setAds(d.ads ?? []);
        setTotal(d.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch, page, tableSearch]);

  useEffect(() => { loadAds(); }, [loadAds]);

  // ── Row helpers ───────────────────────────────────────────────
  function updateRow(id: string, patch: Partial<AdRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function addRow() { setRows(prev => [...prev, makeBlankRow()]); }

  function removeRow(id: string) {
    setRows(prev => prev.length === 1 ? [makeBlankRow()] : prev.filter(r => r.id !== id));
  }

  function duplicateRow(id: string) {
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === id);
      if (idx === -1) return prev;
      const copy = { ...prev[idx], id: Math.random().toString(36).slice(2) };
      return [...prev.slice(0, idx + 1), copy, ...prev.slice(idx + 1)];
    });
  }

  // ── Batch import ──────────────────────────────────────────────
  async function handleImport() {
    const valid = rows.filter(r => r.title.trim() && r.description.trim() && r.location.trim() && r.contactName.trim());
    if (!valid.length) {
      setImportMsg({ ok: false, text: "Fill in at least title, description, location, and contact name on each row" });
      return;
    }
    setImporting(true);
    setImportMsg(null);
    try {
      const ads = valid.map(r => ({
        title: r.title.trim(),
        description: r.description.trim(),
        category: r.category,
        subcategory: r.subcategory || null,
        type: r.type,
        price: r.price ? r.price : null,
        priceLabel: r.priceLabel || null,
        negotiable: r.negotiable,
        condition: r.condition || null,
        location: r.location.trim(),
        contactName: r.contactName.trim(),
        contactPhone: r.contactPhone || null,
        externalLink: r.externalLink || null,
        source: "gumtree",
      }));
      const res = await authFetch("/api/admin/classifieds/batch-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ads }),
      });
      const d = await res.json() as { imported?: number; error?: string };
      if (res.ok) {
        setImportMsg({ ok: true, text: `Imported ${d.imported} classified ad${d.imported === 1 ? "" : "s"}` });
        setRows([makeBlankRow()]);
        loadAds();
      } else {
        setImportMsg({ ok: false, text: d.error ?? "Import failed" });
      }
    } catch {
      setImportMsg({ ok: false, text: "Network error — try again" });
    } finally {
      setImporting(false);
    }
  }

  // ── Delete ad ─────────────────────────────────────────────────
  async function handleDelete(id: number) {
    if (!confirm("Delete this classified ad?")) return;
    setDeletingId(id);
    try {
      await authFetch(`/api/admin/classifieds/${id}`, { method: "DELETE" });
      loadAds();
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const validCount = rows.filter(r => r.title.trim() && r.description.trim() && r.location.trim() && r.contactName.trim()).length;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-gray-900">Classifieds Importer</h1>
          <p className="text-sm text-gray-400 mt-0.5">Batch-import Gumtree-style ads — categories auto-map to Bazunk classifieds</p>
        </div>
      </div>

      {/* Batch import form */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#10B981] flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Batch Import Ads</p>
                <p className="text-xs text-gray-400">Add rows below — one row per classified ad</p>
              </div>
            </div>
            <button onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-dashed border-[#10B981]/40 text-[#10B981] text-sm font-bold hover:bg-emerald-50 transition-colors">
              <Plus className="w-4 h-4" /> Add Row
            </button>
          </div>

          {/* Column headers */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap w-[220px]">Category / Subcategory</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[200px]">Title</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[220px]">Description</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[80px]">Type</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[70px]">Price £</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[90px]">Price Label</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[80px]">Condition</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[120px]">Location</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[120px]">Contact Name</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[110px]">Phone</th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-400 uppercase tracking-wide w-[140px]">Gumtree URL</th>
                  <th className="px-3 py-2.5 w-[60px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const catMeta = CLASSIFIED_CATEGORIES.find(c => c.slug === row.category);
                  const isEmpty = !row.title.trim() && !row.description.trim();
                  return (
                    <tr key={row.id} className={`border-b border-gray-50 ${isEmpty && idx > 0 ? "opacity-50" : ""}`}>
                      {/* Category / Subcategory */}
                      <td className="px-3 py-2">
                        <select value={row.category} onChange={e => updateRow(row.id, { category: e.target.value, subcategory: "" })}
                          className={inputCls + " mb-1"}>
                          {CLASSIFIED_CATEGORIES.map(c => (
                            <option key={c.slug} value={c.slug}>{c.label}</option>
                          ))}
                        </select>
                        <select value={row.subcategory} onChange={e => updateRow(row.id, { subcategory: e.target.value })}
                          className={inputCls}>
                          <option value="">— Subcategory —</option>
                          {catMeta?.subcategoryGroups.map(group => (
                            <optgroup key={group.label} label={group.label}>
                              {group.items.map(item => (
                                <option key={item} value={item}>{item}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </td>
                      {/* Title */}
                      <td className="px-3 py-2">
                        <input value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })}
                          placeholder="Ad title*" className={inputCls} />
                      </td>
                      {/* Description */}
                      <td className="px-3 py-2">
                        <textarea value={row.description} onChange={e => updateRow(row.id, { description: e.target.value })}
                          placeholder="Description*" rows={2}
                          className={inputCls + " resize-none"} />
                      </td>
                      {/* Type */}
                      <td className="px-3 py-2">
                        <select value={row.type} onChange={e => updateRow(row.id, { type: e.target.value as "offer" | "wanted" })}
                          className={inputCls}>
                          <option value="offer">Offer</option>
                          <option value="wanted">Wanted</option>
                        </select>
                      </td>
                      {/* Price */}
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" value={row.price} onChange={e => updateRow(row.id, { price: e.target.value })}
                          placeholder="0.00" className={inputCls} />
                      </td>
                      {/* Price label */}
                      <td className="px-3 py-2">
                        <select value={row.priceLabel} onChange={e => updateRow(row.id, { priceLabel: e.target.value })} className={inputCls}>
                          <option value="">Fixed</option>
                          <option value="Negotiable">Negotiable</option>
                          <option value="Free">Free</option>
                          <option value="Trade">Trade</option>
                          <option value="ONO">ONO</option>
                          <option value="Offers">Offers</option>
                          <option value="POA">POA</option>
                        </select>
                      </td>
                      {/* Condition */}
                      <td className="px-3 py-2">
                        <select value={row.condition} onChange={e => updateRow(row.id, { condition: e.target.value })} className={inputCls}>
                          <option value="">—</option>
                          <option value="New">New</option>
                          <option value="Like New">Like New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="For Parts">For Parts</option>
                        </select>
                      </td>
                      {/* Location */}
                      <td className="px-3 py-2">
                        <input value={row.location} onChange={e => updateRow(row.id, { location: e.target.value })}
                          placeholder="City / area*" className={inputCls} />
                      </td>
                      {/* Contact name */}
                      <td className="px-3 py-2">
                        <input value={row.contactName} onChange={e => updateRow(row.id, { contactName: e.target.value })}
                          placeholder="Name*" className={inputCls} />
                      </td>
                      {/* Phone */}
                      <td className="px-3 py-2">
                        <input value={row.contactPhone} onChange={e => updateRow(row.id, { contactPhone: e.target.value })}
                          placeholder="07..." className={inputCls} />
                      </td>
                      {/* Gumtree URL */}
                      <td className="px-3 py-2">
                        <input value={row.externalLink} onChange={e => updateRow(row.id, { externalLink: e.target.value })}
                          placeholder="https://gumtree.com/…" className={inputCls} />
                      </td>
                      {/* Actions */}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => duplicateRow(row.id)} title="Duplicate"
                            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => removeRow(row.id)} title="Remove"
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button onClick={addRow}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                <Plus className="w-4 h-4" /> Add Another Row
              </button>
              <span className="text-xs text-gray-400">{rows.length} row{rows.length !== 1 ? "s" : ""}, {validCount} valid</span>
            </div>
            <div className="flex items-center gap-3">
              {importMsg && (
                <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl ${
                  importMsg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}>
                  {importMsg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
                  {importMsg.text}
                </div>
              )}
              <button onClick={handleImport} disabled={importing || validCount === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#10B981] text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50">
                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
                {importing ? "Importing…" : `Import ${validCount > 0 ? `(${validCount})` : ""}`}
              </button>
            </div>
          </div>
        </div>

        {/* Category reference */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="font-bold text-gray-900">Bazunk Category Reference</p>
            <p className="text-xs text-gray-400 mt-0.5">All available categories and their subcategory groups</p>
          </div>
          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
            {CLASSIFIED_CATEGORIES.map(cat => (
              <div key={cat.slug} className="p-3 rounded-xl border border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-800 mb-1" style={{ color: cat.color }}>{cat.label}</p>
                {cat.subcategoryGroups.map(g => (
                  <p key={g.label} className="text-[10px] text-gray-400 truncate">· {g.label}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Existing classifieds table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="font-bold text-gray-900">{total} Classified Ads</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input value={tableSearch} onChange={e => { setTableSearch(e.target.value); setPage(0); }}
                  placeholder="Search ads…"
                  className="pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] w-44" />
                {tableSearch && (
                  <button onClick={() => { setTableSearch(""); setPage(0); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button onClick={loadAds} disabled={loading}
                className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
          ) : ads.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="font-semibold text-gray-500">No classified ads yet</p>
              <p className="text-sm mt-1">Import some above to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Price</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Posted</th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map(ad => (
                    <tr key={ad.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-gray-900 truncate">{ad.title}</p>
                        {ad.external_link && (
                          <a href={ad.external_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5 w-fit">
                            Gumtree <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold capitalize">{ad.category.replace("-", " ")}</span>
                        {ad.subcategory && <p className="text-[10px] text-gray-400 mt-0.5">{ad.subcategory}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ad.type === "offer" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>
                          {ad.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-700">
                        {ad.price ? `£${Number(ad.price).toFixed(2)}` : ad.price_label ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{ad.location}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {ad.contact_name}
                        {ad.contact_phone && <p className="text-xs text-gray-400">{ad.contact_phone}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {new Date(ad.posted_at).toLocaleDateString("en-GB")}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(ad.id)} disabled={deletingId === ad.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          {deletingId === ad.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  ))}
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
    </AdminLayout>
  );
}

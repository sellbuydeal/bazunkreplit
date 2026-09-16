import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle2, ArrowDownToLine, FileText, ChevronDown } from "lucide-react";
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
  condition: string;
  location: string;
  contactName: string;
  contactPhone: string;
  externalLink: string;
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
    condition: "",
    location: "",
    contactName: "",
    contactPhone: "",
    externalLink: "",
  };
}

const inputCls = "px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#10B981]/30 focus:border-[#10B981] bg-white w-full";

export function UserClassifiedsImporterSection() {
  const [rows, setRows] = useState<AdRow[]>([makeBlankRow()]);
  const [importing, setImporting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function updateRow(id: string, patch: Partial<AdRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }
  function addRow() { setRows(prev => [...prev, makeBlankRow()]); }
  function removeRow(id: string) {
    setRows(prev => prev.length === 1 ? [makeBlankRow()] : prev.filter(r => r.id !== id));
  }

  async function handleImport() {
    const valid = rows.filter(r => r.title.trim() && r.description.trim() && r.location.trim() && r.contactName.trim());
    if (!valid.length) {
      setMsg({ ok: false, text: "Fill in title, description, location, and your name on each row" });
      return;
    }
    setImporting(true);
    setMsg(null);
    try {
      const ads = valid.map(r => ({
        title: r.title.trim(),
        description: r.description.trim(),
        category: r.category,
        subcategory: r.subcategory || null,
        type: r.type,
        price: r.price || null,
        priceLabel: r.priceLabel || null,
        condition: r.condition || null,
        location: r.location.trim(),
        contactName: r.contactName.trim(),
        contactPhone: r.contactPhone || null,
        externalLink: r.externalLink || null,
      }));
      let imported = 0;
      for (const ad of ads) {
        const r = await fetch("/api/classifieds", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(ad),
        });
        if (r.ok) imported++;
      }
      setMsg({ ok: true, text: `Posted ${imported} classified ad${imported === 1 ? "" : "s"} — they're now live on Bazunk Classifieds!` });
      setRows([makeBlankRow()]);
    } catch {
      setMsg({ ok: false, text: "Network error — try again" });
    } finally {
      setImporting(false);
    }
  }

  const validCount = rows.filter(r => r.title.trim() && r.description.trim() && r.location.trim() && r.contactName.trim()).length;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Intro */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-black text-lg">Gumtree → Bazunk Classifieds</p>
            <p className="text-white/80 text-sm">Re-post your Gumtree ads here — pick a category and go</p>
          </div>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-4">
        {rows.map((row, idx) => {
          const catMeta = CLASSIFIED_CATEGORIES.find(c => c.slug === row.category);
          return (
            <div key={row.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-black text-gray-700">Ad #{idx + 1}</span>
                <button onClick={() => removeRow(row.id)}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Category two-level picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Category</label>
                  <div className="relative">
                    <select
                      value={row.category}
                      onChange={e => updateRow(row.id, { category: e.target.value, subcategory: "" })}
                      className={inputCls + " appearance-none pr-8"}
                    >
                      {CLASSIFIED_CATEGORIES.map(c => (
                        <option key={c.slug} value={c.slug}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subcategory <span className="font-normal text-gray-400">(optional)</span></label>
                  <div className="relative">
                    <select
                      value={row.subcategory}
                      onChange={e => updateRow(row.id, { subcategory: e.target.value })}
                      className={inputCls + " appearance-none pr-8"}
                    >
                      <option value="">— All {catMeta?.label ?? "Category"} —</option>
                      {catMeta?.subcategoryGroups.map(group => (
                        <optgroup key={group.label} label={group.label}>
                          {group.items.map(item => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title *</label>
                  <input value={row.title} onChange={e => updateRow(row.id, { title: e.target.value })}
                    placeholder="e.g. iPhone 13 Pro, 256GB, excellent condition" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Type</label>
                  <select value={row.type} onChange={e => updateRow(row.id, { type: e.target.value as "offer" | "wanted" })}
                    className={inputCls}>
                    <option value="offer">Offering (I have this)</option>
                    <option value="wanted">Wanted (I'm looking for this)</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description *</label>
                <textarea value={row.description} onChange={e => updateRow(row.id, { description: e.target.value })}
                  rows={3} placeholder="Describe the item — condition, features, reason for selling…"
                  className={inputCls + " resize-none"} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Price (£)</label>
                  <input type="number" min="0" step="0.01" value={row.price} onChange={e => updateRow(row.id, { price: e.target.value })}
                    placeholder="0.00" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Price Type</label>
                  <select value={row.priceLabel} onChange={e => updateRow(row.id, { priceLabel: e.target.value })} className={inputCls}>
                    <option value="">Fixed</option>
                    <option value="Negotiable">Negotiable</option>
                    <option value="Free">Free</option>
                    <option value="Trade">Trade</option>
                    <option value="ONO">ONO</option>
                    <option value="Offers">Offers</option>
                    <option value="POA">POA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Condition</label>
                  <select value={row.condition} onChange={e => updateRow(row.id, { condition: e.target.value })} className={inputCls}>
                    <option value="">—</option>
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="For Parts">For Parts</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Location *</label>
                  <input value={row.location} onChange={e => updateRow(row.id, { location: e.target.value })}
                    placeholder="e.g. Manchester" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Your Name *</label>
                  <input value={row.contactName} onChange={e => updateRow(row.id, { contactName: e.target.value })}
                    placeholder="First name or full name" className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Phone (optional)</label>
                  <input value={row.contactPhone} onChange={e => updateRow(row.id, { contactPhone: e.target.value })}
                    placeholder="07..." className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Original Gumtree URL</label>
                  <input value={row.externalLink} onChange={e => updateRow(row.id, { externalLink: e.target.value })}
                    placeholder="https://gumtree.com/…" className={inputCls} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={addRow}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <Plus className="w-4 h-4" /> Add Another Ad
        </button>
        <div className="flex items-center gap-3">
          {msg && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
              msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
            }`}>
              {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {msg.text}
            </div>
          )}
          <button onClick={handleImport} disabled={importing || validCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#10B981] text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
            {importing ? "Posting…" : `Post ${validCount > 0 ? `${validCount} Ad${validCount !== 1 ? "s" : ""}` : "Ads"}`}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

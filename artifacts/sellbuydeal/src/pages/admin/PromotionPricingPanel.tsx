import { useCallback, useEffect, useState } from "react";
import { Coins, Loader2, Check, RotateCcw } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

interface Row {
  type: string;
  label: string;
  kind: "listing" | "auction";
  oneShot: boolean;
  comingSoon: boolean;
  credits: number;
  daysValid: number;
  enabled: boolean;
  defaultCredits: number;
  defaultDays: number;
}

/**
 * Admin → Promotions: set what each promotion costs (in credits, 100 = £1), how long it lasts
 * and whether sellers can buy it. Changes apply immediately on the seller Promotions page.
 */
export function PromotionPricingPanel() {
  const { authFetch } = useAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, Partial<Row>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await authFetch(`/api/admin/promotion-settings?_t=${Date.now()}`);
      if (!r.ok) { setError(`Couldn't load prices (error ${r.status})`); return; }
      setRows(await r.json());
      setEdits({});
    } catch { setError("Couldn't reach the server"); }
  }, [authFetch]);

  useEffect(() => { void load(); }, [load]);

  function set(type: string, patch: Partial<Row>) {
    setEdits(prev => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  async function save(row: Row) {
    const e = { ...row, ...(edits[row.type] ?? {}) };
    setSaving(row.type); setError("");
    try {
      const r = await authFetch(`/api/admin/promotion-settings/${row.type}`, {
        method: "PUT",
        body: JSON.stringify({ credits: e.credits, daysValid: e.daysValid, enabled: e.enabled }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Failed to save"); return; }
      setRows(prev => prev.map(x => x.type === row.type ? { ...x, credits: e.credits, daysValid: e.daysValid, enabled: e.enabled } : x));
      setEdits(prev => { const n = { ...prev }; delete n[row.type]; return n; });
      setSaved(row.type);
      setTimeout(() => setSaved(null), 2000);
    } catch { setError("Network error — try again"); }
    finally { setSaving(null); }
  }

  const groups: { title: string; hint?: string; rows: Row[] }[] = [
    { title: "Listing promotions", rows: rows.filter(r => r.kind === "listing" && !r.comingSoon) },
    { title: "Auction add-ons", hint: "Charged to the seller when they create an auction.", rows: rows.filter(r => r.kind === "auction") },
    { title: "Coming soon", hint: "Shown to sellers as “Coming soon” and can't be bought yet. Set the price now so it's ready.", rows: rows.filter(r => r.comingSoon) },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl mb-8 overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50">
        <span className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center"><Coins className="w-5 h-5 text-amber-500" /></span>
        <span className="flex-1">
          <span className="block font-black text-gray-900">Promotion pricing</span>
          <span className="block text-xs text-gray-500">Set what each promotion costs sellers (credits — 100 credits = £1), how long it lasts, and whether it's on sale.</span>
        </span>
        <span className="text-xs font-semibold text-gray-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 pb-5">
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          {rows.length === 0 && !error && <p className="py-6 text-sm text-gray-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</p>}

          {groups.filter(g => g.rows.length).map(g => (
            <div key={g.title} className="mt-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">{g.title}</h3>
              {g.hint && <p className="text-xs text-gray-400 mt-0.5">{g.hint}</p>}
              <div className="mt-2 divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                {g.rows.map(row => {
                  const e = { ...row, ...(edits[row.type] ?? {}) };
                  const dirty = !!edits[row.type] && (e.credits !== row.credits || e.daysValid !== row.daysValid || e.enabled !== row.enabled);
                  return (
                    <div key={row.type} className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white">
                      <div className="flex-1 min-w-[170px]">
                        <p className="text-sm font-bold text-gray-900">{row.label}</p>
                        <p className="text-[11px] text-gray-400">
                          Default {row.defaultCredits} cr{!row.oneShot && ` · ${row.defaultDays}d`}
                          {(e.credits !== row.defaultCredits || (!row.oneShot && e.daysValid !== row.defaultDays)) && (
                            <button type="button" onClick={() => set(row.type, { credits: row.defaultCredits, daysValid: row.defaultDays })}
                              className="ml-2 inline-flex items-center gap-0.5 text-[#4A5CE8] hover:underline"><RotateCcw className="w-3 h-3" />reset</button>
                          )}
                        </p>
                      </div>
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input type="number" min={0} step={1} value={e.credits}
                          onChange={ev => set(row.type, { credits: parseInt(ev.target.value) || 0 })}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                        cr <span className="text-gray-300">≈ £{(e.credits / 100).toFixed(2)}</span>
                      </label>
                      {!row.oneShot ? (
                        <label className="flex items-center gap-1.5 text-xs text-gray-500">
                          <input type="number" min={1} max={365} step={1} value={e.daysValid}
                            onChange={ev => set(row.type, { daysValid: parseInt(ev.target.value) || 1 })}
                            className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-[#4A5CE8]" />
                          days
                        </label>
                      ) : <span className="w-[88px] text-xs text-gray-300 text-center">one-off</span>}
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={e.enabled} disabled={row.comingSoon && false}
                          onChange={ev => set(row.type, { enabled: ev.target.checked })} />
                        {row.comingSoon ? "Ready" : "On sale"}
                      </label>
                      <button type="button" onClick={() => save(row)} disabled={!dirty || saving === row.type}
                        className={`min-w-[72px] px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${
                          saved === row.type ? "bg-emerald-100 text-emerald-600" : "bg-[#4A5CE8] text-white disabled:opacity-30"}`}>
                        {saving === row.type ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved === row.type ? <><Check className="w-3.5 h-3.5" />Saved</> : "Save"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

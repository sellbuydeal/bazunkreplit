import { useEffect, useState } from "react";
import { X, Eye, Users, ShoppingBag, Percent, Loader2, AlertCircle } from "lucide-react";

interface Analytics {
  title: string;
  views: number;
  uniqueVisitors: number;
  trackingSince: string | null;
  watchers: number;
  sales: number;
  conversionRate: number;
  sources: { source: string; count: number }[];
  daily: { day: string; views: number }[];
}

const SOURCE_LABELS: Record<string, string> = {
  direct: "Direct / link", internal: "Browsing Bazunk", search: "Search engines", social: "Social media", email: "Email", referral: "Other websites", other: "Other",
};

export function ListingAnalyticsModal({ listingId, email, onClose }: { listingId: number; email: string; onClose: () => void }) {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/promotions/analytics/${listingId}?email=${encodeURIComponent(email)}`)
      .then(async r => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Couldn't load analytics");
        setData(d);
      })
      .catch((e: Error) => setError(e.message));
  }, [listingId, email]);

  const maxDay = Math.max(1, ...(data?.daily.map(d => d.views) ?? [1]));
  const totalSrc = Math.max(1, (data?.sources ?? []).reduce((s, x) => s + x.count, 0));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="font-black text-gray-900">Listing analytics</h2>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{data?.title ?? "Loading…"}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 ml-3"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {error && <p className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="w-4 h-4" />{error}</p>}
          {!data && !error && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>}
          {data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: Eye, label: "Views", value: data.views.toLocaleString(), color: "text-blue-500", bg: "bg-blue-50" },
                  { icon: Users, label: "Watchers", value: data.watchers.toLocaleString(), color: "text-purple-500", bg: "bg-purple-50" },
                  { icon: ShoppingBag, label: "Sales", value: data.sales.toLocaleString(), color: "text-emerald-500", bg: "bg-emerald-50" },
                  { icon: Percent, label: "Conversion", value: `${data.conversionRate}%`, color: "text-amber-500", bg: "bg-amber-50" },
                ].map(k => (
                  <div key={k.label} className="rounded-xl border border-gray-100 p-3">
                    <span className={`w-8 h-8 rounded-lg ${k.bg} flex items-center justify-center mb-2`}><k.icon className={`w-4 h-4 ${k.color}`} /></span>
                    <p className="text-xl font-black text-gray-900">{k.value}</p>
                    <p className="text-[11px] text-gray-400">{k.label}</p>
                  </div>
                ))}
              </div>

              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Views — last 14 days</h3>
              <div className="flex items-end gap-1 h-28 mb-1">
                {data.daily.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col justify-end h-full group relative" title={`${d.day}: ${d.views} views`}>
                    <div className="w-full rounded-t bg-[#4A5CE8]/80 group-hover:bg-[#4A5CE8] transition-colors" style={{ height: `${Math.max(d.views ? 6 : 2, (d.views / maxDay) * 100)}%`, opacity: d.views ? 1 : 0.25 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 mb-5"><span>{data.daily[0]?.day.slice(5)}</span><span>{data.daily[data.daily.length - 1]?.day.slice(5)}</span></div>

              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">Traffic sources</h3>
              {data.sources.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">No visits recorded yet — they'll appear here as buyers view your listing.</p>
              ) : (
                <div className="space-y-2 mb-4">
                  {data.sources.map(s => (
                    <div key={s.source}>
                      <div className="flex justify-between text-xs text-gray-600 mb-0.5"><span>{SOURCE_LABELS[s.source] ?? s.source}</span><span className="font-bold">{s.count} ({Math.round((s.count / totalSrc) * 100)}%)</span></div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#F26B21] rounded-full" style={{ width: `${(s.count / totalSrc) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {data.uniqueVisitors.toLocaleString()} unique visitors{data.trackingSince ? ` since ${new Date(data.trackingSince).toLocaleDateString("en-GB")}` : ""}.
                Visits are counted from when tracking began. Sales are matched to this listing by its title, and conversion is sales ÷ unique visitors.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

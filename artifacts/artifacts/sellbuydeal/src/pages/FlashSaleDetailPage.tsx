import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  Zap, ChevronLeft, User2, Tag, Shield, Timer,
  TrendingDown, AlertCircle, Loader2, CheckCircle2, XCircle, CalendarClock,
  Bell, BellOff, Coffee, Calendar, Star,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

type FlashSale = {
  id: string; seller_name: string; seller_email: string;
  title: string; description: string | null; image: string | null; category: string | null;
  original_price: string; sale_price: string; discount_percent: number;
  starts_at: string; ends_at: string; status: string; sale_type: string;
};

const SALE_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  standard:       { label: "Flash Sale",     icon: Zap,      color: "text-orange-600", bg: "bg-orange-100" },
  lightning:      { label: "Lightning Deal", icon: Zap,      color: "text-red-600",    bg: "bg-red-100" },
  happy_hour:     { label: "Happy Hour",     icon: Coffee,   color: "text-amber-600",  bg: "bg-amber-100" },
  weekend_mega:   { label: "Weekend Mega",   icon: Calendar, color: "text-purple-600", bg: "bg-purple-100" },
  category_event: { label: "Category Event", icon: Star,     color: "text-blue-600",   bg: "bg-blue-100" },
};

function getTimeLeft(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    hours: Math.floor(diff / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

function BigCountdownBanner({ sale }: { sale: FlashSale }) {
  const isActive = sale.status === "active";
  const target = isActive ? sale.ends_at : sale.starts_at;
  const [t, setT] = useState(() => getTimeLeft(target));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const urgent = isActive && t !== null && t.total < 3600000;
  const isLightning = sale.sale_type === "lightning";
  const bg = isLightning ? "bg-red-50 border-red-200" : urgent ? "bg-red-50 border-red-200" : isActive ? "bg-orange-50 border-orange-200" : "bg-amber-50 border-amber-200";
  const textColor = isLightning ? "text-red-600" : urgent ? "text-red-600" : isActive ? "text-orange-600" : "text-amber-700";

  if (!t) return (
    <div className={`rounded-2xl border p-5 text-center ${isActive ? "bg-gray-50 border-gray-200" : bg}`}>
      <p className="font-black text-lg text-gray-500">{isActive ? "This sale has ended" : "Sale is now live!"}</p>
    </div>
  );

  return (
    <div className={`rounded-2xl border p-5 ${bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-3 text-center ${textColor}`}>
        {isActive ? "⚡ Sale ends in" : "🕐 Sale starts in"}
      </p>
      <div className="flex items-center justify-center gap-3">
        {[{ label: "Hours", v: t.hours }, { label: "Mins", v: t.mins }, { label: "Secs", v: t.secs }].map((b, i, arr) => (
          <div key={b.label} className="flex items-center gap-3">
            <div className="text-center px-4 py-3 rounded-xl min-w-[60px] bg-white shadow-sm">
              <p className={`text-3xl font-black tabular-nums ${textColor}`}>{String(b.v).padStart(2, "0")}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{b.label}</p>
            </div>
            {i < arr.length - 1 && <span className={`text-2xl font-black ${textColor} opacity-40`}>:</span>}
          </div>
        ))}
      </div>
      {isLightning && (
        <p className="text-center text-xs text-red-500 font-semibold mt-3 animate-pulse">⚡ Lightning Deal — extremely limited time!</p>
      )}
    </div>
  );
}

function NotifyButton({ sale }: { sale: FlashSale }) {
  const [state, setState] = useState<"idle" | "set" | "denied">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  async function handleNotify() {
    if (!("Notification" in window)) { setState("denied"); return; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }

    const msUntilStart = new Date(sale.starts_at).getTime() - Date.now();
    const msUntilEnd = new Date(sale.ends_at).getTime() - Date.now();
    const isActive = sale.status === "active";

    if (isActive && msUntilEnd > 0 && msUntilEnd < 300000) {
      new Notification("⚡ Ending Soon!", { body: `${sale.title} — only ${Math.ceil(msUntilEnd / 60000)} min left!`, icon: "/logo.png" });
    } else if (!isActive && msUntilStart > 0) {
      const notifyAt = Math.max(0, msUntilStart - 60000);
      timerRef.current = setTimeout(() => {
        new Notification("🔥 Flash Sale Starting!", { body: `${sale.title} is going live now!`, icon: "/logo.png" });
      }, notifyAt);
    }
    if (msUntilEnd > 300000) {
      setTimeout(() => {
        new Notification("⚡ Last 5 Minutes!", { body: `${sale.title} ends soon — grab it!`, icon: "/logo.png" });
      }, Math.max(0, msUntilEnd - 300000));
    }
    setState("set");
  }

  const label = sale.status === "active" ? "Notify when ending" : "Notify when live";

  if (state === "set") return (
    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-600 bg-emerald-50 rounded-xl px-4 py-3">
      <Bell className="w-4 h-4" /> You'll be notified
    </div>
  );
  if (state === "denied") return (
    <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-3">
      <BellOff className="w-4 h-4" /> Notifications blocked in browser
    </div>
  );
  return (
    <button onClick={handleNotify}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#4A5CE8] text-[#4A5CE8] text-sm font-semibold hover:bg-[#4A5CE8]/5 transition-colors">
      <Bell className="w-4 h-4" /> {label}
    </button>
  );
}

export function FlashSaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [sale, setSale] = useState<FlashSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/flash-sales/${id}`);
      if (res.status === 404) { setError("Flash sale not found"); return; }
      if (!res.ok) throw new Error();
      setSale(await res.json());
    } catch { setError("Failed to load flash sale"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function cancelSale() {
    if (!sale || !user) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/flash-sales/${id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) { setCancelled(true); await load(); }
    } finally { setCancelling(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-[#F26B21]" /></div>
      <Footer />
    </div>
  );

  if (error || !sale) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <p className="font-semibold text-gray-600">{error ?? "Not found"}</p>
        <Link href="/flash-sales" className="flex items-center gap-1.5 text-[#4A5CE8] text-sm font-semibold hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Flash Sales
        </Link>
      </div>
      <Footer />
    </div>
  );

  const orig = parseFloat(sale.original_price);
  const sp = parseFloat(sale.sale_price);
  const isOwnSale = user?.email === sale.seller_email;
  const isActive = sale.status === "active";
  const isUpcoming = sale.status === "upcoming";
  const isLightning = sale.sale_type === "lightning";
  const typeMeta = SALE_TYPE_META[sale.sale_type] ?? SALE_TYPE_META.standard;
  const TypeIcon = typeMeta.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        <Link href="/flash-sales" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] mb-6 w-fit">
          <ChevronLeft className="w-4 h-4" /> Back to Flash Sales
        </Link>

        {/* Lightning Deal banner */}
        {isLightning && isActive && (
          <div className="mb-5 bg-red-600 rounded-2xl px-5 py-3 flex items-center gap-3 text-white">
            <Zap className="w-5 h-5 fill-white shrink-0" />
            <p className="font-black text-sm">Lightning Deal — this sale lasts 5–15 minutes only. Don't miss it!</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden aspect-[16/9]">
              {sale.image ? (
                <img src={sale.image} alt={sale.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                  <Zap className="w-16 h-16" />
                  <p className="text-sm mt-2 text-gray-400">No image provided</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start gap-3 justify-between mb-4">
                <h1 className="text-xl font-black text-gray-900 leading-snug">{sale.title}</h1>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                  isActive ? "bg-orange-100 text-orange-700" :
                  isUpcoming ? "bg-amber-100 text-amber-700" :
                  sale.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {isActive ? "⚡ Live" : isUpcoming ? "🕐 Upcoming" : sale.status === "cancelled" ? "Cancelled" : "Ended"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {/* Sale type badge */}
                <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${typeMeta.bg} ${typeMeta.color}`}>
                  <TypeIcon className="w-3 h-3" /> {typeMeta.label}
                </span>
                {sale.category && (
                  <span className="bg-[#4A5CE8]/10 text-[#4A5CE8] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Tag className="w-3 h-3" /> {sale.category}
                  </span>
                )}
                <span className="bg-[#F26B21]/10 text-[#F26B21] text-xs font-bold px-2.5 py-1 rounded-full">-{sale.discount_percent}% OFF</span>
              </div>
              {sale.description && <p className="text-sm text-gray-600 leading-relaxed">{sale.description}</p>}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#4A5CE8] flex items-center justify-center text-white font-black text-lg">
                {sale.seller_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{sale.seller_name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><User2 className="w-3 h-3" /> Seller</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                <Shield className="w-3.5 h-3.5" /> Verified Seller
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            <BigCountdownBanner sale={sale} />

            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-center mb-5">
                <p className="text-xs text-gray-400 mb-1">Flash sale price</p>
                <p className={`text-4xl font-black ${isLightning ? "text-red-600" : "text-[#F26B21]"}`}>{formatPrice(sp)}</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <p className="text-base text-gray-400 line-through">{formatPrice(orig)}</p>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Save {formatPrice(orig - sp)}
                  </span>
                </div>
              </div>

              {isActive && !isOwnSale && !messageSent && (
                <button onClick={() => setMessageSent(true)}
                  className={`w-full py-3 rounded-xl text-white font-black hover:opacity-90 transition-opacity flex items-center justify-center gap-2 ${isLightning ? "bg-red-600" : "bg-[#F26B21]"}`}>
                  <Zap className="w-4 h-4 fill-white" /> Grab This Deal
                </button>
              )}
              {messageSent && (
                <div className="flex flex-col items-center gap-2 py-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="font-bold text-gray-800">Interest registered!</p>
                  <p className="text-xs text-gray-400 text-center">The seller will be in touch. Check your messages.</p>
                </div>
              )}
              {isUpcoming && (
                <div className="text-center py-2">
                  <p className="text-sm font-semibold text-amber-600 flex items-center justify-center gap-1.5">
                    <CalendarClock className="w-4 h-4" /> Sale hasn't started yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Come back when the countdown hits zero!</p>
                </div>
              )}
              {isOwnSale && (sale.status === "active" || sale.status === "upcoming") && !cancelled && (
                <button onClick={cancelSale} disabled={cancelling}
                  className="w-full py-2.5 rounded-xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 transition-colors mt-2">
                  {cancelling ? "Cancelling…" : "Cancel This Flash Sale"}
                </button>
              )}
              {(sale.status === "ended" || sale.status === "cancelled") && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-400 flex items-center justify-center gap-1.5">
                    <XCircle className="w-4 h-4" /> {sale.status === "cancelled" ? "Sale was cancelled" : "This sale has ended"}
                  </p>
                </div>
              )}

              {/* Notify Me */}
              {(isActive || isUpcoming) && !isOwnSale && (
                <div className="mt-3">
                  <NotifyButton sale={sale} />
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>Original price</span><span className="font-semibold text-gray-700">{formatPrice(orig)}</span></div>
              <div className="flex justify-between"><span>Sale price</span><span className={`font-semibold ${isLightning ? "text-red-600" : "text-[#F26B21]"}`}>{formatPrice(sp)}</span></div>
              <div className="flex justify-between"><span>You save</span><span className="font-semibold text-emerald-600">{formatPrice(orig - sp)} ({sale.discount_percent}%)</span></div>
              <div className="border-t border-gray-200 pt-2 flex justify-between"><span>Starts</span><span className="font-semibold text-gray-700">{new Date(sale.starts_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
              <div className="flex justify-between"><span>Ends</span><span className="font-semibold text-gray-700">{new Date(sale.ends_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

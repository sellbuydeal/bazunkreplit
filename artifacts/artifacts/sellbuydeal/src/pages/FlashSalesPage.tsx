import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  Zap, Clock, Plus, AlertCircle, Loader2, Tag, ChevronRight, Timer,
  CalendarClock, TrendingDown, Flame, Bell, BellOff, Coffee, Calendar, Star,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

type FlashSale = {
  id: string; seller_name: string; seller_email: string;
  title: string; description: string | null; image: string | null; category: string | null;
  original_price: string; sale_price: string; discount_percent: number;
  starts_at: string; ends_at: string; status: string; created_at: string;
  sale_type: string;
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

function CountdownPill({ target, label, urgent }: { target: string; label: string; urgent?: boolean }) {
  const [t, setT] = useState(() => getTimeLeft(target));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!t) return <span className="text-xs font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500">Ended</span>;
  const isUrgent = urgent && t.total < 3600000;
  return (
    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
      isUrgent ? "bg-red-100 text-red-600 animate-pulse" :
      urgent ? "bg-orange-100 text-orange-600" : "bg-amber-100 text-amber-700"
    }`}>
      <Timer className="w-3 h-3" />
      {label} {String(t.hours).padStart(2,"0")}:{String(t.mins).padStart(2,"0")}:{String(t.secs).padStart(2,"0")}
    </span>
  );
}

const SALE_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; description: string }> = {
  standard:       { label: "Flash Sale",     icon: Zap,          color: "text-orange-600",  bg: "bg-orange-100",  description: "" },
  lightning:      { label: "Lightning Deal", icon: Zap,          color: "text-red-600",     bg: "bg-red-100",     description: "5–15 minutes only" },
  happy_hour:     { label: "Happy Hour",     icon: Coffee,       color: "text-amber-600",   bg: "bg-amber-100",   description: "Limited-hour promo" },
  weekend_mega:   { label: "Weekend Mega",   icon: Calendar,     color: "text-purple-600",  bg: "bg-purple-100",  description: "Weekend-only deal" },
  category_event: { label: "Category Event", icon: Star,         color: "text-blue-600",    bg: "bg-blue-100",    description: "Category flash event" },
};

function SaleTypeBadge({ type }: { type: string }) {
  const meta = SALE_TYPE_META[type] ?? SALE_TYPE_META.standard;
  const Icon = meta.icon;
  return (
    <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${meta.bg} ${meta.color}`}>
      <Icon className="w-2.5 h-2.5" /> {meta.label}
    </span>
  );
}

function NotifyButton({ sale }: { sale: FlashSale }) {
  const [state, setState] = useState<"idle" | "set" | "denied">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function handleNotify() {
    if (!("Notification" in window)) { setState("denied"); return; }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("denied"); return; }

    const msUntilStart = new Date(sale.starts_at).getTime() - Date.now();
    const msUntilEnd = new Date(sale.ends_at).getTime() - Date.now();
    const isActive = sale.status === "active";

    if (isActive && msUntilEnd < 300000) {
      new Notification("⚡ Ending Soon!", { body: `${sale.title} — only ${Math.ceil(msUntilEnd / 60000)} min left!`, icon: "/logo.png" });
    } else if (!isActive && msUntilStart > 0) {
      const notifyAt = Math.max(0, msUntilStart - 60000);
      timerRef.current = setTimeout(() => {
        new Notification("🔥 Flash Sale Starting!", { body: `${sale.title} is going live now!`, icon: "/logo.png" });
      }, notifyAt);
      if (msUntilEnd > 0) {
        setTimeout(() => {
          new Notification("⚡ Last 5 Minutes!", { body: `${sale.title} ends soon — grab it!`, icon: "/logo.png" });
        }, Math.max(0, msUntilEnd - 300000));
      }
    }
    setState("set");
  }

  if (state === "set") return (
    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 cursor-default">
      <Bell className="w-3 h-3" /> Notified
    </button>
  );
  if (state === "denied") return (
    <button className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-400 cursor-default">
      <BellOff className="w-3 h-3" /> Blocked
    </button>
  );
  return (
    <button onClick={handleNotify} className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-[#4A5CE8]/10 text-[#4A5CE8] hover:bg-[#4A5CE8]/20 transition-colors">
      <Bell className="w-3 h-3" /> Notify Me
    </button>
  );
}

type TabValue = "active" | "upcoming";
const TABS: { value: TabValue; label: string; icon: React.ElementType }[] = [
  { value: "active",   label: "On Now",       icon: Flame },
  { value: "upcoming", label: "Starting Soon", icon: CalendarClock },
];

type SaleTypeFilter = "all" | "lightning" | "happy_hour" | "weekend_mega" | "category_event" | "standard";
const TYPE_FILTERS: { value: SaleTypeFilter; label: string; icon: React.ElementType }[] = [
  { value: "all",           label: "All",           icon: Zap },
  { value: "lightning",     label: "Lightning",     icon: Zap },
  { value: "happy_hour",    label: "Happy Hour",    icon: Coffee },
  { value: "weekend_mega",  label: "Weekend Mega",  icon: Calendar },
  { value: "category_event",label: "Category Event",icon: Star },
];

const CATEGORIES = ["All", "Electronics", "Fashion", "Gaming", "Books", "Collectibles", "Home", "Sports", "Other"];

function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}
function isHappyHour() {
  const h = new Date().getHours();
  return h >= 17 && h < 19;
}

export function FlashSalesPage() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabValue>("active");
  const [sales, setSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [saleTypeFilter, setSaleTypeFilter] = useState<SaleTypeFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: tab });
      if (category !== "All") params.set("category", category);
      if (saleTypeFilter !== "all") params.set("sale_type", saleTypeFilter);
      const res = await fetch(`/api/flash-sales?${params}`);
      if (!res.ok) throw new Error();
      setSales(await res.json());
    } catch {
      setError("Could not load flash sales.");
    } finally {
      setLoading(false);
    }
  }, [tab, category, saleTypeFilter]);

  useEffect(() => { load(); }, [load]);

  const lightningDeals = sales.filter(s => s.sale_type === "lightning");
  const otherSales = sales.filter(s => s.sale_type !== "lightning");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-[#1A1D2E] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-8 -left-8 w-64 h-64 rounded-full bg-[#F26B21]/10 blur-3xl" />
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-[#4A5CE8]/10 blur-3xl" />
        </div>
        <div className="relative container mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#F26B21] flex items-center justify-center shadow-lg shadow-[#F26B21]/30">
                  <Zap className="w-5 h-5 text-white fill-white" />
                </div>
                <span className="text-[#F26B21] font-black text-sm uppercase tracking-widest">Flash Sales</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-2">
                Deals that don't last forever.
              </h1>
              <p className="text-white/50 text-sm">Massive discounts for a limited time only. Grab them before the countdown hits zero.</p>
            </div>
            {user && (
              <Link href="/flash-sales/create" className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity shrink-0 shadow-lg shadow-[#F26B21]/30">
                <Plus className="w-4 h-4" /> Run a Flash Sale
              </Link>
            )}
          </div>

          {/* Live context banners */}
          <div className="flex flex-wrap gap-3 mt-6">
            {isHappyHour() && (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-xl px-4 py-2 text-amber-300 text-sm font-semibold">
                <Coffee className="w-4 h-4" /> Happy Hour is live now — check Happy Hour deals!
              </div>
            )}
            {isWeekend() && (
              <div className="flex items-center gap-2 bg-purple-500/20 border border-purple-500/30 rounded-xl px-4 py-2 text-purple-300 text-sm font-semibold">
                <Calendar className="w-4 h-4" /> Weekend Mega Sales are on — bigger discounts this weekend!
              </div>
            )}
          </div>
        </div>
      </div>

      <AdSlot slotKey="flash_sales_mid" />

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">

        {/* Sale type strip */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {TYPE_FILTERS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setSaleTypeFilter(value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                saleTypeFilter === value
                  ? value === "lightning" ? "bg-red-600 text-white border-red-600"
                  : value === "happy_hour" ? "bg-amber-500 text-white border-amber-500"
                  : value === "weekend_mega" ? "bg-purple-600 text-white border-purple-600"
                  : value === "category_event" ? "bg-[#4A5CE8] text-white border-[#4A5CE8]"
                  : "bg-[#1A1D2E] text-white border-[#1A1D2E]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Tabs + Category */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex bg-white rounded-xl border border-gray-200 p-1 gap-1">
            {TABS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setTab(value)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  tab === value ? "bg-[#1A1D2E] text-white" : "text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon className={`w-4 h-4 ${tab === value ? "text-[#F26B21]" : ""}`} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  category === cat ? "bg-[#4A5CE8] text-white" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#F26B21]" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <AlertCircle className="w-10 h-10 mb-3 text-red-300" />
            <p className="font-semibold">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold">Retry</button>
          </div>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Zap className="w-14 h-14 mb-4 text-gray-200" />
            <p className="text-lg font-semibold text-gray-600">
              {tab === "active" ? "No flash sales running right now" : "No upcoming flash sales scheduled"}
            </p>
            <p className="text-sm mt-1">Check back soon, or be the first to run one!</p>
            {user && (
              <Link href="/flash-sales/create" className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity">
                <Zap className="w-4 h-4" /> Create Flash Sale
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Lightning Deals section */}
            {lightningDeals.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white fill-white" />
                  </div>
                  <h2 className="text-lg font-black text-gray-900">Lightning Deals</h2>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full animate-pulse">5–15 min</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {lightningDeals.map(s => <SaleCard key={s.id} s={s} tab={tab} formatPrice={formatPrice} setLocation={setLocation} />)}
                </div>
              </div>
            )}

            {/* All other sales */}
            {otherSales.length > 0 && (
              <>
                {lightningDeals.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-lg font-black text-gray-900">More Deals</h2>
                    <span className="text-xs text-gray-400">{otherSales.length} sale{otherSales.length !== 1 ? "s" : ""}</span>
                  </div>
                )}
                {lightningDeals.length === 0 && (
                  <p className="text-sm text-gray-500 mb-4">{sales.length} flash sale{sales.length !== 1 ? "s" : ""}</p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {otherSales.map(s => <SaleCard key={s.id} s={s} tab={tab} formatPrice={formatPrice} setLocation={setLocation} />)}
                </div>
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function SaleCard({ s, tab, formatPrice, setLocation }: {
  s: FlashSale; tab: "active" | "upcoming";
  formatPrice: (n: number) => string;
  setLocation: (p: string) => void;
}) {
  const orig = parseFloat(s.original_price);
  const sale = parseFloat(s.sale_price);
  const isLightning = s.sale_type === "lightning";
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden hover:shadow-md transition-shadow flex flex-col group ${isLightning ? "border-red-200 ring-1 ring-red-100" : "border-gray-100"}`}>
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {s.image ? (
          <img src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Zap className="w-12 h-12 text-gray-200" /></div>
        )}
        <div className={`absolute top-2 left-2 text-white text-xs font-black px-2.5 py-1 rounded-full shadow ${isLightning ? "bg-red-600" : "bg-[#F26B21]"}`}>
          -{s.discount_percent}%
        </div>
        <div className="absolute top-2 right-2"><SaleTypeBadge type={s.sale_type} /></div>
        <div className="absolute bottom-2 left-2 right-2 flex justify-center">
          {tab === "active"
            ? <CountdownPill target={s.ends_at} label="Ends in" urgent />
            : <CountdownPill target={s.starts_at} label="Starts in" />
          }
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{s.title}</h3>
        <div className="flex items-center gap-3 mb-3">
          <p className={`text-xl font-black ${isLightning ? "text-red-600" : "text-[#F26B21]"}`}>{formatPrice(sale)}</p>
          <p className="text-sm text-gray-400 line-through">{formatPrice(orig)}</p>
          <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingDown className="w-3 h-3" /> Save {formatPrice(orig - sale)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3 flex-wrap">
          {s.category && <><Tag className="w-3 h-3" /><span>{s.category}</span></>}
          <span className="ml-auto">by {s.seller_name}</span>
        </div>
        <div className="flex gap-2 mt-auto">
          <button onClick={() => setLocation(`/flash-sales/${s.id}`)}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-1.5 ${isLightning ? "bg-red-600 hover:bg-red-700" : "bg-[#1A1D2E] hover:bg-[#2a2d3e]"}`}>
            {tab === "active" ? "Grab Deal" : "Preview Deal"} <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <NotifyButton sale={s} />
        </div>
      </div>
    </div>
  );
}

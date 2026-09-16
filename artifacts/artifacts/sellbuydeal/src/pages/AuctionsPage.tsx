import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "wouter";
import {
  Gavel, Clock, TrendingUp, Plus, ChevronRight, Loader2,
  Tag, Filter, AlertCircle,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

type Auction = {
  id: string; title: string; description: string | null; images: string[];
  category: string | null; condition: string; seller_name: string; seller_email: string;
  starting_bid: string; current_bid: string | null; bid_count: number;
  bid_increment: string; end_time: string; status: string; created_at: string;
};

function getTimeLeft(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return { days, hours, mins, secs };
}

function Countdown({ endTime }: { endTime: string }) {
  const [t, setT] = useState(() => getTimeLeft(endTime));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);
  if (!t) return <span className="text-red-500 font-bold text-xs">Ended</span>;
  if (t.days > 0) return <span className="font-mono font-bold text-sm">{t.days}d {t.hours}h {t.mins}m</span>;
  if (t.hours > 0) return <span className="font-mono font-bold text-sm text-amber-600">{t.hours}h {t.mins}m {t.secs}s</span>;
  return <span className="font-mono font-bold text-sm text-red-600 animate-pulse">{t.mins}m {t.secs}s</span>;
}

const CATEGORIES = ["All", "Electronics", "Fashion", "Gaming", "Books", "Collectibles", "Home", "Sports", "Other"];
const SORT_OPTIONS = [
  { value: "ending", label: "Ending Soon" },
  { value: "newest", label: "Newest First" },
];

export function AuctionsPage() {
  const [, setLocation] = useLocation();
  const { formatPrice } = useCurrency();
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("ending");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ status: "active", sort });
      if (category !== "All") params.set("category", category);
      const res = await fetch(`/api/auctions?${params}`);
      if (!res.ok) throw new Error("Failed to load auctions");
      setAuctions(await res.json());
    } catch {
      setError("Could not load auctions. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [category, sort]);

  useEffect(() => { load(); }, [load]);

  const isEndingSoon = (endTime: string) => new Date(endTime).getTime() - Date.now() < 3600000;
  const isNew = (createdAt: string) => Date.now() - new Date(createdAt).getTime() < 86400000;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-[#1A1D2E] text-white py-12 px-4">
        <div className="container mx-auto max-w-5xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F26B21] flex items-center justify-center">
                <Gavel className="w-4 h-4 text-white" />
              </div>
              <span className="text-[#F26B21] font-bold text-sm uppercase tracking-wide">Live Auctions</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight mb-2">
              Bid on Unique Items
            </h1>
            <p className="text-white/60 text-sm">
              Place bids on one-of-a-kind listings. The highest bid wins when the timer hits zero.
            </p>
          </div>
          {user && (
            <Link
              href="/auctions/create"
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity shrink-0"
              data-testid="button-create-auction"
            >
              <Plus className="w-4 h-4" /> List an Auction
            </Link>
          )}
        </div>
      </div>

      <AdSlot slotKey="auctions_mid" />

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  category === cat ? "bg-[#4A5CE8] text-white" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-[#4A5CE8]"
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[#4A5CE8]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <AlertCircle className="w-10 h-10 mb-3 text-red-300" />
            <p className="font-semibold">{error}</p>
            <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold">Retry</button>
          </div>
        ) : auctions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-gray-400">
            <Gavel className="w-14 h-14 mb-4 text-gray-200" />
            <p className="text-lg font-semibold text-gray-600">No active auctions</p>
            <p className="text-sm mt-1">
              {category !== "All" ? `No auctions in ${category} right now. ` : ""}
              Be the first to list one!
            </p>
            {user && (
              <Link href="/auctions/create" className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Create Auction
              </Link>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">{auctions.length} auction{auctions.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {auctions.map((a) => {
                const currentBid = a.current_bid ? parseFloat(a.current_bid) : null;
                const displayBid = currentBid ?? parseFloat(a.starting_bid);
                const endingSoon = isEndingSoon(a.end_time);
                const isNewListing = isNew(a.created_at);
                const img = Array.isArray(a.images) && a.images.length > 0 ? a.images[0] : null;
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                    {/* Image */}
                    <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
                      {img ? (
                        <img src={img} alt={a.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gavel className="w-12 h-12 text-gray-200" />
                        </div>
                      )}
                      {endingSoon && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          Ending Soon
                        </span>
                      )}
                      {!endingSoon && isNewListing && (
                        <span className="absolute top-2 left-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          New
                        </span>
                      )}
                      {a.category && (
                        <span className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">
                          {a.category}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2">{a.title}</h3>

                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-xs text-gray-400">{currentBid ? "Current bid" : "Starting bid"}</p>
                          <p className="text-xl font-black text-[#F26B21]">{formatPrice(displayBid)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{a.bid_count} bid{a.bid_count !== 1 ? "s" : ""}</p>
                          <div className="flex items-center gap-1 justify-end mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <Countdown endTime={a.end_time} />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                        <Tag className="w-3 h-3" />
                        <span>{a.condition}</span>
                        <span className="ml-auto">by {a.seller_name}</span>
                      </div>

                      <button
                        onClick={() => setLocation(`/auctions/${a.id}`)}
                        className="mt-auto w-full py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                        data-testid={`button-view-auction-${a.id}`}
                      >
                        View Auction <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}

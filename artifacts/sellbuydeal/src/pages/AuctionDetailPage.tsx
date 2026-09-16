import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useLocation } from "wouter";
import {
  Gavel, Clock, ChevronLeft, User2, Shield, Tag,
  TrendingUp, CheckCircle2, XCircle, Loader2, AlertCircle, Trophy,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";

type Bid = { id: string; bidder_name: string; bidder_email: string; amount: string; created_at: string };
type Auction = {
  id: string; title: string; description: string | null; images: string[];
  category: string | null; condition: string; seller_name: string; seller_email: string;
  starting_bid: string; current_bid: string | null; bid_count: number;
  bid_increment: string; reserve_price: string | null; end_time: string;
  status: string; winner_name: string | null; winner_email: string | null;
  winner_bid: string | null; created_at: string; bids: Bid[];
};

function getTimeLeft(endTime: string) {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
}

function BigCountdown({ endTime }: { endTime: string }) {
  const [t, setT] = useState(() => getTimeLeft(endTime));
  useEffect(() => {
    const id = setInterval(() => setT(getTimeLeft(endTime)), 1000);
    return () => clearInterval(id);
  }, [endTime]);

  if (!t) return (
    <div className="bg-red-50 rounded-2xl p-4 text-center">
      <p className="text-red-600 font-black text-lg">Auction Ended</p>
    </div>
  );

  const blocks = t.days > 0
    ? [{ label: "Days", v: t.days }, { label: "Hours", v: t.hours }, { label: "Mins", v: t.mins }, { label: "Secs", v: t.secs }]
    : [{ label: "Hours", v: t.hours }, { label: "Mins", v: t.mins }, { label: "Secs", v: t.secs }];

  const urgent = t.days === 0 && t.hours === 0;
  return (
    <div className={`rounded-2xl p-4 ${urgent ? "bg-red-50" : "bg-gray-50"}`}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 text-center">Time Remaining</p>
      <div className="flex items-center justify-center gap-2">
        {blocks.map((b, i) => (
          <div key={b.label} className="flex items-center gap-2">
            <div className={`text-center px-3 py-2 rounded-xl min-w-[52px] ${urgent ? "bg-red-100" : "bg-white border border-gray-200"}`}>
              <p className={`text-2xl font-black tabular-nums ${urgent ? "text-red-600" : "text-gray-900"}`}>
                {String(b.v).padStart(2, "0")}
              </p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{b.label}</p>
            </div>
            {i < blocks.length - 1 && <span className={`text-xl font-black ${urgent ? "text-red-400" : "text-gray-300"}`}>:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [bidError, setBidError] = useState<string | null>(null);
  const [bidSuccess, setBidSuccess] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/auctions/${id}`);
      if (res.status === 404) { setError("Auction not found"); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAuction(data);
    } catch {
      if (!silent) setError("Failed to load auction");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => { load(); }, [load]);

  // Poll for new bids every 8 seconds while the auction is active
  useEffect(() => {
    const interval = setInterval(() => {
      load(true);
    }, 8000);
    return () => clearInterval(interval);
  }, [load]);

  async function placeBid() {
    if (!auction || !user) return;
    const amountInCurrency = parseFloat(bidAmount);
    if (isNaN(amountInCurrency)) { setBidError("Please enter a valid amount"); return; }
    // Convert from user's display currency back to GBP for storage
    const amount = amountInCurrency / currency.rate;
    setBidding(true);
    setBidError(null);
    try {
      const res = await fetch(`/api/auctions/${id}/bid`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bidderEmail: user.email, bidderName: user.name ?? user.username, amount }),
      });
      const data = await res.json();
      if (!res.ok) { setBidError(data.error ?? "Bid failed"); return; }
      setBidSuccess(true);
      setBidAmount("");
      setTimeout(() => setBidSuccess(false), 3000);
      await load();
    } finally {
      setBidding(false);
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-[#4A5CE8]" />
      </div>
      <Footer />
    </div>
  );

  if (error || !auction) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <p className="font-semibold text-gray-600">{error ?? "Auction not found"}</p>
        <Link href="/auctions" className="flex items-center gap-1.5 text-[#4A5CE8] text-sm font-semibold hover:underline">
          <ChevronLeft className="w-4 h-4" /> Back to Auctions
        </Link>
      </div>
      <Footer />
    </div>
  );

  const currentBid = auction.current_bid ? parseFloat(auction.current_bid) : null;
  const startingBid = parseFloat(auction.starting_bid);
  const displayBid = currentBid ?? startingBid;
  const minNextBid = currentBid !== null ? currentBid + parseFloat(auction.bid_increment) : startingBid;
  const isActive = auction.status === "active" && new Date(auction.end_time) > new Date();
  const isOwnAuction = user?.email === auction.seller_email;
  const imgs = Array.isArray(auction.images) ? auction.images : [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        {/* Breadcrumb */}
        <Link href="/auctions" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] mb-6 w-fit">
          <ChevronLeft className="w-4 h-4" /> Back to Auctions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left */}
          <div className="lg:col-span-2 space-y-5">
            {/* Image */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden aspect-[4/3]">
              {imgs.length > 0 ? (
                <img src={imgs[0]} alt={auction.title} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-200">
                  <Gavel className="w-16 h-16" />
                  <p className="text-sm mt-2 text-gray-400">No image provided</p>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-xl font-black text-gray-900 leading-snug">{auction.title}</h1>
                <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                  isActive ? "bg-emerald-100 text-emerald-700" :
                  auction.status === "ended" ? "bg-gray-100 text-gray-500" :
                  "bg-red-100 text-red-600"
                }`}>
                  {isActive ? "Active" : auction.status === "ended" ? "Ended" : "Cancelled"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {auction.category && <span className="bg-[#4A5CE8]/10 text-[#4A5CE8] text-xs font-semibold px-2.5 py-1 rounded-full">{auction.category}</span>}
                <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1"><Tag className="w-3 h-3" /> {auction.condition}</span>
              </div>
              {auction.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{auction.description}</p>
              )}
            </div>

            {/* Seller */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#4A5CE8] flex items-center justify-center text-white font-black text-lg">
                {auction.seller_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{auction.seller_name}</p>
                <p className="text-xs text-gray-400 flex items-center gap-1"><User2 className="w-3 h-3" /> Seller</p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1.5 rounded-full">
                <Shield className="w-3.5 h-3.5" /> Verified Seller
              </div>
            </div>

            {/* Ended / winner */}
            {auction.status === "ended" && auction.winner_name && (
              <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-amber-800">Auction Ended — Winner: {auction.winner_name}</p>
                  <p className="text-sm text-amber-600">Winning bid: {formatPrice(parseFloat(auction.winner_bid!))}</p>
                </div>
              </div>
            )}

            {/* Bid history */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#4A5CE8]" /> Bid History ({auction.bid_count})
              </h2>
              {auction.bids.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No bids yet — be the first!</p>
              ) : (
                <div className="space-y-2">
                  {auction.bids.map((b, i) => (
                    <div key={b.id} className={`flex items-center justify-between py-2 px-3 rounded-xl ${i === 0 ? "bg-[#4A5CE8]/5" : "bg-gray-50"}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                          {b.bidder_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">
                          {i === 0 ? "🏆 " : ""}{b.bidder_name}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-900">{formatPrice(parseFloat(b.amount))}</p>
                        <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right — sticky bid panel */}
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {/* Countdown */}
            <BigCountdown endTime={auction.end_time} />

            {/* Bid info */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="text-center mb-5">
                <p className="text-xs text-gray-400 mb-1">{currentBid ? "Current bid" : "Starting bid"}</p>
                <p className="text-4xl font-black text-[#F26B21]">{formatPrice(displayBid)}</p>
                <p className="text-xs text-gray-400 mt-1">{auction.bid_count} bid{auction.bid_count !== 1 ? "s" : ""}</p>
              </div>

              {isActive && !isOwnAuction && (
                <>
                  {!user ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-3">Sign in to place a bid</p>
                      <Link href="/login" className="block w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity text-center">
                        Sign In to Bid
                      </Link>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-gray-500 mb-2">
                        Min. bid: <span className="font-bold text-gray-800">{formatPrice(minNextBid)}</span>
                        {" "}(+{formatPrice(parseFloat(auction.bid_increment))} increment)
                      </p>
                      <div className="flex gap-2 mb-3">
                        <input
                          type="number"
                          step="0.01"
                          min={(minNextBid * currency.rate).toFixed(currency.decimals)}
                          value={bidAmount}
                          onChange={(e) => { setBidAmount(e.target.value); setBidError(null); }}
                          placeholder={`${currency.symbol}${(minNextBid * currency.rate).toFixed(currency.decimals)} or more`}
                          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                          data-testid="input-bid-amount"
                        />
                      </div>
                      {bidError && <p className="text-xs text-red-500 mb-2">{bidError}</p>}
                      {bidSuccess && (
                        <div className="flex items-center gap-2 text-emerald-600 text-sm font-semibold mb-2">
                          <CheckCircle2 className="w-4 h-4" /> Bid placed successfully!
                        </div>
                      )}
                      <button
                        onClick={placeBid}
                        disabled={bidding || !bidAmount}
                        className="w-full py-3 rounded-xl bg-[#F26B21] text-white font-black hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        data-testid="button-place-bid"
                      >
                        {bidding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4" />}
                        {bidding ? "Placing bid…" : "Place Bid"}
                      </button>
                    </>
                  )}
                </>
              )}

              {isActive && isOwnAuction && (
                <div className="text-center py-2">
                  <p className="text-sm text-gray-400 flex items-center justify-center gap-1.5"><XCircle className="w-4 h-4" /> You cannot bid on your own auction</p>
                </div>
              )}

              {!isActive && auction.status === "cancelled" && (
                <div className="text-center py-2">
                  <p className="text-sm text-red-500 font-semibold">This auction was cancelled</p>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-xs text-gray-500">
              <div className="flex justify-between"><span>Starting bid</span><span className="font-semibold text-gray-700">{formatPrice(startingBid)}</span></div>
              <div className="flex justify-between"><span>Bid increment</span><span className="font-semibold text-gray-700">+{formatPrice(parseFloat(auction.bid_increment))}</span></div>
              {auction.reserve_price && <div className="flex justify-between"><span>Reserve price</span><span className="font-semibold text-gray-700">Hidden</span></div>}
              <div className="flex justify-between"><span>Listed</span><span className="font-semibold text-gray-700">{new Date(auction.created_at).toLocaleDateString("en-GB")}</span></div>
              <div className="flex justify-between"><span>Ends</span><span className="font-semibold text-gray-700">{new Date(auction.end_time).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

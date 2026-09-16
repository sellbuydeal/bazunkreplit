import { useState } from "react";
import { useLocation } from "wouter";
import {
  Tag, Clock, CheckCircle2, XCircle, ChevronRight,
  MessageSquare, AlertCircle, RefreshCw, ArrowLeft,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useOffers, type Offer, type OfferStatus } from "@/context/OfferContext";
import { useAuth } from "@/context/AuthContext";

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending:          { label: "Pending",          color: "bg-amber-100 text-amber-700 border-amber-200",   icon: Clock       },
  accepted:         { label: "Accepted",          color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  declined:         { label: "Declined",          color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle     },
  countered:        { label: "Counter Offer",     color: "bg-blue-100 text-blue-700 border-blue-200",      icon: MessageSquare },
  counter_accepted: { label: "Counter Accepted",  color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  counter_declined: { label: "Counter Declined",  color: "bg-red-100 text-red-700 border-red-200",         icon: XCircle     },
};

const TABS = [
  { key: "all",      label: "All Offers" },
  { key: "pending",  label: "Pending" },
  { key: "countered",label: "Counter Offers" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function StatusBadge({ status }: { status: OfferStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function OfferCard({ offer }: { offer: Offer }) {
  const { respondToCounter } = useOffers();
  const [, setLocation] = useLocation();
  const cfg = STATUS_CONFIG[offer.status];

  const savings = offer.listingPrice - offer.offerPrice;
  const savingsPct = Math.round((savings / offer.listingPrice) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Product image */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
          {offer.productImage ? (
            <img src={offer.productImage} alt={offer.productTitle} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Tag className="w-7 h-7 text-gray-300" />
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{offer.productTitle}</h3>
            <StatusBadge status={offer.status} />
          </div>

          <p className="text-xs text-gray-400 mb-2">Seller: {offer.sellerName}</p>

          <div className="flex flex-wrap gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Listed at</p>
              <p className="font-bold text-gray-600 line-through">£{offer.listingPrice.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Your offer</p>
              <p className="font-black text-[#F26B21]">£{offer.offerPrice.toFixed(2)}</p>
            </div>
            {savings > 0 && (
              <div>
                <p className="text-xs text-gray-400">Saving</p>
                <p className="font-bold text-emerald-600">£{savings.toFixed(2)} ({savingsPct}%)</p>
              </div>
            )}
          </div>

          {offer.message && (
            <p className="mt-2 text-xs text-gray-500 italic bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100">
              "{offer.message}"
            </p>
          )}

          <p className="mt-2 text-xs text-gray-300">
            {new Date(offer.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Counter offer section */}
      {offer.status === "countered" && offer.counterPrice && (
        <div className="border-t border-blue-100 bg-blue-50/60 px-4 py-3">
          <div className="flex items-start gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-semibold text-blue-700 mb-0.5">Seller made a counter offer</p>
              <p className="text-sm font-black text-blue-800">£{offer.counterPrice.toFixed(2)}</p>
              {offer.counterMessage && (
                <p className="text-xs text-blue-600 mt-0.5 italic">"{offer.counterMessage}"</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => respondToCounter(offer.id, true)}
              className="flex-1 py-2 rounded-xl bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 transition-colors"
            >
              Accept £{offer.counterPrice.toFixed(2)}
            </button>
            <button
              onClick={() => respondToCounter(offer.id, false)}
              className="flex-1 py-2 rounded-xl bg-red-100 text-red-600 text-xs font-bold hover:bg-red-200 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* View listing button */}
      <div className="border-t border-gray-50 px-4 py-2.5 flex justify-end">
        <button
          onClick={() => setLocation(`/listing/${offer.productId}`)}
          className="flex items-center gap-1.5 text-xs font-medium text-[#4A5CE8] hover:text-[#3a4cc8] transition-colors"
        >
          View listing <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function OffersPage() {
  const { user } = useAuth();
  const { offers } = useOffers();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<TabKey>("all");

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Sign in to view offers</h2>
            <p className="text-sm text-gray-500 mb-4">You need an account to make and manage offers.</p>
            <button
              onClick={() => setLocation("/login")}
              className="bg-[#F26B21] text-white font-bold px-6 py-2.5 rounded-xl hover:bg-[#d45c1a] transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const filtered = tab === "all"
    ? offers
    : tab === "declined"
      ? offers.filter(o => o.status === "declined" || o.status === "counter_declined")
      : tab === "accepted"
        ? offers.filter(o => o.status === "accepted" || o.status === "counter_accepted")
        : offers.filter(o => o.status === tab);

  const counts: Record<TabKey, number> = {
    all:       offers.length,
    pending:   offers.filter(o => o.status === "pending").length,
    countered: offers.filter(o => o.status === "countered").length,
    accepted:  offers.filter(o => o.status === "accepted" || o.status === "counter_accepted").length,
    declined:  offers.filter(o => o.status === "declined" || o.status === "counter_declined").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setLocation("/dashboard")}
            className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Offers</h1>
            <p className="text-sm text-gray-400">Track and manage all your price negotiations</p>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Pending",  value: counts.pending,   color: "text-amber-600",   bg: "bg-amber-50"   },
            { label: "Accepted", value: counts.accepted,  color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Total",    value: counts.all,       color: "text-[#4A5CE8]",   bg: "bg-blue-50"    },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                tab === t.key
                  ? "bg-[#1A1D2E] text-white"
                  : "bg-white text-gray-500 hover:text-gray-700 border border-gray-200"
              }`}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  tab === t.key ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                }`}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Offers list */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">
              {tab === "all" ? "No offers yet" : `No ${tab} offers`}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {tab === "all"
                ? "Browse listings and make an offer on something you like."
                : "Switch tabs to see other offers."}
            </p>
            {tab === "all" && (
              <button
                onClick={() => setLocation("/browse")}
                className="bg-[#F26B21] text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:bg-[#d45c1a] transition-colors"
              >
                Browse Listings
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(offer => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        )}

        {/* Counter offers notice */}
        {counts.countered > 0 && tab !== "countered" && (
          <button
            onClick={() => setTab("countered")}
            className="mt-4 w-full bg-blue-50 border border-blue-200 rounded-2xl p-3.5 flex items-center gap-3 hover:bg-blue-100 transition-colors text-left"
          >
            <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-700">
                {counts.countered} counter offer{counts.countered > 1 ? "s" : ""} waiting for your response
              </p>
              <p className="text-xs text-blue-500">Click to review and respond</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-400" />
          </button>
        )}
      </main>

      <Footer />
    </div>
  );
}

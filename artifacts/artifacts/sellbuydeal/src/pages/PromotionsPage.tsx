import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp, Star, Home, Eye, Crown, Clock,
  Coins, ChevronLeft, Check, Zap, AlertCircle, X, Search, Package,
  Loader2, ChevronRight, Users, Send, Tag, Trophy, MessageSquare,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";

interface Promotion {
  id: string;
  title: string;
  description: string;
  credits: number;
  duration: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  popular?: boolean;
  perks: string[];
}

interface Listing {
  id: number;
  title: string;
  price: string;
  image?: string;
  category: string;
  status: string;
}

const PROMOTIONS: Promotion[] = [
  {
    id: "move-to-top",
    title: "Move to Top",
    description: "Instantly move your listing to the top of search results",
    credits: 199,
    duration: 3,
    icon: ArrowUp,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-500",
    perks: ["Top of search results", "Resets every 24h", "3-day boost"],
  },
  {
    id: "featured-badge",
    title: "Featured Badge",
    description: "Add a featured badge and get premium placement in browse",
    credits: 299,
    duration: 7,
    icon: Star,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-500",
    popular: true,
    perks: ["Gold featured badge", "Browse page highlight", "7-day duration"],
  },
  {
    id: "homepage-spotlight",
    title: "Homepage Spotlight",
    description: "Feature your listing in the homepage spotlight carousel",
    credits: 499,
    duration: 7,
    icon: Home,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-500",
    perks: ["Homepage carousel slot", "Thousands of daily views", "7-day duration"],
  },
  {
    id: "visibility-boost",
    title: "Visibility Boost",
    description: "Increase your ranking across all relevant search pages",
    credits: 349,
    duration: 5,
    icon: Eye,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-500",
    perks: ["Boosted across all searches", "Category page boost", "5-day duration"],
  },
  {
    id: "premium-placement",
    title: "Premium Placement",
    description: "Premium positioning across category and search pages",
    credits: 599,
    duration: 10,
    icon: Crown,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-500",
    perks: ["Top-3 placement guaranteed", "Category spotlight", "10-day duration"],
  },
  {
    id: "urgent-badge",
    title: "Urgent Badge",
    description: "Add an urgent badge to attract immediate buyer attention",
    credits: 149,
    duration: 3,
    icon: Clock,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-500",
    perks: ["Eye-catching urgent label", "Browsing urgency signal", "3-day duration"],
  },
  {
    id: "related-listings-5d",
    title: "Related Listings",
    description: "Appear in the 'Featured in this Category' sidebar on related listing pages",
    credits: 249,
    duration: 5,
    icon: Users,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-500",
    perks: ["Sidebar on related listings", "Category-matched exposure", "5-day duration"],
  },
  {
    id: "newsletter-feature",
    title: "Newsletter Feature",
    description: "Include your listing in our weekly newsletter and featured blog posts",
    credits: 299,
    duration: 7,
    icon: Send,
    iconBg: "bg-violet-50",
    iconColor: "text-violet-500",
    perks: ["Weekly newsletter slot", "Blog post feature", "7-day campaign"],
  },
  {
    id: "badge-new-listing",
    title: "Hot Seller Badge",
    description: "Add a 'Hot Seller' badge to stand out in browse and search results",
    credits: 99,
    duration: 30,
    icon: Tag,
    iconBg: "bg-teal-50",
    iconColor: "text-teal-500",
    perks: ["Bold 'New Listing' label", "Stands out in browse", "30-day duration"],
  },
  {
    id: "badge-price-reduced",
    title: "Price Reduced Badge",
    description: "Highlight a price drop with a bold 'Price Reduced' badge",
    credits: 99,
    duration: 30,
    icon: Tag,
    iconBg: "bg-red-50",
    iconColor: "text-red-500",
    perks: ["'Price Reduced' label", "Attracts deal seekers", "30-day duration"],
  },
  {
    id: "badge-best-seller",
    title: "Best Seller Badge",
    description: "Show buyers this is a top-performing item with a 'Best Seller' badge",
    credits: 99,
    duration: 30,
    icon: Trophy,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-500",
    perks: ["'Best Seller' label", "Builds trust with buyers", "30-day duration"],
  },
  {
    id: "badge-renovated",
    title: "Recently Renovated Badge",
    description: "Let buyers know the item or property has been recently renovated",
    credits: 99,
    duration: 30,
    icon: Tag,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
    perks: ["'Recently Renovated' label", "Signals quality", "30-day duration"],
  },
  {
    id: "engagement-boost",
    title: "Engagement Tools",
    description: "Enable 'Ask a Question', 'Schedule a Visit' and 'Request More Info' contact buttons",
    credits: 179,
    duration: 14,
    icon: MessageSquare,
    iconBg: "bg-cyan-50",
    iconColor: "text-cyan-500",
    perks: ["Ask a Question button", "Schedule a Visit button", "14-day engagement"],
  },
];

export function PromotionsPage() {
  const { user, refreshBalance } = useAuth();
  const [, setLocation] = useLocation();

  const [balanceCredits, setBalanceCredits] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(true);

  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingSearch, setListingSearch] = useState("");
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);

  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const [successFor, setSuccessFor] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;
    fetch(`/api/stripe/balance/${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setBalanceCredits(Math.round((d.balance ?? 0) * 100));
      })
      .catch(() => {})
      .finally(() => setBalanceLoading(false));
  }, [user?.email]);

  async function openPromoModal(promo: Promotion) {
    setSelectedPromo(promo);
    setSelectedListing(null);
    setListingSearch("");
    setApplyResult(null);
    if (!user?.email) return;
    setListingsLoading(true);
    try {
      const res = await fetch(`/api/listings/mine?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        const all: Listing[] = Array.isArray(data) ? data : (data.listings ?? []);
        setListings(all.filter((l: Listing) => l.status === "active"));
      }
    } finally {
      setListingsLoading(false);
    }
  }

  function closeModal() {
    setSelectedPromo(null);
    setSelectedListing(null);
    setApplyResult(null);
  }

  async function applyPromotion() {
    if (!selectedPromo || !selectedListing || !user?.email) return;
    setApplying(true);
    setApplyResult(null);
    try {
      const res = await fetch("/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          type: selectedPromo.id,
          listingId: selectedListing.id,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const newCr = Math.round((data.newBalance ?? 0) * 100);
        setBalanceCredits(newCr);
        setSuccessFor(selectedPromo.id);
        setTimeout(() => setSuccessFor(null), 4000);
        closeModal();
        refreshBalance?.();
      } else {
        if (res.status === 402) {
          setApplyResult({ ok: false, msg: `Not enough credits. You need ${selectedPromo.credits} cr but have ${balanceCredits} cr.` });
        } else {
          setApplyResult({ ok: false, msg: data.error ?? "Failed to apply promotion" });
        }
      }
    } catch {
      setApplyResult({ ok: false, msg: "Network error — please try again" });
    } finally {
      setApplying(false);
    }
  }

  const filteredListings = listings.filter(l =>
    l.title.toLowerCase().includes(listingSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-6 max-w-5xl">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium mb-5 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-r from-[#3B4FD8] to-[#4A5CE8] px-7 py-8 mb-6 relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black text-white mb-2">Boost Your Listings</h1>
            <p className="text-blue-200 text-sm md:text-base mb-4">
              Increase visibility and sell faster with powerful promotion tools
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-1.5 bg-white/20 text-white text-sm font-semibold px-3 py-1.5 rounded-lg">
                <Coins className="w-4 h-4" />
                {balanceLoading ? "…" : balanceCredits.toLocaleString()} credits available
                <span className="text-white/60 text-xs font-normal">≈ £{(balanceCredits / 100).toFixed(2)}</span>
              </div>
              <Link
                href="/credits"
                className="inline-flex items-center gap-1.5 bg-[#F26B21] text-white text-sm font-bold px-3 py-1.5 rounded-lg hover:bg-[#e05c15] transition-colors"
              >
                + Top Up Credits
              </Link>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute -right-4 -bottom-10 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute right-20 top-4 w-20 h-20 rounded-full bg-white/5" />
        </div>

        {/* How it works */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 mb-6 flex flex-wrap gap-6">
          {[
            { step: "1", text: "Choose a promotion package below" },
            { step: "2", text: "Select which listing to promote" },
            { step: "3", text: "Credits are deducted and your boost goes live instantly" },
          ].map(({ step, text }) => (
            <div key={step} className="flex items-center gap-3 flex-1 min-w-[180px]">
              <span className="w-7 h-7 rounded-full bg-[#4A5CE8] text-white text-xs font-black flex items-center justify-center flex-shrink-0">{step}</span>
              <p className="text-sm text-gray-600">{text}</p>
              {step !== "3" && <ChevronRight className="w-4 h-4 text-gray-300 hidden lg:block flex-shrink-0" />}
            </div>
          ))}
        </div>

        {/* Promotion cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROMOTIONS.map((promo, i) => {
            const Icon = promo.icon;
            const canAfford = balanceCredits >= promo.credits;
            const isSuccess = successFor === promo.id;

            return (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col relative overflow-hidden"
              >
                {promo.popular && (
                  <span className="absolute top-4 right-4 text-[10px] font-black bg-[#F26B21] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
                    Popular
                  </span>
                )}

                <div className={`w-12 h-12 rounded-2xl ${promo.iconBg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-6 h-6 ${promo.iconColor}`} />
                </div>

                <h3 className="font-bold text-gray-900 text-base mb-1">{promo.title}</h3>
                <p className="text-sm text-gray-400 leading-snug mb-3">{promo.description}</p>

                <ul className="space-y-1 mb-4">
                  {promo.perks.map(perk => (
                    <li key={perk} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between mb-4 mt-auto">
                  <div>
                    <span className="text-xl font-black text-gray-900">{promo.credits.toLocaleString()} cr</span>
                    <span className="text-xs text-gray-400 ml-1.5">≈ £{(promo.credits / 100).toFixed(2)}</span>
                  </div>
                  <span className="text-xs text-gray-400 font-medium">{promo.duration} days</span>
                </div>

                <AnimatePresence mode="wait">
                  {isSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Promotion applied!
                    </motion.div>
                  ) : (
                    <motion.button
                      key="apply"
                      onClick={() => {
                        if (!user) { setLocation("/sign-in"); return; }
                        openPromoModal(promo);
                      }}
                      className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                        canAfford
                          ? "bg-[#1A1D2E] text-white hover:bg-[#2a2d3e]"
                          : "bg-[#F26B21] text-white hover:bg-[#e05c15]"
                      }`}
                    >
                      {canAfford ? (
                        <><Zap className="w-4 h-4" /> Apply Now — {promo.credits.toLocaleString()} cr</>
                      ) : (
                        <>Top Up Credits to Apply</>
                      )}
                    </motion.button>
                  )}
                </AnimatePresence>

                {!canAfford && !isSuccess && (
                  <p className="text-xs text-gray-400 text-center mt-2">
                    You need {(promo.credits - balanceCredits).toLocaleString()} more credits
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Promotions are applied per listing. You choose which listing to promote after clicking Apply Now.
          · <Link href="/credits" className="text-[#4A5CE8] hover:underline">Buy more credits</Link>
        </p>
      </div>

      <Footer />

      {/* ── Listing Picker Modal ── */}
      <AnimatePresence>
        {selectedPromo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="p-5 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedPromo.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <selectedPromo.icon className={`w-5 h-5 ${selectedPromo.iconColor}`} />
                  </div>
                  <div>
                    <h2 className="font-black text-gray-900 text-base">{selectedPromo.title}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {selectedPromo.credits.toLocaleString()} credits · {selectedPromo.duration} days
                    </p>
                  </div>
                </div>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step indicator */}
              <div className="px-5 pt-4 pb-3 flex-shrink-0">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Choose a listing to promote:
                </p>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search your listings…"
                    value={listingSearch}
                    onChange={e => setListingSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  />
                </div>
              </div>

              {/* Listing list */}
              <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-2">
                {listingsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
                  </div>
                ) : listings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3">
                      <Package className="w-7 h-7 text-gray-200" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">No active listings</p>
                    <p className="text-xs text-gray-400 mb-4">You need at least one active listing to apply a promotion.</p>
                    <Link
                      href="/sell"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                    >
                      Create a Listing
                    </Link>
                  </div>
                ) : filteredListings.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No listings match your search</p>
                ) : (
                  filteredListings.map(listing => {
                    const isSelected = selectedListing?.id === listing.id;
                    return (
                      <button
                        key={listing.id}
                        onClick={() => setSelectedListing(listing)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                          isSelected
                            ? "border-[#4A5CE8] bg-[#4A5CE8]/5"
                            : "border-gray-100 hover:border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                          {listing.image ? (
                            <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{listing.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            £{parseFloat(listing.price).toFixed(2)} · {listing.category}
                          </p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? "border-[#4A5CE8] bg-[#4A5CE8]" : "border-gray-300"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Error */}
              {applyResult && !applyResult.ok && (
                <div className="mx-5 mb-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3 flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{applyResult.msg}</p>
                </div>
              )}

              {/* Confirm footer */}
              <div className="p-5 border-t border-gray-100 flex-shrink-0">
                {selectedListing && (
                  <div className="mb-3 bg-[#4A5CE8]/6 border border-[#4A5CE8]/15 rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-700 truncate">{selectedListing.title}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Will be promoted for {selectedPromo.duration} days
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <p className="text-sm font-black text-[#4A5CE8]">{selectedPromo.credits.toLocaleString()} cr</p>
                      <p className="text-[10px] text-gray-400">≈ £{(selectedPromo.credits / 100).toFixed(2)}</p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={applyPromotion}
                    disabled={!selectedListing || applying}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {applying ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Applying…</>
                    ) : (
                      <><Zap className="w-4 h-4" /> Apply Promotion</>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

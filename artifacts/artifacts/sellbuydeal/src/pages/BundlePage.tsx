import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, Layers, Plus, Check, Trash2, ShoppingCart,
  Tag, Sparkles, ChevronRight, Info, Users, MapPin, Lock, Package,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";

const CONDITION_COLORS: Record<string, string> = {
  "new": "bg-emerald-100 text-emerald-700",
  "like new": "bg-teal-100 text-teal-700",
  "good": "bg-blue-100 text-blue-700",
  "fair": "bg-yellow-100 text-yellow-700",
  "poor": "bg-red-100 text-red-700",
};

const TIERS = [
  { min: 2, discount: 5,  label: "5% off",  color: "text-blue-600 bg-blue-50 border-blue-200" },
  { min: 3, discount: 10, label: "10% off", color: "text-violet-600 bg-violet-50 border-violet-200" },
  { min: 4, discount: 15, label: "15% off", color: "text-[#F26B21] bg-orange-50 border-orange-200" },
  { min: 5, discount: 20, label: "20% off", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
];

function getTier(count: number) {
  return [...TIERS].reverse().find((t) => count >= t.min) ?? null;
}
function getNextTier(count: number) {
  return TIERS.find((t) => count < t.min) ?? null;
}

interface SellerListing {
  id: number;
  title: string;
  price: number;
  condition: string;
  category: string;
  image?: string;
  location?: string;
}

export function BundlePage() {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [listings, setListings] = useState<SellerListing[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bundleAdded, setBundleAdded] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/listings/mine?email=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((rows: Array<{ id: number; title: string; price: string; condition: string; category: string; image?: string }>) => {
        setListings(rows.map((r) => ({
          id: r.id,
          title: r.title,
          price: parseFloat(r.price),
          condition: r.condition,
          category: r.category,
          image: r.image,
        })));
      })
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [user?.email]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(listings.map((p) => p.category).filter(Boolean)));
    return [
      { slug: "all", label: "All Categories" },
      ...cats.map((c) => ({ slug: c, label: c.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) })),
    ];
  }, [listings]);

  const visible = filterCategory === "all"
    ? listings
    : listings.filter((p) => p.category === filterCategory);

  const selected = listings.filter((p) => selectedIds.has(p.id));
  const subtotal = selected.reduce((s, p) => s + p.price, 0);
  const tier = getTier(selected.length);
  const nextTier = getNextTier(selected.length);
  const discount = tier ? subtotal * (tier.discount / 100) : 0;
  const total = subtotal - discount;

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function publishBundle() {
    selected.forEach((p) => addToCart(p as Parameters<typeof addToCart>[0], 1));
    setBundleAdded(true);
    setTimeout(() => setLocation("/dashboard"), 1800);
  }

  /* ── Auth gate ── */
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-5">
            <Lock className="w-9 h-9 text-[#4A5CE8]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Sign in to create a Bundle Deal</h1>
          <p className="text-gray-400 text-sm max-w-sm mb-6">
            Bundle your listings together and offer buyers a tiered discount — available to registered sellers only.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Sign In
            </Link>
            <Link href="/register"
              className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-[#4A5CE8] transition-colors">
              Create Account
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[#F26B21] border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  /* ── No listings yet ── */
  if (listings.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-orange-50 flex items-center justify-center mb-5">
            <Package className="w-9 h-9 text-[#F26B21]" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">No listings to bundle yet</h1>
          <p className="text-gray-400 text-sm max-w-sm mb-6">
            Add at least 2 listings to your store before creating a bundle deal.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/sell/quick"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Add Your First Listing
            </Link>
            <Link href="/dashboard"
              className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-bold text-sm hover:border-gray-300 transition-colors">
              My Dashboard
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl flex-1">
        <button onClick={() => setLocation("/dashboard")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bundle Builder</h1>
              <p className="text-sm text-gray-400">Select your listings to create a bundled deal with tiered discounts</p>
            </div>
          </div>
        </div>

        {/* Discount tier display */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {TIERS.map((t) => {
            const active = tier?.min === t.min;
            const achieved = selected.length >= t.min;
            return (
              <div key={t.min} className={`rounded-2xl border-2 p-3 text-center transition-all ${achieved ? t.color : "bg-white border-gray-100 text-gray-400"} ${active ? "shadow-md scale-105" : ""}`}>
                <p className="text-lg font-black">{t.label}</p>
                <p className="text-xs font-medium mt-0.5">{t.min}+ items</p>
                {active && <span className="mt-1.5 inline-flex items-center gap-0.5 text-[10px] font-bold"><Sparkles className="w-3 h-3" /> Active!</span>}
              </div>
            );
          })}
        </div>

        {nextTier && selected.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 mb-5 flex items-center gap-3">
            <Info className="w-4 h-4 text-[#4A5CE8] flex-shrink-0" />
            <p className="text-sm text-gray-700">
              Add <strong>{nextTier.min - selected.length} more item{nextTier.min - selected.length > 1 ? "s" : ""}</strong> to unlock <strong className="text-[#4A5CE8]">{nextTier.label} off</strong>
            </p>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] rounded-full transition-all"
                style={{ width: `${Math.min((selected.length / nextTier.min) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Listings picker */}
          <div className="lg:col-span-2">
            {categories.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setFilterCategory(cat.slug)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filterCategory === cat.slug ? "bg-[#4A5CE8] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A5CE8] hover:text-[#4A5CE8]"}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <AnimatePresence>
                {visible.map((product) => {
                  const sel = selectedIds.has(product.id);
                  return (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => toggle(product.id)}
                      className={`relative bg-white rounded-2xl border-2 cursor-pointer transition-all group overflow-hidden ${sel ? "border-[#4A5CE8] shadow-lg shadow-[#4A5CE8]/10" : "border-gray-100 hover:border-gray-200 shadow-sm"}`}
                    >
                      <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${sel ? "bg-[#4A5CE8] border-[#4A5CE8]" : "bg-white border-gray-300 group-hover:border-[#4A5CE8]"}`}>
                        {sel && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>

                      <div className="aspect-square bg-gray-50 p-3 flex items-center justify-center">
                        {product.image ? (
                          <img src={product.image} alt={product.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <Package className="w-10 h-10 text-gray-200" />
                        )}
                        {product.condition && (
                          <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize ${CONDITION_COLORS[product.condition] ?? "bg-gray-100 text-gray-500"}`}>
                            {product.condition}
                          </span>
                        )}
                      </div>

                      <div className="p-3">
                        <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-2 min-h-[2rem]">{product.title}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">£{product.price.toFixed(2)}</span>
                        </div>
                        {product.location && (
                          <div className="flex items-center gap-0.5 mt-1 text-[10px] text-gray-400">
                            <MapPin className="w-3 h-3" />{product.location}
                          </div>
                        )}
                      </div>

                      {sel && <div className="absolute inset-0 border-2 border-[#4A5CE8] rounded-2xl pointer-events-none" />}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {/* Bundle summary */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#4A5CE8]" /> Your Bundle
              </h3>

              {selected.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Layers className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                  <p className="text-sm font-medium">Select items from the left to build your bundle</p>
                  <p className="text-xs mt-1">Min. 2 items for a discount</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                    {selected.map((p) => (
                      <div key={p.id} className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center">
                          {p.image
                            ? <img src={p.image} alt={p.title} className="w-full h-full object-contain p-1" />
                            : <Package className="w-4 h-4 text-gray-300" />}
                        </div>
                        <p className="flex-1 text-xs font-medium text-gray-700 line-clamp-1">{p.title}</p>
                        <span className="text-xs font-bold text-gray-900 flex-shrink-0">£{p.price.toFixed(2)}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggle(p.id); }} className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal ({selected.length} items)</span>
                      <span className="font-semibold text-gray-900">£{subtotal.toFixed(2)}</span>
                    </div>
                    {tier && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> Bundle discount ({tier.label})</span>
                        <span>−£{discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                      <span>Bundle Total</span>
                      <span className={tier ? "text-emerald-600" : ""}>£{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {tier && (
                    <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Buyers save £{discount.toFixed(2)} with this bundle!
                    </div>
                  )}

                  {selected.length < 2 && (
                    <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2 text-xs text-gray-500 text-center">
                      Add {2 - selected.length} more item to unlock discounts
                    </div>
                  )}
                </>
              )}

              <button
                onClick={publishBundle}
                disabled={selected.length < 2 || bundleAdded}
                className={`w-full mt-4 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  bundleAdded
                    ? "bg-emerald-500 text-white"
                    : selected.length < 2
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] text-white hover:opacity-90 shadow-sm"
                }`}
              >
                {bundleAdded ? (
                  <><Check className="w-4 h-4" /> Bundle Published!</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Publish Bundle Deal</>
                )}
              </button>

              {selected.length >= 2 && !bundleAdded && (
                <Link href="/dashboard" className="w-full mt-2 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-xs flex items-center justify-center gap-1.5 hover:border-gray-300 transition-colors">
                  Save draft & return <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

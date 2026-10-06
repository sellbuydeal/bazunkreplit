import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Store, Zap, Gavel, Handshake, Newspaper, Tag, Layers,
  ArrowRight, X,
  Smartphone, Shirt, Armchair, Dumbbell, BookOpen, CarFront, Gamepad2, Gem, Package2,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { NewBuyerPromo } from "./NewBuyerPromo";

const PILLS = [
  { icon: Tag,       label: "Buy It Now"    },
  { icon: Handshake, label: "Make an Offer" },
  { icon: Gavel,     label: "Auctions"      },
  { icon: Zap,       label: "Flash Sales"   },
  { icon: Newspaper, label: "Classifieds"   },
];

const SELL_OPTIONS = [
  {
    icon: ShoppingCart,
    label: "Direct Sale",
    desc: "List an item for sale right now",
    href: "/sell/direct",
    color: "bg-[#4A5CE8]/10 text-[#4A5CE8]",
    hover: "hover:border-[#4A5CE8]/30 hover:bg-[#4A5CE8]/5",
  },
  {
    icon: Gavel,
    label: "Auction",
    desc: "Start a bidding war for maximum value",
    href: "/auctions/create",
    color: "bg-[#F26B21]/10 text-[#F26B21]",
    hover: "hover:border-[#F26B21]/30 hover:bg-[#F26B21]/5",
  },
  {
    icon: Zap,
    label: "Flash Sale",
    desc: "Time-limited deal that drives urgency",
    href: "/flash-sales/create",
    color: "bg-yellow-500/10 text-yellow-500",
    hover: "hover:border-yellow-400/30 hover:bg-yellow-50",
  },
  {
    icon: Newspaper,
    label: "Classifieds",
    desc: "Post a local ad — no listing fee",
    href: "/classifieds",
    color: "bg-emerald-500/10 text-emerald-600",
    hover: "hover:border-emerald-400/30 hover:bg-emerald-50",
  },
  {
    icon: Layers,
    label: "Bundle",
    desc: "Group items together for a deal",
    href: "/bundle",
    color: "bg-purple-500/10 text-purple-600",
    hover: "hover:border-purple-400/30 hover:bg-purple-50",
  },
];

const HERO_CATS = [
  { name: "Electronics",   icon: Smartphone, color: "#3B82F6", href: "/browse?category=electronics" },
  { name: "Fashion",       icon: Shirt,      color: "#EC4899", href: "/browse?category=fashion"     },
  { name: "Gaming",        icon: Gamepad2,   color: "#8B5CF6", href: "/browse?category=gaming"      },
  { name: "Home & Garden", icon: Armchair,   color: "#0D9488", href: "/browse?category=home"        },
  { name: "Sports",        icon: Dumbbell,   color: "#10B981", href: "/browse?category=sports"      },
  { name: "Books",         icon: BookOpen,   color: "#F59E0B", href: "/browse?category=books"       },
  { name: "Collectibles",  icon: Gem,        color: "#F26B21", href: "/browse?category=collectibles"},
  { name: "Automotive",    icon: CarFront,   color: "#64748B", href: "/browse?category=automotive"  },
  { name: "All Categories",icon: Package2,   color: "#4A5CE8", href: "/categories"                  },
];

export function Hero() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [sellOpen, setSellOpen] = useState(false);

  function handleSellClick() {
    if (!user) {
      setLocation("/sell");
    } else {
      setSellOpen(true);
    }
  }

  return (
    <section className="relative w-full overflow-hidden bg-[#1A1D2E]">
      {/* Diagonal accent */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute -right-48 top-0 h-full w-[700px] bg-[#4A5CE8]/10"
          style={{ transform: "skewX(-14deg)" }} />
        <div className="absolute right-32 -top-20 w-72 h-72 rounded-full bg-[#F26B21]/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-7 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] gap-6 lg:gap-8 items-start">

          {/* ── Left panel ─────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
          >
            <h1 className="sr-only">Buy, Sell, Deal, Get Rewarded on Bazunk</h1>
            <img
              src="/hero-buy-sell-deal-rewarded.png"
              alt="Buy, Sell, Deal, Get Rewarded — colourful Bazunk marketplace artwork"
              width={1672}
              height={941}
              fetchPriority="high"
              className="block w-full aspect-[16/9] object-cover rounded-2xl mb-4 shadow-2xl shadow-black/20"
            />

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Link href="/browse">
                <button className="flex items-center justify-center gap-2 px-7 py-3.5 bg-[#F26B21] text-white font-black rounded-2xl hover:opacity-90 transition-opacity shadow-xl shadow-[#F26B21]/25 text-sm w-full sm:w-auto">
                  <ShoppingCart className="w-4 h-4" /> Start Shopping
                </button>
              </Link>


              {/* Sell — flyout trigger */}
              <button
                onClick={handleSellClick}
                className="flex items-center justify-center gap-2 px-7 py-3.5 border border-white/20 text-white font-bold rounded-2xl hover:bg-white/5 transition-colors text-sm w-full sm:w-auto"
              >
                <Store className="w-4 h-4" /> Start Selling
                <svg
                  className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${sellOpen ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

          </motion.div>

          {/* ── Right panel — top categories ──────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="hidden lg:flex flex-col gap-4 self-start"
          >
            <div className="grid grid-cols-3 gap-3">
            {HERO_CATS.map(({ name, icon: Icon, color, href }, i) => (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
              >
                <Link href={href}>
                  <div className="bg-white/6 border border-white/10 rounded-2xl px-3 py-3.5 min-h-[96px] flex flex-col items-center justify-center gap-2 hover:bg-white/12 hover:border-white/25 hover:scale-[1.03] transition-all duration-300 cursor-pointer group">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: color }}
                    >
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-white/65 text-[11px] font-semibold text-center leading-tight group-hover:text-white transition-colors">
                      {name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
            </div>

            {/* Marketplace type pills — aligned under categories */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PILLS.map(({ icon: Icon, label }) => (
                <span key={label} className="flex items-center gap-1.5 text-white/50 text-xs font-medium bg-white/5 border border-white/10 px-3 py-1.5 rounded-full hover:border-white/20 hover:text-white/70 transition-colors">
                  <Icon className="w-3 h-3" /> {label}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* New-buyer incentive — visible before sign-up */}
        <NewBuyerPromo />
      </div>

      {/* ── Sell flyout portal (escapes overflow-hidden) ── */}
      {createPortal(
        <AnimatePresence>
          {sellOpen && (
            <motion.div
              key="sell-flyout-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[300] flex items-center justify-center p-4"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={() => setSellOpen(false)}
            >
              <motion.div
                key="sell-flyout-panel"
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 16 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                  <div>
                    <h2 className="text-lg font-black text-gray-900">How do you want to sell?</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Pick a listing type — all are free to post</p>
                  </div>
                  <button
                    onClick={() => setSellOpen(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>

                {/* Options */}
                <div className="p-4 space-y-2">
                  {SELL_OPTIONS.map(({ icon: Icon, label, desc, href, color, hover }) => (
                    <Link key={href} href={href} onClick={() => setSellOpen(false)}>
                      <div className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-gray-100 ${hover} transition-all cursor-pointer group`}>
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{label}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 pt-1 text-center">
                  <p className="text-[11px] text-gray-400">
                    No fees to list · Bazunk only earns when you sell
                  </p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </section>
  );
}

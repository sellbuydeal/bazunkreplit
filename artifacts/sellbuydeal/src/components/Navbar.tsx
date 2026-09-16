import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, User, HelpCircle, X, Eye, CheckCircle2, ChevronRight,
  Heart, ShoppingCart, Tag, ChevronDown, LogOut,
  LayoutDashboard, Menu, Home, Grid3X3, List, Newspaper, MessageSquare,
  Gavel, Zap, Gift, Package, Radio, Handshake, MapPin, Info,
  Trophy, MoreHorizontal, Flame, ArrowDownToLine, ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES } from "@/data/categories";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useCurrency, CURRENCIES, type CurrencyCode } from "@/context/CurrencyContext";
import { MessageCenterOverlay } from "./MessageCenterOverlay";

const ALL_PRODUCTS: { id: number; title: string; price: number; condition: string; views: number; image: string; category: string }[] = [];

const SELL_OPTIONS: Array<{
  id: string; label: string; desc: string;
  icon: React.FC<{ className?: string }>; href: string;
  color: string; bg: string; badge?: string;
}> = [
  {
    id: "quick",
    label: "Quick List",
    desc: "List a single item in seconds",
    icon: Zap,
    href: "/sell/quick",
    color: "text-[#F26B21]",
    bg: "bg-orange-50",
  },
  {
    id: "bundle",
    label: "Bundle Deal",
    desc: "Sell multiple items together",
    icon: Package,
    href: "/bundle",
    color: "text-[#4A5CE8]",
    bg: "bg-blue-50",
  },
  {
    id: "auction",
    label: "Auction",
    desc: "Let buyers bid on your item",
    icon: Gavel,
    href: "/auctions",
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    id: "classified",
    label: "Classified Ad",
    desc: "Post a local or free ad",
    icon: Newspaper,
    href: "/classifieds?post=1",
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
  {
    id: "locker",
    label: "Locker Shipping",
    desc: "InPost, Evri & Royal Mail drop-off",
    icon: MapPin,
    href: "/shipping/lockers",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
];

const MORE_NAV = [
  { href: "/auctions",          label: "Auctions",         icon: Gavel },
  { href: "/flash-sales",       label: "Flash Sales",      icon: Flame },
  { href: "/classifieds",       label: "Classifieds",      icon: Newspaper },
  { href: "/buyer-protection",  label: "Buyer Protection", icon: ShieldCheck },
  { href: "/support",           label: "Support",          icon: HelpCircle },
  { href: "/dashboard",         label: "Importers",        icon: ArrowDownToLine },
];

const MOBILE_NAV_LINKS = [
  { href: "/",            label: "Home",        icon: Home },
  { href: "/browse",      label: "Browse",      icon: Grid3X3 },
  { href: "/auctions",    label: "Auctions",    icon: Gavel },
  { href: "/flash-sales", label: "Flash Sales", icon: Zap },
  { href: "/live",        label: "Live",        icon: Radio,  live: true },
  { href: "/categories",  label: "Categories",  icon: List },
  { href: "/classifieds", label: "Classifieds", icon: Newspaper },
  { href: "/sell/quick",  label: "Quick List",  icon: Tag },
  { href: "/bundle",      label: "Bundle Deal", icon: Package },
  { href: "/offers",      label: "My Offers",   icon: Handshake },
  { href: "/messages",    label: "Messages",    icon: MessageSquare },
  { href: "/dashboard",   label: "Dashboard",   icon: LayoutDashboard },
  { href: "/buyer-protection", label: "Buyer Protection", icon: ShieldCheck },
  { href: "/dashboard",        label: "Importers",        icon: ArrowDownToLine },
  { href: "/support",          label: "Support",          icon: HelpCircle },
];

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount, openCart } = useCart();
  const { currency, setCurrency, formatPrice } = useCurrency();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [rewardsPopover, setRewardsPopover] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [messageCenterOpen, setMessageCenterOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const sellRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const rewardsRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim().toLowerCase();
  const matchedProducts = trimmed
    ? ALL_PRODUCTS.filter((p) => p.title.toLowerCase().includes(trimmed)).slice(0, 4)
    : [];
  const matchedCategories = trimmed
    ? CATEGORIES.filter(
        (c) => c.name.toLowerCase().includes(trimmed) ||
          c.subcategories.some((s) => s.name.toLowerCase().includes(trimmed))
      ).slice(0, 3)
    : [];
  const hasResults = matchedProducts.length > 0 || matchedCategories.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false);
      if (sellRef.current && !sellRef.current.contains(e.target as Node)) setSellOpen(false);
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
      if (rewardsRef.current && !rewardsRef.current.contains(e.target as Node)) setRewardsPopover(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (trimmed) {
      setLocation(`/search?q=${encodeURIComponent(trimmed)}`);
      setSearchOpen(false);
      setMobileOpen(false);
    }
  }

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    setMobileOpen(false);
    setLocation("/");
  }

  function navTo(href: string) {
    setLocation(href);
    setMobileOpen(false);
  }

  function handleRewardsClick() {
    if (user) {
      setLocation("/dashboard?section=credits");
    } else {
      setRewardsPopover((v) => !v);
    }
  }

  const initial = user?.name?.charAt(0).toUpperCase() ?? "U";

  const primaryLinks = [
    { href: "/",           label: "Home" },
    { href: "/browse",     label: "Browse" },
    { href: "/categories", label: "Categories" },
    { href: "/live",       label: "Live", live: true },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 w-full bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between gap-3">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0" data-testid="link-logo">
            <img src="/bazunk-logo.png" alt="Bazunk" className="h-20 w-auto object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-0.5 text-sm font-medium">

            {/* Primary links */}
            {primaryLinks.map(({ href, label, live }) => {
              const active = location === href && !(href === "/" && location !== "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    active
                      ? "text-[#F26B21] font-semibold bg-orange-50"
                      : "text-gray-500 hover:text-[#F26B21] hover:bg-gray-50"
                  }`}
                >
                  {live && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                  )}
                  {label}
                </Link>
              );
            })}

            {/* Rewards — highlighted, guest-visible */}
            <div ref={rewardsRef} className="relative">
              <button
                onClick={handleRewardsClick}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap text-amber-600 font-semibold hover:bg-amber-50"
                data-testid="link-rewards"
              >
                <Trophy className="w-3.5 h-3.5" />
                Rewards
              </button>
              <AnimatePresence>
                {rewardsPopover && !user && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-[calc(100%+8px)] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="px-5 pt-5 pb-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
                        <Trophy className="w-6 h-6 text-amber-500" />
                      </div>
                      <p className="font-bold text-gray-900 text-sm">Earn Rewards on Bazunk</p>
                      <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                        Complete milestones, earn credits & badges. Free to join — your rewards build up from your first listing.
                      </p>
                    </div>
                    <div className="px-5 pb-5 flex flex-col gap-2">
                      <Link
                        href="/sign-up"
                        onClick={() => setRewardsPopover(false)}
                        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#D97706] transition-colors"
                      >
                        <Gift className="w-4 h-4" /> Join Free & Start Earning
                      </Link>
                      <Link
                        href="/sign-in"
                        onClick={() => setRewardsPopover(false)}
                        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                      >
                        Already have an account? Sign in
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* More dropdown */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  moreOpen ? "text-[#F26B21] bg-orange-50" : "text-gray-500 hover:text-[#F26B21] hover:bg-gray-50"
                }`}
                data-testid="button-more-nav"
              >
                More
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-[calc(100%+8px)] w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1.5"
                  >
                    {MORE_NAV.map(({ href, label, icon: Icon }) => {
                      const active = location === href;
                      return (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMoreOpen(false)}
                          className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                            active
                              ? "text-[#F26B21] font-semibold bg-orange-50"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <Icon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          {label}
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 flex-1 md:flex-none justify-end">

            {/* Desktop search */}
            <div ref={searchRef} className="relative w-full max-w-[220px] hidden sm:block">
              <form onSubmit={handleSubmit}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="search"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => query.trim() && setSearchOpen(true)}
                  placeholder="Search for anything..."
                  className="w-full pl-9 pr-8 rounded-full bg-gray-100 border-transparent focus-visible:ring-1 focus-visible:ring-[#4A5CE8] h-9 text-sm"
                  data-testid="input-search"
                />
                {query && (
                  <button type="button" onClick={() => { setQuery(""); setSearchOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>
              {searchOpen && query.trim() && (
                <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  {!hasResults ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">No results for "<span className="font-medium text-gray-600">{query}</span>"</div>
                  ) : (
                    <>
                      {matchedProducts.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Products</p>
                          {matchedProducts.map((product) => (
                            <Link key={product.id} href={`/listing/${product.id}`} onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group" data-testid={`link-search-product-${product.id}`}>
                              <div className="w-9 h-9 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
                                <img src={product.image} alt={product.title} className="w-full h-full object-contain p-1" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-[#4A5CE8] transition-colors">{product.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-green-600">{formatPrice(product.price)}</span>
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 capitalize">{product.condition}</Badge>
                                  <span className="flex items-center gap-0.5 text-[10px] text-gray-400"><Eye className="w-2.5 h-2.5" />{product.views}</span>
                                </div>
                              </div>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                            </Link>
                          ))}
                        </div>
                      )}
                      {matchedCategories.length > 0 && (
                        <div className={matchedProducts.length > 0 ? "border-t border-gray-100" : ""}>
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-4 pt-3 pb-1">Categories</p>
                          {matchedCategories.map((cat) => (
                            <Link key={cat.slug} href="/categories" onClick={() => setSearchOpen(false)}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors group" data-testid={`link-search-category-${cat.slug}`}>
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center flex-shrink-0">
                                <span className="text-white text-xs font-bold">{cat.name.charAt(0)}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-[#4A5CE8] transition-colors">{cat.name}</p>
                                <p className="text-[10px] text-gray-400">{cat.subcategories.length} subcategories</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#4A5CE8] transition-colors" />
                            </Link>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-gray-100 px-4 py-2.5">
                        <button onClick={handleSubmit as never} className="w-full text-center text-sm text-[#4A5CE8] font-medium hover:underline py-1">
                          See all results for "{query}"
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Currency selector */}
            <div ref={currencyRef} className="relative hidden sm:block">
              <button
                onClick={() => setCurrencyOpen(!currencyOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors bg-white"
                data-testid="button-currency"
              >
                <span className="text-base leading-none">{currency.flag}</span>
                <span className="text-xs">{currency.symbol}</span>
                <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${currencyOpen ? "rotate-180" : ""}`} />
              </button>
              {currencyOpen && (
                <div className="absolute right-0 top-[calc(100%+6px)] w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 py-1">
                  {(Object.values(CURRENCIES) as typeof CURRENCIES[CurrencyCode][]).map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setCurrency(c.code); setCurrencyOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                        currency.code === c.code
                          ? "bg-[#4A5CE8]/5 text-[#4A5CE8] font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-base w-6 text-center">{c.flag}</span>
                      <span className="flex-1">{c.name}</span>
                      <span className="text-gray-400 font-mono text-xs">{c.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Logged OUT actions */}
            {!user && (
              <>
                <Link href="/sell" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-[#F26B21]/40 text-[#F26B21] text-sm font-semibold hover:bg-[#F26B21]/5 transition-colors" data-testid="link-sell-info">
                  <Tag className="w-3.5 h-3.5" /> Start Selling
                </Link>
                <Link href="/sign-in" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full border border-gray-200 text-sm font-semibold text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors" data-testid="link-sign-in">
                  Sign In
                </Link>
                <Link href="/sign-up" className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F26B21] text-white text-sm font-semibold hover:bg-[#D97706] transition-colors shadow-sm" data-testid="link-register">
                  Join Free
                </Link>
              </>
            )}

            {/* Logged IN actions */}
            {user && (
              <>
                {/* Sell dropdown */}
                <div ref={sellRef} className="relative hidden md:block flex-shrink-0">
                  <button
                    onClick={() => setSellOpen(!sellOpen)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#F26B21] text-white text-sm font-bold hover:bg-[#D97706] transition-colors shadow-sm"
                    data-testid="button-sell-dropdown"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    Sell
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${sellOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {sellOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="px-4 pt-3 pb-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">How do you want to sell?</p>
                        </div>
                        {SELL_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          return (
                            <Link
                              key={opt.id}
                              href={opt.href}
                              onClick={() => setSellOpen(false)}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                              data-testid={`sell-option-${opt.id}`}
                            >
                              <div className={`w-9 h-9 rounded-xl ${opt.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-4 h-4 ${opt.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-gray-900 group-hover:text-[#F26B21] transition-colors">{opt.label}</span>
                                  {opt.badge && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-red-500 text-white leading-none tracking-wide animate-pulse">
                                      {opt.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</p>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#F26B21] transition-colors flex-shrink-0" />
                            </Link>
                          );
                        })}
                        <div className="border-t border-gray-100 mx-4" />
                        <Link
                          href="/sell"
                          onClick={() => setSellOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#F26B21] font-semibold hover:underline"
                        >
                          <Info className="w-3.5 h-3.5" /> View seller fees & all options →
                        </Link>
                        <div className="border-t border-gray-100 mx-4" />
                        <Link
                          href="/dashboard"
                          onClick={() => setSellOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 pb-3 text-xs text-[#4A5CE8] font-semibold hover:underline"
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" /> Manage your listings →
                        </Link>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Messages */}
                <button
                  onClick={() => setMessageCenterOpen(true)}
                  className="hidden md:flex w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center text-gray-600 transition-colors relative"
                  data-testid="button-messages"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>

                {/* Cart */}
                <button
                  onClick={openCart}
                  className="hidden md:flex w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 items-center justify-center text-gray-600 transition-colors relative"
                  data-testid="button-cart"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F26B21] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {itemCount > 9 ? "9+" : itemCount}
                    </span>
                  )}
                </button>

                {/* User menu */}
                <div ref={userMenuRef} className="relative flex-shrink-0">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                    data-testid="button-user-menu"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white text-xs font-bold">
                      {initial}
                    </div>
                    <span className="hidden md:block text-sm font-semibold text-gray-800 max-w-[80px] truncate">{user.username}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-[calc(100%+8px)] w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50"
                      >
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <LayoutDashboard className="w-4 h-4 text-gray-400" /> My Dashboard
                        </Link>
                        <Link href="/offers" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Handshake className="w-4 h-4 text-gray-400" /> My Offers
                        </Link>
                        <button onClick={() => { setUserMenuOpen(false); setMessageCenterOpen(true); }} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <MessageSquare className="w-4 h-4 text-gray-400" /> Messages
                        </button>
                        <Link href="/sell/quick" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                          <Tag className="w-4 h-4 text-gray-400" /> Create Listing
                        </Link>
                        <div className="border-t border-gray-100">
                          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors" data-testid="button-logout">
                            <LogOut className="w-4 h-4" /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex-shrink-0"
              aria-label="Open menu"
              data-testid="button-mobile-menu"
            >
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 flex flex-col md:hidden shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center">
                  <img src="/bazunk-logo.png" alt="Bazunk" className="h-8 w-auto object-contain" />
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search */}
              <div className="px-5 py-3 border-b border-gray-100">
                <form onSubmit={handleSubmit} className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search listings..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-100 border-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30"
                    data-testid="input-search-mobile"
                  />
                </form>
              </div>

              {/* User info (logged in) */}
              {user && (
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white font-bold">
                    {initial}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{user.name}</p>
                    <p className="text-xs text-gray-400 truncate max-w-[180px]">{user.email}</p>
                  </div>
                </div>
              )}

              {/* Rewards banner (guest) */}
              {!user && (
                <div className="mx-4 mt-3 mb-1 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-amber-800">Earn Rewards</p>
                    <p className="text-[11px] text-amber-600">Credits, badges & perks</p>
                  </div>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileOpen(false)}
                    className="text-[11px] font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Join Free
                  </Link>
                </div>
              )}

              {/* Nav links */}
              <nav className="flex-1 overflow-y-auto py-2">
                {/* Rewards link (logged in) */}
                {user && (
                  <button
                    onClick={() => { setLocation("/dashboard?section=credits"); setMobileOpen(false); }}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors text-left"
                    data-testid="mobile-link-rewards"
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Rewards & Credits
                    <ChevronRight className="w-3.5 h-3.5 text-amber-300 ml-auto" />
                  </button>
                )}
                {MOBILE_NAV_LINKS.map(({ href, label, icon: Icon, live }) => (
                  <button
                    key={href}
                    onClick={() => navTo(href)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-[#4A5CE8] transition-colors text-left"
                    data-testid={`mobile-link-${label.toLowerCase().replace(/\s/g, "-")}`}
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    {label}
                    {live && (
                      <span className="relative flex h-2 w-2 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    <ChevronRight className="w-3.5 h-3.5 text-gray-300 ml-auto" />
                  </button>
                ))}
              </nav>

              {/* Bottom auth actions */}
              {!user && (
                <div className="px-5 py-4 border-t border-gray-100 flex flex-col gap-2">
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:bg-[#D97706] transition-colors"
                    data-testid="mobile-link-register"
                  >
                    <Gift className="w-4 h-4" /> Join Free
                  </Link>
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-semibold hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                    data-testid="mobile-link-sign-in"
                  >
                    Sign In
                  </Link>
                </div>
              )}
              {user && (
                <div className="px-5 py-4 border-t border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-100 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors"
                    data-testid="mobile-button-logout"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <MessageCenterOverlay open={messageCenterOpen} onClose={() => setMessageCenterOpen(false)} />
    </>
  );
}

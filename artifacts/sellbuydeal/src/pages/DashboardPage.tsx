import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Bell, ShoppingBag, BarChart2, Heart, Search, MessageSquare,
  ArrowUp, Home as HomeIcon, Crown,
  Coins, Megaphone, User, Shield, ShieldCheck, MapPin, CreditCard, Banknote, Zap, Store,
  Tag, Eye, Plus, TrendingUp, Trophy, Gift, ChevronRight, LogOut,
  ShoppingCart, Trash2, TrendingDown, Bell as BellIcon, BellOff, ExternalLink,
  ArrowRight, CheckCheck, Check, CheckCircle, CheckCircle2, Flame, Star,
  Info, Phone, Building2, FileText, Share2, Settings, Copy, AlertTriangle,
  Globe, Edit, Pencil, Users, Package, Menu, X, Radio, Link2,
  RotateCcw, Truck, Clock, PackageCheck, XCircle, ChevronDown, Gavel, Handshake,
  MoreVertical, PauseCircle, Image as ImageIcon,
  LifeBuoy, Send, Inbox, AlertCircle, Percent, RefreshCw, ArrowDownToLine,
} from "lucide-react";
import { useCurrency, countryToCurrency } from "@/context/CurrencyContext";
import { COUNTRY_STORAGE_KEY } from "@/components/CountrySetupModal";
import { useAuth } from "@/context/AuthContext";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { useWatchlist, getCurrentPrice } from "@/context/WatchlistContext";
import { useCart } from "@/context/CartContext";
import { MOCK_CONVERSATIONS } from "@/data/messages";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLiveStream } from "@/context/LiveStreamContext";
import { PLATFORM_META, type LivePlatform } from "@/data/livestreams";
import { LiveKitBroadcaster } from "@/components/LiveKitBroadcaster";
import { ALL_PRODUCTS } from "@/data/products";

import { ImporterSection } from "@/components/ImporterSection";
import { UserAmazonImporterSection } from "@/components/UserAmazonImporterSection";
import { UserEbayImporterSection } from "@/components/UserEbayImporterSection";
import { UserClassifiedsImporterSection } from "@/components/UserClassifiedsImporterSection";
import { CATEGORIES as SITE_CATEGORIES } from "@/data/categories";

import tshirtImage from "/tshirt.png";
import macbookImage from "/macbook.png";
import ps5Image from "/ps5.png";

type SidebarSubItem = { id: string; label: string; icon: React.ElementType; iconBg: string };
type SidebarCategory = {
  id: string; label: string; icon: React.ElementType;
  gradient: string; bg: string; items: SidebarSubItem[];
};

const SIDEBAR_CATEGORIES: SidebarCategory[] = [
  {
    id: "overview", label: "Overview", icon: LayoutDashboard,
    gradient: "from-[#3B4FD8] to-[#4A5CE8]", bg: "bg-[#3B4FD8]", items: [],
  },
  {
    id: "buying", label: "Buying", icon: ShoppingCart,
    gradient: "from-[#4A5CE8] to-indigo-500", bg: "bg-[#4A5CE8]",
    items: [
      { id: "orders",         label: "Orders",        icon: ShoppingBag, iconBg: "bg-[#4A5CE8]"     },
      { id: "my-bids",        label: "My Bids",       icon: TrendingUp,  iconBg: "bg-[#4A5CE8]"     },
      { id: "offers",         label: "My Offers",     icon: Handshake,   iconBg: "bg-emerald-600"    },
      { id: "watchlist",      label: "Watchlist",     icon: Heart,       iconBg: "bg-amber-500"      },
      { id: "saved-searches", label: "Saved Searches",icon: Search,      iconBg: "bg-sky-500"        },
    ],
  },
  {
    id: "selling", label: "Selling", icon: Store,
    gradient: "from-[#F26B21] to-orange-400", bg: "bg-[#F26B21]",
    items: [
      { id: "my-store",      label: "My Store",      icon: Store,     iconBg: "bg-[#F26B21]" },
      { id: "my-listings",   label: "My Listings",   icon: Package,   iconBg: "bg-[#F26B21]" },
      { id: "sales",         label: "Sales",         icon: BarChart2, iconBg: "bg-[#F26B21]" },
      { id: "my-auctions",   label: "My Auctions",   icon: Gavel,     iconBg: "bg-[#F26B21]" },
      { id: "my-flash-sales",label: "Flash Sales",   icon: Zap,       iconBg: "bg-[#F26B21]" },
      { id: "auto-accept",   label: "Auto-Accept",   icon: Zap,       iconBg: "bg-amber-500"  },
      { id: "go-live",       label: "Go Live",       icon: Radio,     iconBg: "bg-red-500"    },
    ],
  },
  {
    id: "importers", label: "Importers", icon: ArrowDownToLine,
    gradient: "from-[#1A1D2E] to-slate-600", bg: "bg-[#1A1D2E]",
    items: [
      { id: "amazon-import",    label: "Amazon UK",   icon: ShoppingBag, iconBg: "bg-[#F26B21]" },
      { id: "ebay-import",      label: "eBay",        icon: ShoppingBag, iconBg: "bg-[#4A5CE8]" },
      { id: "aliexpress-import",       label: "AliExpress",  icon: Package,     iconBg: "bg-[#1A1D2E]" },
      { id: "classifieds-import",      label: "Classifieds", icon: FileText,    iconBg: "bg-[#10B981]" },
    ],
  },
  {
    id: "comms", label: "Inbox", icon: MessageSquare,
    gradient: "from-purple-500 to-purple-600", bg: "bg-purple-500",
    items: [
      { id: "notifications", label: "Notifications", icon: Bell,          iconBg: "bg-[#4A5CE8]"  },
      { id: "messages",      label: "Messages",      icon: MessageSquare, iconBg: "bg-purple-500" },
    ],
  },
  {
    id: "finance", label: "Finance", icon: CreditCard,
    gradient: "from-emerald-500 to-teal-500", bg: "bg-emerald-500",
    items: [
      { id: "credits",        label: "Credits",        icon: Coins,     iconBg: "bg-emerald-500" },
      { id: "seller-payouts", label: "Seller Payouts", icon: Banknote,  iconBg: "bg-emerald-600" },
      { id: "payment-cards",  label: "Payment Cards",  icon: CreditCard,iconBg: "bg-[#4A5CE8]"   },
      { id: "promotions",     label: "Promotions",     icon: Megaphone, iconBg: "bg-rose-500"    },
    ],
  },
  {
    id: "account", label: "Account", icon: User,
    gradient: "from-sky-500 to-blue-500", bg: "bg-sky-500",
    items: [
      { id: "profile",      label: "Profile",      icon: User,        iconBg: "bg-sky-500"   },
      { id: "security",     label: "Security",     icon: Shield,      iconBg: "bg-slate-500" },
      { id: "verification", label: "Verification", icon: ShieldCheck, iconBg: "bg-[#4A5CE8]" },
      { id: "addresses",    label: "Addresses",    icon: MapPin,      iconBg: "bg-teal-500"  },
    ],
  },
  {
    id: "support", label: "Support", icon: LifeBuoy,
    gradient: "from-rose-500 to-pink-500", bg: "bg-rose-500",
    items: [
      { id: "buyer-protection", label: "Buyer Protection", icon: ShieldCheck, iconBg: "bg-emerald-500" },
      { id: "disputes",         label: "Disputes",         icon: Shield,      iconBg: "bg-rose-500"    },
      { id: "returns",          label: "Returns",          icon: RotateCcw,   iconBg: "bg-amber-500"   },
      { id: "support-tickets",  label: "Support",          icon: LifeBuoy,    iconBg: "bg-[#4A5CE8]"  },
    ],
  },
];


const RECENT_ACTIVITY: { id: number; title: string; price: number; date: string }[] = [];

const MOCK_NOTIFICATIONS: { id: number; icon: React.ElementType; iconBg: string; iconColor: string; title: string; desc: string; time: string; unread: boolean }[] = [];

type TrackingStep = { label: string; detail: string; done: boolean; active: boolean };
type MockOrder = {
  id: string; title: string; price: number; date: string;
  status: string; statusColor: string; seller: string; image: string;
  trackingNumber?: string; carrier?: string; estimatedDelivery?: string;
  address?: string; trackingStep: number;
};
type MockReturn = {
  id: string; orderId: string; title: string; price: number;
  status: string; statusColor: string; reason: string; condition: string;
  description: string; date: string; image: string;
  adminNotes?: string; refundAmount?: string; returnTracking?: string;
};

function getTrackingSteps(step: number): TrackingStep[] {
  const steps = [
    { label: "Order Placed",        detail: "Your order has been received" },
    { label: "Payment Confirmed",   detail: "Payment verified by the platform" },
    { label: "Seller Preparing",    detail: "Seller is packing your item" },
    { label: "Shipped",             detail: "Your parcel is on its way" },
    { label: "Out for Delivery",    detail: "With your local courier" },
    { label: "Delivered",           detail: "Package delivered — enjoy!" },
  ];
  return steps.map((s, i) => ({ ...s, done: i < step, active: i === step }));
}

const MOCK_ORDERS_DATA: MockOrder[] = [];

const MOCK_RETURNS_DATA: MockReturn[] = [];

const MOCK_ORDERS: MockOrder[] = MOCK_ORDERS_DATA;

const MOCK_SALES: { id: string; title: string; price: number; date: string; status: string; statusColor: string; buyer: string; image: string; fee: number }[] = [];

const MOCK_SAVED_SEARCHES: { id: number; query: string; filters: string; count: number; lastRun: string; alert: boolean }[] = [];

function BuyerProtectionDashSection() {
  const [, setLocation] = useLocation();
  return (
    <div className="flex-1 p-6 max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Buyer Protection</h2>
        <p className="text-gray-500 text-sm mt-1">Every purchase on Bazunk is fully covered.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Clock,    color: "bg-emerald-500", label: "48h Dispute Resolution",    desc: "Fast resolution by our UK team" },
          { icon: Shield,   color: "bg-[#4A5CE8]",   label: "Escrow-Protected Payments", desc: "Money held safely until you're happy" },
          { icon: RotateCcw,color: "bg-amber-500",   label: "30-Day Returns",            desc: "Change your mind? No problem" },
        ].map(({ icon: Icon, color, label, desc }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-3 shadow-sm">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h3 className="font-black text-gray-900">You're Protected Against</h3>
        {[
          { title: "Item Not Received",   desc: "Full refund if your order never arrives." },
          { title: "Not As Described",    desc: "Return and full refund if the item differs from the listing." },
          { title: "Counterfeit Items",   desc: "Zero tolerance — instant refund, no return needed." },
          { title: "Seller Disappeared",  desc: "We intervene immediately and refund you in full." },
        ].map(({ title, desc }) => (
          <div key={title} className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 text-center space-y-4">
        <p className="font-bold text-gray-900">Need help with an order?</p>
        <p className="text-sm text-gray-500">Our UK-based support team is here 7 days a week.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setLocation("/dashboard?section=disputes")}
            className="bg-[#F26B21] text-white font-bold px-6 py-2.5 rounded-full hover:bg-[#e05a10] transition-colors text-sm"
          >
            Open a Dispute
          </button>
          <button
            onClick={() => setLocation("/support")}
            className="bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-2.5 rounded-full hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors text-sm"
          >
            Contact Support
          </button>
        </div>
        <Link href="/buyer-protection" className="inline-flex items-center gap-1.5 text-sm text-[#4A5CE8] font-medium hover:underline mt-1">
          View full policy <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

function EmptySection({ label }: { label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-gray-400">
      <p className="text-lg font-medium">{label}</p>
      <p className="text-sm mt-1">Nothing here yet</p>
    </div>
  );
}

function OffersSection() {
  const [tab, setTab] = useState<"received" | "sent">("received");
  return (
    <div className="flex-1 p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-gray-900">My Offers</h2>
        <p className="text-sm text-gray-400 mt-1">Track offers you've made and received from buyers</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {(["received", "sent"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              tab === t
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {t === "received" ? "Received" : "Sent"}
          </button>
        ))}
      </div>

      {/* Empty state */}
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
          <Handshake className="w-7 h-7 text-emerald-600" />
        </div>
        <p className="font-black text-gray-800 text-lg mb-1">
          {tab === "received" ? "No offers received yet" : "You haven't made any offers"}
        </p>
        <p className="text-sm text-gray-400 max-w-xs mb-6">
          {tab === "received"
            ? "When buyers make an offer on your listings it will appear here."
            : "Browse listings and make an offer — negotiate the best price directly."}
        </p>
        <Link
          href={tab === "received" ? "/sell/quick" : "/browse"}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          {tab === "received" ? (
            <><Tag className="w-4 h-4" /> Create a Listing</>
          ) : (
            <><Search className="w-4 h-4" /> Browse Listings</>
          )}
        </Link>
      </div>

      {/* Info tip */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-blue-600">
          <span className="font-bold">Tip:</span> Enable Auto-Accept Offers in your dashboard to automatically approve offers above a set price — saving you time and closing deals faster.
        </p>
      </div>
    </div>
  );
}

type ExtraCat = { category: string; subcategory: string };
type StoredListing = { id: number; publicId?: string | null; title: string; price: number; views: number; watchers: number; image: string; status: string; description?: string; condition?: string; category?: string; subcategory?: string; extraCategories?: string; sellerEmail?: string };

async function fetchMyListings(email: string): Promise<StoredListing[]> {
  if (!email) return [];
  try {
    const res = await fetch(`/api/listings/mine?email=${encodeURIComponent(email)}`);
    if (!res.ok) return [];
    const data: Array<{ id: number; publicId?: string | null; title: string; price: string; views: number; watchers: number; image: string | null; status: string; description?: string; condition?: string; category?: string; subcategory?: string; extraCategories?: string; seller_email?: string; sellerEmail?: string }> = await res.json();
    return data.map((l) => ({
      id: l.id,
      publicId: l.publicId ?? null,
      title: l.title,
      price: parseFloat(l.price),
      views: l.views,
      watchers: l.watchers,
      image: l.image ?? "",
      status: l.status,
      description: l.description ?? "",
      condition: l.condition ?? "good",
      category: l.category ?? "",
      subcategory: l.subcategory ?? "",
      extraCategories: l.extraCategories ?? "",
      sellerEmail: l.seller_email ?? l.sellerEmail,
    }));
  } catch { return []; }
}

// ── Listing Actions: dropdown menu + revise modal + promote modal ─────────────
const LISTING_CONDITIONS = ["brand-new", "like-new", "good", "fair", "poor"];

function findCategoryTop(val: string): string {
  if (!val) return SITE_CATEGORIES[0]?.slug ?? "";
  if (SITE_CATEGORIES.find(c => c.slug === val)) return val;
  const parent = SITE_CATEGORIES.find(c => c.subcategories.some(s => s.slug === val));
  return parent?.slug ?? SITE_CATEGORIES[0]?.slug ?? "";
}

function ListingActions({ listing, userEmail, onUpdated, onDeleted }: {
  listing: StoredListing;
  userEmail: string;
  onUpdated: (updated: StoredListing) => void;
  onDeleted: (id: number) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reviseOpen, setReviseOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [draft, setDraft] = useState({ title: "", price: "", description: "", condition: "good", category: "", categoryTop: "", image: "", extraCategories: [] as ExtraCat[] });
  const [addingExtraCat, setAddingExtraCat] = useState(false);
  const [newExtraCatTop, setNewExtraCatTop] = useState("");
  const [newExtraCatSub, setNewExtraCatSub] = useState("");
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState<string | null>(null);
  const [promoteResult, setPromoteResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [menuOpen]);

  function openRevise() {
    const catVal = listing.category ?? "";
    const catTop = findCategoryTop(catVal);
    let extraCategories: ExtraCat[] = [];
    try { extraCategories = listing.extraCategories ? JSON.parse(listing.extraCategories) : []; } catch { /* ignore */ }
    setDraft({
      title: listing.title,
      price: String(listing.price),
      description: listing.description ?? "",
      condition: listing.condition ?? "good",
      category: catVal,
      categoryTop: catTop,
      image: listing.image ?? "",
      extraCategories,
    });
    setAddingExtraCat(false);
    setNewExtraCatTop("");
    setNewExtraCatSub("");
    setMenuOpen(false);
    setReviseOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}?email=${encodeURIComponent(userEmail)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title, price: draft.price, description: draft.description, condition: draft.condition, category: draft.categoryTop, subcategory: draft.category, image: draft.image, extra_categories: draft.extraCategories }),
      });
      if (res.ok) {
        const u = await res.json();
        onUpdated({ ...listing, title: u.title, price: parseFloat(u.price), description: u.description, condition: u.condition, category: u.category, image: u.image ?? "" });
        setReviseOpen(false);
      }
    } finally { setSaving(false); }
  }

  async function handleSuspend() {
    setMenuOpen(false);
    const newStatus = listing.status === "active" ? "suspended" : "active";
    const res = await fetch(`/api/listings/${listing.id}?email=${encodeURIComponent(userEmail)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) { const u = await res.json(); onUpdated({ ...listing, status: u.status }); }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    const res = await fetch(`/api/listings/${listing.id}?email=${encodeURIComponent(userEmail)}`, { method: "DELETE" });
    if (res.ok) onDeleted(listing.id);
  }

  async function handlePromote(type: string) {
    setPromoting(type);
    setPromoteResult(null);
    try {
      const res = await fetch("/api/promotions/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, type, listingId: listing.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setPromoteResult({ ok: true, msg: `Promotion applied! ${Math.round(data.creditsSpent * 100)} credits deducted.` });
      } else if (res.status === 402) {
        const needed = Math.round(data.required * 100);
        const have = Math.round(data.balance * 100);
        setPromoteResult({ ok: false, msg: `Not enough credits — need ${needed}, you have ${have}.` });
      } else {
        setPromoteResult({ ok: false, msg: data.error ?? "Something went wrong." });
      }
    } catch {
      setPromoteResult({ ok: false, msg: "Network error — please try again." });
    } finally {
      setPromoting(null);
    }
  }

  return (
    <>
      <div ref={menuRef} className="relative flex-shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          title="Manage listing"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-9 z-50 bg-white rounded-xl border border-gray-100 shadow-xl py-1.5 min-w-[176px]"
            >
              <button onClick={openRevise} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <Pencil className="w-3.5 h-3.5 text-[#4A5CE8]" /> Revise Listing
              </button>
              <button onClick={() => { setMenuOpen(false); setPromoteOpen(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <TrendingUp className="w-3.5 h-3.5 text-[#F26B21]" /> Promote Listing
              </button>
              <button onClick={handleSuspend} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                <PauseCircle className="w-3.5 h-3.5 text-amber-500" />
                {listing.status === "active" ? "Suspend Listing" : "Re-activate"}
              </button>
              <div className="h-px bg-gray-100 mx-3 my-1" />
              <button onClick={handleDelete} className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete Listing
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Revise Modal ── */}
      <AnimatePresence>
        {reviseOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setReviseOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Revise Listing</h3>
                  {listing.publicId && <p className="text-xs text-gray-400 mt-0.5 font-mono">{listing.publicId}</p>}
                </div>
                <button onClick={() => setReviseOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
                {/* Photo */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-2 block">Photo</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                      {draft.image
                        ? <img src={draft.image} alt="" className="w-full h-full object-contain p-1" />
                        : <ImageIcon className="w-6 h-6 text-gray-300" />}
                    </div>
                    <label className="flex-1 cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => setDraft((d) => ({ ...d, image: reader.result as string }));
                        reader.readAsDataURL(file);
                      }} />
                      <div className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors text-center">
                        {draft.image ? "Change photo" : "Upload photo"}
                      </div>
                    </label>
                    {draft.image && (
                      <button onClick={() => setDraft((d) => ({ ...d, image: "" }))} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors flex-shrink-0">
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Title</label>
                  <input
                    value={draft.title}
                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                    placeholder="What are you selling?"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  />
                </div>

                {/* Price + Condition */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold pointer-events-none">£</span>
                      <input
                        type="number" min="0" step="0.01"
                        value={draft.price}
                        onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Condition</label>
                    <select
                      value={draft.condition}
                      onChange={(e) => setDraft((d) => ({ ...d, condition: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-white"
                    >
                      {LISTING_CONDITIONS.map((c) => (
                        <option key={c} value={c}>{c.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={draft.categoryTop}
                      onChange={(e) => {
                        const top = e.target.value;
                        const cat = SITE_CATEGORIES.find(c => c.slug === top);
                        const firstSub = cat?.subcategories[0]?.slug ?? top;
                        setDraft(d => ({ ...d, categoryTop: top, category: firstSub }));
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-white"
                    >
                      {SITE_CATEGORIES.map(c => (
                        <option key={c.slug} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                    {(() => {
                      const subs = SITE_CATEGORIES.find(c => c.slug === draft.categoryTop)?.subcategories ?? [];
                      if (!subs.length) return null;
                      return (
                        <select
                          value={draft.category}
                          onChange={(e) => setDraft(d => ({ ...d, category: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] bg-white"
                        >
                          {subs.map(s => (
                            <option key={s.slug} value={s.slug}>{s.name}</option>
                          ))}
                        </select>
                      );
                    })()}
                  </div>
                </div>

                {/* Extra categories */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Also list in (optional)</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {draft.extraCategories.map((ec, i) => {
                      const catName = SITE_CATEGORIES.find(c => c.slug === ec.category)?.name ?? ec.category;
                      const subName = SITE_CATEGORIES.find(c => c.slug === ec.category)?.subcategories.find(s => s.slug === ec.subcategory)?.name;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {catName}{subName ? ` › ${subName}` : ""}
                          <button type="button" onClick={() => setDraft(d => ({ ...d, extraCategories: d.extraCategories.filter((_, j) => j !== i) }))} className="ml-0.5 text-indigo-400 hover:text-indigo-700">×</button>
                        </span>
                      );
                    })}
                  </div>
                  {addingExtraCat ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={newExtraCatTop} onChange={e => { setNewExtraCatTop(e.target.value); setNewExtraCatSub(""); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30">
                        <option value="">— category —</option>
                        {SITE_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                      {newExtraCatTop && (() => {
                        const subs = SITE_CATEGORIES.find(c => c.slug === newExtraCatTop)?.subcategories ?? [];
                        return subs.length > 0 ? (
                          <select value={newExtraCatSub} onChange={e => setNewExtraCatSub(e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30">
                            <option value="">— subcategory —</option>
                            {subs.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                          </select>
                        ) : null;
                      })()}
                      <button type="button" onClick={() => {
                        if (!newExtraCatTop) return;
                        setDraft(d => ({ ...d, extraCategories: [...d.extraCategories, { category: newExtraCatTop, subcategory: newExtraCatSub }] }));
                        setNewExtraCatTop(""); setNewExtraCatSub(""); setAddingExtraCat(false);
                      }} className="px-2.5 py-1 rounded-lg bg-[#4A5CE8] text-white text-xs font-semibold hover:bg-indigo-700 transition-colors">Add</button>
                      <button type="button" onClick={() => setAddingExtraCat(false)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200 transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingExtraCat(true)}
                      className="inline-flex items-center gap-1 text-xs text-[#4A5CE8] font-semibold hover:underline">
                      + Add another category
                    </button>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Description</label>
                  <textarea
                    rows={4}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Describe condition, what's included, any defects…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button
                  onClick={() => setReviseOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !draft.title.trim()}
                  className="flex-[2] flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {saving ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Save &amp; Publish Changes</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Promote Modal ── */}
      <AnimatePresence>
        {promoteOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setPromoteOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-bold text-gray-900">Promote Listing</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{listing.title}</p>
                </div>
                <button onClick={() => setPromoteOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
              <div className="space-y-2 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                {[
                  { label: "Featured Listing",     desc: "Pin to top of category for 7 days",                          price: "£2.99",  credits: "299 cr",  type: "featured",           icon: <Star        className="w-4 h-4 text-amber-500"    /> },
                  { label: "Move to Top",           desc: "Instantly move to the top of search results for 3 days",    price: "£1.49",  credits: "149 cr",  type: "move-to-top",        icon: <TrendingUp  className="w-4 h-4 text-[#4A5CE8]"     /> },
                  { label: "Urgent Badge",          desc: "Display a bold 'Urgent' badge on your listing for 3 days",  price: "£1.49",  credits: "149 cr",  type: "urgent-badge",       icon: <Zap         className="w-4 h-4 text-red-500"       /> },
                  { label: "Homepage Spotlight",    desc: "Show in homepage hero for 24 hours",                        price: "£4.99",  credits: "499 cr",  type: "spotlight",          icon: <Zap         className="w-4 h-4 text-[#F26B21]"     /> },
                  { label: "Premium Placement",     desc: "Top placement across category & search for 5 days",        price: "£3.49",  credits: "349 cr",  type: "premium-placement",  icon: <Trophy      className="w-4 h-4 text-violet-500"    /> },
                  { label: "Related Listings",      desc: "Appear in 'Featured in this Category' sidebar for 5 days", price: "£2.49",  credits: "249 cr",  type: "related-listings-5d",icon: <Users       className="w-4 h-4 text-sky-500"       /> },
                  { label: "Newsletter Feature",    desc: "Featured in our weekly newsletter & blog posts for 7 days", price: "£2.99",  credits: "299 cr",  type: "newsletter-feature", icon: <Send        className="w-4 h-4 text-violet-500"    /> },
                  { label: "Hot Seller Badge",      desc: "Add a 'Hot Seller' badge for 30 days",                     price: "£0.99",  credits: "99 cr",   type: "badge-new-listing",  icon: <Flame       className="w-4 h-4 text-orange-500"    /> },
                  { label: "Price Reduced Badge",   desc: "Add a 'Price Reduced' badge for 30 days",                  price: "£0.99",  credits: "99 cr",   type: "badge-price-reduced",icon: <Tag         className="w-4 h-4 text-red-400"       /> },
                  { label: "Best Seller Badge",     desc: "Add a 'Best Seller' badge for 30 days",                    price: "£0.99",  credits: "99 cr",   type: "badge-best-seller",  icon: <Trophy      className="w-4 h-4 text-amber-500"    /> },
                  { label: "Engagement Tools",      desc: "Enable Ask a Question, Schedule a Visit buttons for 14 days", price: "£1.79", credits: "179 cr", type: "engagement-boost",  icon: <MessageSquare className="w-4 h-4 text-cyan-500"  /> },
                ].map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => handlePromote(opt.type)}
                    disabled={promoting !== null}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-[#4A5CE8] hover:bg-blue-50/40 transition-all text-left group disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-50 group-hover:bg-white flex items-center justify-center flex-shrink-0 transition-colors">
                      {promoting === opt.type
                        ? <div className="w-4 h-4 border-2 border-[#4A5CE8] border-t-transparent rounded-full animate-spin" />
                        : opt.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-[#F26B21]">{opt.price}</p>
                      <p className="text-[10px] text-gray-400">{opt.credits}</p>
                    </div>
                  </button>
                ))}
              </div>
              {promoteResult && (
                <div className={`mb-3 px-3.5 py-2.5 rounded-xl text-sm font-medium ${promoteResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {promoteResult.msg}
                </div>
              )}
              <p className="text-xs text-gray-400 text-center">100 credits = £1 · balance updates instantly</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ── My Listings Section ───────────────────────────────────────────────────────
function MyListingsSection({ userEmail }: { userEmail: string }) {
  const [listings, setListings] = useState<StoredListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchMyListings(userEmail).then((data) => { setListings(data); setLoading(false); });
  }, [userEmail]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">My Listings</h2>
          <p className="text-xs text-gray-400 mt-0.5">{listings.length} listing{listings.length !== 1 ? "s" : ""}</p>
        </div>
        <Link href="/sell/quick" className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#F26B21] px-4 py-2 rounded-xl hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Listing
        </Link>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-[#F26B21] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-gray-200" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No listings yet</p>
          <p className="text-sm text-gray-400 mb-5">Create your first listing and start selling today</p>
          <Link href="/sell/quick" className="px-6 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Create a Listing
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {listings.map((listing) => (
            <div key={listing.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/30 transition-colors group">
              <Link href={`/listing/${listing.publicId ?? listing.id}`} className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden block">
                {listing.image ? (
                  <img src={listing.image} alt={listing.title} className="w-full h-full object-contain p-1.5" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </Link>
              <Link href={`/listing/${listing.publicId ?? listing.id}`} className="flex-1 min-w-0 block">
                <p className="text-sm font-semibold text-gray-800 line-clamp-1 group-hover:text-[#4A5CE8] transition-colors">{listing.title}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{listing.views} views</span>
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{listing.watchers} watching</span>
                </p>
              </Link>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">£{Number(listing.price).toFixed(2)}</p>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 ${listing.status === "active" ? "bg-emerald-100 text-emerald-700" : listing.status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {listing.status}
                  </span>
                </div>
                <ListingActions
                  listing={listing}
                  userEmail={userEmail}
                  onUpdated={(updated) => setListings((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
                  onDeleted={(id) => setListings((prev) => prev.filter((l) => l.id !== id))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OverviewContent({ user, onNavigate }: { user: { name: string; email: string; username: string; balance: number }; onNavigate: (section: string) => void }) {
  const initial = user.name.charAt(0).toUpperCase();
  const [myListings, setMyListings] = useState<StoredListing[]>([]);

  useEffect(() => {
    fetchMyListings(user.email).then(setMyListings);
  }, [user.email]);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 hidden sm:block">Manage your account, orders, and marketplace activity</p>
        </div>
        <div className="hidden lg:flex items-center gap-2">
          <Link href="/rewards" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F26B21]/10 hover:bg-[#F26B21]/20 transition-colors text-[#F26B21] border border-[#F26B21]/20 text-sm font-semibold">
            <Gift className="w-4 h-4" /> Rewards
          </Link>
          <Link href="/promotions" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED]/10 hover:bg-[#7C3AED]/20 transition-colors text-[#7C3AED] border border-[#7C3AED]/20 text-sm font-semibold">
            <Megaphone className="w-4 h-4" /> Promotions
          </Link>
          <Link href="/credits" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F59E0B] text-white text-sm font-semibold hover:bg-[#D97706] transition-colors shadow-sm" data-testid="button-buy-credits">
            <Coins className="w-4 h-4" /> Buy Credits
          </Link>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold">
            <Tag className="w-4 h-4" /> £{user.balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* User card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-col items-center gap-2 text-center">
          <div className="w-12 h-12 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white font-bold text-lg">
            {initial}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{user.username}</p>
            <p className="text-xs text-gray-400 truncate max-w-[120px]">{user.email}</p>
          </div>
        </div>

        {/* My Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">My Orders</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">As buyer</p>
          <div className="mt-2 flex justify-end">
            <div className="w-9 h-9 rounded-lg bg-[#4A5CE8] flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Credit Balance — highlighted */}
        <div className="bg-gradient-to-br from-[#3B4FD8] to-[#1E3A8A] rounded-2xl p-4 text-white">
          <p className="text-xs text-blue-200 mb-1">Credit Balance</p>
          <p className="text-2xl font-bold">£{user.balance.toFixed(2)}</p>
          <p className="text-xs text-blue-300 mt-1">Ready to use</p>
          <div className="mt-2 flex justify-end">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Coins className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Active Listings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Active Listings</p>
          <p className="text-2xl font-bold text-gray-900">{myListings.length}</p>
          <p className="text-xs text-gray-400 mt-1">{myListings.length === 0 ? "No listings yet" : `${myListings.length} active`}</p>
          <div className="mt-2 flex justify-end">
            <div className="w-9 h-9 rounded-lg bg-[#F26B21] flex items-center justify-center shadow-sm">
              <Tag className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Sales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Sales</p>
          <p className="text-2xl font-bold text-gray-900">0</p>
          <p className="text-xs text-gray-400 mt-1">As seller</p>
          <div className="mt-2 flex justify-end">
            <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
              <BarChart2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Listings */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Recent Listings</h2>
          <button className="text-xs text-[#4A5CE8] font-semibold hover:underline" onClick={() => onNavigate("my-listings")} data-testid="link-manage-all">Manage All</button>
        </div>
        {myListings.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400 font-medium">No listings yet</p>
            <Link href="/sell/quick" className="mt-3 inline-flex items-center gap-1 text-xs text-[#4A5CE8] font-semibold hover:underline">
              <Plus className="w-3 h-3" /> Create your first listing
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {myListings.map((listing) => (
              <div key={listing.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-1 -mx-1 transition-colors group">
                <Link href={`/listing/${listing.publicId ?? listing.id}`} className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 block">
                  {listing.image
                    ? <img src={listing.image} alt={listing.title} className="w-full h-full object-contain p-1" />
                    : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-gray-300" /></div>}
                </Link>
                <Link href={`/listing/${listing.publicId ?? listing.id}`} className="flex-1 min-w-0 block">
                  <p className="text-sm font-medium text-gray-800 line-clamp-1 group-hover:text-[#4A5CE8] transition-colors">{listing.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                    <span className="flex items-center gap-0.5"><Eye className="w-3 h-3" />{listing.views} views</span>
                    <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" />{listing.watchers} watchers</span>
                  </div>
                </Link>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <span className="font-bold text-gray-900 text-sm block">£{listing.price.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${listing.status === "active" ? "bg-green-100 text-green-700" : listing.status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{listing.status}</span>
                  </div>
                  <ListingActions
                    listing={listing}
                    userEmail={user.email}
                    onUpdated={(updated) => setMyListings((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
                    onDeleted={(id) => setMyListings((prev) => prev.filter((l) => l.id !== id))}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 pt-2 border-t border-gray-100">
          <Link href="/sell/quick" className="flex items-center gap-1.5 text-sm text-[#4A5CE8] font-semibold hover:underline" data-testid="link-create-listing">
            <Plus className="w-3.5 h-3.5" /> Create New Listing
          </Link>
          <span className="text-gray-200">|</span>
          <button className="flex items-center gap-1.5 text-sm text-[#4A5CE8] font-semibold hover:underline" onClick={() => onNavigate("promotions")} data-testid="button-boost-listings">
            <TrendingUp className="w-3.5 h-3.5" /> Boost Listings
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Link
            href="/sell/quick"
            className="flex flex-col items-center text-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#4A5CE8]/40 hover:bg-blue-50/30 transition-colors group"
            data-testid="link-quick-action-create-listing"
          >
            <div className="w-11 h-11 rounded-full bg-[#F59E0B] flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-800">Create Listing</p>
            <p className="text-xs text-gray-400 mt-0.5">Sell an item quickly</p>
          </Link>
          <button
            onClick={() => onNavigate("credits")}
            className="flex flex-col items-center text-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#4A5CE8]/40 hover:bg-blue-50/30 transition-colors group"
            data-testid="link-quick-action-earn-credits"
          >
            <div className="w-11 h-11 rounded-full bg-[#3B4FD8] flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-800">Earn Credits</p>
            <p className="text-xs text-gray-400 mt-0.5">Complete milestones</p>
          </button>
          <Link
            href="/promotions"
            className="flex flex-col items-center text-center p-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#4A5CE8]/40 hover:bg-blue-50/30 transition-colors group"
            data-testid="link-quick-action-promote-items"
          >
            <div className="w-11 h-11 rounded-full bg-[#7C3AED] flex items-center justify-center mb-2 shadow-sm group-hover:scale-110 transition-transform">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-bold text-gray-800">Promote Items</p>
            <p className="text-xs text-gray-400 mt-0.5">Increase visibility</p>
          </Link>
        </div>
      </div>

      {/* Earn Real Rewards */}
      <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Gift className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Earn Real Rewards</h2>
            <p className="text-xs text-gray-500">Complete milestones to unlock fee waivers, free boosts, and discounts!</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          {[
            { icon: ShoppingBag, label: "Sell 3 items", reward: "Fee-free next listing", color: "text-blue-500 bg-blue-50" },
            { icon: Trophy, label: "5 positive reviews", reward: "Free homepage exposure", color: "text-yellow-500 bg-yellow-50" },
            { icon: Zap, label: "7-day streak", reward: "£3 marketplace credits", color: "text-orange-500 bg-orange-50" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-white rounded-xl p-3 border border-green-100">
                <div className={`w-8 h-8 rounded-full ${m.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xs font-bold text-gray-800">{m.label}</p>
                <p className="text-[11px] text-green-600 mt-0.5">→ {m.reward}</p>
              </div>
            );
          })}
        </div>
        <button onClick={() => onNavigate("credits")} className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors" data-testid="button-view-milestones">
          View All Milestones
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Recent Activity</h2>
        {RECENT_ACTIVITY.length === 0 ? (
          <div className="py-8 text-center text-gray-400">
            <BarChart2 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
            <p className="text-sm font-medium">No activity yet</p>
            <p className="text-xs mt-1">Actions like listing items and purchases will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {RECENT_ACTIVITY.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-3.5 h-3.5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">New Listing Created</p>
                  <p className="text-xs text-gray-400 line-clamp-1">{activity.title} — £{activity.price.toFixed(2)}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">{activity.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Credits Section ─────────────────────────────────────────────────────────
// Rate: 100 credits = £1

const MILESTONES = [
  // ── One-time welcome events ──────────────────────────────────────────────
  {
    id: "welcome-bonus", name: "Welcome to Bazunk!", task: "Join Bazunk (one-time)",
    progress: 0, total: 1, reward: "50 credits",
    rewardIcon: Gift, iconBg: "bg-pink-50", iconColor: "text-pink-500",
    color: "bg-pink-500", completed: false, oneTime: true,
  },
  {
    id: "first-listing", name: "First Listing", task: "Post your first item for sale",
    progress: 0, total: 1, reward: "100 credits",
    rewardIcon: Tag, iconBg: "bg-blue-50", iconColor: "text-blue-500",
    color: "bg-blue-500", completed: false, oneTime: true,
  },
  {
    id: "first-live", name: "Go Live!", task: "Host your first live stream",
    progress: 0, total: 1, reward: "200 credits",
    rewardIcon: Zap, iconBg: "bg-purple-50", iconColor: "text-purple-500",
    color: "bg-purple-500", completed: false, oneTime: true,
  },
  {
    id: "first-flash-sale", name: "Flash Sale Pro", task: "Run your first flash sale",
    progress: 0, total: 1, reward: "150 credits",
    rewardIcon: Flame, iconBg: "bg-orange-50", iconColor: "text-[#F26B21]",
    color: "bg-[#F26B21]", completed: false, oneTime: true,
  },
  // ── Monthly challenges ───────────────────────────────────────────────────
  {
    id: "quick-seller", name: "Quick Seller", task: "Sell 3 items this month",
    progress: 0, total: 3, reward: "Fee-free next listing",
    rewardIcon: Tag, iconBg: "bg-blue-50", iconColor: "text-blue-500",
    color: "bg-blue-500", completed: false, oneTime: false,
  },
  {
    id: "power-seller", name: "Power Seller", task: "Sell 10 items this month",
    progress: 0, total: 10, reward: "5 fee-free listings",
    rewardIcon: Tag, iconBg: "bg-purple-50", iconColor: "text-purple-500",
    color: "bg-purple-500", completed: false, oneTime: false,
  },
  {
    id: "trusted-seller", name: "Trusted Seller", task: "5 positive reviews in a row",
    progress: 0, total: 5, reward: "Free homepage exposure (7 days)",
    rewardIcon: Bell, iconBg: "bg-yellow-50", iconColor: "text-yellow-500",
    color: "bg-yellow-500", completed: false, oneTime: false,
  },
  {
    id: "top-rated", name: "Top Rated", task: "10 positive reviews in a row",
    progress: 0, total: 10, reward: "3 free featured badges",
    rewardIcon: Bell, iconBg: "bg-orange-50", iconColor: "text-orange-500",
    color: "bg-orange-500", completed: false, oneTime: false,
  },
  {
    id: "active-lister", name: "Active Lister", task: "List 5 items this month",
    progress: 0, total: 5, reward: "200 credits",
    rewardIcon: Coins, iconBg: "bg-emerald-50", iconColor: "text-emerald-500",
    color: "bg-emerald-500", completed: false, oneTime: false,
  },
  {
    id: "inventory-master", name: "Inventory Master", task: "List 20 items this month",
    progress: 0, total: 20, reward: "10% off all fees next month",
    rewardIcon: Tag, iconBg: "bg-teal-50", iconColor: "text-teal-500",
    color: "bg-teal-500", completed: false, oneTime: false,
  },
  {
    id: "consistent-seller", name: "Consistent Seller", task: "7-day active streak",
    progress: 0, total: 7, reward: "150 credits",
    rewardIcon: Coins, iconBg: "bg-red-50", iconColor: "text-red-500",
    color: "bg-red-500", completed: false, oneTime: false,
  },
  {
    id: "dedicated-seller", name: "Dedicated Seller", task: "30-day active streak",
    progress: 0, total: 30, reward: "1 free premium placement (14 days)",
    rewardIcon: Star, iconBg: "bg-amber-50", iconColor: "text-amber-500",
    color: "bg-amber-500", completed: false, oneTime: false,
  },
];

const CREDIT_FEATURES = [
  {
    icon: TrendingUp, iconBg: "bg-blue-50", iconColor: "text-blue-500",
    title: "Promote Listings",
    desc: "Boost visibility with Featured Badge, Move to Top, Homepage Spotlight and more",
    detail: "From 149 credits per promotion",
    detailColor: "text-blue-600",
  },
  {
    icon: Tag, iconBg: "bg-teal-50", iconColor: "text-teal-500",
    title: "Attribute Badges",
    desc: "Add 'New Listing', 'Price Reduced', 'Best Seller' badges to attract more buyers",
    detail: "99 credits = 30 days",
    detailColor: "text-teal-600",
  },
  {
    icon: Send, iconBg: "bg-violet-50", iconColor: "text-violet-500",
    title: "Newsletter & Exposure",
    desc: "Get featured in our weekly newsletter and the Related Listings sidebar",
    detail: "From 249 credits",
    detailColor: "text-violet-600",
  },
  {
    icon: MessageSquare, iconBg: "bg-cyan-50", iconColor: "text-cyan-500",
    title: "Engagement Tools",
    desc: "Enable 'Ask a Question', 'Schedule a Visit' and buyer contact buttons",
    detail: "179 credits = 14 days",
    detailColor: "text-cyan-600",
  },
];

function CreditsSection({ user }: { user: { name: string; email: string; username: string; balance: number } }) {
  const { refreshBalance } = useAuth();
  const [creditsTab, setCreditsTab] = useState<"rewards" | "progress" | "history">("rewards");
  const [claiming, setClaiming] = useState<Record<string, boolean>>({});
  const [milestoneData, setMilestoneData] = useState<Record<string, { progress: number; completed: boolean; claimed: boolean }>>({});

  function loadMilestones() {
    fetch(`/api/user/milestones?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : { milestones: {} })
      .then(data => setMilestoneData(data.milestones ?? {}))
      .catch(() => {});
  }

  useEffect(() => { loadMilestones(); }, [user.email]);

  const displayMilestones = MILESTONES.map(m => ({
    ...m,
    progress: milestoneData[m.id]?.progress ?? m.progress,
    completed: milestoneData[m.id]?.completed ?? m.completed,
    claimed: milestoneData[m.id]?.claimed ?? false,
  }));

  const completedCount = displayMilestones.filter(m => m.completed).length;

  async function handleClaim(id: string) {
    setClaiming((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/user/milestones/${encodeURIComponent(id)}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      if (res.ok) {
        await refreshBalance();
        loadMilestones();
      }
    } finally {
      setClaiming((prev) => ({ ...prev, [id]: false }));
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero banner */}
      <div className="bg-gradient-to-r from-[#3B4FD8] to-[#4A5CE8] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-xl font-black">Marketplace Credits</h2>
            <p className="text-blue-200 text-sm mt-0.5">100 credits = £1 · earn up to 150/week free</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black">{Math.round(user.balance * 100).toLocaleString()}</p>
            <p className="text-blue-200 text-xs mt-0.5">credits · ≈ £{user.balance.toFixed(2)}</p>
            <div className="mt-2 flex items-center gap-2">
              <Link
                href="/credits"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm"
              >
                <Coins className="w-3.5 h-3.5" /> Buy Credits
              </Link>
              <Link
                href="/promotions"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors"
              >
                <Megaphone className="w-3.5 h-3.5" /> Promotions
              </Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Promo Credits", value: `${Math.round(user.balance * 100)}`, sub: "spend on any promotion", icon: Tag },
            { label: "Promos Available", value: `${Math.floor(user.balance * 100 / 99)}`, sub: "from 99 credits each", icon: TrendingUp },
            { label: "Weekly Cap", value: "150", sub: "max credits earned/week", icon: TrendingDown },
            { label: "Total Balance", value: `${Math.round(user.balance * 100).toLocaleString()} cr`, sub: `≈ £${user.balance.toFixed(2)}`, icon: Trophy },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 text-blue-200 text-xs mb-2">
                  <Icon className="w-3.5 h-3.5" /> {stat.label}
                </div>
                <p className="text-lg font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-blue-300 mt-0.5">{stat.sub}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* What Can Credits Do */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <Coins className="w-3.5 h-3.5 text-white" />
          </div>
          <h3 className="font-bold text-gray-900">What Can Credits Do?</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {CREDIT_FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white rounded-xl p-4 border border-emerald-100">
                <div className={`w-9 h-9 rounded-xl ${f.iconBg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-4 h-4 ${f.iconColor}`} />
                </div>
                <p className="text-sm font-bold text-gray-900 mb-1">{f.title}</p>
                <p className="text-xs text-gray-400 mb-2 leading-snug">{f.desc}</p>
                <p className={`text-[10px] font-bold ${f.detailColor}`}>{f.detail}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { id: "rewards", label: "Earn Rewards", icon: Trophy },
            { id: "progress", label: "Your Progress", icon: TrendingUp },
            { id: "history", label: "Transaction History", icon: BarChart2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = creditsTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCreditsTab(tab.id as typeof creditsTab)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition-colors ${
                  active
                    ? "text-[#4A5CE8] border-b-2 border-[#4A5CE8] bg-[#4A5CE8]/5"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {creditsTab === "rewards" && (
            <div>
              {/* Weekly cap notice */}
              <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-4">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Weekly earning cap: 150 credits</p>
                  <p className="text-xs text-gray-500 mt-0.5">You can earn up to 150 credits per week from activity rewards (≈ £1.50 value). Resets every Monday. Buy more anytime.</p>
                </div>
              </div>

              {/* One-time welcome milestones */}
              <div className="flex items-start gap-3 bg-pink-50 border border-pink-100 rounded-xl px-4 py-3 mb-3">
                <Gift className="w-4 h-4 text-pink-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900">One-Time Starter Credits</p>
                  <p className="text-xs text-gray-500 mt-0.5">Get bonus credits for completing these milestones once — they count toward your weekly cap.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {displayMilestones.filter(m => m.oneTime).map((m) => {
                  const RewardIcon = m.rewardIcon;
                  const pct = Math.round((m.progress / m.total) * 100);
                  const isClaimed = m.claimed;
                  const isClaiming = claiming[m.id];
                  const remaining = m.total - m.progress;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border-2 p-4 ${
                        m.completed && !isClaimed
                          ? "border-yellow-300 bg-yellow-50/50"
                          : isClaimed
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <RewardIcon className={`w-5 h-5 ${m.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{m.name}</p>
                            <span className="text-[9px] font-black bg-pink-100 text-pink-600 px-1.5 py-0.5 rounded-full uppercase">One-time</span>
                            {(m.completed || isClaimed) && (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.task}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-gray-100 mb-3">
                        <RewardIcon className={`w-3.5 h-3.5 ${m.iconColor} flex-shrink-0`} />
                        <span className="text-xs text-gray-500 flex-1">{m.reward}</span>
                        {/^\d[\d,]* credits$/.test(m.reward) && (
                          <span className={`text-xs font-black ${m.iconColor}`}>+{m.reward.split(" ")[0]}</span>
                        )}
                      </div>
                      {m.completed && !isClaimed ? (
                        <button onClick={() => handleClaim(m.id)} disabled={isClaiming}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60">
                          {isClaiming ? "Claiming…" : "Claim Reward"}
                        </button>
                      ) : isClaimed ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm text-center">✓ Reward Claimed</div>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm text-center font-medium">
                          {remaining} more to unlock
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Monthly challenges */}
              <div className="flex items-start gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 mb-3">
                <Flame className="w-4 h-4 text-[#F26B21] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-gray-900">Monthly Challenges</p>
                  <p className="text-xs text-gray-500 mt-0.5">Complete milestones to earn credits, fee waivers, boosts, and discounts!</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayMilestones.filter(m => !m.oneTime).map((m) => {
                  const RewardIcon = m.rewardIcon;
                  const pct = Math.round((m.progress / m.total) * 100);
                  const isClaimed = m.claimed;
                  const isClaiming = claiming[m.id];
                  const remaining = m.total - m.progress;
                  return (
                    <div
                      key={m.id}
                      className={`rounded-xl border-2 p-4 ${
                        m.completed && !isClaimed
                          ? "border-yellow-300 bg-yellow-50/50"
                          : isClaimed
                          ? "border-emerald-200 bg-emerald-50/40"
                          : "border-gray-100"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-xl ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                          <RewardIcon className={`w-5 h-5 ${m.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-900">{m.name}</p>
                            {(m.completed || isClaimed) && (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{m.task}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
                        <span>Progress</span>
                        <span className="font-bold">{m.progress}/{m.total}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: 0.1 }}
                          className={`h-full rounded-full ${m.color}`}
                        />
                      </div>

                      <div className="flex items-center gap-1.5 bg-white rounded-lg px-3 py-2 border border-gray-100 mb-3">
                        <RewardIcon className={`w-3.5 h-3.5 ${m.iconColor} flex-shrink-0`} />
                        <span className="text-xs text-gray-500 flex-1">{m.reward}</span>
                        {/^\d[\d,]* credits$/.test(m.reward) && (
                          <span className={`text-xs font-black ${m.iconColor}`}>
                            +{m.reward.split(" ")[0]}
                          </span>
                        )}
                      </div>

                      {m.completed && !isClaimed ? (
                        <button
                          onClick={() => handleClaim(m.id)}
                          disabled={isClaiming}
                          className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {isClaiming ? "Claiming…" : "Claim Reward"}
                        </button>
                      ) : isClaimed ? (
                        <div className="w-full py-2.5 rounded-xl bg-emerald-100 text-emerald-700 font-bold text-sm text-center">
                          ✓ Reward Claimed
                        </div>
                      ) : (
                        <div className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 text-sm text-center font-medium">
                          {remaining} more to unlock
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {creditsTab === "progress" && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: "Milestones Completed", value: String(completedCount) },
                  { label: "Milestones Active", value: String(displayMilestones.filter(m => !m.completed && m.progress > 0).length) },
                  { label: "Total Milestones", value: String(MILESTONES.length) },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-black text-[#4A5CE8]">{s.value}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {displayMilestones.map((m) => {
                  const pct = Math.min(100, Math.round((m.progress / m.total) * 100));
                  return (
                    <div key={m.id} className={`flex items-center gap-3 p-3 rounded-xl border ${m.completed ? "border-emerald-100 bg-emerald-50/40" : "border-gray-100"}`}>
                      <div className={`w-8 h-8 rounded-lg ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <m.rewardIcon className={`w-4 h-4 ${m.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-bold text-gray-800">{m.name}</p>
                          <span className={`text-xs font-bold ${m.completed ? "text-emerald-600" : "text-gray-500"}`}>{m.progress}/{m.total}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${m.completed ? "bg-emerald-500" : m.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      {m.completed && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {creditsTab === "history" && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-gray-700">Recent Transactions</p>
                <span className="text-xs text-[#4A5CE8] font-semibold">All time</span>
              </div>
              <div className="py-10 text-center text-gray-400">
                <Coins className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No transactions yet</p>
                <p className="text-xs mt-1">Credit purchases and rewards will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_ADDR = { label: "", name: "", line1: "", line2: "", city: "", postcode: "", country: "" };

const COUNTRIES = [
  "United Kingdom","United States","Canada","Australia","Ireland","Germany",
  "France","Spain","Italy","Netherlands","Belgium","Sweden","Norway","Denmark",
  "Finland","Poland","Portugal","Austria","Switzerland","New Zealand",
  "South Africa","India","Singapore","United Arab Emirates","Japan","China",
  "Brazil","Mexico","Other",
];

function AddressesSection() {
  const { user } = useAuth();
  const addrKey = user?.email ? `sbd_addresses_v1_${user.email}` : null;
  const [addrLoadedKey, setAddrLoadedKey] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<{ id: number; label: string; name: string; line1: string; line2: string; city: string; postcode: string; country: string; default: boolean }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAddr, setNewAddr] = useState(EMPTY_ADDR);
  const [addrError, setAddrError] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editAddr, setEditAddr] = useState(EMPTY_ADDR);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!addrKey) { setAddresses([]); setAddrLoadedKey(null); return; }
    try { const s = localStorage.getItem(addrKey); setAddresses(s ? JSON.parse(s) : []); } catch { setAddresses([]); }
    setAddrLoadedKey(addrKey);
  }, [addrKey]);
  useEffect(() => {
    if (!addrLoadedKey) return;
    localStorage.setItem(addrLoadedKey, JSON.stringify(addresses));
  }, [addresses, addrLoadedKey]);

  function removeAddress(id: number) {
    setAddresses((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      if (remaining.length > 0 && !remaining.some((a) => a.default)) remaining[0] = { ...remaining[0], default: true };
      return remaining;
    });
  }
  function setDefault(id: number) {
    setAddresses((prev) => prev.map((a) => ({ ...a, default: a.id === id })));
  }
  function handleSaveAddress() {
    if (!newAddr.label.trim() || !newAddr.name.trim() || !newAddr.line1.trim() || !newAddr.city.trim() || !newAddr.postcode.trim() || !newAddr.country.trim()) {
      setAddrError("Please fill in all required fields.");
      return;
    }
    setAddresses((prev) => [
      ...prev,
      { id: Date.now(), ...newAddr, default: prev.length === 0 },
    ]);
    setNewAddr(EMPTY_ADDR);
    setAddrError("");
    setShowAdd(false);
  }
  function startEdit(addr: typeof addresses[0]) {
    setEditId(addr.id);
    setEditAddr({ label: addr.label, name: addr.name, line1: addr.line1, line2: addr.line2, city: addr.city, postcode: addr.postcode, country: addr.country });
    setEditError("");
    setShowAdd(false);
  }
  function handleUpdateAddress() {
    if (!editAddr.label.trim() || !editAddr.name.trim() || !editAddr.line1.trim() || !editAddr.city.trim() || !editAddr.postcode.trim() || !editAddr.country.trim()) {
      setEditError("Please fill in all required fields.");
      return;
    }
    setAddresses((prev) => prev.map((a) => a.id === editId ? { ...a, ...editAddr } : a));
    setEditId(null);
    setEditError("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Addresses</h2>
          <p className="text-xs text-gray-400 mt-0.5">{addresses.length} saved address{addresses.length !== 1 ? "es" : ""}</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setAddrError(""); setNewAddr(EMPTY_ADDR); }}
          className="flex items-center gap-1.5 text-xs text-[#4A5CE8] font-semibold hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add New
        </button>
      </div>

      <div className="p-5 space-y-3">
        {addresses.map((addr) => (
          <div key={addr.id} className={`rounded-xl border-2 ${addr.default ? "border-[#4A5CE8]/30 bg-blue-50/30" : "border-gray-100"}`}>
            {editId === addr.id ? (
              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 mb-3">Edit Address</p>
                <div className="grid grid-cols-2 gap-3">
                  {([ { key: "label", placeholder: "Label (e.g. Home)", span: 1 }, { key: "name", placeholder: "Full Name", span: 1 }, { key: "line1", placeholder: "Address Line 1", span: 1 }, { key: "line2", placeholder: "Address Line 2 (optional)", span: 1 }, { key: "city", placeholder: "City", span: 1 }, { key: "postcode", placeholder: "Postcode", span: 1 } ] as { key: keyof typeof editAddr; placeholder: string; span: number }[]).map(({ key, placeholder, span }) => (
                    <input key={key} placeholder={placeholder} value={editAddr[key]}
                      onChange={(e) => setEditAddr((p) => ({ ...p, [key]: e.target.value }))}
                      className={`col-span-${span} px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white`} />
                  ))}
                  <select
                    value={editAddr.country}
                    onChange={(e) => setEditAddr((p) => ({ ...p, country: e.target.value }))}
                    className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white text-gray-700"
                  >
                    <option value="">Select Country</option>
                    {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                {editError && <p className="mt-2 text-xs text-red-500 font-medium">{editError}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleUpdateAddress} className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90">Save Changes</button>
                  <button onClick={() => setEditId(null)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-[#4A5CE8] flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-900">{addr.label}</span>
                    {addr.default && <span className="text-[10px] font-bold bg-[#4A5CE8] text-white px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!addr.default && <button onClick={() => setDefault(addr.id)} className="text-[10px] text-[#4A5CE8] font-semibold hover:underline">Set default</button>}
                    <button onClick={() => startEdit(addr)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeAddress(addr.id)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 transition-colors" data-testid={`button-remove-address-${addr.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <p className="text-sm text-gray-700">{addr.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}</p>
                <p className="text-xs text-gray-500">{addr.city}, {addr.postcode}</p>
                <p className="text-xs text-gray-400">{addr.country}</p>
              </div>
            )}
          </div>
        ))}

        {showAdd && (
          <div className="rounded-xl border-2 border-dashed border-[#4A5CE8]/30 p-5 bg-blue-50/20">
            <p className="text-sm font-bold text-gray-900 mb-3">New Address</p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { key: "label", placeholder: "Label (e.g. Home)", span: 1 },
                  { key: "name",  placeholder: "Full Name", span: 1 },
                  { key: "line1", placeholder: "Address Line 1", span: 1 },
                  { key: "line2", placeholder: "Address Line 2 (optional)", span: 1 },
                  { key: "city",  placeholder: "City", span: 1 },
                  { key: "postcode", placeholder: "Postcode", span: 1 },
                ] as { key: keyof typeof newAddr; placeholder: string; span: number }[]
              ).map(({ key, placeholder, span }) => (
                <input
                  key={key}
                  placeholder={placeholder}
                  value={newAddr[key]}
                  onChange={(e) => setNewAddr((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={`col-span-${span} px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white`}
                />
              ))}
              <select
                value={newAddr.country}
                onChange={(e) => setNewAddr((prev) => ({ ...prev, country: e.target.value }))}
                className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white text-gray-700"
              >
                <option value="">Select Country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {addrError && <p className="mt-2 text-xs text-red-500 font-medium">{addrError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveAddress}
                className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                data-testid="button-save-address"
              >
                Save Address
              </button>
              <button
                onClick={() => { setShowAdd(false); setAddrError(""); setNewAddr(EMPTY_ADDR); }}
                className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SecuritySection() {
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  function handleChangePassword() {
    if (!pw.current.trim()) { setPwError("Enter your current password."); return; }
    if (pw.next.length < 6) { setPwError("New password must be at least 6 characters."); return; }
    if (pw.next !== pw.confirm) { setPwError("Passwords do not match."); return; }
    const stored = localStorage.getItem("sbd_password");
    if (stored && stored !== pw.current) { setPwError("Current password is incorrect."); return; }
    localStorage.setItem("sbd_password", pw.next);
    setPw({ current: "", next: "", confirm: "" });
    setPwError("");
    setPwSuccess(true);
    setShowPwForm(false);
    setTimeout(() => setPwSuccess(false), 3000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ minHeight: 400 }}>
      <h2 className="font-bold text-gray-900 mb-5">Security</h2>

      {/* Change Password */}
      <div className="border-b border-gray-100">
        <button
          onClick={() => { setShowPwForm((v) => !v); setPwError(""); setPw({ current: "", next: "", confirm: "" }); }}
          className="w-full flex items-center justify-between py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Shield className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">Change Password</p>
              <p className="text-xs text-gray-400">Update your login password</p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showPwForm ? "rotate-90" : ""}`} />
        </button>

        {showPwForm && (
          <div className="pb-4 space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
            />
            <input
              type="password"
              placeholder="New password (min 6 characters)"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
            />
            {pwError && <p className="text-xs text-red-500 font-medium">{pwError}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleChangePassword}
                className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
              >
                Update Password
              </button>
              <button
                onClick={() => { setShowPwForm(false); setPwError(""); }}
                className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {pwSuccess && (
          <p className="pb-3 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Password updated successfully.
          </p>
        )}
      </div>

      {/* Two-Factor Auth */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <Zap className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Two-Factor Auth</p>
            <p className="text-xs text-gray-400">Coming soon — extra layer of security</p>
          </div>
        </div>
        <span className="text-xs font-bold text-gray-300 border border-gray-200 rounded-full px-2.5 py-1">Soon</span>
      </div>
    </div>
  );
}

const EMPTY_CARD = { holderName: "", cardNumber: "", expiry: "", cvv: "" };

type ConnectStatus = {
  connected: boolean; chargesEnabled: boolean; payoutsEnabled: boolean;
  detailsSubmitted?: boolean; accountId: string | null;
} | null;

function SellerPayoutsPanel({ user }: { user: { email: string; name?: string } }) {
  const [status, setStatus] = useState<ConnectStatus>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [dashLoading, setDashLoading] = useState(false);
  const [saleAmount, setSaleAmount] = useState("50");

  useEffect(() => {
    load();
    const params = new URLSearchParams(window.location.search);
    if (params.get("connect") === "success") load();
  }, [user.email]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/connect/status/${encodeURIComponent(user.email)}`);
      if (res.ok) setStatus(await res.json());
    } finally { setLoading(false); }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/stripe/connect/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      if (res.ok) { const { url } = await res.json(); window.location.href = url; }
    } finally { setConnecting(false); }
  }

  async function handleDashboard() {
    setDashLoading(true);
    try {
      const res = await fetch(`/api/stripe/connect/dashboard-link/${encodeURIComponent(user.email)}`);
      if (res.ok) { const { url } = await res.json(); window.open(url, "_blank"); }
    } finally { setDashLoading(false); }
  }

  const rawSettings = useRawSettings();
  const amount = parseFloat(saleAmount) || 0;
  const mktRate = (parseFloat(rawSettings["fee_rate_default"] ?? "5") || 5) / 100;
  const mktRatePct = Math.round(mktRate * 100);
  const stripeRate = 0.029;
  const stripeFlatGbp = 0.30;
  const crossCurrencyRate = 0.015;

  // Detect if seller lists in a non-GBP currency (triggers Stripe's ~1.5% conversion fee)
  const sellerCurrency = (() => {
    try {
      const stored = localStorage.getItem(COUNTRY_STORAGE_KEY(user.email));
      if (stored && stored !== "SKIP") return countryToCurrency(stored === "OTHER" ? "US" : stored) as string;
    } catch { /* */ }
    return "GBP";
  })();
  const isCrossCurrency = sellerCurrency !== "GBP";
  const crossCurrencyFee = isCrossCurrency ? amount * crossCurrencyRate : 0;

  const mktFee    = amount * mktRate;
  const stripeFee = amount * stripeRate + stripeFlatGbp;
  const net       = Math.max(0, amount - mktFee - stripeFee - crossCurrencyFee);
  const sellerPct = Math.round((1 - mktRate - stripeRate - (isCrossCurrency ? crossCurrencyRate : 0)) * 100);

  return (
    <div className="space-y-4 p-5">
      {/* Connect status card */}
      <div className={`rounded-2xl border-2 p-5 ${status?.chargesEnabled ? "border-emerald-200 bg-emerald-50/40" : "border-gray-100 bg-gray-50/40"}`}>
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${status?.chargesEnabled ? "bg-emerald-500" : "bg-gray-200"}`}>
            {status?.chargesEnabled
              ? <CheckCircle2 className="w-6 h-6 text-white" />
              : <CreditCard className="w-6 h-6 text-gray-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900">
              {loading ? "Checking…" : status?.chargesEnabled ? "Stripe Payouts Active" : "Connect your bank account"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {status?.chargesEnabled
                ? "You'll receive net payouts automatically after each sale."
                : "Link your bank via Stripe Express to receive payouts. Free to set up — takes ~5 minutes."}
            </p>
          </div>
        </div>
        {!loading && !status?.chargesEnabled && (
          <button onClick={handleConnect} disabled={connecting}
            className="mt-4 w-full py-3 rounded-xl bg-[#4A5CE8] hover:bg-[#3B4FD8] text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {connecting ? <><RefreshCw className="w-4 h-4 animate-spin" />Redirecting to Stripe…</> : <><ExternalLink className="w-4 h-4" />Connect Bank Account via Stripe</>}
          </button>
        )}
        {status?.chargesEnabled && (
          <button onClick={handleDashboard} disabled={dashLoading}
            className="mt-4 w-full py-2.5 rounded-xl border border-emerald-300 text-emerald-700 hover:bg-emerald-100 font-semibold text-sm transition-colors flex items-center justify-center gap-2">
            {dashLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            Open Stripe Payout Dashboard
          </button>
        )}
        {status && !status.chargesEnabled && status.connected && (
          <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {status.detailsSubmitted ? "Account under review — payouts will activate shortly." : "Complete your Stripe onboarding to enable payouts."}
          </div>
        )}
      </div>

      {/* Fee breakdown */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="font-bold text-gray-900 text-sm">How fees work — Pay as you sell</p>
          <p className="text-xs text-gray-400 mt-0.5">Fees are deducted automatically. Listing is always free.</p>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-semibold text-gray-800">Buyer pays</p>
              <p className="text-xs text-gray-400">Full item price</p>
            </div>
            <span className="font-black text-gray-900">100%</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-semibold text-[#F26B21]">Bazunk marketplace fee</p>
              <p className="text-xs text-gray-400">Deducted from payout</p>
            </div>
            <span className="font-bold text-[#F26B21]">{mktRatePct}%</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-semibold text-[#4A5CE8]">Stripe processing fee</p>
              <p className="text-xs text-gray-400">Card processing cost</p>
            </div>
            <span className="font-bold text-[#4A5CE8]">2.9% + £0.30</span>
          </div>
          {isCrossCurrency && (
            <div className="flex items-center justify-between px-5 py-3 text-sm bg-amber-50/60">
              <div>
                <p className="font-semibold text-amber-700">Currency conversion fee</p>
                <p className="text-xs text-amber-500">Stripe charges ~1.5% when your listing currency ({sellerCurrency}) differs from GBP payout</p>
              </div>
              <span className="font-bold text-amber-600">~1.5%</span>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-3 text-sm bg-emerald-50/50">
            <div>
              <p className="font-bold text-emerald-700">Seller receives (net payout)</p>
              <p className="text-xs text-emerald-500">Paid automatically to your bank in GBP</p>
            </div>
            <span className="font-black text-emerald-700">~{sellerPct}%</span>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-amber-50 bg-amber-50/30 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">Bazunk credits <strong>cannot</strong> be used to offset marketplace fees or Stripe processing fees. These are always deducted in cash from your payout.</p>
        </div>

        {/* Fee calculator */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-700 mb-3">Fee Calculator</p>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-semibold">£</span>
              <input
                type="number" min="0" step="0.01" value={saleAmount}
                onChange={e => setSaleAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4A5CE8]"
                placeholder="Sale price"
              />
            </div>
            <div className="text-xs text-gray-500 flex-shrink-0">sale price</div>
          </div>
          {amount > 0 && (
            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-500">
                <span>Marketplace fee ({mktRatePct}%)</span>
                <span className="text-[#F26B21] font-semibold">−£{mktFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Stripe fee (2.9% + £0.30)</span>
                <span className="text-[#4A5CE8] font-semibold">−£{stripeFee.toFixed(2)}</span>
              </div>
              {isCrossCurrency && (
                <div className="flex justify-between text-amber-600">
                  <span>Currency conversion (~1.5%) — {sellerCurrency}→GBP payout</span>
                  <span className="font-semibold">−£{crossCurrencyFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1.5 mt-1">
                <span>You receive</span>
                <span className="text-emerald-600">£{net.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentSection({ defaultTab = "payouts" }: { defaultTab?: "payouts" | "cards" }) {
  const { user } = useAuth();
  const [payTab, setPayTab] = useState<"payouts" | "cards">(defaultTab);
  const cardsKey = user?.email ? `sbd_cards_v1_${user.email}` : null;
  const [cardsLoadedKey, setCardsLoadedKey] = useState<string | null>(null);
  const [cards, setCards] = useState<{ id: number; brand: string; last4: string; expiry: string; name: string; default: boolean }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newCard, setNewCard] = useState(EMPTY_CARD);
  const [cardError, setCardError] = useState("");
  const [editCardId, setEditCardId] = useState<number | null>(null);
  const [editCard, setEditCard] = useState(EMPTY_CARD);
  const [editCardError, setEditCardError] = useState("");

  useEffect(() => {
    if (!cardsKey) { setCards([]); setCardsLoadedKey(null); return; }
    try { const s = localStorage.getItem(cardsKey); setCards(s ? JSON.parse(s) : []); } catch { setCards([]); }
    setCardsLoadedKey(cardsKey);
  }, [cardsKey]);
  useEffect(() => {
    if (!cardsLoadedKey) return;
    localStorage.setItem(cardsLoadedKey, JSON.stringify(cards));
  }, [cards, cardsLoadedKey]);

  const brandColor: Record<string, string> = {
    Visa: "bg-blue-600",
    Mastercard: "bg-red-500",
  };

  function removeCard(id: number) {
    setCards((prev) => {
      const remaining = prev.filter((c) => c.id !== id);
      if (remaining.length > 0 && !remaining.some((c) => c.default)) {
        remaining[0] = { ...remaining[0], default: true };
      }
      return remaining;
    });
  }

  function handleSaveCard() {
    const digits = newCard.cardNumber.replace(/\s/g, "");
    if (!newCard.holderName.trim()) { setCardError("Cardholder name is required."); return; }
    if (digits.length < 13 || digits.length > 19) { setCardError("Enter a valid card number."); return; }
    if (!/^\d{2}\/\d{2}$/.test(newCard.expiry.trim())) { setCardError("Enter expiry as MM/YY."); return; }
    if (!newCard.cvv.trim()) { setCardError("CVV is required."); return; }

    const brand = digits.startsWith("4") ? "Visa" : digits.startsWith("5") ? "Mastercard" : "Card";
    setCards((prev) => [
      ...prev,
      { id: Date.now(), brand, last4: digits.slice(-4), expiry: newCard.expiry.trim(), name: newCard.holderName.trim(), default: prev.length === 0 },
    ]);
    setNewCard(EMPTY_CARD);
    setCardError("");
    setShowAdd(false);
  }

  function startEditCard(card: typeof cards[0]) {
    setEditCardId(card.id);
    setEditCard({ holderName: card.name, cardNumber: `•••• •••• •••• ${card.last4}`, expiry: card.expiry, cvv: "" });
    setEditCardError("");
    setShowAdd(false);
  }

  function handleUpdateCard() {
    if (!editCard.holderName.trim()) { setEditCardError("Cardholder name is required."); return; }
    if (!/^\d{2}\/\d{2}$/.test(editCard.expiry.trim())) { setEditCardError("Enter expiry as MM/YY."); return; }
    setCards((prev) => prev.map((c) => c.id === editCardId ? { ...c, name: editCard.holderName.trim(), expiry: editCard.expiry.trim() } : c));
    setEditCardId(null);
    setEditCardError("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Payment & Payouts</h2>
        <p className="text-xs text-gray-400 mt-0.5">Manage how you pay and how you get paid</p>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mt-3 max-w-xs">
          {([
            { id: "payouts" as const, label: "Seller Payouts" },
            { id: "cards"   as const, label: "Payment Cards" },
          ]).map(t => (
            <button key={t.id} onClick={() => setPayTab(t.id)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${payTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {payTab === "payouts" && user && (
        <SellerPayoutsPanel user={{ email: user.email, name: user.name ?? undefined }} />
      )}

      {payTab === "cards" && (
      <div>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">{cards.length} card{cards.length !== 1 ? "s" : ""} saved</p>
        </div>
        <button
          onClick={() => { setShowAdd((v) => !v); setCardError(""); setNewCard(EMPTY_CARD); }}
          className="flex items-center gap-1.5 text-xs text-[#4A5CE8] font-semibold hover:underline"
        >
          <Plus className="w-3.5 h-3.5" /> Add Card
        </button>
      </div>

      <div className="p-5 space-y-3">
        {cards.map((card) => (
          <div key={card.id} className={`rounded-xl border-2 ${card.default ? "border-[#4A5CE8]/30 bg-blue-50/30" : "border-gray-100"}`}>
            {editCardId === card.id ? (
              <div className="p-4">
                <p className="text-sm font-bold text-gray-900 mb-3">Edit Card</p>
                <div className="space-y-3">
                  <input placeholder="Cardholder name" value={editCard.holderName}
                    onChange={(e) => setEditCard((p) => ({ ...p, holderName: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white" />
                  <input placeholder="MM / YY" value={editCard.expiry} maxLength={5}
                    onChange={(e) => setEditCard((p) => ({ ...p, expiry: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white" />
                </div>
                {editCardError && <p className="mt-2 text-xs text-red-500 font-medium">{editCardError}</p>}
                <div className="flex gap-2 mt-3">
                  <button onClick={handleUpdateCard} className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90">Save Changes</button>
                  <button onClick={() => setEditCardId(null)} className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="p-4 flex items-center gap-4">
                <div className={`w-12 h-8 rounded-lg ${brandColor[card.brand] ?? "bg-gray-500"} flex items-center justify-center flex-shrink-0`}>
                  <span className="text-white text-[10px] font-black">{card.brand.toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-900">•••• •••• •••• {card.last4}</p>
                    {card.default && <span className="text-[10px] font-bold bg-[#4A5CE8] text-white px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{card.name} · Expires {card.expiry}</p>
                </div>
                <button onClick={() => startEditCard(card)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => removeCard(card.id)} className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 transition-colors" data-testid={`button-remove-card-${card.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}

        {showAdd && (
          <div className="rounded-xl border-2 border-dashed border-[#4A5CE8]/30 p-5 bg-blue-50/20">
            <p className="text-sm font-bold text-gray-900 mb-3">New Card</p>
            <div className="space-y-3">
              <input
                placeholder="Cardholder name"
                value={newCard.holderName}
                onChange={(e) => setNewCard((p) => ({ ...p, holderName: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
              />
              <input
                placeholder="Card number"
                value={newCard.cardNumber}
                onChange={(e) => setNewCard((p) => ({ ...p, cardNumber: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
                maxLength={19}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="MM / YY"
                  value={newCard.expiry}
                  onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
                  maxLength={5}
                />
                <input
                  placeholder="CVV"
                  value={newCard.cvv}
                  onChange={(e) => setNewCard((p) => ({ ...p, cvv: e.target.value }))}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
                  maxLength={4}
                />
              </div>
            </div>
            {cardError && <p className="mt-2 text-xs text-red-500 font-medium">{cardError}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSaveCard}
                className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                data-testid="button-save-card"
              >
                Save Card
              </button>
              <button
                onClick={() => { setShowAdd(false); setCardError(""); setNewCard(EMPTY_CARD); }}
                className="py-2 px-4 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Payments are encrypted and processed securely. We never store full card details.
        </div>
      </div>
    </div>
    )}
  </div>
  );
}

function AutoAcceptSection() {
  const [enabled, setEnabled] = useState(false);
  const [threshold, setThreshold] = useState(85);
  const [scope, setScope] = useState<"all" | "above50">("all");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ minHeight: 400 }}>
      <h2 className="font-bold text-gray-900 mb-1">Auto-Accept Offers</h2>
      <p className="text-sm text-gray-500 mb-5">Automatically accept offers that meet your criteria — no manual review needed.</p>

      {/* Master toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">Enable auto-accept</p>
          <p className="text-xs text-gray-400 mt-0.5">{enabled ? "Active — qualifying offers accepted instantly" : "Disabled — all offers need manual review"}</p>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 ${enabled ? "bg-[#4A5CE8]" : "bg-gray-300"}`}
        >
          <span className={`block w-5 h-5 rounded-full bg-white shadow m-0.5 transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-0"}`} />
        </button>
      </div>

      {/* Settings (only shown when enabled) */}
      {enabled && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Threshold */}
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-gray-800">Minimum offer threshold</p>
              <span className="text-sm font-black text-[#4A5CE8]">{threshold}% of listing price</span>
            </div>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-[#4A5CE8]"
            />
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
              <span>50% (lenient)</span>
              <span>100% (exact price)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Offers at or above <span className="font-bold text-gray-700">{threshold}%</span> of your listing price will be auto-accepted.
            </p>
          </div>

          {/* Scope */}
          <div className="p-4 rounded-xl border border-gray-200">
            <p className="text-sm font-semibold text-gray-800 mb-3">Apply to</p>
            <div className="flex gap-3">
              {[
                { value: "all", label: "All listings" },
                { value: "above50", label: "Listings over £50" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setScope(opt.value as typeof scope)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    scope === opt.value
                      ? "border-[#4A5CE8] bg-[#4A5CE8]/5 text-[#4A5CE8]"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-[#4A5CE8] text-white hover:opacity-90"
            }`}
            data-testid="button-save-auto-accept"
          >
            {saved ? "✓ Settings Saved!" : "Save Settings"}
          </button>

          {saved && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-green-600 text-center font-medium"
            >
              Auto-accept is now {enabled ? "active" : "disabled"} — threshold {threshold}%, applied to {scope === "all" ? "all listings" : "listings over £50"}.
            </motion.p>
          )}
        </motion.div>
      )}

      {/* Save confirmation when toggling off */}
      {!enabled && (
        <div className="mt-4">
          <button
            onClick={handleSave}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
              saved
                ? "bg-green-500 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
            data-testid="button-save-auto-accept-disabled"
          >
            {saved ? "✓ Settings Saved!" : "Save Settings"}
          </button>
          {saved && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-green-600 text-center font-medium"
            >
              Auto-accept disabled — all offers will require manual review.
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
}

type StoreView = "setup" | "overview" | "edit";
type EditTab = "basic" | "contact" | "business" | "policies" | "social" | "settings";

const EDIT_TABS: { id: EditTab; label: string; icon: React.ElementType }[] = [
  { id: "basic",    label: "Basic Information", icon: Info },
  { id: "contact",  label: "Contact Details",   icon: Phone },
  { id: "business", label: "Business Info",     icon: Building2 },
  { id: "policies", label: "Policies",          icon: FileText },
  { id: "social",   label: "Social Media",      icon: Share2 },
  { id: "settings", label: "Store Settings",    icon: Settings },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 cursor-pointer rounded-full transition-colors duration-200 flex-shrink-0 ${on ? "bg-[#4A5CE8]" : "bg-gray-300"}`}
    >
      <span className={`block w-5 h-5 rounded-full bg-white shadow m-0.5 transition-transform duration-200 ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

const COVER_PRESETS = [
  { id: "navy",    style: "linear-gradient(135deg,#3B4FD8,#1A1D2E)" },
  { id: "orange",  style: "linear-gradient(135deg,#F26B21,#1A1D2E)" },
  { id: "purple",  style: "linear-gradient(135deg,#7C3AED,#3B4FD8)" },
  { id: "emerald", style: "linear-gradient(135deg,#059669,#1A1D2E)" },
  { id: "red",     style: "linear-gradient(135deg,#DC2626,#7C3AED)" },
  { id: "sky",     style: "linear-gradient(135deg,#0EA5E9,#3B4FD8)" },
  { id: "amber",   style: "linear-gradient(135deg,#F59E0B,#F26B21)" },
  { id: "steel",   style: "linear-gradient(135deg,#334155,#1A1D2E)" },
];

const LOGO_COLORS = [
  "from-[#3B4FD8] to-[#1A1D2E]",
  "from-[#F26B21] to-[#1A1D2E]",
  "from-[#7C3AED] to-[#3B4FD8]",
  "from-[#059669] to-[#1A1D2E]",
  "from-[#DC2626] to-[#7C3AED]",
  "from-[#0EA5E9] to-[#3B4FD8]",
];

function MyStoreSection({ onNavigate }: { onNavigate: (section: string) => void }) {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<StoredListing[]>([]);
  useEffect(() => { fetchMyListings(user?.email ?? '').then(setMyListings); }, [user?.email]);

  const storeKey = user?.email ? `sbd_my_store_${user.email}` : null;
  const [storeLoadedKey, setStoreLoadedKey] = useState<string | null>(null);
  const [view, setView] = useState<StoreView>("setup");
  const [editTab, setEditTab] = useState<EditTab>("basic");
  const [copied, setCopied] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [logoColorIdx, setLogoColorIdx] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  /* setup form */
  const [storeName, setStoreName] = useState("");
  const [storeCategory, setStoreCategory] = useState("Electronics & Technology");
  const [storeDesc, setStoreDesc] = useState("");
  const [businessType, setBusinessType] = useState("individual");

  /* store data */
  const [store, setStore] = useState<{
    name: string; category: string; description: string; businessType: string;
    slug: string; totalViews: number; followers: number; activeItems: number;
    coverStyle?: string; coverImage?: string;
  }>({ name: "", category: "", description: "", businessType: "individual", slug: "", totalViews: 0, followers: 0, activeItems: 0, coverStyle: COVER_PRESETS[0].style });

  useEffect(() => {
    if (!storeKey) {
      setView("setup");
      setStore({ name: "", category: "", description: "", businessType: "individual", slug: "", totalViews: 0, followers: 0, activeItems: 0, coverStyle: COVER_PRESETS[0].style });
      setStoreLoadedKey(null);
      return;
    }
    try {
      const saved = localStorage.getItem(storeKey);
      if (saved) { setStore(JSON.parse(saved)); setView("overview"); }
      else setView("setup");
    } catch { setView("setup"); }
    setStoreLoadedKey(storeKey);
  }, [storeKey]);

  /* edit tabs state */
  const [contact, setContact] = useState({ email: "", phone: "", address: "", hours: "Monday - Friday: 9:00 AM - 6:00 PM\nSaturday: 10:00 AM - 4:00 PM\nSunday: Closed", website: "" });
  const [taxId, setTaxId] = useState("");
  const [payments, setPayments] = useState<string[]>([]);
  const [shipping, setShipping] = useState<string[]>([]);
  const [policies, setPolicies] = useState({ returns: "30 days", shipping: "3-4 handling", additional: "" });
  const [social, setSocial] = useState({ facebook: "", instagram: "", twitter: "" });
  const [storeSettings, setStoreSettings] = useState({ autoAccept: false, inventoryCount: true, vacation: false, emailNotifications: true });

  function saveStore(updates: Partial<typeof store>) {
    const next = { ...store, ...updates };
    setStore(next);
    if (storeKey) { try { localStorage.setItem(storeKey, JSON.stringify(next)); } catch {} }
  }

  function handleCreate() {
    if (!storeName.trim()) return;
    const newStore = {
      name: storeName, category: storeCategory,
      description: storeDesc || storeName, businessType,
      slug: storeName.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 8),
      totalViews: 0, followers: 0, activeItems: 0,
      coverStyle: COVER_PRESETS[0].style,
    };
    setStore(newStore);
    if (storeKey) { try { localStorage.setItem(storeKey, JSON.stringify(newStore)); } catch {} }
    setView("overview");
  }

  function handleCopy() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      saveStore({ coverImage: dataUrl, coverStyle: undefined });
      setCoverPickerOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  /* store health checklist */
  const healthItems = [
    { label: "Store name set",        done: !!store.name },
    { label: "Description added",     done: !!store.description },
    { label: "Category chosen",       done: !!store.category },
    { label: "Cover photo set",       done: !!(store.coverImage) },
    { label: "Contact email added",   done: !!contact.email },
    { label: "Social link added",     done: !!(social.facebook || social.instagram || social.twitter) },
  ];
  const healthScore = Math.round((healthItems.filter(h => h.done).length / healthItems.length) * 100);

  const storeUrl = `bazunk.co.uk/store/${store.slug}`;

  /* ─── SETUP ─── */
  if (view === "setup") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-br from-[#3B4FD8] to-[#1A1D2E] px-8 py-10 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute right-16 bottom-0 w-28 h-28 rounded-full bg-white/5" />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <Store className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-black mb-1">Open Your Own Store</h2>
            <p className="text-blue-200 text-sm">Build a branded storefront, manage listings, and grow your sales.</p>
            <div className="flex flex-wrap gap-4 mt-5">
              {[["✓", "Custom store page"], ["✓", "Analytics & insights"], ["✓", "Promote your brand"]].map(([icon, text]) => (
                <span key={text} className="flex items-center gap-1.5 text-sm text-blue-100"><span>{icon}</span>{text}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="p-7 max-w-xl">
          <h3 className="text-base font-bold text-gray-900 mb-5">Store details</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Name *</label>
                <input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Easydeals"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category *</label>
                <select value={storeCategory} onChange={(e) => setStoreCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white">
                  {["Electronics & Technology","Fashion & Clothing","Home & Garden","Gaming","Sports & Outdoors","Toys & Hobbies","Books & Music","Other"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Description *</label>
              <textarea value={storeDesc} onChange={(e) => setStoreDesc(e.target.value)}
                placeholder="Tell buyers what your store is about..." rows={3} maxLength={500}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none" />
              <p className="text-[10px] text-gray-400 mt-1">{500 - storeDesc.length} chars left</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Business Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[["individual","Individual Seller"],["registered","Registered Business"],["llc","Limited Liability Co."],["corporation","Corporation"]].map(([val, label]) => (
                  <label key={val} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${businessType === val ? "border-[#4A5CE8] bg-blue-50/40" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" value={val} checked={businessType === val} onChange={() => setBusinessType(val)} className="accent-[#4A5CE8]" />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button onClick={handleCreate} disabled={!storeName.trim()}
            className="mt-6 w-full py-3 rounded-xl bg-gradient-to-r from-[#3B4FD8] to-[#1A1D2E] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            <Store className="w-4 h-4" /> Create Store
          </button>
        </div>
      </div>
    );
  }

  /* ─── EDIT ─── */
  if (view === "edit") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <button onClick={() => setView("overview")} className="flex items-center gap-1.5 text-sm text-[#4A5CE8] font-semibold mb-1 hover:underline">
              <ChevronRight className="w-3.5 h-3.5 rotate-180" /> Back to Store Overview
            </button>
            <h2 className="text-xl font-black text-gray-900">Edit Store</h2>
            <p className="text-xs text-gray-400">Update your store information and settings</p>
          </div>
          <button onClick={() => setView("overview")}
            className="px-5 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-sm">
            Save Changes
          </button>
        </div>

        <div className="flex">
          {/* Left nav */}
          <nav className="w-52 flex-shrink-0 border-r border-gray-100 py-4">
            {EDIT_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = editTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setEditTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${active ? "bg-[#3B4FD8] text-white font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" /> {tab.label}
                </button>
              );
            })}
          </nav>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto" style={{ maxHeight: 600 }}>

            {editTab === "basic" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Name *</label>
                    <input defaultValue={store.name} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Category *</label>
                    <select defaultValue={store.category} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white">
                      {["Electronics & Technology", "Fashion & Clothing", "Home & Garden", "Gaming", "Sports & Outdoors", "Toys & Hobbies", "Books & Music", "Other"].map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Description *</label>
                  <textarea defaultValue={store.description} rows={4} maxLength={500} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none" />
                  <p className="text-[10px] text-gray-400 mt-1">491 characters remaining</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">Business Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[["individual", "Individual Seller"], ["registered", "Registered Business"], ["llc", "Limited Liability Company"], ["corporation", "Corporation"]].map(([val, label]) => (
                      <label key={val} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 cursor-pointer transition-colors ${store.businessType === val ? "border-[#4A5CE8] bg-blue-50/40" : "border-gray-200"}`}>
                        <input type="radio" value={val} defaultChecked={store.businessType === val} name="biztype" className="accent-[#4A5CE8]" />
                        <span className="text-sm text-gray-700">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button onClick={() => setView("overview")} className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                </div>
              </div>
            )}

            {editTab === "contact" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Contact Details</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Email</label>
                    <input value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="contact@yourstore.com" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Contact Phone</label>
                    <input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} placeholder="+1 (555) 123-4567" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Address</label>
                  <textarea value={contact.address} onChange={(e) => setContact({ ...contact, address: e.target.value })} placeholder="123 Business St, City, State, ZIP" rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none" />
                </div>
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Store Hours</label>
                  <textarea value={contact.hours} onChange={(e) => setContact({ ...contact, hours: e.target.value })} rows={3} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none" />
                </div>
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website URL</label>
                  <input value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} placeholder="https://yourwebsite.com" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setView("overview")} className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                </div>
              </div>
            )}

            {editTab === "business" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Business Information</h3>
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tax ID / EIN</label>
                  <input value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="XX-XXXXXXX" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                  <p className="text-[10px] text-gray-400 mt-1">For registered businesses only</p>
                </div>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Payment Methods Accepted</p>
                  <div className="grid grid-cols-3 gap-2">
                    {["Credit Cards", "PayPal", "Apple Pay", "Google Pay", "Bitcoin", "Bank Transfer"].map((m) => (
                      <label key={m} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" className="accent-[#4A5CE8]" checked={payments.includes(m)} onChange={() => setPayments((p) => p.includes(m) ? p.filter((x) => x !== m) : [...p, m])} />
                        {m}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-5">
                  <p className="text-xs font-semibold text-gray-600 mb-2">Shipping Zones</p>
                  <div className="space-y-2">
                    {["Local (Same City)", "Regional (Same State)", "National", "International"].map((z) => (
                      <label key={z} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input type="checkbox" className="accent-[#4A5CE8]" checked={shipping.includes(z)} onChange={() => setShipping((s) => s.includes(z) ? s.filter((x) => x !== z) : [...s, z])} />
                        {z}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => setView("overview")} className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                </div>
              </div>
            )}

            {editTab === "policies" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Store Policies</h3>
                {[["returns", "Return Policy"], ["shipping", "Shipping Policy"], ["additional", "Additional Policies"]].map(([key, label]) => (
                  <div key={key} className="mb-4">
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                    <textarea
                      value={policies[key as keyof typeof policies]}
                      onChange={(e) => setPolicies({ ...policies, [key]: e.target.value })}
                      placeholder={key === "additional" ? "Privacy policy, terms of service, warranty information..." : ""}
                      rows={4}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none"
                    />
                  </div>
                ))}
                <div className="flex justify-end mt-2">
                  <button onClick={() => setView("overview")} className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                </div>
              </div>
            )}

            {editTab === "social" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Social Media Links</h3>
                <p className="text-sm text-gray-400 mb-5">Connect your social media accounts to build trust with customers</p>
                {[
                  { key: "facebook",  label: "Facebook Page",     placeholder: "https://facebook.com/yourstore",  bg: "bg-blue-600",  icon: "f" },
                  { key: "instagram", label: "Instagram Profile",  placeholder: "https://instagram.com/yourstore", bg: "bg-pink-500",  icon: "in" },
                  { key: "twitter",   label: "Twitter / X Profile",placeholder: "https://twitter.com/yourstore",   bg: "bg-sky-500",   icon: "𝕏" },
                ].map(({ key, label, placeholder, bg, icon }) => (
                  <div key={key} className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>{icon}</div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                      <input
                        value={social[key as keyof typeof social]}
                        onChange={(e) => setSocial({ ...social, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                      />
                    </div>
                  </div>
                ))}
                <div className="flex justify-end mt-4">
                  <button onClick={() => setView("overview")} className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white font-bold text-sm hover:opacity-90 transition-opacity">Save Changes</button>
                </div>
              </div>
            )}

            {editTab === "settings" && (
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-5">Store Settings</h3>
                <div className="space-y-0 border border-gray-200 rounded-xl overflow-hidden mb-7">
                  {([
                    ["autoAccept",        "Auto-accept offers",       "Automatically accept offers above a certain percentage"],
                    ["inventoryCount",    "Show inventory count",     "Display remaining quantity to buyers"],
                    ["vacation",          "Vacation mode",            "Hide your store temporarily"],
                    ["emailNotifications","Email notifications",      "Receive notifications for orders and messages"],
                  ] as const).map(([key, title, desc]) => (
                    <div key={key} className="flex items-center justify-between px-4 py-4 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                      </div>
                      <Toggle on={storeSettings[key]} onToggle={() => setStoreSettings((s) => ({ ...s, [key]: !s[key] }))} />
                    </div>
                  ))}
                </div>

                {/* Danger Zone */}
                <div>
                  <h4 className="text-base font-bold text-gray-900 mb-3">Danger Zone</h4>
                  <div className="border-2 border-red-200 rounded-xl p-5">
                    <p className="text-sm font-bold text-red-600 mb-1">Delete Store</p>
                    <p className="text-xs text-red-400 mb-4">Permanently delete your store and all associated data. This action cannot be undone.</p>
                    <button
                      onClick={() => { if (storeKey) { try { localStorage.removeItem(storeKey); } catch {} } setView("setup"); }}
                      className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" /> Delete Store
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    );
  }

  /* ─── OVERVIEW ─── */
  return (
    <div className="space-y-4 p-1">
      {/* Hidden file input for cover upload */}
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverFile} />

      {/* Store card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Cover */}
        <div className="h-36 relative overflow-hidden">
          {store.coverImage ? (
            <img src={store.coverImage} alt="Store cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: store.coverStyle || COVER_PRESETS[0].style }} />
          )}

          {/* Change Cover button */}
          <div className="absolute bottom-3 right-3">
            <button
              onClick={() => setCoverPickerOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 text-white text-xs font-semibold backdrop-blur-sm hover:bg-black/70 transition-colors"
            >
              <Pencil className="w-3.5 h-3.5" /> Change Cover
            </button>

            {/* Cover picker dropdown */}
            <AnimatePresence>
              {coverPickerOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 z-10"
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Choose a gradient</p>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {COVER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => { saveStore({ coverStyle: preset.style, coverImage: undefined }); setCoverPickerOpen(false); }}
                        className="h-8 rounded-lg border-2 transition-all hover:scale-110"
                        style={{
                          background: preset.style,
                          borderColor: store.coverStyle === preset.style && !store.coverImage ? "#4A5CE8" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => { setCoverPickerOpen(false); coverInputRef.current?.click(); }}
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed border-gray-200 text-xs font-semibold text-gray-500 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload Photo
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Profile row */}
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-8 mb-3">
            {/* Clickable avatar — cycles logo colour */}
            <button
              onClick={() => setLogoColorIdx(i => (i + 1) % LOGO_COLORS.length)}
              title="Click to change colour"
              className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${LOGO_COLORS[logoColorIdx]} border-4 border-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform`}
            >
              <span className="text-white font-black text-xl">{store.name.charAt(0).toUpperCase()}</span>
            </button>
            <div className="flex items-center gap-2 mt-10">
              <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B4FD8] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
                <Eye className="w-3.5 h-3.5" /> Preview
              </button>
              <button onClick={() => { setEditTab("basic"); setView("edit"); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors">
                <Edit className="w-3.5 h-3.5" /> Edit Store
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-black text-gray-900 text-lg">{store.name}</p>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <p className="text-xs text-gray-400">{store.category}</p>
          <p className="text-sm text-gray-500 mt-1">{store.description}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Globe className="w-3.5 h-3.5 text-[#4A5CE8]" />
            <span className="text-xs text-[#4A5CE8] font-medium">{storeUrl}</span>
            <button onClick={handleCopy} className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
            <button
              onClick={() => window.open(`https://${storeUrl}`, "_blank")}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-[#4A5CE8] transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Views",  value: store.totalViews,  icon: Eye,     color: "text-[#4A5CE8]", bg: "bg-blue-50" },
          { label: "Followers",    value: store.followers,   icon: Users,   color: "text-pink-500",  bg: "bg-pink-50" },
          { label: "Active Items", value: myListings.filter(l => l.status === "active").length, icon: Package, color: "text-[#F26B21]", bg: "bg-orange-50" },
          { label: "Rating",       value: "New",             icon: Star,    color: "text-amber-500", bg: "bg-amber-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-100 p-4">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xs text-gray-400 mb-0.5">{label}</p>
            <p className="text-xl font-black text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Store Health + Mini Chart */}
      <div className="grid grid-cols-2 gap-4">
        {/* Store Health */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="font-bold text-gray-900 text-sm">Store Health</p>
            </div>
            <span className={`text-sm font-black ${healthScore >= 80 ? "text-emerald-600" : healthScore >= 50 ? "text-amber-500" : "text-red-500"}`}>
              {healthScore}%
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-gray-100 rounded-full mb-4 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${healthScore >= 80 ? "bg-emerald-500" : healthScore >= 50 ? "bg-amber-400" : "bg-red-400"}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <div className="space-y-2">
            {healthItems.map(({ label, done }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-100" : "bg-gray-100"}`}>
                  {done
                    ? <Check className="w-2.5 h-2.5 text-emerald-600" />
                    : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 block" />}
                </div>
                <span className={`text-xs ${done ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
                {!done && (
                  <button
                    onClick={() => { setEditTab("contact"); setView("edit"); }}
                    className="ml-auto text-[10px] text-[#4A5CE8] font-bold hover:underline"
                  >Fix →</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 7-day mini chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 className="w-4 h-4 text-[#4A5CE8]" />
            <p className="font-bold text-gray-900 text-sm">Views This Week</p>
          </div>
          <p className="text-xs text-gray-400 mb-4">Last 7 days activity</p>
          <div className="flex items-end gap-1.5 h-20">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day, i) => {
              const heights = [0, 0, 0, 0, 0, 0, 0];
              return (
                <div key={day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md bg-[#4A5CE8]/15 relative overflow-hidden" style={{ height: 60 }}>
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-[#4A5CE8] rounded-t-md transition-all"
                      style={{ height: `${heights[i]}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-gray-400 font-medium">{day.slice(0,1)}</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-center mt-3 italic">Start selling to see activity</p>
        </div>
      </div>

      {/* Quick Actions + Recent Listings */}
      <div className="grid grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-[#F26B21]" />
            <p className="font-bold text-gray-900 text-sm">Quick Actions</p>
          </div>
          <div className="space-y-1">
            {([
              { label: "Add New Listing",  icon: Plus,      color: "bg-emerald-100 text-emerald-600", action: () => window.open("/sell/quick", "_blank") },
              { label: "Bundle Deal",      icon: Package,   color: "bg-blue-100 text-blue-600",       action: () => window.open("/bundle", "_blank") },
              { label: "Promote Store",    icon: Megaphone, color: "bg-purple-100 text-purple-600",   action: () => onNavigate("promotions") },
              { label: "View Analytics",   icon: BarChart2, color: "bg-sky-100 text-sky-600",         action: () => onNavigate("sales") },
              { label: "Manage Sales",     icon: Tag,       color: "bg-orange-100 text-orange-600",   action: () => onNavigate("sales") },
              { label: "Edit Store Info",  icon: Edit,      color: "bg-gray-100 text-gray-600",       action: () => { setEditTab("basic"); setView("edit"); } },
            ] as { label: string; icon: React.ElementType; color: string; action: () => void }[]).map(({ label, icon: Icon, color, action }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors group w-full text-left">
                <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#4A5CE8]" />
              <p className="font-bold text-gray-900 text-sm">Recent Listings</p>
            </div>
            <button onClick={() => window.open("/browse", "_blank")} className="text-xs text-[#4A5CE8] font-semibold hover:underline">View All</button>
          </div>
          {myListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
                <Package className="w-5 h-5 text-gray-300" />
              </div>
              <p className="text-xs font-semibold text-gray-400 mb-2">No listings yet</p>
              <button onClick={() => window.open("/sell/quick", "_blank")}
                className="text-xs text-[#4A5CE8] font-bold hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add your first item
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              {myListings.slice(0, 4).map((listing) => (
                <div key={listing.id} className="flex items-center gap-2.5 py-1.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-1 -mx-1 transition-colors group">
                  <Link href={`/listing/${listing.publicId ?? listing.id}`} className="w-9 h-9 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden block">
                    {listing.image
                      ? <img src={listing.image} alt={listing.title} className="w-full h-full object-contain p-1" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-3.5 h-3.5 text-gray-300" /></div>}
                  </Link>
                  <Link href={`/listing/${listing.publicId ?? listing.id}`} className="flex-1 min-w-0 block">
                    <p className="text-xs font-semibold text-gray-800 line-clamp-1 group-hover:text-[#4A5CE8] transition-colors">{listing.title}</p>
                    <p className="text-[11px] text-[#F26B21] font-bold">£{listing.price.toFixed(2)}</p>
                  </Link>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${listing.status === "active" ? "bg-emerald-100 text-emerald-700" : listing.status === "suspended" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                      {listing.status}
                    </span>
                    <ListingActions
                      listing={listing}
                      userEmail={user?.email ?? ""}
                      onUpdated={(updated) => setMyListings((prev) => prev.map((l) => l.id === updated.id ? updated : l))}
                      onDeleted={(id) => setMyListings((prev) => prev.filter((l) => l.id !== id))}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Store Preview Slide-over ── */}
      <AnimatePresence>
        {previewOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
              onClick={() => setPreviewOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Store Preview</p>
                  <p className="text-sm font-black text-gray-900 mt-0.5">How buyers see your store</p>
                </div>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto">
                {/* Store banner */}
                <div className="h-28 bg-gradient-to-r from-[#4A5CE8] via-[#3B4FD8] to-[#1A1D2E] relative flex-shrink-0">
                  <div className="absolute inset-0 opacity-20"
                    style={{ backgroundImage: "radial-gradient(circle at 30% 50%, #F26B21 0%, transparent 60%)" }} />
                </div>

                {/* Store identity */}
                <div className="px-5 pb-5">
                  <div className="flex items-end justify-between -mt-8 mb-4">
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-lg border-2 border-white flex items-center justify-center bg-gradient-to-br from-[#3B4FD8] to-[#1A1D2E]">
                      <span className="text-white font-black text-2xl">{store.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-[#4A5CE8] text-[#4A5CE8] text-sm font-bold hover:bg-blue-50 transition-colors">
                      <Heart className="w-3.5 h-3.5" /> Follow
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="font-black text-gray-900 text-xl">{store.name}</h1>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mb-1">{store.category}</p>
                  <p className="text-sm text-gray-600 mb-3">{store.description}</p>

                  <div className="flex items-center gap-1.5 text-xs text-[#4A5CE8]">
                    <Globe className="w-3.5 h-3.5" />
                    <span>bazunk.co.uk/store/{store.slug}</span>
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-px bg-gray-100 border-t border-gray-100">
                  {[
                    { label: "Items",     value: "0" },
                    { label: "Followers", value: "0" },
                    { label: "Sales",     value: "0" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white py-4 text-center">
                      <p className="text-xl font-black text-gray-900">{value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Sample listings */}
                <div className="px-5 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-gray-900 text-sm">Listings</p>
                    <span className="text-xs text-gray-400">Sample — add real items via Sell</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {ALL_PRODUCTS.slice(0, 6).map((p) => (
                      <div key={p.id} className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="aspect-square bg-white flex items-center justify-center p-3">
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        </div>
                        <div className="p-2.5">
                          <p className="text-xs font-semibold text-gray-800 line-clamp-2 mb-1">{p.title}</p>
                          <p className="text-sm font-black text-[#F26B21]">£{p.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* About */}
                <div className="px-5 pb-8">
                  <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                    <p className="text-xs font-bold text-gray-700 mb-2">About this seller</p>
                    <div className="space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Buyer Protection on all orders</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span>Secure checkout via Bazunk</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer CTA */}
              <div className="border-t border-gray-100 p-4 bg-white">
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="w-full py-3 rounded-xl bg-[#1A1D2E] text-white font-bold text-sm hover:bg-[#2A2D3E] transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

const DISPUTE_REASONS = [
  { value: "item_not_received", label: "Item not received" },
  { value: "not_as_described",  label: "Not as described" },
  { value: "damaged",           label: "Damaged in transit" },
  { value: "wrong_item",        label: "Wrong item sent" },
  { value: "other",             label: "Other" },
];

const DISPUTE_STATUS_META: Record<string, { label: string; color: string }> = {
  open:               { label: "Open",          color: "bg-amber-100 text-amber-700"   },
  under_review:       { label: "Under Review",  color: "bg-blue-100 text-blue-700"     },
  resolved_refund:    { label: "Refund Issued", color: "bg-emerald-100 text-emerald-700" },
  resolved_no_action: { label: "No Action",     color: "bg-gray-100 text-gray-500"     },
  closed:             { label: "Closed",        color: "bg-gray-100 text-gray-400"     },
};

// ─── Orders Section ──────────────────────────────────────────────────────────

function OrdersSection() {
  const { formatPrice } = useCurrency();
  const [orders] = useState<MockOrder[]>(MOCK_ORDERS_DATA);
  const [trackingOrder, setTrackingOrder] = useState<MockOrder | null>(null);
  const [returnOrder, setReturnOrder] = useState<MockOrder | null>(null);
  const [existingReturnIds] = useState<Set<string>>(new Set(MOCK_RETURNS_DATA.map(r => r.orderId)));

  // Return request form state
  const [retReason, setRetReason] = useState("not_as_described");
  const [retCondition, setRetCondition] = useState("like_new");
  const [retDesc, setRetDesc] = useState("");
  const [retSubmitted, setRetSubmitted] = useState(false);
  const [retLoading, setRetLoading] = useState(false);

  function openTracking(order: MockOrder) { setTrackingOrder(order); }
  function closeTracking() { setTrackingOrder(null); }
  function openReturn(order: MockOrder) {
    setReturnOrder(order);
    setRetReason("not_as_described");
    setRetCondition("like_new");
    setRetDesc("");
    setRetSubmitted(false);
  }
  function closeReturn() { setReturnOrder(null); }

  async function submitReturn() {
    if (!returnOrder || !retDesc.trim()) return;
    setRetLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setRetLoading(false);
    setRetSubmitted(true);
  }

  const REASON_LABELS: Record<string, string> = {
    changed_mind: "Changed my mind", not_as_described: "Not as described",
    damaged: "Item arrived damaged", wrong_item: "Wrong item sent",
    faulty: "Item is faulty", other: "Other reason",
  };
  const CONDITION_LABELS: Record<string, string> = {
    unopened: "Unopened / sealed", like_new: "Like new (no marks)",
    used: "Used (minor wear)", damaged: "Damaged",
  };

  const inTransit = orders.filter(o => ["In Transit", "Out for Delivery"].includes(o.status)).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-black text-gray-900 text-lg">My Orders</h2>
          <p className="text-xs text-gray-400 mt-0.5">{orders.length} orders · {inTransit} in transit</p>
        </div>
        <Link href="/browse" className="text-xs font-semibold text-[#4A5CE8] hover:underline flex items-center gap-1">
          Browse more <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-200" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No orders yet</p>
          <p className="text-sm text-gray-400 mb-5">Items you purchase will appear here</p>
          <Link href="/browse" className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">Browse Listings</Link>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
              <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                <img src={order.image} alt={order.title} className="w-full h-full object-contain p-1.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 line-clamp-1">{order.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">From {order.seller} · {order.date}</p>
                <p className="text-xs text-gray-400 font-mono">{order.id}</p>
                {order.estimatedDelivery && (
                  <p className="text-xs text-[#4A5CE8] font-medium mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Est. {order.estimatedDelivery}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                <p className="font-bold text-gray-900 text-sm">{formatPrice(order.price)}</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.statusColor}`}>{order.status}</span>
                <div className="flex gap-1.5 mt-1">
                  <button
                    onClick={() => openTracking(order)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#4A5CE8] bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Truck className="w-3 h-3" /> Track
                  </button>
                  {order.status === "Delivered" && !existingReturnIds.has(order.id) && (
                    <button
                      onClick={() => openReturn(order)}
                      className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" /> Return
                    </button>
                  )}
                  {order.status === "Delivered" && existingReturnIds.has(order.id) && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
                      <RotateCcw className="w-3 h-3" /> Returned
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeTracking}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1A1D2E] to-[#2d3158] px-6 pt-6 pb-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-blue-300 font-semibold uppercase tracking-wider">Order Tracking</p>
                  <h3 className="text-white font-black text-lg mt-0.5 line-clamp-1">{trackingOrder.title}</h3>
                  <p className="text-blue-300 text-xs mt-1 font-mono">{trackingOrder.id}</p>
                </div>
                <button onClick={closeTracking} className="text-white/60 hover:text-white transition-colors p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex gap-3 text-xs">
                {trackingOrder.trackingNumber && (
                  <div className="bg-white/10 rounded-xl px-3 py-2">
                    <p className="text-blue-300">Tracking No.</p>
                    <p className="text-white font-bold font-mono">{trackingOrder.trackingNumber}</p>
                  </div>
                )}
                {trackingOrder.carrier && (
                  <div className="bg-white/10 rounded-xl px-3 py-2">
                    <p className="text-blue-300">Carrier</p>
                    <p className="text-white font-bold">{trackingOrder.carrier}</p>
                  </div>
                )}
                {trackingOrder.estimatedDelivery && (
                  <div className="bg-white/10 rounded-xl px-3 py-2">
                    <p className="text-blue-300">Est. Delivery</p>
                    <p className="text-white font-bold">{trackingOrder.estimatedDelivery}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="px-6 py-5">
              <div className="space-y-0">
                {getTrackingSteps(trackingOrder.trackingStep).map((step, i, arr) => (
                  <div key={step.label} className="flex gap-4">
                    {/* Spine */}
                    <div className="flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step.done ? "bg-emerald-500" : step.active ? "bg-[#4A5CE8]" : "bg-gray-100"
                      }`}>
                        {step.done ? (
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        ) : step.active ? (
                          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                        )}
                      </div>
                      {i < arr.length - 1 && (
                        <div className={`w-0.5 flex-1 my-1 min-h-[20px] ${step.done ? "bg-emerald-300" : "bg-gray-100"}`} />
                      )}
                    </div>
                    {/* Label */}
                    <div className={`pb-4 flex-1 ${i === arr.length - 1 ? "pb-0" : ""}`}>
                      <p className={`text-sm font-bold ${step.done ? "text-emerald-700" : step.active ? "text-[#4A5CE8]" : "text-gray-300"}`}>
                        {step.label}
                      </p>
                      <p className={`text-xs mt-0.5 ${step.done || step.active ? "text-gray-500" : "text-gray-300"}`}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery address */}
            {trackingOrder.address && (
              <div className="mx-6 mb-5 bg-gray-50 rounded-2xl px-4 py-3 flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-500">Delivery address</p>
                  <p className="text-sm text-gray-700 font-medium mt-0.5">{trackingOrder.address}</p>
                </div>
              </div>
            )}

            <div className="px-6 pb-6">
              <button onClick={closeTracking} className="w-full py-3 rounded-2xl bg-[#1A1D2E] text-white font-bold text-sm hover:bg-[#2d3158] transition-colors">
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return Request Modal */}
      {returnOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeReturn}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-gray-900 text-lg">Request a Return</h3>
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{returnOrder.title}</p>
              </div>
              <button onClick={closeReturn} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {retSubmitted ? (
              <div className="px-6 py-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h4 className="font-black text-gray-900 text-xl mb-2">Return Requested!</h4>
                <p className="text-sm text-gray-500 mb-6">We'll review your request and get back to you within 2 business days. You'll be notified by email.</p>
                <button onClick={closeReturn} className="px-8 py-3 rounded-2xl bg-[#1A1D2E] text-white font-bold text-sm">Done</button>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Reason for return</label>
                  <div className="relative">
                    <select
                      value={retReason}
                      onChange={e => setRetReason(e.target.value)}
                      className="w-full appearance-none px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#4A5CE8] bg-white pr-8"
                    >
                      {Object.entries(REASON_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Item condition</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(CONDITION_LABELS).map(([v, l]) => (
                      <button
                        key={v}
                        onClick={() => setRetCondition(v)}
                        className={`py-2 px-3 rounded-xl border-2 text-xs font-semibold text-left transition-colors ${
                          retCondition === v ? "border-[#4A5CE8] bg-blue-50 text-[#4A5CE8]" : "border-gray-100 text-gray-600 hover:border-gray-200"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Describe the issue</label>
                  <textarea
                    value={retDesc}
                    onChange={e => setRetDesc(e.target.value)}
                    rows={3}
                    placeholder="Please describe the problem in detail…"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none"
                  />
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  Returns are reviewed within 2 business days. Items must be in the stated condition.
                </div>
                <button
                  onClick={submitReturn}
                  disabled={!retDesc.trim() || retLoading}
                  className="w-full py-3 rounded-2xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {retLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
                  ) : (
                    <><RotateCcw className="w-4 h-4" /> Submit Return Request</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ─── Returns Section ──────────────────────────────────────────────────────────

function ReturnsSection() {
  const { formatPrice } = useCurrency();
  const [returns, setReturns] = useState<MockReturn[]>(MOCK_RETURNS_DATA);
  const [shipping, setShipping] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [shipSubmitted, setShipSubmitted] = useState<Set<string>>(new Set());

  const STATUS_STEPS = ["requested", "approved", "return_shipped", "received", "refund_issued"];
  const STATUS_LABELS: Record<string, string> = {
    requested: "Requested", approved: "Approved", declined: "Declined",
    return_shipped: "Return Shipped", received: "Received", refund_issued: "Refund Issued", closed: "Closed",
  };

  function stepIndex(status: string) {
    const i = STATUS_STEPS.indexOf(status);
    return i === -1 ? 0 : i;
  }

  async function markShipped(id: string) {
    await new Promise(r => setTimeout(r, 600));
    setReturns(prev => prev.map(r => r.id === id ? { ...r, status: "return_shipped", statusColor: "bg-blue-100 text-blue-700", returnTracking: trackingInput || undefined } : r));
    setShipSubmitted(prev => new Set(prev).add(id));
    setShipping(null);
    setTrackingInput("");
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-black text-gray-900 text-lg">My Returns</h2>
        <p className="text-xs text-gray-400 mt-0.5">{returns.length} return{returns.length !== 1 ? "s" : ""} · refunds processed within 5 business days</p>
      </div>

      {returns.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
            <RotateCcw className="w-8 h-8 text-gray-200" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">No returns yet</p>
          <p className="text-sm text-gray-400 mb-1">Return requests appear here once submitted from your Orders.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {returns.map((ret) => {
            const step = stepIndex(ret.status);
            const isDeclined = ret.status === "declined";
            const canShip = ret.status === "approved" && !shipSubmitted.has(ret.id);
            return (
              <div key={ret.id} className="px-5 py-5">
                {/* Order summary */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                    <img src={ret.image} alt={ret.title} className="w-full h-full object-contain p-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 line-clamp-1">{ret.title}</p>
                    <p className="text-xs text-gray-400 font-mono">{ret.id} · Order {ret.orderId}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ret.reason} · {ret.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{formatPrice(ret.price)}</p>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${ret.statusColor}`}>
                      {STATUS_LABELS[ret.status] ?? ret.status}
                    </span>
                  </div>
                </div>

                {/* Status timeline */}
                {!isDeclined && (
                  <div className="flex items-center gap-0 mb-4">
                    {STATUS_STEPS.map((s, i) => (
                      <div key={s} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                            i < step ? "bg-emerald-500" : i === step ? "bg-[#4A5CE8]" : "bg-gray-100"
                          }`}>
                            {i < step ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                            ) : i === step ? (
                              <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            ) : (
                              <div className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                          </div>
                          <p className={`text-[9px] font-semibold text-center leading-tight w-14 ${
                            i <= step ? "text-gray-600" : "text-gray-300"
                          }`}>
                            {STATUS_LABELS[s]}
                          </p>
                        </div>
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-4 mx-1 ${i < step ? "bg-emerald-300" : "bg-gray-100"}`} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Declined state */}
                {isDeclined && (
                  <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2 mb-3">
                    <XCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Return Declined</p>
                      <p className="text-xs text-red-600 mt-0.5">{ret.adminNotes ?? "Your return request was not approved. Contact support if you have questions."}</p>
                    </div>
                  </div>
                )}

                {/* Admin notes */}
                {ret.adminNotes && !isDeclined && (
                  <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2 mb-3">
                    <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">{ret.adminNotes}</p>
                  </div>
                )}

                {/* Refund amount */}
                {ret.refundAmount && ret.status !== "declined" && (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold text-emerald-700">Refund amount</p>
                    <p className="text-sm font-black text-emerald-700">{formatPrice(parseFloat(ret.refundAmount))}</p>
                  </div>
                )}

                {/* Mark as shipped */}
                {canShip && (
                  shipping === ret.id ? (
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="text-xs font-bold text-gray-700">Enter return tracking number (optional)</p>
                      <input
                        type="text"
                        value={trackingInput}
                        onChange={e => setTrackingInput(e.target.value)}
                        placeholder="e.g. JD000123456789"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => markShipped(ret.id)} className="flex-1 py-2 rounded-lg bg-[#4A5CE8] text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5" /> Confirm Shipped
                        </button>
                        <button onClick={() => setShipping(null)} className="py-2 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:bg-gray-100">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShipping(ret.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-[#4A5CE8] bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5" /> Mark as Shipped to Seller
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info footer */}
      <div className="p-5 border-t border-gray-50 bg-gray-50/50 mt-auto">
        <div className="flex items-start gap-2 text-xs text-gray-400">
          <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>Refunds are issued once the seller confirms receipt of your return. Typical processing is 3–5 business days.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Disputes ─────────────────────────────────────────────────────────────────

type DisputeRecord = {
  id: string; order_id: string | null; item_title: string; reason: string;
  description: string; status: string; resolution_notes: string | null;
  refund_amount: string | null; seller_response: string | null; created_at: string;
};

function DisputesSection() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<DisputeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [form, setForm] = useState({ itemTitle: "", orderId: "", reason: "item_not_received", description: "" });
  const [formError, setFormError] = useState("");

  async function load() {
    if (!user?.email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/disputes?email=${encodeURIComponent(user.email)}`);
      if (res.ok) setDisputes(await res.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user?.email]);

  async function submit() {
    if (!form.itemTitle.trim()) { setFormError("Please enter the item name."); return; }
    if (!form.description.trim()) { setFormError("Please describe the issue."); return; }
    setFormError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyerEmail: user?.email,
          orderId: form.orderId.trim() || undefined,
          itemTitle: form.itemTitle.trim(),
          reason: form.reason,
          description: form.description.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        setShowForm(false);
        setForm({ itemTitle: "", orderId: "", reason: "item_not_received", description: "" });
        await load();
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ minHeight: 400 }}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-black text-gray-900 text-lg">Disputes</h2>
          <p className="text-sm text-gray-400 mt-0.5">Open a dispute if something went wrong with your order.</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); setSubmitted(false); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Open Dispute
          </button>
        )}
      </div>

      {submitted && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 mb-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-emerald-800">Dispute submitted</p>
            <p className="text-xs text-emerald-600 mt-0.5">We've received your dispute. The seller has 48 hours to respond before our team steps in.</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-50 rounded-2xl border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-sm">New Dispute</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          {formError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> {formError}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Item Name *</label>
              <input
                value={form.itemTitle}
                onChange={(e) => setForm((f) => ({ ...f, itemTitle: e.target.value }))}
                placeholder="e.g. MacBook Pro 14 inch"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Order ID <span className="text-gray-300 font-normal">(optional)</span></label>
              <input
                value={form.orderId}
                onChange={(e) => setForm((f) => ({ ...f, orderId: e.target.value }))}
                placeholder="e.g. ORD-12345"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Reason *</label>
              <select
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] bg-white"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Describe the issue *</label>
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Tell us what happened, including any relevant dates and details…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8] resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={submit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit Dispute"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-3 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
            <Shield className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400" />
            Disputes must be opened within 30 days of purchase. Our team typically resolves cases within 5 business days.
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
      ) : disputes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-emerald-400" />
          </div>
          <p className="font-bold text-gray-700">No disputes</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">All your orders are going smoothly. If something goes wrong, open a dispute and we'll help resolve it.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const meta = DISPUTE_STATUS_META[d.status] ?? DISPUTE_STATUS_META["open"];
            const isOpen = expanded === d.id;
            const reasonLabel = DISPUTE_REASONS.find((r) => r.value === d.reason)?.label ?? d.reason;
            return (
              <div key={d.id} className="rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{d.item_title}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.color}`}>{meta.label}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{reasonLabel} · {new Date(d.created_at).toLocaleDateString("en-GB")}</p>
                  </div>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-4 py-4 space-y-3">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 mb-1">Your description</p>
                      <p className="text-sm text-gray-700">{d.description}</p>
                    </div>
                    {d.seller_response && (
                      <div className="bg-blue-50 rounded-xl p-3">
                        <p className="text-xs text-blue-400 mb-1">Seller's response</p>
                        <p className="text-sm text-blue-800">{d.seller_response}</p>
                      </div>
                    )}
                    {d.resolution_notes && (
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-xs text-emerald-500 mb-1">Resolution</p>
                        <p className="text-sm text-emerald-800">{d.resolution_notes}</p>
                        {d.refund_amount && (
                          <p className="text-sm font-bold text-emerald-700 mt-1">Refund: £{parseFloat(d.refund_amount).toFixed(2)}</p>
                        )}
                      </div>
                    )}
                    {d.order_id && (
                      <p className="text-xs text-gray-400">Order ID: <span className="font-mono text-gray-600">{d.order_id}</span></p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const PLATFORMS: LivePlatform[] = ["youtube", "twitch", "tiktok", "zoom", "instagram", "facebook", "livekit"];

type GoLiveListing = { id: number; title: string; price: number | string; images: string[] };

function GoLiveSection() {
  const { user } = useAuth();
  const { mySession, goLive, endSession, featureProduct, clearFeatured, getFeatured } = useLiveStream();
  const [platform, setPlatform] = useState<LivePlatform>("youtube");
  const [streamUrl, setStreamUrl] = useState("");
  const [title, setTitle] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const [featureSettings, setFeatureSettings] = useState<Record<number, { discount?: number; stock?: string }>>({});
  const [myListings, setMyListings] = useState<GoLiveListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);

  useEffect(() => {
    if (!user?.email) return;
    setListingsLoading(true);
    fetch(`/api/listings/mine?email=${encodeURIComponent(user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        const items: GoLiveListing[] = Array.isArray(data) ? data : (data.listings ?? []);
        setMyListings(items);
      })
      .catch(() => {})
      .finally(() => setListingsLoading(false));
  }, [user?.email]);

  function toggleProduct(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleGoLive() {
    if (!title.trim()) { setError("Please add a session title."); return; }
    const isNative = platform === "livekit";
    if (!isNative && !streamUrl.trim()) { setError("Please add your stream URL."); return; }
    setError("");
    const name = user?.name ?? user?.email ?? "Seller";
    const initials = name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
    const roomName = isNative ? `bazunk-${Date.now()}` : streamUrl.trim();
    const session = goLive({
      sellerId: user?.email ?? "me",
      sellerName: name,
      sellerInitials: initials,
      title: title.trim(),
      platform,
      streamUrl: roomName,
      isLive: true,
      productIds: selectedIds,
    });
    if (!isNative) navigate(`/live/${session.id}`);
  }

  if (mySession) {
    const sessionProducts = myListings.filter((p) => mySession.productIds.includes(p.id));
    const currentFeatured = getFeatured(mySession.id);

    function updateFeatureSetting(productId: number, key: "discount" | "stock", value: number | string | undefined) {
      setFeatureSettings((prev) => ({ ...prev, [productId]: { ...prev[productId], [key]: value } }));
    }

    function handleFeature(productId: number) {
      const settings = featureSettings[productId] ?? {};
      featureProduct(mySession!.id, productId, {
        discount: settings.discount,
        stockAlert: settings.stock ? parseInt(settings.stock, 10) : undefined,
      });
    }

    return (
      <div className="space-y-4">
        {/* Status bar */}
        <div className="bg-gradient-to-r from-red-600 via-red-500 to-[#F26B21] rounded-2xl p-5 text-white">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="relative flex h-4 w-4 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-4 w-4 bg-white" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-black text-lg leading-tight">You're Live!</h2>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 animate-pulse">STREAMING</span>
                </div>
                <p className="text-white/70 text-xs mt-0.5 line-clamp-1">{mySession.title}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/live/${mySession.id}`}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Live Page
              </Link>
              {mySession.platform !== "livekit" && (
                <a href={mySession.streamUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 text-white font-bold text-xs hover:bg-white/30 transition-colors">
                  <Link2 className="w-3.5 h-3.5" /> My Stream
                </a>
              )}
              <button onClick={() => endSession(mySession.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/25 text-white font-bold text-xs hover:bg-black/35 transition-colors">
                <X className="w-3.5 h-3.5" /> End
              </button>
            </div>
          </div>
          <p className="text-white/60 text-xs">
            {mySession.platform === "livekit"
              ? "You're broadcasting natively via LiveKit. Buyers watching your Live Page see your video in real time."
              : "Open your Live Page in another tab — buyers watching your stream will see featured products in real time."}
          </p>
        </div>

        {/* LiveKit broadcaster panel */}
        {mySession.platform === "livekit" && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-black text-gray-900 text-sm flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-white bg-orange-500 px-2 py-0.5 rounded-full">
                    <Radio className="w-3 h-3" /> NATIVE
                  </span>
                  Your Broadcast
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Camera &amp; mic controls for your LiveKit stream</p>
              </div>
            </div>
            <div className="p-4">
              <LiveKitBroadcaster
                roomName={mySession.streamUrl}
                publisherIdentity={mySession.sellerId}
                onEnd={() => endSession(mySession.id)}
              />
            </div>
          </div>
        )}

        {/* Currently featured */}
        {currentFeatured && (() => {
          const fp = myListings.find((x) => x.id === currentFeatured.productId);
          if (!fp) return null;
          return (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-amber-200 flex-shrink-0 overflow-hidden">
                <img src={fp.images?.[0] ?? ""} alt={fp.title} className="w-full h-full object-contain p-1" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wide mb-0.5">⚡ Now Spotlighted on Live Page</p>
                <p className="text-sm font-bold text-gray-900 truncate">{fp.title}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-xs font-bold text-[#F26B21]">
                    £{currentFeatured.discount
                      ? (Number(fp.price) * (1 - currentFeatured.discount / 100)).toFixed(2)
                      : Number(fp.price).toFixed(2)}
                  </span>
                  {currentFeatured.discount && (
                    <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">
                      -{currentFeatured.discount}% OFF
                    </span>
                  )}
                  {currentFeatured.stockAlert != null && currentFeatured.stockAlert > 0 && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 font-bold px-1.5 py-0.5 rounded-full">
                      Only {currentFeatured.stockAlert} left
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => clearFeatured(mySession!.id)}
                className="flex-shrink-0 p-2 rounded-xl border border-amber-200 text-amber-600 hover:bg-amber-100 transition-colors"
                title="Clear spotlight"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })()}

        {/* Quick deal presets */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-sm font-black text-gray-900 mb-1">Quick Deal Presets</p>
          <p className="text-xs text-gray-400 mb-3">
            {sessionProducts.length === 0
              ? "No products in session — add some when you start your next stream."
              : "Apply to the currently featured product, or the first in your list."}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: "🔥", label: "Flash Deal", discount: 20, stock: undefined, flash: true },
              { emoji: "⚡", label: "Lightning",  discount: 30, stock: 3,         flash: true },
              { emoji: "📦", label: "Last Item",  discount: undefined, stock: 1,  flash: false },
            ].map((preset) => (
              <button
                key={preset.label}
                disabled={sessionProducts.length === 0}
                onClick={() => {
                  const targetId = currentFeatured?.productId ?? sessionProducts[0]?.id;
                  if (!targetId) return;
                  featureProduct(mySession!.id, targetId, {
                    discount: preset.discount,
                    stockAlert: preset.stock,
                    flashDeal: preset.flash,
                  });
                }}
                className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 border-gray-100 hover:border-[#F26B21]/40 hover:bg-orange-50/40 transition-all text-center disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-xl">{preset.emoji}</span>
                <span className="text-xs font-bold text-gray-700">{preset.label}</span>
                {preset.discount && (
                  <span className="text-[9px] text-[#F26B21] font-semibold">{preset.discount}% off</span>
                )}
                {preset.stock && (
                  <span className="text-[9px] text-orange-500 font-semibold">Only {preset.stock} left</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Feature a product */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-black text-gray-900 text-sm">Feature a Product</p>
              <p className="text-xs text-gray-400 mt-0.5">Spotlight any item — buyers see it live instantly</p>
            </div>
            <Zap className="w-4 h-4 text-[#F26B21]" />
          </div>

          {sessionProducts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-3">
                <Tag className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No products in this session</p>
              <p className="text-xs text-gray-400 mt-1">End this stream and start a new one with products selected.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {sessionProducts.map((product) => {
                const settings = featureSettings[product.id] ?? {};
                const isFeatured = currentFeatured?.productId === product.id;
                const numPrice = Number(product.price);
                const effectivePrice = settings.discount
                  ? numPrice * (1 - settings.discount / 100)
                  : numPrice;

                return (
                  <div key={product.id} className={`p-4 ${isFeatured ? "bg-amber-50/60" : ""}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                        <img
                          src={product.images?.[0] ?? ""}
                          alt={product.title}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 line-clamp-1">{product.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-[#F26B21]">£{effectivePrice.toFixed(2)}</span>
                          {settings.discount && (
                            <span className="text-gray-400 text-xs line-through">£{numPrice.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      {isFeatured && (
                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex-shrink-0 self-start">
                          LIVE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-[10px] font-bold text-gray-500 self-center">Discount:</span>
                      {([undefined, 10, 20, 30] as (number | undefined)[]).map((d) => (
                        <button
                          key={d ?? "none"}
                          onClick={() => updateFeatureSetting(product.id, "discount", d)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            settings.discount === d
                              ? "bg-[#F26B21] text-white"
                              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                          }`}
                        >
                          {d === undefined ? "None" : `-${d}%`}
                        </button>
                      ))}
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] font-bold text-gray-500">Stock:</span>
                        <input
                          type="number"
                          min="1"
                          value={settings.stock ?? ""}
                          onChange={(e) => updateFeatureSetting(product.id, "stock", e.target.value || undefined)}
                          placeholder="∞"
                          className="w-12 px-2 py-1 rounded-lg border border-gray-200 text-[10px] text-center focus:outline-none focus:border-[#F26B21]"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFeature(product.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gradient-to-r from-[#F26B21] to-red-500 text-white font-bold text-xs hover:opacity-90 transition-opacity"
                      >
                        <Zap className="w-3.5 h-3.5" /> Feature Now
                      </button>
                      {isFeatured && (
                        <button
                          onClick={() => clearFeatured(mySession!.id)}
                          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-xs font-semibold hover:bg-gray-50 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6" style={{ minHeight: 400 }}>
      <div className="mb-6">
        <h2 className="font-black text-gray-900 text-lg">Go Live</h2>
        <p className="text-sm text-gray-400 mt-1">Stream on your favourite platform and sell directly on Bazunk.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 mb-4">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {/* Platform picker */}
      <div className="mb-5">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Choose Your Platform</label>
        <div className="grid grid-cols-3 gap-2">
          {PLATFORMS.map((p) => {
            const meta = PLATFORM_META[p];
            const active = platform === p;
            return (
              <button
                key={p}
                onClick={() => { setPlatform(p); setStreamUrl(""); }}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  active
                    ? `border-current ${meta.text} bg-gray-50`
                    : "border-gray-100 text-gray-400 hover:border-gray-200"
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-black ${active ? meta.bg : "bg-gray-200"}`}>
                  {p.slice(0, 2).toUpperCase()}
                </span>
                {meta.label}
                {meta.canEmbed && active && (
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Embeds in-page</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session title */}
      <div className="mb-4">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Session Title *</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. MacBook & iPhone Flash Sale!"
          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#F26B21] focus:ring-2 focus:ring-[#F26B21]/10"
        />
      </div>

      {/* Stream URL — hidden for native LiveKit (room auto-generated) */}
      {platform !== "livekit" ? (
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
            Your Stream URL *
            {!PLATFORM_META[platform].canEmbed && (
              <span className="ml-2 text-[10px] text-amber-500 font-semibold normal-case">— opens in new tab for buyers</span>
            )}
            {PLATFORM_META[platform].canEmbed && (
              <span className="ml-2 text-[10px] text-emerald-500 font-semibold normal-case">— embeds directly on your live page</span>
            )}
          </label>
          <div className="relative">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={streamUrl}
              onChange={(e) => setStreamUrl(e.target.value)}
              placeholder={PLATFORM_META[platform].placeholder}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:border-[#F26B21] focus:ring-2 focus:ring-[#F26B21]/10"
            />
          </div>
        </div>
      ) : (
        <div className="mb-5 p-4 rounded-xl bg-orange-50 border border-orange-100">
          <div className="flex items-start gap-3">
            <Radio className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-gray-800 mb-1">Native WebRTC broadcasting</p>
              <p className="text-xs text-gray-500">
                A private room is created automatically. Your camera and microphone will broadcast directly to viewers — no external platform needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product selector */}
      <div className="mb-6">
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
          Items to sell <span className="text-gray-400 font-normal normal-case">(optional — shown on your live page)</span>
        </label>
        <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 divide-y divide-gray-50">
          {listingsLoading ? (
            <div className="px-3 py-4 text-center text-xs text-gray-400">Loading your listings…</div>
          ) : myListings.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs font-semibold text-gray-500">No active listings found</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                <a href="/dashboard?section=my-listings" className="text-[#4A5CE8] underline">Create a listing</a> first, then come back to go live.
              </p>
            </div>
          ) : (
            myListings.map((p) => {
              const checked = selectedIds.includes(p.id);
              return (
                <label key={p.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors ${checked ? "bg-orange-50/50" : ""}`}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleProduct(p.id)}
                    className="accent-[#F26B21] w-4 h-4 flex-shrink-0"
                  />
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-gray-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  )}
                  <span className="text-sm text-gray-700 flex-1 truncate">{p.title}</span>
                  <span className="text-xs font-bold text-[#F26B21] flex-shrink-0">£{Number(p.price).toFixed(2)}</span>
                </label>
              );
            })
          )}
        </div>
        {selectedIds.length > 0 && (
          <p className="text-xs text-gray-400 mt-1.5">{selectedIds.length} item{selectedIds.length !== 1 ? "s" : ""} selected</p>
        )}
      </div>

      <button
        onClick={handleGoLive}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-red-500 to-[#F26B21] text-white font-black text-base hover:opacity-90 transition-opacity shadow-sm"
      >
        <Radio className="w-5 h-5" /> Go Live Now
      </button>
      <p className="text-[10px] text-gray-400 text-center mt-3">
        You'll be taken to your live page where buyers can browse and purchase while watching your stream.
      </p>
    </div>
  );
}

type AuctionSummary = { id: string; title: string; status: string; current_bid: string | null; starting_bid: string; bid_count: number; end_time: string; images: string[]; };

function getAuctionTimeLeft(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const AUCTION_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-gray-100 text-gray-500",
  cancelled: "bg-red-100 text-red-600",
};

function MyAuctionsSection() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [, setLocation] = useLocation();
  const [auctions, setAuctions] = useState<AuctionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`/api/auctions/my-listings?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setAuctions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Auctions</h2>
          <p className="text-sm text-gray-500 mt-0.5">Items you've listed for auction</p>
        </div>
        <button onClick={() => setLocation("/auctions/create")} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity">
          <Plus className="w-4 h-4" /> New Auction
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Clock className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Gavel className="w-12 h-12 mb-3 text-gray-200" />
          <p className="font-semibold text-gray-600">No auctions yet</p>
          <p className="text-sm mt-1">Start your first auction and let bidders compete!</p>
          <button onClick={() => setLocation("/auctions/create")} className="mt-4 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Create Auction
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => {
            const bid = a.current_bid ? parseFloat(a.current_bid) : parseFloat(a.starting_bid);
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {Array.isArray(a.images) && a.images[0]
                    ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover" />
                    : <Gavel className="w-6 h-6 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${AUCTION_STATUS_COLORS[a.status] ?? AUCTION_STATUS_COLORS["ended"]}`}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-400">{a.bid_count} bid{a.bid_count !== 1 ? "s" : ""}</span>
                    {a.status === "active" && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{getAuctionTimeLeft(a.end_time)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-[#F26B21]">{formatPrice(bid)}</p>
                  <p className="text-xs text-gray-400">{a.current_bid ? "Current bid" : "Starting bid"}</p>
                </div>
                <button onClick={() => setLocation(`/auctions/${a.id}`)} className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">View</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyBidsSection() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [, setLocation] = useLocation();
  const [auctions, setAuctions] = useState<(AuctionSummary & { my_latest_bid: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`/api/auctions/my-bids?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setAuctions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  return (
    <div className="flex-1 p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Bids</h2>
        <p className="text-sm text-gray-500 mt-0.5">Auctions you've placed bids on</p>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Clock className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : auctions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <TrendingUp className="w-12 h-12 mb-3 text-gray-200" />
          <p className="font-semibold text-gray-600">No bids placed yet</p>
          <p className="text-sm mt-1">Browse live auctions and start bidding!</p>
          <button onClick={() => setLocation("/auctions")} className="mt-4 px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Browse Auctions
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {auctions.map((a) => {
            const currentBid = a.current_bid ? parseFloat(a.current_bid) : parseFloat(a.starting_bid);
            const myBid = parseFloat(a.my_latest_bid);
            const isWinning = a.status === "active" && myBid >= currentBid;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {Array.isArray(a.images) && a.images[0]
                    ? <img src={a.images[0]} alt={a.title} className="w-full h-full object-cover" />
                    : <Gavel className="w-6 h-6 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{a.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${AUCTION_STATUS_COLORS[a.status] ?? AUCTION_STATUS_COLORS["ended"]}`}>
                      {a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                    </span>
                    {a.status === "active" && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isWinning ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {isWinning ? "🏆 Winning" : "Outbid"}
                      </span>
                    )}
                    {a.status === "active" && <span className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{getAuctionTimeLeft(a.end_time)}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">My bid</p>
                  <p className="text-sm font-black text-[#4A5CE8]">{formatPrice(myBid)}</p>
                  <p className="text-xs text-gray-400">Current: {formatPrice(currentBid)}</p>
                </div>
                <button onClick={() => setLocation(`/auctions/${a.id}`)} className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">View</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

type FlashSaleSummary = {
  id: string; title: string; image: string | null; category: string | null;
  original_price: string; sale_price: string; discount_percent: number;
  starts_at: string; ends_at: string; status: string;
};

function MyFlashSalesSection() {
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [, setLocation] = useLocation();
  const [sales, setSales] = useState<FlashSaleSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetch(`/api/flash-sales/my-sales?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(setSales)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.email]);

  const STATUS_COLOR: Record<string, string> = {
    active:    "bg-orange-100 text-orange-700",
    upcoming:  "bg-amber-100 text-amber-700",
    ended:     "bg-gray-100 text-gray-500",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Flash Sales</h2>
          <p className="text-sm text-gray-500 mt-0.5">Timed discounts you've created</p>
        </div>
        <button onClick={() => setLocation("/flash-sales/create")}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
          <Zap className="w-4 h-4" /> New Flash Sale
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Clock className="w-5 h-5 animate-spin mr-2" /> Loading…
        </div>
      ) : sales.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <Zap className="w-12 h-12 mb-3 text-gray-200" />
          <p className="font-semibold text-gray-600">No flash sales yet</p>
          <p className="text-sm mt-1">Create a timed discount and drive more buyers to your listings!</p>
          <button onClick={() => setLocation("/flash-sales/create")}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            <Zap className="w-4 h-4" /> Create Flash Sale
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map((s) => {
            const orig = parseFloat(s.original_price);
            const sp = parseFloat(s.sale_price);
            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                  {s.image
                    ? <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                    : <Zap className="w-6 h-6 text-gray-300" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[s.status] ?? STATUS_COLOR["ended"]}`}>
                      {s.status.charAt(0).toUpperCase() + s.status.slice(1)}
                    </span>
                    <span className="text-xs font-bold text-[#F26B21]">-{s.discount_percent}% off</span>
                    {(s.status === "active" || s.status === "upcoming") && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {s.status === "active"
                          ? `Ends ${new Date(s.ends_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
                          : `Starts ${new Date(s.starts_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400 line-through">{formatPrice(orig)}</p>
                  <p className="text-sm font-black text-[#F26B21]">{formatPrice(sp)}</p>
                </div>
                <button onClick={() => setLocation(`/flash-sales/${s.id}`)}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TICKET_CATEGORIES = [
  "General Enquiry", "Order Issue", "Payment Problem",
  "Account Access", "Listing Issue", "Return / Refund",
  "Dispute", "Account Closure", "Other",
];

const TICKET_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  open:          { label: "Open",        cls: "bg-blue-100 text-blue-700" },
  "in-progress": { label: "In Progress", cls: "bg-amber-100 text-amber-700" },
  closed:        { label: "Closed",      cls: "bg-gray-100 text-gray-500"  },
};

type SupportTicketSummary = {
  id: number; subject: string; category: string; status: string;
  priority: string; created_at: string; updated_at: string; message_count: number;
};

type SupportMessage = {
  id: number; author: string; author_type: "user" | "admin"; body: string; created_at: string;
};

function SupportTicketsSection({ user }: { user: { email: string; name?: string } }) {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ subject: "", category: TICKET_CATEGORIES[0], description: "" });
  const [errors, setErrors] = useState<{ subject?: string; description?: string }>({});

  const [openTicket, setOpenTicket] = useState<SupportTicketSummary | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replySending, setReplySending] = useState(false);

  useEffect(() => { fetchTickets(); }, [user.email]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch(`/api/support/tickets?email=${encodeURIComponent(user.email)}`);
      if (res.ok) { const d = await res.json(); setTickets(d.tickets ?? []); }
    } finally { setLoading(false); }
  }

  async function openThread(t: SupportTicketSummary) {
    setOpenTicket(t);
    setThreadLoading(true);
    setReplyBody("");
    try {
      const res = await fetch(`/api/support/tickets/${t.id}?email=${encodeURIComponent(user.email)}`);
      if (res.ok) { const d = await res.json(); setMessages(d.messages ?? []); }
    } finally { setThreadLoading(false); }
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.subject.trim()) e.subject = "Subject is required";
    if (form.description.trim().length < 20) e.description = "Please provide at least 20 characters of detail";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          subject: form.subject.trim(),
          category: form.category,
          body: form.description.trim(),
        }),
      });
      if (res.ok) {
        setForm({ subject: "", category: TICKET_CATEGORIES[0], description: "" });
        setErrors({});
        setShowForm(false);
        setSubmitted(true);
        setTimeout(() => setSubmitted(false), 4000);
        await fetchTickets();
      }
    } finally { setSubmitting(false); }
  }

  async function handleReply() {
    if (!openTicket || !replyBody.trim()) return;
    setReplySending(true);
    try {
      const res = await fetch(`/api/support/tickets/${openTicket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, body: replyBody.trim() }),
      });
      if (res.ok) {
        setReplyBody("");
        const r2 = await fetch(`/api/support/tickets/${openTicket.id}?email=${encodeURIComponent(user.email)}`);
        if (r2.ok) { const d = await r2.json(); setMessages(d.messages ?? []); }
        await fetchTickets();
      }
    } finally { setReplySending(false); }
  }

  if (openTicket) {
    const s = TICKET_STATUS_STYLES[openTicket.status] ?? TICKET_STATUS_STYLES.open;
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 500 }}>
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <button onClick={() => setOpenTicket(null)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-gray-400 font-mono">#{openTicket.id}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
              <span className="text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">{openTicket.category}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 mt-0.5 truncate">{openTicket.subject}</p>
          </div>
        </div>

        <div className="flex-1 p-5 space-y-3 overflow-auto">
          {threadLoading ? (
            <div className="flex justify-center py-8"><Clock className="w-5 h-5 text-gray-300 animate-spin" /></div>
          ) : messages.map((m) => (
            <div key={m.id} className={`flex ${m.author_type === "admin" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.author_type === "admin"
                  ? "bg-[#4A5CE8]/8 border border-[#4A5CE8]/15 text-gray-800"
                  : "bg-[#1A1D2E] text-white"
              }`}>
                <p className={`text-[10px] font-bold mb-1 ${m.author_type === "admin" ? "text-[#4A5CE8]" : "text-white/50"}`}>
                  {m.author_type === "admin" ? "Support Team" : "You"}
                </p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                <p className={`text-[10px] mt-1.5 ${m.author_type === "admin" ? "text-gray-400" : "text-white/40"}`}>
                  {new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>

        {openTicket.status !== "closed" ? (
          <div className="p-5 border-t border-gray-100">
            <div className="flex gap-2">
              <textarea
                rows={2}
                placeholder="Add a reply…"
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 resize-none"
              />
              <button
                onClick={handleReply}
                disabled={replySending || !replyBody.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 self-end"
              >
                {replySending ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 border-t border-gray-100">
            <p className="text-xs text-center text-gray-400">This ticket is closed. Open a new ticket if you need further help.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col" style={{ minHeight: 400 }}>
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-[#4A5CE8]" /> Support Tickets
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Support open 24/7 — we'll reply as soon as possible</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" /> New Ticket
          </button>
        )}
      </div>

      <AnimatePresence>
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center gap-3"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-700 font-semibold">Ticket submitted! Our team will get back to you soon.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-5 mt-5 bg-gray-50 rounded-2xl border border-gray-200 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-sm">New Support Ticket</h3>
              <button onClick={() => { setShowForm(false); setErrors({}); }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                <input
                  type="text" placeholder="Brief summary of your issue…"
                  value={form.subject}
                  onChange={(e) => setForm(f => ({ ...f, subject: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 transition-all ${errors.subject ? "border-red-300" : "border-gray-200"}`}
                />
                {errors.subject && <p className="text-xs text-red-500 mt-1">{errors.subject}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 transition-all"
                >
                  {TICKET_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={4}
                  placeholder="Describe your issue in detail. Include any relevant order IDs, listing IDs, or screenshots if possible…"
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className={`w-full px-3 py-2.5 rounded-xl border text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 transition-all resize-none ${errors.description ? "border-red-300" : "border-gray-200"}`}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
                <p className="text-xs text-gray-400 mt-1">{form.description.length} / 20 chars min</p>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowForm(false); setErrors({}); }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-gray-300 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submitting ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Submit Ticket
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 p-5">
        {loading ? (
          <div className="flex justify-center py-10"><Clock className="w-5 h-5 text-gray-300 animate-spin" /></div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
              <Inbox className="w-8 h-8 text-gray-200" />
            </div>
            <p className="font-semibold text-gray-700 mb-1">No tickets yet</p>
            <p className="text-sm text-gray-400 mb-5 max-w-xs">
              Can't find the answer in our Support Centre? Open a ticket and we'll help you out.
            </p>
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" /> Open a Ticket
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const s = TICKET_STATUS_STYLES[t.status] ?? TICKET_STATUS_STYLES.open;
              return (
                <button key={t.id} onClick={() => openThread(t)}
                  className="w-full text-left bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 p-4 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-bold text-gray-400 font-mono">#{t.id}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
                        <span className="text-[10px] text-gray-400 bg-white border border-gray-200 px-2 py-0.5 rounded-full">{t.category}</span>
                        {t.message_count > 0 && (
                          <span className="text-[10px] text-gray-400">{t.message_count} message{t.message_count !== 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{t.subject}</p>
                    </div>
                    <div className="flex-shrink-0 text-right flex items-center gap-1.5">
                      <p className="text-[10px] text-gray-400">
                        {new Date(t.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </p>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-300 -rotate-90" />
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-[#4A5CE8] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#4A5CE8] leading-relaxed">
                Our support team will respond within your ticket thread. Support is open 24/7.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Identity Verification Section ─────────────────────────────────────────

type VerifStatus = "unverified" | "pending" | "verified" | "rejected";

function VerificationSection({ userEmail }: { userEmail: string }) {
  const [status, setStatus] = useState<VerifStatus>("unverified");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/verification/status?email=${encodeURIComponent(userEmail)}`)
      .then((r) => r.json())
      .then((d: { verificationStatus?: VerifStatus }) => {
        setStatus(d.verificationStatus ?? "unverified");
      })
      .catch(() => setStatus("unverified"))
      .finally(() => setLoading(false));
  }, [userEmail]);

  async function startVerification() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/verification/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `API error ${res.status}`);
      }
      const { url } = await res.json() as { url: string };
      setStatus("pending");
      window.location.href = url;
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-8 h-8 rounded-full border-4 border-[#4A5CE8] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black text-gray-900">Identity Verification</h2>
        <p className="text-sm text-gray-400 mt-1">
          Verified sellers build buyer trust and unlock the ability to publish listings on Bazunk.
        </p>
      </div>

      {/* Status card */}
      {status === "verified" && (
        <div className="rounded-2xl bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-black">Identity Verified</p>
              <p className="text-sm text-white/70">Your blue badge is now shown on all your listings</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-4 py-2.5 bg-white/10 rounded-xl w-fit">
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span className="text-sm font-bold">Verified Seller</span>
          </div>
        </div>
      )}

      {status === "pending" && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <div className="w-6 h-6 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
            <div>
              <p className="text-lg font-black text-amber-800">Verification in Progress</p>
              <p className="text-sm text-amber-600">
                Didit is reviewing your documents. This usually takes a few minutes.
              </p>
            </div>
          </div>
          <p className="text-xs text-amber-500 mt-2">
            You'll be able to publish listings once your identity is confirmed.
          </p>
        </div>
      )}

      {status === "rejected" && (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-lg font-black text-red-800">Verification Declined</p>
              <p className="text-sm text-red-600">
                Your documents could not be verified. Please try again with clearer photos.
              </p>
            </div>
          </div>
          <button
            onClick={startVerification}
            disabled={starting}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            {starting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Try Again
          </button>
        </div>
      )}

      {status === "unverified" && (
        <div className="rounded-2xl bg-white border border-gray-200 p-6 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-gray-400" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Get Verified to Start Selling</p>
              <p className="text-sm text-gray-500 mt-1">
                Bazunk requires identity verification for all sellers. It takes about 2 minutes
                and is handled securely by our partner Didit.
              </p>
            </div>
          </div>

          <ul className="space-y-2 text-sm text-gray-600">
            {[
              "Government-issued ID or passport",
              "A short selfie for facial matching",
              "Your details are never stored on Bazunk servers",
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4A5CE8] flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={startVerification}
            disabled={starting}
            className="flex items-center gap-2 px-6 py-3 bg-[#4A5CE8] hover:bg-[#3B4DD6] text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-60 w-full justify-center"
          >
            {starting ? (
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {starting ? "Starting verification…" : "Verify My Identity"}
          </button>

          <p className="text-xs text-gray-400 text-center">
            Powered by <span className="font-semibold text-gray-500">Didit</span> — GDPR compliant, ISO 27001 certified
          </p>
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: ShieldCheck, label: "Secure", desc: "Bank-grade encryption",    color: "text-[#4A5CE8]", bg: "bg-blue-50" },
          { icon: CheckCircle2, label: "Fast",   desc: "~2 min to complete",       color: "text-emerald-600", bg: "bg-emerald-50" },
          { icon: AlertTriangle, label: "Required", desc: "To publish listings",   color: "text-amber-600", bg: "bg-amber-50" },
        ].map(({ icon: Icon, label, desc, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl p-3 text-center`}>
            <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
            <p className="text-xs font-bold text-gray-700">{label}</p>
            <p className="text-xs text-gray-400">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── End Verification Section ────────────────────────────────────────────────

export function DashboardPage() {
  const { user, logout } = useAuth();
  const rawSettings = useRawSettings();
  const { items: watchlistItems, removeFromWatchlist, toggleAlert } = useWatchlist();
  const { addToCart } = useCart();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSectionRaw] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    let s = params.get("section");
    if (s === "payment") s = "seller-payouts"; // legacy redirect
    const allIds = SIDEBAR_CATEGORIES.flatMap(c => c.items.length ? c.items.map(i => i.id) : [c.id]);
    return s && allIds.includes(s) ? s : "overview";
  });
  const setActiveSection = (id: string) => {
    setActiveSectionRaw(id);
    setMobileExpandedCat(
      SIDEBAR_CATEGORIES.find(c => c.items.some(i => i.id === id))?.id ?? null
    );
  };
  const [myStoreOpen, setMyStoreOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [flyoutY, setFlyoutY] = useState(0);
  const [mobileExpandedCat, setMobileExpandedCat] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("section") ?? "overview";
    return SIDEBAR_CATEGORIES.find(c => c.items.some(i => i.id === s))?.id ?? null;
  });
  const categoryMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(e.target as Node)) {
        setActiveCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const [savedSearches, setSavedSearches] = useState(MOCK_SAVED_SEARCHES);
  const [notifs, setNotifs] = useState(MOCK_NOTIFICATIONS);
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileForm, setProfileForm] = useState(() => {
    try {
      const raw = user?.email ? localStorage.getItem(`sbd_profile_v1_${user.email}`) : null;
      const saved = raw ? JSON.parse(raw) : null;
      return { name: saved?.name ?? user?.name ?? "", email: user?.email ?? "", username: saved?.username ?? user?.username ?? "" };
    } catch { return { name: user?.name ?? "", email: user?.email ?? "", username: user?.username ?? "" }; }
  });
  const [savedProfile, setSavedProfile] = useState(() => {
    try {
      const raw = user?.email ? localStorage.getItem(`sbd_profile_v1_${user.email}`) : null;
      const saved = raw ? JSON.parse(raw) : null;
      return { name: saved?.name ?? user?.name ?? "", email: user?.email ?? "", username: saved?.username ?? user?.username ?? "" };
    } catch { return { name: user?.name ?? "", email: user?.email ?? "", username: user?.username ?? "" }; }
  });
  const [profileSaved, setProfileSaved] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-sm">
            <div className="w-20 h-20 rounded-full bg-[#3B4FD8]/10 flex items-center justify-center mx-auto mb-6">
              <User className="w-10 h-10 text-[#3B4FD8]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to access your Dashboard</h2>
            <p className="text-gray-500 text-sm mb-8">Manage your listings, orders, and account settings.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/login" className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#3B4FD8] to-[#1E3A8A] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md" data-testid="button-sign-in">
                Sign In
              </Link>
              <Link href="/register" className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors" data-testid="button-create-account">
                Create Account
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const initial = user.name.charAt(0).toUpperCase();

  function handleLogout() {
    logout();
    setLocation("/");
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Navbar />

      {/* Mobile sticky sub-header */}
      <div className="lg:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <button
          onClick={() => {
            setSidebarOpen(true);
            const activeCat = SIDEBAR_CATEGORIES.find(c =>
              c.id === activeSection || c.items.some(i => i.id === activeSection)
            );
            if (activeCat) setMobileExpandedCat(activeCat.id);
          }}
          className="flex items-center gap-2 text-gray-700 font-semibold text-sm"
        >
          <Menu className="w-5 h-5 text-gray-500" />
          <span>{SIDEBAR_CATEGORIES.flatMap(c => c.items.length ? c.items : [{ id: c.id, label: c.label }]).find(s => s.id === activeSection)?.label ?? "Dashboard"}</span>
        </button>
        <div className="flex items-center gap-2">
          <Link href="/credits" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B] text-white text-xs font-semibold">
            <Coins className="w-3.5 h-3.5" /> Credits
          </Link>
          <div className="w-8 h-8 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex container mx-auto px-4 py-6 gap-5 max-w-6xl">

        {/* Sidebar — fixed drawer on mobile, static on desktop */}
        <aside className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-72 lg:w-24 flex-shrink-0
          flex flex-col
          bg-gray-100 lg:bg-transparent
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Scrollable inner container */}
          <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col gap-3 pt-4 pb-8 px-4 lg:px-0 lg:pt-0 lg:pb-0 lg:overflow-visible">

            {/* Mobile close row */}
            <div className="lg:hidden flex items-center justify-between pb-1 flex-shrink-0">
              <span className="font-bold text-gray-900 text-sm">My Dashboard</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-gray-700 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col items-center text-center flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white font-bold text-2xl mb-3">
                {initial}
              </div>
              <p className="font-bold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-400 mt-0.5">{user.email}</p>
            </div>

            {/* Nav menu — icon rail + flyout (desktop only hint) */}
            <div className="hidden lg:flex items-center justify-end px-1 -mb-1">
              <div className="group relative">
                <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-500 text-[10px] font-bold flex items-center justify-center cursor-default select-none">?</span>
                <div className="absolute right-0 top-5 z-50 hidden group-hover:block w-52 bg-gray-900 text-white text-[11px] leading-snug rounded-xl px-3 py-2 shadow-lg pointer-events-none">
                  Click a menu icon to open options · click anywhere to close
                </div>
              </div>
            </div>

            {/* ── Mobile nav: accordion list (no flyout) ── */}
            <nav className="lg:hidden bg-white rounded-2xl border border-gray-100 overflow-hidden flex-shrink-0">
              {SIDEBAR_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = cat.items.length === 0
                  ? activeSection === cat.id
                  : cat.items.some(i => i.id === activeSection);
                const isExpanded = mobileExpandedCat === cat.id;

                if (cat.items.length === 0) {
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveSection(cat.id); setSidebarOpen(false); setMobileExpandedCat(null); }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-100 transition-colors ${isActive ? "bg-[#3B4FD8]/8" : "hover:bg-gray-50"}`}
                      data-testid={`cat-${cat.id}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cat.gradient}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`flex-1 text-sm font-semibold ${isActive ? "text-[#3B4FD8]" : "text-gray-800"}`}>{cat.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 text-[#3B4FD8]" />}
                    </button>
                  );
                }

                return (
                  <div key={cat.id} className="border-b border-gray-100 last:border-0">
                    <button
                      onClick={() => setMobileExpandedCat(isExpanded ? null : cat.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors ${isActive ? "bg-[#3B4FD8]/5" : "hover:bg-gray-50"}`}
                      data-testid={`cat-${cat.id}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${cat.gradient}`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`flex-1 text-sm font-semibold ${isActive ? "text-[#3B4FD8]" : "text-gray-800"}`}>{cat.label}</span>
                      {isActive && !isExpanded && <span className="w-2 h-2 rounded-full bg-[#3B4FD8] mr-1 flex-shrink-0" />}
                      <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                    {isExpanded && (
                      <div className="bg-gray-50/80 border-t border-gray-100">
                        {cat.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isItemActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.id === "my-store") { setMyStoreOpen(true); setSidebarOpen(false); setMobileExpandedCat(null); return; }
                                setActiveSection(item.id);
                                setSidebarOpen(false);
                                setMobileExpandedCat(null);
                              }}
                              className={`w-full flex items-center gap-3 pl-6 pr-4 py-3 text-left border-b border-gray-100 last:border-0 transition-colors ${isItemActive ? "bg-white" : "hover:bg-white/60"}`}
                              data-testid={`sidebar-${item.id}`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${item.iconBg}`}>
                                <ItemIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className={`flex-1 text-sm ${isItemActive ? "font-semibold text-[#3B4FD8]" : "text-gray-600"}`}>{item.label}</span>
                              {isItemActive && <ChevronRight className="w-3.5 h-3.5 text-[#3B4FD8] flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-red-50 transition-colors border-t border-gray-100"
                data-testid="button-logout"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50">
                  <LogOut className="w-4 h-4 text-red-400" />
                </div>
                <span className="text-sm font-semibold text-red-500">Sign Out</span>
              </button>
            </nav>

            {/* ── Desktop nav: icon rail + flyout ── */}
            <nav
              className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-visible flex-shrink-0 relative"
              ref={categoryMenuRef}
            >
              {/* Icon rail */}
              <div className="flex flex-col py-2">
                {SIDEBAR_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = cat.items.length === 0
                    ? activeSection === cat.id
                    : cat.items.some(i => i.id === activeSection);
                  const isOpen = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => {
                        if (cat.items.length === 0) {
                          setActiveSection(cat.id);
                          setActiveCategory(null);
                          setSidebarOpen(false);
                        } else {
                          const y = (e.currentTarget as HTMLElement).offsetTop;
                          setFlyoutY(y);
                          setActiveCategory(isOpen ? null : cat.id);
                        }
                      }}
                      className="group relative flex flex-col items-center gap-1 px-2 py-2.5 w-full transition-all"
                      title={cat.label}
                      data-testid={`cat-${cat.id}`}
                    >
                      {(isActive || isOpen) && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#3B4FD8] rounded-r-full" />
                      )}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-sm bg-gradient-to-br ${cat.gradient} ${
                        isActive || isOpen ? "scale-110 shadow-md ring-2 ring-offset-1 ring-white" : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                      }`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <span className={`text-[9px] font-bold tracking-wide leading-tight ${
                        isActive || isOpen ? "text-gray-900" : "text-gray-400 group-hover:text-gray-600"
                      }`}>{cat.label}</span>
                    </button>
                  );
                })}
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="group flex flex-col items-center gap-1 px-2 py-2.5 w-full border-t border-gray-100 mt-1 transition-all"
                  title="Sign Out"
                  data-testid="button-logout"
                >
                  <div className="w-11 h-11 rounded-xl bg-red-50 group-hover:bg-red-500 flex items-center justify-center transition-all">
                    <LogOut className="w-5 h-5 text-red-400 group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 group-hover:text-red-400 tracking-wide transition-colors">Sign Out</span>
                </button>
              </div>

              {/* Flyout panel */}
              <AnimatePresence>
                {activeCategory && (() => {
                  const cat = SIDEBAR_CATEGORIES.find(c => c.id === activeCategory);
                  if (!cat || cat.items.length === 0) return null;
                  return (
                    <motion.div
                      key={activeCategory}
                      initial={{ opacity: 0, x: -8, scale: 0.97 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -8, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-full ml-2 w-52 bg-white rounded-2xl border border-gray-100 shadow-xl z-50 overflow-hidden"
                      style={{ top: flyoutY }}
                    >
                      <div className={`px-4 py-3 bg-gradient-to-r ${cat.gradient} flex items-center gap-2`}>
                        <cat.icon className="w-4 h-4 text-white/80" />
                        <span className="text-sm font-bold text-white">{cat.label}</span>
                      </div>
                      <div className="py-1.5">
                        {cat.items.map((item) => {
                          const ItemIcon = item.icon;
                          const isItemActive = activeSection === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                if (item.id === "my-store") { setMyStoreOpen(true); setActiveCategory(null); setSidebarOpen(false); return; }
                                setActiveSection(item.id);
                                setActiveCategory(null);
                                setSidebarOpen(false);
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left ${
                                isItemActive
                                  ? "bg-[#3B4FD8]/8 text-[#3B4FD8] font-semibold"
                                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                              }`}
                              data-testid={`sidebar-${item.id}`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm ${item.iconBg}`}>
                                <ItemIcon className="w-3.5 h-3.5 text-white" />
                              </div>
                              <span className="flex-1">{item.label}</span>
                              {isItemActive && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </nav>

          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="h-full"
          >
            {activeSection === "overview" && <OverviewContent user={user} onNavigate={setActiveSection} />}
            {activeSection === "notifications" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Notifications</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{notifs.filter(n => n.unread).length} unread</p>
                  </div>
                  {notifs.some(n => n.unread) && (
                    <button
                      onClick={() => setNotifs(prev => prev.map(n => ({ ...n, unread: false })))}
                      className="text-xs text-[#4A5CE8] font-semibold hover:underline"
                      data-testid="button-mark-all-read"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                      <Bell className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">No notifications</p>
                    <p className="text-sm text-gray-400">We'll notify you about price drops, messages, and order updates</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {notifs.map((n) => {
                      const Icon = n.icon;
                      return (
                        <div
                          key={n.id}
                          className={`flex items-start gap-3 px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${n.unread ? "bg-blue-50/30" : ""}`}
                          onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x))}
                        >
                          <div className={`w-9 h-9 rounded-full ${n.iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                            <Icon className={`w-4 h-4 ${n.iconColor}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`text-sm ${n.unread ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>{n.title}</p>
                              <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">{n.time}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{n.desc}</p>
                          </div>
                          {n.unread && <div className="w-2 h-2 rounded-full bg-[#4A5CE8] flex-shrink-0 mt-2" />}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {activeSection === "orders" && <OrdersSection />}
            {activeSection === "sales" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100">
                  <h2 className="font-bold text-gray-900">Sales</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{MOCK_SALES.length} sales · £{MOCK_SALES.reduce((s, x) => s + x.price - x.fee, 0).toFixed(2)} net earned</p>
                </div>
                {MOCK_SALES.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                      <TrendingUp className="w-8 h-8 text-gray-200" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">No sales yet</p>
                    <p className="text-sm text-gray-400 mb-5">List your first item to start selling</p>
                    <Link href="/sell/quick" className="px-6 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                      Create a Listing
                    </Link>
                    {/* Platform fee rates reference */}
                    <div className="mt-8 w-full max-w-lg text-left">
                      <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                          <Percent className="w-4 h-4 text-[#4A5CE8]" />
                          <p className="text-sm font-bold text-gray-800">Platform Fee Rates</p>
                          <span className="ml-auto text-xs text-gray-400">Deducted from sale price on completion</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {[
                            { name: "Electronics", slug: "electronics", def: "10" },
                            { name: "Phones & Tablets", slug: "cell-phones", def: "10" },
                            { name: "Fashion & Clothing", slug: "clothing-shoes-jewelry", def: "12" },
                            { name: "Automotive", slug: "automotive", def: "5" },
                            { name: "Home & Garden", slug: "home-garden", def: "10" },
                            { name: "Sports & Outdoors", slug: "sports-outdoors", def: "10" },
                            { name: "Books", slug: "books", def: "12" },
                            { name: "Beauty & Personal Care", slug: "beauty-personal-care", def: "12" },
                            { name: "Baby Products", slug: "baby-products", def: "10" },
                            { name: "Appliances", slug: "appliances", def: "8" },
                            { name: "All other categories", slug: "default", def: "10" },
                          ].map(cat => {
                            const rate = rawSettings[`fee_rate_${cat.slug}`] ?? rawSettings["fee_rate_default"] ?? cat.def;
                            return (
                              <div key={cat.slug} className="flex items-center justify-between px-4 py-2 text-sm">
                                <span className="text-gray-600">{cat.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-gray-900">{rate}%</span>
                                  <span className="text-xs text-gray-400">e.g. £{(100 * parseFloat(rate) / 100).toFixed(2)} on £100</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="px-4 py-2.5 bg-emerald-50 border-t border-emerald-100">
                          <p className="text-xs text-emerald-700 font-semibold">Listing is free — fees only apply when your item sells</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-50">
                      {MOCK_SALES.map((sale) => (
                        <div key={sale.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                            <img src={sale.image} alt={sale.title} className="w-full h-full object-contain p-1.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{sale.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Buyer: {sale.buyer} · {sale.date}</p>
                            <p className="text-xs text-gray-400">{sale.id} · Fee: £{sale.fee.toFixed(2)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-gray-900 text-sm">£{sale.price.toFixed(2)}</p>
                            <p className="text-xs text-emerald-600 font-semibold">+£{(sale.price - sale.fee).toFixed(2)} net</p>
                            <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${sale.statusColor}`}>{sale.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Total earnings (after fees)</span>
                        <span className="font-black text-gray-900">£{MOCK_SALES.reduce((s, x) => s + x.price - x.fee, 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeSection === "watchlist" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Watchlist</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{watchlistItems.length} saved item{watchlistItems.length !== 1 ? "s" : ""}{watchlistItems.filter(i => getCurrentPrice(i.product) < i.priceAtAdd).length > 0 ? ` · ${watchlistItems.filter(i => getCurrentPrice(i.product) < i.priceAtAdd).length} price drop${watchlistItems.filter(i => getCurrentPrice(i.product) < i.priceAtAdd).length !== 1 ? "s" : ""}` : ""}</p>
                  </div>
                  <Link href="/browse" className="flex items-center gap-1.5 text-xs text-[#4A5CE8] font-semibold hover:underline">
                    <Plus className="w-3.5 h-3.5" /> Add Items
                  </Link>
                </div>

                {watchlistItems.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-16 text-center px-6">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                      <Heart className="w-8 h-8 text-red-200" />
                    </div>
                    <p className="font-semibold text-gray-700 mb-1">Your watchlist is empty</p>
                    <p className="text-sm text-gray-400 mb-5">Save items from any listing to track prices and get alerts</p>
                    <Link href="/browse" className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                      Browse Listings
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {watchlistItems.map((item) => {
                      const currentPrice = getCurrentPrice(item.product);
                      const hasDrop = currentPrice < item.priceAtAdd;
                      const saving = item.priceAtAdd - currentPrice;
                      return (
                        <div key={item.product.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                          {/* Image */}
                          <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
                            <img src={item.product.image} alt={item.product.title} className="w-full h-full object-contain p-1.5" />
                          </div>
                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 line-clamp-1">{item.product.title}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="flex items-baseline gap-1.5">
                                <span className={`font-bold text-base ${hasDrop ? "text-emerald-600" : "text-gray-900"}`}>
                                  £{currentPrice.toFixed(2)}
                                </span>
                                {hasDrop && (
                                  <span className="text-xs text-gray-400 line-through">£{item.priceAtAdd.toFixed(2)}</span>
                                )}
                              </div>
                              {hasDrop && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  <TrendingDown className="w-3 h-3" /> −£{saving.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Saved {new Date(item.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              {" · "}{item.product.location}
                            </p>
                          </div>
                          {/* Actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => addToCart(item.product, 1)}
                                className="px-3 py-1.5 rounded-lg bg-[#F26B21] text-white text-xs font-bold hover:opacity-90 transition-opacity"
                                title="Add to cart"
                              >
                                Add to Cart
                              </button>
                              <Link
                                href={`/listing/${'publicId' in item.product && item.product.publicId ? item.product.publicId as string : item.product.id}`}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#4A5CE8] hover:border-[#4A5CE8] transition-colors"
                                title="View listing"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => toggleAlert(item.product.id)}
                                className={`p-1.5 rounded-lg border transition-colors ${item.alertEnabled ? "border-amber-200 text-amber-500 bg-amber-50" : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                                title={item.alertEnabled ? "Price alerts on" : "Price alerts off"}
                              >
                                {item.alertEnabled ? <BellIcon className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => removeFromWatchlist(item.product.id)}
                                className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400 transition-colors"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {hasDrop && item.alertEnabled && (
                              <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                                <BellIcon className="w-3 h-3" /> Price drop alert sent
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {watchlistItems.length > 0 && (
                  <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                    <p className="text-xs text-gray-400 flex items-center gap-1.5">
                      <BellIcon className="w-3.5 h-3.5 text-amber-500" />
                      Price alerts are active for {watchlistItems.filter(i => i.alertEnabled).length} item{watchlistItems.filter(i => i.alertEnabled).length !== 1 ? "s" : ""}. We'll notify you when prices drop.
                    </p>
                  </div>
                )}
              </div>
            )}
            {activeSection === "saved-searches" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Saved Searches</h2>
                    <p className="text-xs text-gray-400 mt-0.5">{savedSearches.length} saved · {savedSearches.filter(s => s.alert).length} with alerts</p>
                  </div>
                  <Link href="/browse" className="flex items-center gap-1.5 text-xs text-[#4A5CE8] font-semibold hover:underline">
                    <Plus className="w-3.5 h-3.5" /> New Search
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {savedSearches.length === 0 ? (
                    <div className="py-14 text-center text-gray-400">
                      <Search className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                      <p className="text-sm font-medium">No saved searches</p>
                      <Link href="/browse" className="mt-3 inline-flex items-center gap-1 text-xs text-[#4A5CE8] font-semibold hover:underline">
                        <Plus className="w-3 h-3" /> Start a search
                      </Link>
                    </div>
                  ) : savedSearches.map((s) => (
                    <div key={s.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center flex-shrink-0">
                        <Search className="w-4 h-4 text-[#4A5CE8]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900">{s.query}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.filters}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Last run {s.lastRun} · <span className="font-semibold text-[#4A5CE8]">{s.count} results</span></p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.alert ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-400"}`}>
                          {s.alert ? "🔔 Alert on" : "Alert off"}
                        </span>
                        <Link href="/browse" className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-[#4A5CE8] hover:border-[#4A5CE8] transition-colors" title="Run search">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => setSavedSearches(prev => prev.filter(x => x.id !== s.id))}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-300 hover:text-red-400 hover:border-red-200 transition-colors"
                          title="Delete saved search"
                          data-testid={`button-delete-saved-search-${s.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {activeSection === "messages" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Messages</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {MOCK_CONVERSATIONS.reduce((s, c) => s + c.unread, 0)} unread · {MOCK_CONVERSATIONS.length} conversations
                    </p>
                  </div>
                  <Link href="/messages" className="flex items-center gap-1.5 text-xs text-[#4A5CE8] font-semibold hover:underline">
                    Open Inbox <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="divide-y divide-gray-50">
                  {MOCK_CONVERSATIONS.map((convo) => {
                    const last = convo.messages[convo.messages.length - 1];
                    const initials = convo.with.avatar;
                    const avatarColors: Record<string, string> = {
                      MD: "bg-blue-500", SM: "bg-emerald-500", PK: "bg-purple-500",
                      JT: "bg-amber-500", TA: "bg-[#4A5CE8]",
                    };
                    const color = avatarColors[initials] ?? "bg-gray-400";
                    return (
                      <Link
                        key={convo.id}
                        href="/messages"
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors"
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white text-sm font-bold`}>
                            {initials}
                          </div>
                          {convo.unread > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F26B21] text-white text-[9px] font-bold flex items-center justify-center">
                              {convo.unread}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className={`text-sm ${convo.unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
                              {convo.with.name}
                            </p>
                            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                              {new Date(last.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#F26B21] font-medium truncate mb-0.5">{convo.listingTitle}</p>
                          <p className={`text-xs truncate ${convo.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
                            {last.senderId === "me" ? "You: " : ""}{last.text}
                          </p>
                        </div>
                        {last.senderId === "me" && (
                          <div className="flex-shrink-0">
                            {last.read
                              ? <CheckCheck className="w-3.5 h-3.5 text-[#4A5CE8]" />
                              : <Check className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
                <div className="p-4 border-t border-gray-100">
                  <Link
                    href="/messages"
                    className="w-full py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <MessageSquare className="w-4 h-4" /> Open Full Inbox
                  </Link>
                </div>
              </div>
            )}
            {activeSection === "credits" && <CreditsSection user={user} />}
            {activeSection === "promotions" && (
              <div className="bg-white rounded-2xl border border-gray-100 flex flex-col" style={{ minHeight: 400 }}>
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-gray-900">Promotions</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Credits available: <span className="font-semibold text-gray-700">£{user.balance.toFixed(2)}</span></p>
                  </div>
                  <Link href="/promotions" className="text-xs text-[#4A5CE8] font-semibold hover:underline">View all tools →</Link>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  {([
                    { id: "move-to-top",           title: "Move to Top",            desc: "Push your listing to the top of search results",                       credits: 199, days: 3,  Icon: ArrowUp,      bg: "bg-blue-50",    color: "text-blue-500"    },
                    { id: "featured-badge",        title: "Featured Badge",         desc: "Gold badge + premium placement in browse",                             credits: 299, days: 7,  Icon: Star,         bg: "bg-yellow-50",  color: "text-yellow-500", popular: true },
                    { id: "homepage-spotlight",    title: "Homepage Spotlight",     desc: "Feature your listing in the homepage spotlight carousel",               credits: 499, days: 7,  Icon: HomeIcon,     bg: "bg-purple-50",  color: "text-purple-500"  },
                    { id: "visibility-boost",      title: "Visibility Boost",       desc: "Higher ranking across all relevant search pages",                      credits: 349, days: 5,  Icon: Eye,          bg: "bg-emerald-50", color: "text-emerald-500" },
                    { id: "premium-placement",     title: "Premium Placement",      desc: "Top-3 placement across category and search pages",                     credits: 599, days: 10, Icon: Crown,        bg: "bg-pink-50",    color: "text-pink-500"    },
                    { id: "urgent-badge",          title: "Urgent Badge",           desc: "Attract immediate buyer attention with an urgent label",                credits: 149, days: 3,  Icon: Clock,        bg: "bg-orange-50",  color: "text-orange-500"  },
                    { id: "related-listings-5d",   title: "Related Listings",       desc: "Appear in the featured sidebar on related category listing pages",      credits: 249, days: 5,  Icon: Users,        bg: "bg-indigo-50",  color: "text-indigo-500"  },
                    { id: "newsletter-feature",    title: "Newsletter Feature",     desc: "Your listing featured in our weekly newsletter and blog posts",         credits: 299, days: 7,  Icon: Send,         bg: "bg-violet-50",  color: "text-violet-500"  },
                    { id: "badge-new-listing",     title: "Hot Seller Badge",       desc: "Add a 'Hot Seller' badge to stand out in browse and search results",          credits: 99, days: 30, Icon: Flame, bg: "bg-orange-50",  color: "text-orange-500"  },
                    { id: "engagement-boost",      title: "Engagement Tools",       desc: "Enable 'Ask a Question', 'Schedule a Visit' and contact features",     credits: 179, days: 14, Icon: MessageSquare, bg: "bg-cyan-50",    color: "text-cyan-500"    },
                  ] as { id: string; title: string; desc: string; credits: number; days: number; Icon: React.ElementType; bg: string; color: string; popular?: boolean }[]).map((p) => (
                    <Link key={p.id} href={`/promotions#${p.id}`}
                      className="relative rounded-2xl border border-gray-100 p-4 hover:border-[#4A5CE8]/30 hover:shadow-sm transition-all flex flex-col gap-3 group"
                    >
                      {p.popular && (
                        <span className="absolute top-3 right-3 text-[9px] font-bold bg-[#F26B21] text-white px-2 py-0.5 rounded-full">Popular</span>
                      )}
                      <div className={`w-9 h-9 rounded-xl ${p.bg} flex items-center justify-center`}>
                        <p.Icon className={`w-4.5 h-4.5 ${p.color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{p.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{p.desc}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">{p.credits} credits <span className="font-normal text-gray-400">/ {p.days}d</span></span>
                        <span className="text-xs text-[#4A5CE8] font-semibold group-hover:underline">Apply →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {activeSection === "profile" && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ minHeight: 400 }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-gray-900">Profile</h2>
                  {!profileEdit ? (
                    <div className="flex items-center gap-3">
                      {profileSaved && (
                        <motion.span
                          initial={{ opacity: 0, x: 6 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="text-xs text-emerald-600 font-semibold flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" /> Saved
                        </motion.span>
                      )}
                      <button
                        onClick={() => { setProfileForm({ ...savedProfile }); setProfileEdit(true); setProfileSaved(false); }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                        data-testid="button-edit-profile"
                      >
                        <Pencil className="w-3.5 h-3.5" /> Edit Profile
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setProfileEdit(false)}
                        className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-sm font-semibold hover:border-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const updated = { ...profileForm };
                          setSavedProfile(updated);
                          // Always use the actual Clerk email (not the form email) for DB cascade
                          const clerkEmail = user?.email || "";
                          const displayName = updated.name.trim() || savedProfile.name;
                          if (clerkEmail) {
                            try { localStorage.setItem(`sbd_profile_v1_${clerkEmail}`, JSON.stringify({ name: displayName, username: updated.username })); } catch {}
                            if (displayName || updated.username) {
                              try {
                                await fetch("/api/listings/seller-name", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: clerkEmail, name: displayName || undefined, username: updated.username || undefined }),
                                });
                              } catch {}
                            }
                          }
                          setProfileEdit(false);
                          setProfileSaved(true);
                          setTimeout(() => setProfileSaved(false), 3000);
                        }}
                        className="px-4 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        data-testid="button-save-profile"
                      >
                        <Check className="w-3.5 h-3.5" /> Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {/* Avatar row */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-[#3B4FD8] flex items-center justify-center text-white text-2xl font-bold">
                      {(profileEdit ? profileForm.name : savedProfile.name).charAt(0).toUpperCase()}
                    </div>
                    {profileEdit && (
                      <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#4A5CE8] text-white flex items-center justify-center border-2 border-white hover:bg-[#3A4CC8] transition-colors">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{profileEdit ? profileForm.name || savedProfile.name : savedProfile.name}</p>
                    <p className="text-sm text-gray-500">{profileEdit ? profileForm.email || savedProfile.email : savedProfile.email}</p>
                  </div>
                </div>

                {/* Fields */}
                <div className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                    {profileEdit ? (
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900 font-medium focus:outline-none focus:border-[#4A5CE8] focus:ring-2 focus:ring-[#4A5CE8]/10 transition-colors"
                        placeholder="Your full name"
                        data-testid="input-profile-name"
                      />
                    ) : (
                      <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-900 font-medium">{savedProfile.name}</div>
                    )}
                  </div>

                  {/* Email — always read-only; managed by your sign-in provider */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email Address</label>
                    <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-900 font-medium">{savedProfile.email}</div>
                    {profileEdit && (
                      <p className="text-xs text-gray-400 mt-1">Email is managed by your sign-in account and cannot be changed here.</p>
                    )}
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Username</label>
                    {profileEdit ? (
                      <div className="flex rounded-xl border border-gray-200 overflow-hidden focus-within:border-[#4A5CE8] focus-within:ring-2 focus-within:ring-[#4A5CE8]/10 transition-colors">
                        <span className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-sm text-gray-400 font-medium select-none">@</span>
                        <input
                          type="text"
                          value={profileForm.username}
                          onChange={e => setProfileForm(f => ({ ...f, username: e.target.value.replace(/\s/g, "") }))}
                          className="flex-1 px-3 py-2.5 text-sm text-gray-900 font-medium focus:outline-none bg-white"
                          placeholder="username"
                          data-testid="input-profile-username"
                        />
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-900 font-medium">@{savedProfile.username}</div>
                    )}
                  </div>

                  {/* Member since — always read-only */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Member Since</label>
                    <div className="px-4 py-2.5 rounded-xl bg-gray-50 text-sm text-gray-400 font-medium">January 2024</div>
                  </div>
                </div>

              </div>
            )}
            {activeSection === "security" && <SecuritySection />}
            {activeSection === "verification" && <VerificationSection userEmail={user?.email ?? ""} />}
            {activeSection === "addresses" && <AddressesSection />}
            {activeSection === "seller-payouts" && <PaymentSection defaultTab="payouts" />}
            {activeSection === "payment-cards" && <PaymentSection defaultTab="cards" />}
            {activeSection === "auto-accept" && <AutoAcceptSection />}
            {activeSection === "offers" && <OffersSection />}
            {activeSection === "go-live" && <GoLiveSection />}
            {activeSection === "buyer-protection" && <BuyerProtectionDashSection />}
            {activeSection === "disputes" && <DisputesSection />}
            {activeSection === "returns" && <ReturnsSection />}
            {activeSection === "my-listings" && <MyListingsSection userEmail={user.email} />}
            {activeSection === "my-auctions" && <MyAuctionsSection />}
            {activeSection === "my-bids" && <MyBidsSection />}
            {activeSection === "my-flash-sales" && <MyFlashSalesSection />}
            {activeSection === "importer" && <ImporterSection />}
            {activeSection === "aliexpress-import" && <ImporterSection />}
            {activeSection === "amazon-import" && <UserAmazonImporterSection />}
            {activeSection === "ebay-import" && <UserEbayImporterSection />}
            {activeSection === "classifieds-import" && <UserClassifiedsImporterSection />}
            {activeSection === "support-tickets" && <SupportTicketsSection user={user} />}
          </motion.div>
        </main>
      </div>

      {/* ── My Store Full-Screen Overlay ── */}
      <AnimatePresence>
        {myStoreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setMyStoreOpen(false)}
            />

            {/* Floating modal — inset so the dashboard still peeks behind */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 24 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed inset-3 md:inset-6 lg:inset-10 bg-gray-100 rounded-3xl z-50 shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#F26B21] flex items-center justify-center shadow-sm">
                    <Store className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 text-base leading-tight">My Store</p>
                    <p className="text-xs text-gray-400 mt-0.5">Manage, edit and preview your store</p>
                  </div>
                </div>
                <button
                  onClick={() => setMyStoreOpen(false)}
                  className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable body — MyStoreSection fills it */}
              <div className="flex-1 overflow-y-auto">
                <MyStoreSection
                  onNavigate={(s) => { setMyStoreOpen(false); setActiveSection(s); }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

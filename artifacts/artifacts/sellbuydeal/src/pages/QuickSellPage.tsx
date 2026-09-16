import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { COUNTRY_STORAGE_KEY } from "@/components/CountrySetupModal";
import { countryToCurrency } from "@/context/CurrencyContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Truck,
  Zap,
  Package,
  Mail,
  ShoppingBag,
  Tag,
  Leaf,
  Star,
  CheckCircle2,
  Eye,
  Video,
  Upload,
  Save,
  Bell,
  ChevronDown,
  AlertCircle,
  Plus,
  X,
  Palette,
  Ruler,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CATEGORIES } from "@/data/categories";

const CONDITIONS = [
  { id: "brand-new", label: "Brand New", desc: "Never used, in original packaging", icon: Tag },
  { id: "like-new", label: "Like New", desc: "Used once or twice, excellent condition", icon: Star },
  { id: "good", label: "Good", desc: "Used but well maintained", icon: CheckCircle2 },
  { id: "fair", label: "Fair", desc: "Shows wear but fully functional", icon: Eye },
  { id: "poor", label: "Poor", desc: "Significant wear, may need repair", icon: Package },
];

const SHIP_ORIGINS = [
  { id: "UK",    label: "UK",    flag: "🇬🇧" },
  { id: "US",    label: "US",    flag: "🇺🇸" },
  { id: "EU",    label: "EU",    flag: "🇪🇺" },
  { id: "China", label: "China", flag: "🇨🇳" },
  { id: "Other", label: "Other", flag: "🌍" },
];

const SHIP_ZONES: Record<string, { id: string; label: string; desc: string }[]> = {
  UK: [
    { id: "domestic",  label: "UK Only",        desc: "Ship within the United Kingdom" },
    { id: "eu",        label: "UK & EU",         desc: "UK and European Union countries" },
    { id: "worldwide", label: "Worldwide",       desc: "Ship internationally" },
  ],
  US: [
    { id: "domestic",      label: "US Only",       desc: "Ship within the United States" },
    { id: "north-america", label: "North America",  desc: "US, Canada and Mexico" },
    { id: "worldwide",     label: "Worldwide",      desc: "Ship internationally" },
  ],
  EU: [
    { id: "eu-only",   label: "EU Only",       desc: "Ship within the European Union" },
    { id: "europe",    label: "All Europe",     desc: "EU + Norway, Switzerland, UK etc." },
    { id: "worldwide", label: "Worldwide",      desc: "Ship internationally" },
  ],
  China: [
    { id: "asia",      label: "Asia Pacific",  desc: "East & Southeast Asia" },
    { id: "worldwide", label: "Worldwide",      desc: "Ship internationally" },
  ],
  Other: [
    { id: "domestic",  label: "Locally Only",  desc: "Ship within my country" },
    { id: "worldwide", label: "Worldwide",      desc: "Ship internationally" },
  ],
};

const CARRIERS: Record<string, { id: string; label: string; desc: string; color: string; eta: string }[]> = {
  UK: [
    { id: "royal-mail",  label: "Royal Mail",    desc: "Tracked 24/48 · 11,500+ Post Offices", color: "#CC0000", eta: "1–2 days" },
    { id: "evri",        label: "Evri",           desc: "Budget-friendly · from £2.49",          color: "#9B1FAE", eta: "2–3 days" },
    { id: "dpd",         label: "DPD",            desc: "Next-day · real-time tracking",          color: "#DC0032", eta: "Next day" },
    { id: "parcelforce", label: "Parcelforce",    desc: "Express UK-wide delivery",               color: "#E7600E", eta: "1–2 days" },
    { id: "dhl",         label: "DHL",            desc: "International express",                  color: "#D4A017", eta: "1–3 days" },
    { id: "inpost",      label: "InPost Locker",  desc: "4,500+ 24/7 smart lockers · QR drop-off", color: "#FFD100", eta: "Next day" },
  ],
  US: [
    { id: "usps",         label: "USPS",               desc: "United States Postal Service",           color: "#004B87", eta: "1–5 days" },
    { id: "ups",          label: "UPS",                 desc: "United Parcel Service",                  color: "#FFB500", eta: "1–5 days" },
    { id: "fedex",        label: "FedEx",               desc: "Federal Express",                        color: "#FF6600", eta: "1–5 days" },
    { id: "dhl",          label: "DHL",                 desc: "International express",                  color: "#D4A017", eta: "1–3 days" },
    { id: "usps-priority",label: "USPS Priority Mail",  desc: "1–3 business days",                      color: "#004B87", eta: "1–3 days" },
  ],
  EU: [
    { id: "dhl",      label: "DHL",        desc: "Pan-European express delivery",           color: "#D4A017", eta: "1–3 days" },
    { id: "dpd",      label: "DPD",        desc: "Cross-border parcel delivery",            color: "#DC0032", eta: "2–4 days" },
    { id: "gls",      label: "GLS",        desc: "General Logistics Systems · 40+ countries", color: "#0057A8", eta: "2–5 days" },
    { id: "postnl",   label: "PostNL",     desc: "Netherlands · pan-European",              color: "#F26522", eta: "2–4 days" },
    { id: "fedex",    label: "FedEx",      desc: "International express",                   color: "#FF6600", eta: "1–3 days" },
    { id: "ups",      label: "UPS",        desc: "United Parcel Service",                   color: "#FFB500", eta: "2–4 days" },
  ],
  China: [
    { id: "dhl",         label: "DHL",          desc: "International express shipping",         color: "#D4A017", eta: "3–7 days" },
    { id: "epacket",     label: "ePacket",       desc: "China Post ePacket · tracked",           color: "#CC0000", eta: "7–20 days" },
    { id: "china-post",  label: "China Post",    desc: "State postal service · economy",         color: "#CC0000", eta: "10–30 days" },
    { id: "sf-express",  label: "SF Express",    desc: "Premium courier · fast delivery",        color: "#ED1C24", eta: "3–7 days" },
    { id: "ems",         label: "EMS",           desc: "Express Mail Service · international",   color: "#00A651", eta: "5–10 days" },
    { id: "yanwen",      label: "Yanwen",        desc: "Economy international shipping",         color: "#1F5DA0", eta: "10–20 days" },
  ],
  Other: [
    { id: "dhl",        label: "DHL",              desc: "International express delivery", color: "#D4A017", eta: "3–7 days" },
    { id: "fedex",      label: "FedEx",            desc: "International express",          color: "#FF6600", eta: "3–5 days" },
    { id: "ups",        label: "UPS",              desc: "United Parcel Service",          color: "#FFB500", eta: "3–5 days" },
    { id: "local-post", label: "Local Post Office",desc: "National postal service",        color: "#4A5CE8", eta: "Varies" },
  ],
};

const CURRENCIES = ["£ GBP", "$ USD", "€ EUR", "A$ AUD", "C$ CAD", "NZ$ NZD", "Fr CHF"];

const CURRENCY_DISPLAY: Record<string, string> = {
  GBP: "£ GBP", USD: "$ USD", EUR: "€ EUR",
  AUD: "A$ AUD", CAD: "C$ CAD", NZD: "NZ$ NZD", CHF: "Fr CHF",
};

function extractCurrencyCode(display: string): string {
  return display.match(/[A-Z]{3}$/)?.[0] ?? "GBP";
}

export function QuickSellPage() {
  interface BuilderOption { label: string; hex: string; qty: number; }
  interface BuilderVariant { type: "size" | "colour"; options: BuilderOption[]; newLabel: string; newHex: string; newQty: string; }

  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [currency, setCurrency] = useState("£ GBP");
  const [variantGroups, setVariantGroups] = useState<BuilderVariant[]>([]);
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [extraCategories, setExtraCategories] = useState<{ category: string; subcategory: string }[]>([]);
  const [addingExtraCat, setAddingExtraCat] = useState(false);
  const [newExtraCatTop, setNewExtraCatTop] = useState("");
  const [newExtraCatSub, setNewExtraCatSub] = useState("");
  const [description, setDescription] = useState("");
  const [ecoFriendly, setEcoFriendly] = useState(false);
  const [condition, setCondition] = useState("brand-new");
  const [photos, setPhotos] = useState<string[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [shipOrigin, setShipOrigin] = useState("UK");
  const [countryOther, setCountryOther] = useState("");
  const [shipZone, setShipZone] = useState("domestic");
  const [carrier, setCarrier] = useState("royal-mail");
  const [shippingPrice, setShippingPrice] = useState("");
  const [handlingCharge, setHandlingCharge] = useState("");
  const [tags, setTags] = useState("");
  const [specifications, setSpecifications] = useState<{ key: string; value: string }[]>([]);
  const [newSpecKey, setNewSpecKey] = useState("");
  const [newSpecValue, setNewSpecValue] = useState("");
  const [premiumVideo, setPremiumVideo] = useState(false);
  const [published, setPublished] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [, setLocation] = useLocation();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user?.email) return;
    try {
      const stored = localStorage.getItem(COUNTRY_STORAGE_KEY(user.email));
      if (stored && stored !== "SKIP") {
        const code = countryToCurrency(stored === "OTHER" ? "US" : stored);
        setCurrency(CURRENCY_DISPLAY[code] ?? "£ GBP");
      }
    } catch { /* ignore */ }
  }, [user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 10 - photos.length;
    const toRead = files.slice(0, remaining);
    Promise.all(
      toRead.map(
        (f) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target?.result as string);
            reader.readAsDataURL(f);
          })
      )
    ).then((dataUrls) => setPhotos((p) => [...p, ...dataUrls]));
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!price || parseFloat(price) <= 0) errors.push("Price must be greater than 0");
    if (!category) errors.push("Category is required");
    if (!description.trim()) errors.push("Description is required");

    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setValidationErrors([]);
    setPublishError(null);
    setPublishing(true);

    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          price,
          currency: extractCurrencyCode(currency),
          category,
          subcategory: subcategory || undefined,
          extra_categories: extraCategories.length ? extraCategories : undefined,
          description: description.trim(),
          condition,
          image: photos[0] ?? null,
          sellerEmail: user?.email ?? "guest",
          sellerName: user?.name ?? null,
          sellerUsername: user?.username ?? null,
          tags: tags.trim() || undefined,
          specifications: specifications.length > 0 ? specifications : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Failed to publish");
      }
      setPublished(true);
      setTimeout(() => setLocation("/dashboard"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to publish listing";
      setPublishError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setPublishing(false);
    }
  }

  function handleSaveDraft() {
    if (!title.trim() && !price && !description.trim() && !category) {
      setValidationErrors(["Fill in at least a title or description before saving a draft"]);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 3000);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <form onSubmit={handlePublish} noValidate>

          {/* Header card */}
          <div className="rounded-t-2xl bg-gradient-to-r from-[#3B4FD8] to-[#1E3A8A] px-7 py-7 mb-0">
            <h1 className="text-2xl font-bold text-white">Create Your Listing</h1>
            <p className="text-blue-200 text-sm mt-1">Fill in the details below to list your item</p>
          </div>

          {/* Basic Information */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-5">Basic Information</h2>

            {/* Title */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., iPhone 14 Pro Max - 256GB Space Black"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                data-testid="input-listing-title"
              />
            </div>

            {/* Currency & Price + Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Currency & Price <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-7 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                      data-testid="select-currency"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] w-0"
                    data-testid="input-price"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Your preferred currency: {currency.split(" ")[0]}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    data-testid="select-category"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
                {category && (() => {
                  const subs = CATEGORIES.find((c) => c.slug === category)?.subcategories ?? [];
                  if (subs.length === 0) return null;
                  return (
                    <div className="relative mt-2">
                      <select
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                        data-testid="select-subcategory"
                      >
                        <option value="">All subcategories</option>
                        {subs.map((sub) => (
                          <option key={sub.slug} value={sub.slug}>{sub.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    </div>
                  );
                })()}
              </div>

              {/* Extra categories */}
              {category && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">Also list in (optional):</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {extraCategories.map((ec, i) => {
                      const catName = CATEGORIES.find(c => c.slug === ec.category)?.name ?? ec.category;
                      const subName = CATEGORIES.find(c => c.slug === ec.category)?.subcategories.find(s => s.slug === ec.subcategory)?.name;
                      return (
                        <span key={i} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          {catName}{subName ? ` › ${subName}` : ""}
                          <button type="button" onClick={() => setExtraCategories(prev => prev.filter((_, j) => j !== i))} className="ml-0.5 text-indigo-400 hover:text-indigo-700">×</button>
                        </span>
                      );
                    })}
                  </div>
                  {addingExtraCat ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <select value={newExtraCatTop} onChange={e => { setNewExtraCatTop(e.target.value); setNewExtraCatSub(""); }}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30">
                        <option value="">— category —</option>
                        {CATEGORIES.filter(c => c.slug !== category).map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                      </select>
                      {newExtraCatTop && (() => {
                        const subs = CATEGORIES.find(c => c.slug === newExtraCatTop)?.subcategories ?? [];
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
                        setExtraCategories(prev => [...prev, { category: newExtraCatTop, subcategory: newExtraCatSub }]);
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
              )}
            </div>

            {/* Description */}
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item in detail. Include condition, features, and any defects..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                data-testid="textarea-description"
              />
            </div>
          </section>

          {/* Eco-Friendly */}
          <section className="bg-white px-7 py-5 border-x border-b border-gray-100">
            <label
              className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                ecoFriendly ? "border-green-400 bg-green-50" : "border-gray-200 hover:border-green-300"
              }`}
              data-testid="checkbox-eco-friendly"
            >
              <input
                type="checkbox"
                checked={ecoFriendly}
                onChange={(e) => setEcoFriendly(e.target.checked)}
                className="mt-0.5 accent-green-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Leaf className="w-4 h-4 text-green-500" />
                  <span className="font-semibold text-gray-900 text-sm">Eco-Friendly Product</span>
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">FREE</span>
                </div>
                <p className="text-xs text-gray-500">
                  Mark this item as eco-friendly or recyclable. Products with this badge get 25% more visibility and attract environmentally conscious buyers!
                </p>
              </div>
            </label>
          </section>

          {/* Product Variants */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-gray-900">Product Variants</h2>
              <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">OPTIONAL</span>
            </div>
            <p className="text-xs text-gray-500 mb-5">Add size, colour, or storage options so buyers can choose the exact variant they want.</p>

            {/* Existing variant groups */}
            <div className="space-y-5">
              {variantGroups.map((group, gi) => (
                <div key={group.type} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {group.type === "colour"
                        ? <Palette className="w-4 h-4 text-[#4A5CE8]" />
                        : <Ruler className="w-4 h-4 text-[#4A5CE8]" />}
                      <span className="text-sm font-semibold text-gray-900 capitalize">{group.type} options</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setVariantGroups((prev) => prev.filter((_, i) => i !== gi))}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Current options — each has a qty stepper */}
                  {group.options.length > 0 && (
                    <div className="mb-3 border border-gray-100 rounded-xl overflow-hidden">
                      {/* Header row */}
                      <div className="grid grid-cols-[1fr_80px_28px] gap-2 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Variant</span>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Qty</span>
                        <span />
                      </div>
                      {group.options.map((opt, oi) => (
                        <div key={oi} className="grid grid-cols-[1fr_80px_28px] gap-2 items-center px-3 py-2 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50">
                          <div className="flex items-center gap-2 min-w-0">
                            {group.type === "colour" && (
                              <span className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0" style={{ backgroundColor: opt.hex || "#ccc" }} />
                            )}
                            <span className="text-sm font-medium text-gray-700 truncate">{opt.label}</span>
                          </div>
                          <input
                            type="number"
                            min="0"
                            value={opt.qty}
                            onChange={(e) => setVariantGroups((prev) =>
                              prev.map((g, i) => i === gi ? {
                                ...g,
                                options: g.options.map((o, j) => j === oi ? { ...o, qty: Math.max(0, parseInt(e.target.value) || 0) } : o),
                              } : g)
                            )}
                            className="w-full text-center border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                          />
                          <button
                            type="button"
                            onClick={() => setVariantGroups((prev) =>
                              prev.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)
                            )}
                            className="text-gray-300 hover:text-red-400 transition-colors flex items-center justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {/* Subtotal row */}
                      <div className="grid grid-cols-[1fr_80px_28px] gap-2 items-center px-3 py-2 bg-gray-50 border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-500">Subtotal</span>
                        <span className="text-center text-sm font-bold text-[#4A5CE8]">{group.options.reduce((s, o) => s + o.qty, 0)}</span>
                        <span />
                      </div>
                    </div>
                  )}

                  {/* Add new option */}
                  <div className="flex gap-2">
                    {group.type === "colour" && (
                      <input
                        type="color"
                        value={group.newHex || "#4A5CE8"}
                        onChange={(e) => setVariantGroups((prev) =>
                          prev.map((g, i) => i === gi ? { ...g, newHex: e.target.value } : g)
                        )}
                        className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
                      />
                    )}
                    <input
                      type="text"
                      placeholder={group.type === "size" ? "e.g. S, M, L, XL" : "e.g. Navy Blue"}
                      value={group.newLabel}
                      onChange={(e) => setVariantGroups((prev) =>
                        prev.map((g, i) => i === gi ? { ...g, newLabel: e.target.value } : g)
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (!group.newLabel.trim()) return;
                          setVariantGroups((prev) =>
                            prev.map((g, i) => i === gi ? {
                              ...g,
                              options: [...g.options, { label: g.newLabel.trim(), hex: g.newHex, qty: Math.max(1, parseInt(g.newQty) || 1) }],
                              newLabel: "",
                              newQty: "1",
                            } : g)
                          );
                        }
                      }}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    />
                    <input
                      type="number"
                      min="1"
                      value={group.newQty}
                      onChange={(e) => setVariantGroups((prev) =>
                        prev.map((g, i) => i === gi ? { ...g, newQty: e.target.value } : g)
                      )}
                      placeholder="Qty"
                      className="w-16 text-center border border-gray-200 rounded-lg px-2 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!group.newLabel.trim()) return;
                        setVariantGroups((prev) =>
                          prev.map((g, i) => i === gi ? {
                            ...g,
                            options: [...g.options, { label: g.newLabel.trim(), hex: g.newHex, qty: Math.max(1, parseInt(g.newQty) || 1) }],
                            newLabel: "",
                            newQty: "1",
                          } : g)
                        );
                      }}
                      className="px-3 py-2 rounded-lg bg-[#4A5CE8] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add variant group buttons */}
            <div className="flex gap-3 mt-4">
              {!variantGroups.some((g) => g.type === "size") && (
                <button
                  type="button"
                  onClick={() => setVariantGroups((prev) => [...prev, { type: "size", options: [], newLabel: "", newHex: "", newQty: "1" }])}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                >
                  <Ruler className="w-4 h-4" /> Add Size Variants
                </button>
              )}
              {!variantGroups.some((g) => g.type === "colour") && (
                <button
                  type="button"
                  onClick={() => setVariantGroups((prev) => [...prev, { type: "colour", options: [], newLabel: "", newHex: "#4A5CE8", newQty: "1" }])}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors"
                >
                  <Palette className="w-4 h-4" /> Add Colour Variants
                </button>
              )}
            </div>
          </section>

          {/* Item Condition */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4">Item Condition</h2>
            <div className="space-y-2">
              {CONDITIONS.map((c) => {
                const Icon = c.icon;
                const selected = condition === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCondition(c.id)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-[#4A5CE8] bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                    data-testid={`button-condition-${c.id}`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        selected ? "bg-[#4A5CE8]" : "bg-gray-100"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${selected ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${selected ? "text-[#4A5CE8]" : "text-gray-800"}`}>
                        {c.label}
                      </p>
                      <p className="text-xs text-gray-400">{c.desc}</p>
                    </div>
                    {selected && (
                      <CheckCircle2 className="w-5 h-5 text-[#4A5CE8] flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Photos */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="w-4 h-4 text-[#4A5CE8]" />
              <h2 className="text-base font-bold text-gray-900">
                Photos ({photos.length}/10)
              </h2>
            </div>

            {/* Preview grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mb-4">
                {photos.map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200 relative group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-lg font-bold"
                    >
                      ×
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 text-[9px] bg-[#4A5CE8] text-white px-1.5 py-0.5 rounded font-medium">
                        Main
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {photos.length < 10 && (
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center text-center cursor-pointer hover:border-[#4A5CE8]/50 hover:bg-blue-50/30 transition-colors"
                onClick={() => photoInputRef.current?.click()}
                data-testid="dropzone-photos"
              >
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center mb-3 shadow-md">
                  <Camera className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-gray-800 mb-1">Add Photos</p>
                <p className="text-sm text-gray-400 mb-4">Drag & drop or click to upload</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); photoInputRef.current?.click(); }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] text-white text-sm font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                  data-testid="button-choose-photos"
                >
                  <Upload className="w-4 h-4" />
                  Choose Files
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </div>
            )}

            <div className="mt-4 bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-800 mb-2">📸 Photo Tips</p>
              <ul className="space-y-1">
                {[
                  "Use natural lighting for best results",
                  "Show multiple angles and any flaws",
                  "First photo becomes your main listing image",
                  "High-quality photos increase sales by 40%",
                ].map((tip) => (
                  <li key={tip} className="text-xs text-[#4A5CE8]">• {tip}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Specifications (Optional) */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F26B21] to-[#D97706] flex items-center justify-center flex-shrink-0">
                <Tag className="w-3.5 h-3.5 text-white" />
              </div>
              <h2 className="text-base font-bold text-gray-900">Specifications <span className="text-xs font-normal text-gray-400">(optional)</span></h2>
            </div>
            <p className="text-xs text-gray-400 mb-5">Add key product details like brand, model, colour etc. to help buyers find and compare your item.</p>

            {/* Quick-add preset keys */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["Brand", "Model", "Colour", "Material", "Size", "Weight", "MPN", "EAN / Barcode", "Compatible With", "Country of Origin"].filter(
                (k) => !specifications.some((s) => s.key.toLowerCase() === k.toLowerCase())
              ).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSpecifications((prev) => [...prev, { key: preset, value: "" }])}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-[#F26B21]/40 text-xs font-semibold text-[#F26B21] hover:bg-orange-50 transition-colors"
                >
                  <Plus className="w-3 h-3" /> {preset}
                </button>
              ))}
            </div>

            {/* Current spec rows */}
            {specifications.length > 0 && (
              <div className="rounded-xl overflow-hidden border border-gray-100 mb-4">
                {specifications.map((spec, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-2.5 ${i % 2 === 0 ? "bg-blue-50" : "bg-white"}`}>
                    <input
                      type="text"
                      value={spec.key}
                      onChange={(e) => setSpecifications((prev) => prev.map((s, j) => j === i ? { ...s, key: e.target.value } : s))}
                      placeholder="Property"
                      className="w-32 flex-shrink-0 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30"
                    />
                    <span className="text-gray-300 text-sm">:</span>
                    <input
                      type="text"
                      value={spec.value}
                      onChange={(e) => setSpecifications((prev) => prev.map((s, j) => j === i ? { ...s, value: e.target.value } : s))}
                      placeholder="Value"
                      className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setSpecifications((prev) => prev.filter((_, j) => j !== i))}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Custom key-value add row */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
                placeholder="Property (e.g. Battery Life)"
                className="w-40 flex-shrink-0 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
              />
              <input
                type="text"
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (newSpecKey.trim() && newSpecValue.trim()) {
                      setSpecifications((prev) => [...prev, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
                      setNewSpecKey("");
                      setNewSpecValue("");
                    }
                  }
                }}
                placeholder="Value (e.g. 20 hours)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
              />
              <button
                type="button"
                onClick={() => {
                  if (newSpecKey.trim() && newSpecValue.trim()) {
                    setSpecifications((prev) => [...prev, { key: newSpecKey.trim(), value: newSpecValue.trim() }]);
                    setNewSpecKey("");
                    setNewSpecValue("");
                  }
                }}
                className="px-3 py-2 rounded-lg bg-[#4A5CE8] text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1 flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </section>

          {/* Shipping & Details */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-5">Shipping & Details</h2>

            {/* Quantity + SKU */}
            {(() => {
              const allOptions = variantGroups.flatMap((g) => g.options);
              const hasVariantQty = allOptions.length > 0;
              const variantTotal = allOptions.reduce((s, o) => s + o.qty, 0);
              return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2">
                  Quantity
                  {hasVariantQty && (
                    <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">from variants</span>
                  )}
                </label>
                {hasVariantQty ? (
                  <div className="w-full border border-[#4A5CE8]/30 bg-blue-50 rounded-lg px-3 py-2.5 text-sm font-bold text-[#4A5CE8] flex items-center justify-between">
                    <span>{variantTotal}</span>
                    <span className="text-xs font-normal text-blue-400">auto-calculated</span>
                  </div>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    data-testid="input-quantity"
                  />
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">SKU (Optional)</label>
                <input
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g., PROD-12345"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                  data-testid="input-sku"
                />
              </div>
            </div>
              );
            })()}

            {/* Ship From Country */}
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Ship From</label>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {SHIP_ORIGINS.map((o) => {
                  const sel = shipOrigin === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        setShipOrigin(o.id);
                        setCarrier(CARRIERS[o.id]?.[0]?.id ?? "dhl");
                        setShipZone(SHIP_ZONES[o.id]?.[0]?.id ?? "domestic");
                      }}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                        sel ? "border-[#4A5CE8] bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      data-testid={`button-origin-${o.id}`}
                    >
                      <span className="text-xl">{o.flag}</span>
                      <span className={`text-xs font-bold ${sel ? "text-[#4A5CE8]" : "text-gray-600"}`}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
              {/* Other — manual entry */}
              {shipOrigin === "Other" && (
                <input
                  type="text"
                  value={countryOther}
                  onChange={(e) => setCountryOther(e.target.value)}
                  placeholder="Enter your country…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] mb-3"
                  data-testid="input-country-other"
                />
              )}
            </div>

            {/* Shipping Zone */}
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Where will you ship?</label>
              <div className="flex flex-wrap gap-2">
                {(SHIP_ZONES[shipOrigin] ?? SHIP_ZONES.Other).map((z) => {
                  const sel = shipZone === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setShipZone(z.id)}
                      className={`flex-1 min-w-[30%] flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-xl border-2 text-center transition-all ${
                        sel ? "border-[#F26B21] bg-orange-50" : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      data-testid={`button-zone-${z.id}`}
                    >
                      <span className={`text-sm font-bold ${sel ? "text-[#F26B21]" : "text-gray-800"}`}>{z.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">{z.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Carrier Selection */}
            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Carrier</label>
              <div className="space-y-2">
                {(CARRIERS[shipOrigin] ?? CARRIERS.Other).map((c) => {
                  const sel = carrier === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCarrier(c.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        sel ? "border-[#4A5CE8] bg-blue-50" : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                      data-testid={`button-carrier-${c.id}`}
                    >
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-black text-[10px] text-center leading-tight"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.label.split(" ").map((w) => w[0]).join("").slice(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${sel ? "text-[#4A5CE8]" : "text-gray-800"}`}>{c.label}</p>
                        <p className="text-xs text-gray-400 truncate">{c.desc}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.eta}</span>
                        {sel && <CheckCircle2 className="w-5 h-5 text-[#4A5CE8]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shipping Price + Handling */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Shipping Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingPrice}
                    onChange={(e) => setShippingPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    data-testid="input-shipping-price"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Handling Charge (Optional)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={handlingCharge}
                    onChange={(e) => setHandlingCharge(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-gray-200 rounded-lg pl-7 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    data-testid="input-handling-charge"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tags (comma-separated)</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="vintage, rare, collectible, mint condition..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                data-testid="input-tags"
              />
              <p className="text-xs text-gray-400 mt-1">Add relevant tags to help buyers find your item</p>
            </div>
          </section>

          {/* Premium Video */}
          <section className="bg-[#FFFBEB] px-7 py-7 border-x border-b border-yellow-100">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-yellow-400 flex items-center justify-center">
                  <Video className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-gray-900">Premium Video</span>
              </div>
              <span className="text-xs font-bold bg-[#F26B21] text-white px-3 py-1 rounded-full">+$2.99</span>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Add a video to showcase your item in action. Videos increase engagement by 300%!
            </p>

            <div className="bg-white rounded-xl border border-yellow-100 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Product Video</p>
                  <p className="text-xs text-gray-400">Videos get 5x more engagement</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPremiumVideo(!premiumVideo)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                    premiumVideo
                      ? "bg-green-500 text-white"
                      : "bg-gradient-to-r from-[#F26B21] to-[#F59E0B] text-white"
                  }`}
                  data-testid="button-premium-video"
                >
                  {premiumVideo ? "Added ✓" : "Premium +$2.99"}
                </button>
              </div>
            </div>

            {/* Upload area */}
            <div
              className="rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-purple-200 p-10 flex flex-col items-center text-center cursor-pointer hover:border-purple-400 transition-colors mb-4"
              onClick={() => premiumVideo && videoInputRef.current?.click()}
              data-testid="dropzone-video"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#EC4899] flex items-center justify-center mb-4 shadow-md">
                <Video className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-gray-800 text-lg mb-1">Add Product Video</p>
              <p className="text-sm text-gray-500 mb-1">Show your item in action</p>
              <p className="text-xs text-gray-400 mb-5">MP4, MOV, AVI • Max 100MB • Premium feature</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); if (premiumVideo) videoInputRef.current?.click(); }}
                className={`px-8 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity flex items-center gap-2 ${
                  premiumVideo
                    ? "bg-gradient-to-r from-[#7C3AED] to-[#EC4899] hover:opacity-90"
                    : "bg-gray-300 cursor-not-allowed"
                }`}
                data-testid="button-select-video"
              >
                <Upload className="w-4 h-4" />
                Select Video File
              </button>
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" />
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Eye, label: "5x More Views", desc: "Videos dramatically increase engagement" },
                { icon: Zap, label: "Sell 3x Faster", desc: "Videos build trust and confidence" },
                { icon: Star, label: "Premium Badge", desc: "Stand out from other listings" },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="bg-white rounded-xl p-4 border border-gray-100 text-center">
                    <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-2">
                      <Icon className="w-4 h-4 text-green-500" />
                    </div>
                    <p className="text-xs font-bold text-gray-800 mb-1">{b.label}</p>
                    <p className="text-[10px] text-gray-400">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ready to List */}
          <section className="bg-white px-7 py-7 rounded-b-2xl border-x border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Ready to List?</h2>
            <p className="text-sm text-gray-500 mb-4">Review your listing and publish when ready</p>

            {/* Validation errors */}
            <AnimatePresence>
              {validationErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1">Please fix the following:</p>
                      <ul className="text-sm text-red-600 space-y-0.5 list-disc list-inside">
                        {validationErrors.map((err) => <li key={err}>{err}</li>)}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {publishError && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-700">{publishError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold text-sm hover:border-gray-400 transition-colors"
                data-testid="button-save-draft"
              >
                <Save className="w-4 h-4" />
                {draftSaved ? "Draft Saved!" : "Save Draft"}
              </button>
              <button
                type="submit"
                disabled={published || publishing}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#3B4FD8] to-[#1E3A8A] text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-md disabled:opacity-70"
                data-testid="button-publish-listing"
              >
                <Bell className="w-4 h-4" />
                {published ? "Published! Redirecting…" : publishing ? "Publishing…" : "Publish Listing"}
              </button>
            </div>

            <AnimatePresence>
              {draftSaved && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 font-medium text-center"
                >
                  Draft saved — you can come back and finish it later.
                </motion.div>
              )}
              {published && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium text-center"
                >
                  Your listing has been published! Taking you to your dashboard…
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        </form>
      </div>

      <Footer />
    </div>
  );
}

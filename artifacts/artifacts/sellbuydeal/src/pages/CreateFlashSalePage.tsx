import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Zap, ChevronLeft, Loader2, CheckCircle2, AlertCircle, ImageIcon, Clock, TrendingDown, Coffee, Calendar, Star, Upload, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SellerListingPicker, type SellerListing } from "@/components/SellerListingPicker";

const CATEGORIES = ["Electronics", "Fashion", "Gaming", "Books", "Collectibles", "Home", "Sports", "Other"];

type SaleType = "standard" | "lightning" | "happy_hour" | "weekend_mega" | "category_event";

const SALE_TYPES: { value: SaleType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { value: "standard",       label: "Flash Sale",      icon: Zap,      color: "bg-[#F26B21]",   description: "Standard time-limited deal" },
  { value: "lightning",      label: "Lightning Deal",  icon: Zap,      color: "bg-red-600",      description: "5–15 minutes only — ultra-urgent" },
  { value: "happy_hour",     label: "Happy Hour",      icon: Coffee,   color: "bg-amber-500",    description: "Runs during your chosen hour window" },
  { value: "weekend_mega",   label: "Weekend Mega",    icon: Calendar, color: "bg-purple-600",   description: "Bigger discounts, runs over the weekend" },
  { value: "category_event", label: "Category Event",  icon: Star,     color: "bg-[#4A5CE8]",   description: "Themed to a specific product category" },
];

const STANDARD_DURATIONS: { label: string; hours: number }[] = [
  { label: "1h", hours: 1 }, { label: "2h", hours: 2 }, { label: "4h", hours: 4 },
  { label: "6h", hours: 6 }, { label: "12h", hours: 12 }, { label: "24h", hours: 24 },
  { label: "48h", hours: 48 },
];

const LIGHTNING_DURATIONS: { label: string; mins: number }[] = [
  { label: "5 min", mins: 5 }, { label: "10 min", mins: 10 }, { label: "15 min", mins: 15 },
];

export function CreateFlashSalePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { currency, formatPrice } = useCurrency();

  const [saleType, setSaleType] = useState<SaleType>("standard");
  const [form, setForm] = useState({
    title: "", description: "", image: "", category: "Electronics",
    originalPrice: "", salePrice: "", discountPct: "",
    startNow: true, startsAt: "", durationHours: 4, lightningMins: 10,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedListingIds, setSelectedListingIds] = useState<number[]>([]);
  const [selectedListings, setSelectedListings] = useState<SellerListing[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);

  function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setField("image", (ev.target?.result as string) ?? "");
    reader.readAsDataURL(file);
  }

  useEffect(() => { if (!user) setLocation("/login"); }, [user, setLocation]);

  function handleMultiSelect(listings: SellerListing[]) {
    setSelectedListings(listings);
    setSelectedListingIds(listings.map((l) => l.id));
    // Auto-fill description/image from first listing if only one selected
    if (listings.length === 1) {
      const listing = listings[0];
      const matchCat = CATEGORIES.find((c) => c.toLowerCase() === (listing.category ?? "").toLowerCase()) ?? "Electronics";
      setForm((prev) => ({
        ...prev,
        title: listings.length === 1 ? listing.title : prev.title,
        description: listing.description ?? prev.description,
        image: listing.image ?? prev.image,
        category: matchCat,
        originalPrice: "",
        salePrice: "",
        discountPct: "",
      }));
    } else if (listings.length > 1) {
      // Multiple — clear individual price fields, keep discount %
      setForm((prev) => ({
        ...prev,
        title: `Flash Sale — ${listings.length} items`,
        originalPrice: "",
        salePrice: "",
      }));
    }
    setError(null);
  }

  // When switching to lightning, reset duration
  useEffect(() => {
    if (saleType === "lightning") setForm(p => ({ ...p, startNow: true }));
  }, [saleType]);

  function setField(key: string, val: string | number | boolean) {
    setForm(prev => ({ ...prev, [key]: val }));
    setError(null);
  }

  function handleOriginalPrice(v: string) {
    const op = parseFloat(v); const pct = parseFloat(form.discountPct);
    if (!isNaN(op) && !isNaN(pct) && pct > 0 && pct < 100)
      setForm(prev => ({ ...prev, originalPrice: v, salePrice: (op * (1 - pct / 100)).toFixed(2) }));
    else setForm(prev => ({ ...prev, originalPrice: v }));
    setError(null);
  }
  function handleSalePrice(v: string) {
    const op = parseFloat(form.originalPrice); const sp = parseFloat(v);
    if (!isNaN(op) && !isNaN(sp) && op > 0 && sp < op)
      setForm(prev => ({ ...prev, salePrice: v, discountPct: String(Math.round(((op - sp) / op) * 100)) }));
    else setForm(prev => ({ ...prev, salePrice: v }));
    setError(null);
  }
  function handleDiscountPct(v: string) {
    const op = parseFloat(form.originalPrice); const pct = parseFloat(v);
    if (!isNaN(op) && !isNaN(pct) && pct > 0 && pct < 100)
      setForm(prev => ({ ...prev, discountPct: v, salePrice: (op * (1 - pct / 100)).toFixed(2) }));
    else setForm(prev => ({ ...prev, discountPct: v }));
    setError(null);
  }

  const origNum = parseFloat(form.originalPrice) || 0;
  const saleNum = parseFloat(form.salePrice) || 0;
  const pctNum = origNum > 0 && saleNum > 0 ? Math.round(((origNum - saleNum) / origNum) * 100) : 0;

  const durationMs = saleType === "lightning"
    ? form.lightningMins * 60000
    : form.durationHours * 3600000;
  const endTime = new Date(
    form.startNow ? Date.now() + durationMs : new Date(form.startsAt || Date.now()).getTime() + durationMs
  );

  // For multi-listing: percentage discount applied to each listing's price
  const discountPctNum = parseFloat(form.discountPct) || 0;
  const isMultiListing = selectedListings.length > 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.startNow && !form.startsAt) { setError("Please set a start time or choose 'Start Now'"); return; }

    const toGBP = (n: number) => n / currency.rate;
    const startsAt = form.startNow ? new Date().toISOString() : new Date(form.startsAt).toISOString();
    const endsAt = new Date(new Date(startsAt).getTime() + durationMs).toISOString();

    setSubmitting(true); setError(null);

    try {
      if (isMultiListing) {
        // Create one flash sale per selected listing
        if (discountPctNum <= 0 || discountPctNum >= 100) { setError("Enter a discount % between 1 and 99"); return; }
        const results: string[] = [];
        for (const listing of selectedListings) {
          const op = listing.price;
          const sp = op * (1 - discountPctNum / 100);
          const matchCat = CATEGORIES.find((c) => c.toLowerCase() === (listing.category ?? "").toLowerCase()) ?? "Electronics";
          const res = await fetch("/api/flash-sales", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sellerEmail: user.email,
              sellerName: user.name ?? user.username,
              sellerUsername: user.username,
              title: listing.title,
              description: listing.description ?? null,
              image: listing.image ?? null,
              category: matchCat,
              originalPrice: toGBP(op),
              salePrice: toGBP(sp),
              startsAt,
              endsAt,
              saleType,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error ?? `Failed to create flash sale for "${listing.title}"`); return; }
          results.push(data.id);
        }
        setSuccess(`multi:${results.length}`);
      } else {
        // Single listing or manual entry
        if (!form.title.trim()) { setError("Title is required"); return; }
        const op = parseFloat(form.originalPrice);
        const sp = parseFloat(form.salePrice);
        if (isNaN(op) || op <= 0) { setError("Original price must be greater than 0"); return; }
        if (isNaN(sp) || sp <= 0) { setError("Sale price must be greater than 0"); return; }
        if (sp >= op) { setError("Sale price must be less than original price"); return; }
        const res = await fetch("/api/flash-sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sellerEmail: user.email,
            sellerName: user.name ?? user.username,
            title: form.title.trim(),
            description: form.description.trim() || null,
            image: form.image.trim() || null,
            category: form.category,
            originalPrice: toGBP(op),
            salePrice: toGBP(sp),
            startsAt,
            endsAt,
            saleType,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? "Failed to create flash sale"); return; }
        setSuccess(data.id);
      }
    } finally { setSubmitting(false); }
  }

  if (success) {
    const isMultiSuccess = success.startsWith("multi:");
    const count = isMultiSuccess ? parseInt(success.split(":")[1]) : 1;
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="bg-white rounded-3xl border border-gray-100 p-10 text-center max-w-md w-full">
            <div className="w-16 h-16 rounded-full bg-[#F26B21]/10 flex items-center justify-center mx-auto mb-5">
              <Zap className="w-8 h-8 text-[#F26B21] fill-[#F26B21]" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {isMultiSuccess ? `${count} Flash Sales Created!` : "Flash Sale is Live!"}
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              {isMultiSuccess
                ? `${count} timed deals are now live — buyers can see them on the Flash Sales page.`
                : "Your sale has been created."}
            </p>
            {!isMultiSuccess && (
              <p className="font-mono text-xs text-[#4A5CE8] bg-[#4A5CE8]/5 rounded-xl px-3 py-2 mb-6">{success}</p>
            )}
            <div className="flex flex-col gap-3">
              {!isMultiSuccess && (
                <button onClick={() => setLocation(`/flash-sales/${success}`)} className="w-full py-3 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90">View Flash Sale</button>
              )}
              <button onClick={() => setLocation("/flash-sales")} className="w-full py-3 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90">Browse All Flash Sales</button>
              <button onClick={() => setLocation("/dashboard")} className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50">Go to Dashboard</button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto max-w-4xl px-4 py-8">
        <Link href="/flash-sales" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] mb-6 w-fit">
          <ChevronLeft className="w-4 h-4" /> Back to Flash Sales
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-white rounded-3xl border border-gray-100 p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-[#F26B21] flex items-center justify-center shadow-lg shadow-[#F26B21]/30">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900">Create Flash Sale</h1>
                <p className="text-sm text-gray-400">Countdown deals — live immediately or on schedule</p>
              </div>
            </div>

            {/* Sale type selector */}
            <div className="mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Sale Type</p>
              <div className="grid grid-cols-1 gap-2">
                {SALE_TYPES.map(({ value, label, icon: Icon, color, description }) => (
                  <button key={value} type="button" onClick={() => setSaleType(value)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      saleType === value ? "border-transparent ring-2 ring-offset-1 ring-[#F26B21] bg-gray-50" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-4 h-4 text-white fill-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400">{description}</p>
                    </div>
                    {saleType === value && <CheckCircle2 className="w-4 h-4 text-[#F26B21] shrink-0" />}
                  </button>
                ))}
              </div>
              {saleType === "lightning" && (
                <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Zap className="w-4 h-4 text-red-600 fill-red-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-red-600 font-medium">Lightning Deals run for 5–15 minutes only. They start immediately and show with a special urgent badge.</p>
                </div>
              )}
              {saleType === "happy_hour" && (
                <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Coffee className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-600 font-medium">Happy Hour promos typically run 5pm–7pm. Schedule your start time accordingly for maximum visibility.</p>
                </div>
              )}
              {saleType === "weekend_mega" && (
                <div className="mt-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                  <p className="text-xs text-purple-600 font-medium">Weekend Mega Sales get a special banner on Saturday and Sunday. Schedule to start on Friday evening or Saturday morning.</p>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100 mb-6" />

            <form onSubmit={submit} className="space-y-6">
              {/* Listing picker — multi-select */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Your Listings</p>
                <SellerListingPicker
                  multiSelect
                  selectedIds={selectedListingIds}
                  onMultiSelect={handleMultiSelect}
                />
                {isMultiListing && (
                  <p className="text-xs text-[#4A5CE8] mt-2 font-medium">
                    Each listing will become its own flash sale with the discount % applied to its price.
                  </p>
                )}
              </section>

              <div className="border-t border-gray-100" />

              {/* Item details — only shown for single/manual entry */}
              {!isMultiListing && (
                <>
                  <section>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Item Details</p>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Title *</label>
                        <input value={form.title} onChange={e => setField("title", e.target.value)} placeholder="e.g. Sony WH-1000XM5 Headphones — Open Box" maxLength={120}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21] focus:ring-1 focus:ring-[#F26B21]/20" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Description</label>
                        <textarea value={form.description} onChange={e => setField("description", e.target.value)} rows={3} placeholder="What's included, condition, why you're discounting…"
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21] resize-none" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5"><ImageIcon className="w-3.5 h-3.5 inline mr-1" />Photo</label>
                        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                        {form.image ? (
                          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-50 border border-gray-200 group">
                            <img src={form.image} alt="Preview" className="w-full h-full object-contain p-2" />
                            <button
                              type="button"
                              onClick={() => { setField("image", ""); if (imageInputRef.current) imageInputRef.current.value = ""; }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="w-3.5 h-3.5 text-white" />
                            </button>
                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              className="absolute bottom-2 right-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Upload className="w-3 h-3" /> Change
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => imageInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#F26B21] hover:bg-orange-50/30 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Upload className="w-5 h-5 text-gray-400" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-semibold text-gray-600">Click to upload a photo</p>
                              <p className="text-xs text-gray-400 mt-0.5">PNG, JPG, WEBP up to 10 MB</p>
                            </div>
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Category</label>
                        <select value={form.category} onChange={e => setField("category", e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21]">
                          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>
                  <div className="border-t border-gray-100" />
                </>
              )}

              {/* Pricing */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pricing</p>
                {isMultiListing ? (
                  <>
                    {/* Multi-listing: shared discount % only — prices come from each listing */}
                    <div className="mb-3">
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">Discount % (applied to all) *</label>
                      <div className="relative max-w-[160px]">
                        <input type="number" min="1" max="99" value={form.discountPct} onChange={e => handleDiscountPct(e.target.value)} placeholder="e.g. 20"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21] pr-7" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                      </div>
                    </div>
                    {discountPctNum > 0 && (
                      <div className="space-y-1.5">
                        {selectedListings.map(l => (
                          <div key={l.id} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                            <span className="truncate flex-1 mr-3 font-medium">{l.title}</span>
                            <span className="text-gray-400 line-through mr-2">{currency.symbol}{(l.price * currency.rate).toFixed(2)}</span>
                            <span className="font-bold text-[#F26B21]">{currency.symbol}{(l.price * currency.rate * (1 - discountPctNum / 100)).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Original ({currency.symbol}) *</label>
                        <input type="number" step="0.01" min="0.01" value={form.originalPrice} onChange={e => handleOriginalPrice(e.target.value)} placeholder="0.00"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21]" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Sale Price ({currency.symbol}) *</label>
                        <input type="number" step="0.01" min="0.01" value={form.salePrice} onChange={e => handleSalePrice(e.target.value)} placeholder="0.00"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21]" />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1.5">Discount %</label>
                        <div className="relative">
                          <input type="number" min="1" max="99" value={form.discountPct} onChange={e => handleDiscountPct(e.target.value)} placeholder="0"
                            className="w-full px-3 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#F26B21] pr-7" />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Enter any two fields — the third updates automatically.</p>
                  </>
                )}
              </section>

              <div className="border-t border-gray-100" />

              {/* Schedule */}
              <section>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Schedule &amp; Duration</p>
                <div className="space-y-4">
                  {saleType !== "lightning" && (
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setField("startNow", true)}
                        className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${form.startNow ? "bg-[#F26B21] text-white border-[#F26B21]" : "border-gray-200 text-gray-600 hover:border-[#F26B21]"}`}>
                        ⚡ Start Now
                      </button>
                      <button type="button" onClick={() => setField("startNow", false)}
                        className={`py-3 rounded-xl border text-sm font-semibold transition-colors ${!form.startNow ? "bg-[#4A5CE8] text-white border-[#4A5CE8]" : "border-gray-200 text-gray-600 hover:border-[#4A5CE8]"}`}>
                        📅 Schedule
                      </button>
                    </div>
                  )}
                  {!form.startNow && saleType !== "lightning" && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1.5">Start Date &amp; Time</label>
                      <input type="datetime-local" value={form.startsAt} onChange={e => setField("startsAt", e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#4A5CE8]" />
                    </div>
                  )}

                  {saleType === "lightning" ? (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2"><Clock className="w-3.5 h-3.5 inline mr-1" />Duration (Lightning)</label>
                      <div className="flex gap-2">
                        {LIGHTNING_DURATIONS.map(d => (
                          <button key={d.mins} type="button" onClick={() => setField("lightningMins", d.mins)}
                            className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-colors ${form.lightningMins === d.mins ? "bg-red-600 text-white border-red-600" : "border-gray-200 text-gray-600 hover:border-red-400"}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2"><Clock className="w-3.5 h-3.5 inline mr-1" />Duration</label>
                      <div className="flex gap-2 flex-wrap">
                        {STANDARD_DURATIONS.map(d => (
                          <button key={d.hours} type="button" onClick={() => setField("durationHours", d.hours)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.durationHours === d.hours ? "bg-[#1A1D2E] text-white border-[#1A1D2E]" : "border-gray-200 text-gray-600 hover:border-[#1A1D2E]"}`}>
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400">
                    Ends: {endTime.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </section>

              {error && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}

              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-2xl bg-[#F26B21] text-white font-black text-base hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#F26B21]/30">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-white" />}
                {submitting ? "Creating…" : "Launch Flash Sale"}
              </button>
            </form>
          </div>

          {/* Live Preview */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-4 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Preview</p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="relative aspect-[4/3] bg-gray-100">
                  {form.image ? (
                    <img src={form.image} alt="Preview" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Zap className="w-12 h-12 text-gray-200" /></div>
                  )}
                  {pctNum > 0 && (
                    <div className={`absolute top-2 left-2 text-white text-xs font-black px-2.5 py-1 rounded-full ${saleType === "lightning" ? "bg-red-600" : "bg-[#F26B21]"}`}>
                      -{pctNum}%
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex justify-center">
                    <span className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${saleType === "lightning" ? "bg-red-100 text-red-600 animate-pulse" : "bg-orange-100 text-orange-600"}`}>
                      <Clock className="w-3 h-3" />
                      {saleType === "lightning" ? `Ends in ${form.lightningMins}m 00s` : `Ends in ${form.durationHours}h 00m 00s`}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-sm leading-snug mb-2 line-clamp-2 min-h-[2.5rem]">
                    {form.title || <span className="text-gray-300">Your item title…</span>}
                  </h3>
                  <div className="flex items-center gap-2 mb-2">
                    {saleNum > 0 ? (
                      <p className={`text-xl font-black ${saleType === "lightning" ? "text-red-600" : "text-[#F26B21]"}`}>{formatPrice(saleNum / currency.rate)}</p>
                    ) : (
                      <p className="text-xl font-black text-gray-200">—</p>
                    )}
                    {origNum > 0 && <p className="text-sm text-gray-400 line-through">{formatPrice(origNum / currency.rate)}</p>}
                    {origNum > 0 && saleNum > 0 && origNum > saleNum && (
                      <span className="ml-auto text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" /> Save {formatPrice((origNum - saleNum) / currency.rate)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{form.category}</p>
                </div>
              </div>
              {pctNum > 0 && origNum > 0 && saleNum > 0 && (
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-emerald-700 font-black text-lg">-{pctNum}% off</p>
                  <p className="text-emerald-600 text-xs">Buyers save {formatPrice((origNum - saleNum) / currency.rate)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

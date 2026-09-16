import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Gavel,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Camera,
  Video,
  Upload,
  X,
  Tag,
  Star,
  Eye,
  Package,
  Zap,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useCurrency } from "@/context/CurrencyContext";
import { SellerListingPicker, type SellerListing } from "@/components/SellerListingPicker";

const CATEGORIES = [
  "Electronics", "Fashion", "Gaming", "Books",
  "Collectibles", "Home", "Sports", "Art", "Music", "Toys", "Other",
];

const CONDITIONS = [
  { id: "new",       label: "Brand New",  desc: "Sealed / never used",          icon: Tag       },
  { id: "like-new",  label: "Like New",   desc: "Used once, no marks",           icon: Star      },
  { id: "good",      label: "Good",       desc: "Light wear, fully working",     icon: CheckCircle2 },
  { id: "fair",      label: "Fair",       desc: "Visible wear, fully working",   icon: Eye       },
  { id: "used",      label: "Used",       desc: "Well used, still functional",   icon: Package   },
  { id: "for-parts", label: "For Parts",  desc: "Broken or incomplete",          icon: Zap       },
];

const DURATIONS: { label: string; hours: number }[] = [
  { label: "1h",    hours: 1   },
  { label: "3h",    hours: 3   },
  { label: "6h",    hours: 6   },
  { label: "12h",   hours: 12  },
  { label: "1 day", hours: 24  },
  { label: "3 days",hours: 72  },
  { label: "7 days",hours: 168 },
  { label: "14d",   hours: 336 },
];

export function CreateAuctionPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { currency } = useCurrency();

  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [category, setCategory]         = useState("");
  const [condition, setCondition]       = useState("good");
  const [tags, setTags]                 = useState("");
  const [startingBid, setStartingBid]   = useState("");
  const [reservePrice, setReservePrice] = useState("");
  const [bidIncrement, setBidIncrement] = useState("1.00");
  const [durationHours, setDurationHours] = useState(24);
  const [photos, setPhotos]             = useState<string[]>([]);
  const [videoSrc, setVideoSrc]         = useState<string | null>(null);
  const [selectedListingId, setSelectedListingId] = useState<number | null>(null);

  const [submitting, setSubmitting]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [success, setSuccess]           = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) setLocation("/sign-in");
  }, [user, setLocation]);

  function handleListingSelect(listing: SellerListing) {
    setSelectedListingId(listing.id);
    setTitle(listing.title);
    setDescription(listing.description ?? "");
    if (listing.image) setPhotos([listing.image]);
    const matchCat = CATEGORIES.find((c) => c.toLowerCase() === (listing.category ?? "").toLowerCase()) ?? "";
    if (matchCat) setCategory(matchCat);
    const matchCond = CONDITIONS.find((c) => c.id === (listing.condition ?? "").toLowerCase().replace(" ", "-"));
    if (matchCond) setCondition(matchCond.id);
    if (listing.price) setStartingBid(String((listing.price * 0.5).toFixed(2)));
    setError(null);
    setValidationErrors([]);
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 10 - photos.length;
    const toAdd = files.slice(0, remaining);
    toAdd.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setPhotos((prev) => (prev.length < 10 ? [...prev, result] : prev));
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === "string") setVideoSrc(result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    const startBid = parseFloat(startingBid);
    if (isNaN(startBid) || startBid <= 0) errors.push("Starting bid must be greater than 0");
    const increment = parseFloat(bidIncrement);
    if (isNaN(increment) || increment <= 0) errors.push("Bid increment must be greater than 0");
    if (!category) errors.push("Category is required");
    if (errors.length > 0) {
      setValidationErrors(errors);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setValidationErrors([]);
    setError(null);
    setSubmitting(true);

    try {
      const endTime = new Date(Date.now() + durationHours * 3600000).toISOString();
      const toGBP = (n: number) => n / currency.rate;
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          images: photos,
          category,
          condition,
          sellerEmail: user.email,
          sellerName: user.name ?? user.username,
          sellerUsername: user.username,
          startingBid: toGBP(startBid),
          reservePrice: reservePrice ? toGBP(parseFloat(reservePrice)) : null,
          bidIncrement: toGBP(increment),
          endTime,
          tags: tags.trim() || null,
          videoUrl: videoSrc ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create auction"); return; }
      setSuccess(data.id);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-gray-100 p-10 text-center max-w-md w-full shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Auction Live!</h2>
          <p className="text-gray-500 text-sm mb-6">Your item is now open for bids. Good luck!</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setLocation(`/auctions/${success}`)}
              className="w-full py-3 rounded-xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity"
            >
              View My Auction
            </button>
            <button
              onClick={() => setLocation("/auctions")}
              className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Browse All Auctions
            </button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <Link
          href="/auctions"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] mb-6 w-fit transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Auctions
        </Link>

        <form onSubmit={submit} noValidate>

          {/* Header card */}
          <div className="rounded-t-2xl bg-gradient-to-r from-[#F26B21] to-[#e05a10] px-7 py-7 mb-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Start an Auction</h1>
                <p className="text-orange-100 text-sm mt-0.5">Add photos, set your price — go live instantly</p>
              </div>
            </div>
          </div>

          {/* Import from existing listing */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4">Import from a Listing <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
            <SellerListingPicker onSelect={handleListingSelect} selectedId={selectedListingId} />
          </section>

          {/* Photos */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-1">Photos</h2>
            <p className="text-xs text-gray-400 mb-4">Upload up to 10 photos. First photo is the cover.</p>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
              {photos.map((src, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group"
                >
                  <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-[#F26B21] text-white text-[9px] font-bold text-center py-0.5">
                      COVER
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-gray-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}

              {photos.length < 10 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#F26B21] hover:text-[#F26B21] transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Add</span>
                </button>
              )}
            </div>

            {photos.length === 0 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-[#F26B21] hover:text-[#F26B21] transition-colors"
              >
                <Upload className="w-6 h-6" />
                <span className="text-sm font-medium">Click to upload photos</span>
                <span className="text-xs">JPG, PNG, WEBP — max 10 photos</span>
              </button>
            )}
          </section>

          {/* Video */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-1">Video <span className="text-gray-400 font-normal text-sm">(optional)</span></h2>
            <p className="text-xs text-gray-400 mb-4">A short clip helps bidders trust the item is as described.</p>

            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleVideoChange}
            />

            <AnimatePresence>
              {videoSrc ? (
                <motion.div
                  key="video"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative rounded-xl overflow-hidden border border-gray-200"
                >
                  <video src={videoSrc} controls className="w-full max-h-52 object-cover bg-black" />
                  <button
                    type="button"
                    onClick={() => setVideoSrc(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-gray-900/70 text-white flex items-center justify-center hover:bg-gray-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ) : (
                <motion.button
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-gray-200 rounded-xl py-7 flex flex-col items-center gap-2 text-gray-400 hover:border-[#F26B21] hover:text-[#F26B21] transition-colors"
                >
                  <Video className="w-6 h-6" />
                  <span className="text-sm font-medium">Click to upload a video</span>
                  <span className="text-xs">MP4, MOV, WEBM</span>
                </motion.button>
              )}
            </AnimatePresence>
          </section>

          {/* Item Details */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-5">Item Details</h2>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => { setTitle(e.target.value); setValidationErrors([]); }}
                placeholder="e.g. Vintage Sony Walkman — excellent condition"
                maxLength={120}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
              />
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the item — any defects, accessories included, history…"
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setValidationErrors([]); }}
                    className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                  >
                    <option value="">Select category</option>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Tags</label>
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="vintage, sony, walkman, 80s"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
            </div>

            {/* Condition cards */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Condition</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CONDITIONS.map((c) => {
                  const Icon = c.icon;
                  const active = condition === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCondition(c.id)}
                      className={`flex items-start gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
                        active
                          ? "border-[#F26B21] bg-[#F26B21]/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 ${active ? "text-[#F26B21]" : "text-gray-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold leading-tight ${active ? "text-[#F26B21]" : "text-gray-700"}`}>
                          {c.label}
                        </p>
                        <p className="text-[10px] text-gray-400 leading-tight mt-0.5">{c.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Auction Settings */}
          <section className="bg-white px-7 py-7 border-x border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-5">Auction Settings</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Starting Bid ({currency.symbol}) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={startingBid}
                  onChange={(e) => { setStartingBid(e.target.value); setValidationErrors([]); }}
                  placeholder="1.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  Bid Increment ({currency.symbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={bidIncrement}
                  onChange={(e) => { setBidIncrement(e.target.value); setValidationErrors([]); }}
                  placeholder="1.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                Reserve Price ({currency.symbol}){" "}
                <span className="text-gray-400 font-normal text-xs">— optional, hidden from bidders</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={reservePrice}
                onChange={(e) => setReservePrice(e.target.value)}
                placeholder="Leave blank for no reserve"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5 block">
                <Clock className="w-3.5 h-3.5" /> Duration
              </label>
              <div className="grid grid-cols-4 gap-2 mb-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.hours}
                    type="button"
                    onClick={() => setDurationHours(d.hours)}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                      durationHours === d.hours
                        ? "bg-[#F26B21] text-white border-[#F26B21]"
                        : "border-gray-200 text-gray-600 hover:border-[#F26B21] hover:text-[#F26B21]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Ends:{" "}
                {new Date(Date.now() + durationHours * 3600000).toLocaleString("en-GB", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </p>
            </div>
          </section>

          {/* Ready to list */}
          <section className="bg-white px-7 py-7 rounded-b-2xl border-x border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Ready to List?</h2>
            <p className="text-sm text-gray-500 mb-4">Your auction goes live the moment you submit.</p>

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
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-semibold text-red-700">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#e05a10] text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-md disabled:opacity-70"
              data-testid="button-submit-auction"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating auction…</>
                : <><Gavel className="w-4 h-4" /> Start Auction</>
              }
            </button>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { icon: CheckCircle2, label: "Buyer Protected", desc: "All bids are covered" },
                { icon: Clock, label: "Auto Close", desc: "Timer ends it fairly" },
                { icon: Plus, label: "Free to List", desc: "No upfront fees" },
              ].map((b) => {
                const Icon = b.icon;
                return (
                  <div key={b.label} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mx-auto mb-1.5">
                      <Icon className="w-4 h-4 text-[#F26B21]" />
                    </div>
                    <p className="text-[10px] font-bold text-gray-800">{b.label}</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">{b.desc}</p>
                  </div>
                );
              })}
            </div>
          </section>

        </form>
      </div>

      <Footer />
    </div>
  );
}

import { useState, useMemo, useRef, useEffect } from "react";
import { useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, ChevronDown, Plus, X, MapPin, Clock, Tag,
  Wrench, Home, Car, Briefcase, Users, ShoppingBag,
  Building2, Zap, UserCircle, MoreHorizontal,
  ChevronRight, CheckCircle2,
  Mail, Phone, AlertCircle, Flag, MessageSquare,
  Camera, Upload, Star, Package, Eye,
  Sparkles, Flame, CalendarClock, Coffee,
  Heart, Dumbbell, Monitor, Gift,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";
import { useCurrency } from "@/context/CurrencyContext";
import { useAuth } from "@/context/AuthContext";
import {
  MOCK_ADS, CLASSIFIED_CATEGORIES,
  type ClassifiedAd, type ClassifiedCategory, type ClassifiedType, type ClassifiedUrgency,
} from "@/data/classifieds";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Heart, Home, Dumbbell, Sparkles, Monitor, Car, Wrench, Gift,
  Briefcase, Users, ShoppingBag, Building2, Zap, UserCircle, MoreHorizontal,
};

const SORT_OPTIONS = [
  { value: "newest",     label: "Newest First"        },
  { value: "oldest",     label: "Oldest First"         },
  { value: "price-asc",  label: "Price: Low to High"  },
  { value: "price-desc", label: "Price: High to Low"  },
];

const TYPE_OPTIONS = [
  { value: "all",    label: "All Types"  },
  { value: "offer",  label: "Offering"   },
  { value: "wanted", label: "Wanted"     },
];

const CONDITIONS = [
  { id: "new",      label: "New",      icon: Tag       },
  { id: "like-new", label: "Like New", icon: Star      },
  { id: "good",     label: "Good",     icon: CheckCircle2 },
  { id: "fair",     label: "Fair",     icon: Eye       },
  { id: "used",     label: "Used",     icon: Package   },
];

const URGENCIES: { id: ClassifiedUrgency; label: string; icon: React.ElementType; color: string }[] = [
  { id: "asap",       label: "ASAP",       icon: Flame,        color: "text-red-500 border-red-300 bg-red-50"         },
  { id: "this-week",  label: "This Week",  icon: Sparkles,     color: "text-amber-600 border-amber-300 bg-amber-50"   },
  { id: "this-month", label: "This Month", icon: CalendarClock,color: "text-blue-600 border-blue-300 bg-blue-50"      },
  { id: "flexible",   label: "Flexible",   icon: Coffee,       color: "text-green-600 border-green-300 bg-green-50"   },
];

// ─── Category Card ────────────────────────────────────────────────────────────
function CategoryCard({
  cat, count, active, onClick,
}: {
  cat: typeof CLASSIFIED_CATEGORIES[0];
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = CATEGORY_ICONS[cat.icon] ?? MoreHorizontal;
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={active ? { borderColor: cat.color, boxShadow: `0 0 0 3px ${cat.color}22` } : {}}
      className={`w-full bg-white rounded-2xl border-2 p-4 text-center cursor-pointer transition-all shadow-sm hover:shadow-md ${
        active ? "" : "border-gray-100 hover:border-gray-200"
      }`}
    >
      <div
        className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3 transition-colors"
        style={{ backgroundColor: `${cat.color}18` }}
      >
        <Icon className="w-7 h-7" style={{ color: cat.color }} />
      </div>
      <p className="font-bold text-gray-800 text-sm">{cat.label}</p>
      <p className="text-xs text-gray-400 mt-0.5">{count} ad{count !== 1 ? "s" : ""}</p>
      {cat.subcategories.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1 justify-center">
          {cat.subcategories.slice(0, 3).map((s) => (
            <span key={s} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 leading-tight">{s}</span>
          ))}
          {cat.subcategories.length > 3 && (
            <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">+{cat.subcategories.length - 3}</span>
          )}
        </div>
      )}
    </motion.button>
  );
}

// ─── Ad Card ──────────────────────────────────────────────────────────────────
function AdCard({ ad, onClick }: { ad: ClassifiedAd; onClick: () => void }) {
  const cat = CLASSIFIED_CATEGORIES.find((c) => c.slug === ad.category);
  const Icon = cat ? (CATEGORY_ICONS[cat.icon] ?? MoreHorizontal) : MoreHorizontal;
  const { formatPrice } = useCurrency();
  const coverPhoto = (ad.images && ad.images.length > 0) ? ad.images[0] : ad.image;
  const urgency = URGENCIES.find((u) => u.id === ad.urgency);

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all group cursor-pointer overflow-hidden"
    >
      <div className="flex gap-0">
        {/* Photo or icon */}
        {coverPhoto ? (
          <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
            <img src={coverPhoto} alt={ad.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div
            className="w-24 h-24 flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: `${cat?.color ?? "#F26B21"}15` }}
          >
            <Icon className="w-9 h-9" style={{ color: cat?.color ?? "#F26B21" }} />
          </div>
        )}

        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-start gap-2 flex-wrap mb-1">
              <h3 className="font-bold text-gray-900 text-sm line-clamp-1 flex-1 group-hover:text-[#F26B21] transition-colors">{ad.title}</h3>
              {(ad.price != null || ad.priceLabel) && (
                <span className="flex-shrink-0 font-bold text-[#F26B21] text-sm">
                  {ad.price != null ? formatPrice(ad.price) : ad.priceLabel}
                  {ad.negotiable && <span className="text-[10px] font-normal text-gray-400 ml-1">• nego</span>}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">{ad.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <MapPin className="w-3 h-3" />{ad.location}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-gray-400">
              <Clock className="w-3 h-3" />{new Date(ad.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
              ad.type === "offer" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
            }`}>
              {ad.type === "offer" ? "Offering" : "Wanted"}
            </span>
            {urgency && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${urgency.color.split(" ").slice(0,2).join(" ")}`}>
                {urgency.label}
              </span>
            )}
            {ad.subcategory ? (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${cat?.color ?? "#F26B21"}18`, color: cat?.color ?? "#F26B21" }}
              >
                {ad.subcategory}
              </span>
            ) : cat && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
              >
                {cat.label}
              </span>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 self-center pr-3 text-gray-300 group-hover:text-[#F26B21] transition-colors">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </motion.button>
  );
}

// ─── Ad Detail Modal ──────────────────────────────────────────────────────────
function AdDetailModal({ ad, onClose }: { ad: ClassifiedAd; onClose: () => void }) {
  const cat = CLASSIFIED_CATEGORIES.find((c) => c.slug === ad.category);
  const Icon = cat ? (CATEGORY_ICONS[cat.icon] ?? MoreHorizontal) : MoreHorizontal;
  const { formatPrice } = useCurrency();
  const [reported, setReported] = useState(false);
  const [composing, setComposing] = useState(false);
  const [msgText, setMsgText] = useState(`Hi, I'm interested in your ad: "${ad.title}". `);
  const [msgSent, setMsgSent] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);

  const photos = ad.images && ad.images.length > 0 ? ad.images : (ad.image ? [ad.image] : []);
  const urgency = URGENCIES.find((u) => u.id === ad.urgency);

  function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!msgText.trim()) return;
    setMsgSent(true);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Photo gallery */}
          {photos.length > 0 && (
            <div className="relative">
              <div className="aspect-video overflow-hidden rounded-t-3xl bg-gray-100">
                <img
                  src={photos[photoIdx]}
                  alt={`Photo ${photoIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {photos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIdx(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? "bg-white" : "bg-white/50"}`}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Header */}
          <div className={`flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-100 gap-3 ${photos.length > 0 ? "" : ""}`}>
            <div className="flex items-center gap-3 min-w-0">
              {photos.length === 0 && (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cat?.color ?? "#F26B21"}18` }}
                >
                  <Icon className="w-6 h-6" style={{ color: cat?.color ?? "#F26B21" }} />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-bold text-gray-900 text-base leading-snug">{ad.title}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    ad.type === "offer" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
                  }`}>
                    {ad.type === "offer" ? "Offering" : "Wanted"}
                  </span>
                  {urgency && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${urgency.color}`}>
                      {urgency.label}
                    </span>
                  )}
                  {cat && (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${cat.color}18`, color: cat.color }}
                    >
                      {cat.label}
                    </span>
                  )}
                  {ad.condition && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {ad.condition}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {photos.length === 0 && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            )}
          </div>

          <div className="px-6 py-5 space-y-4">
            {/* Price */}
            {(ad.price != null || ad.priceLabel) && (
              <div className="flex items-center justify-between bg-orange-50 rounded-2xl px-4 py-3">
                <div>
                  <span className="text-sm text-gray-500 font-medium">Price</span>
                  {ad.negotiable && <p className="text-[10px] text-orange-400 font-semibold">Negotiable</p>}
                </div>
                <span className="text-2xl font-black text-[#F26B21]">
                  {ad.price != null ? formatPrice(ad.price) : ad.priceLabel}
                </span>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-gray-700 leading-relaxed">{ad.description}</p>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Location</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-[#F26B21]" />{ad.location}
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-1">Posted</p>
                <div className="flex items-center gap-1.5 text-sm text-gray-700 font-semibold">
                  <Clock className="w-3.5 h-3.5 text-[#4A5CE8]" />
                  {new Date(ad.postedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              </div>
            </div>

            {/* Tags */}
            {ad.tags && ad.tags.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {ad.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">#{tag}</span>
                ))}
              </div>
            )}

            {/* Contact */}
            <div className="bg-gradient-to-br from-[#4A5CE8]/5 to-[#4A5CE8]/10 rounded-2xl px-4 py-4">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-3">Posted by</p>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-[#4A5CE8] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {ad.contactName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{ad.contactName}</p>
                  <p className="text-xs text-gray-400">Classified advertiser</p>
                </div>
              </div>
              {(ad.contactEmail || ad.contactPhone) && (
                <div className="flex flex-wrap gap-2">
                  {ad.contactEmail && (
                    <a
                      href={`mailto:${ad.contactEmail}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[#4A5CE8] bg-white rounded-lg px-3 py-1.5 hover:bg-[#4A5CE8]/10 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />{ad.contactEmail}
                    </a>
                  )}
                  {ad.contactPhone && (
                    <a
                      href={`tel:${ad.contactPhone}`}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-white rounded-lg px-3 py-1.5 hover:bg-emerald-50 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />{ad.contactPhone}
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Message / actions */}
            {composing ? (
              msgSent ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-6 text-center bg-emerald-50 rounded-2xl"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <p className="font-bold text-gray-800 text-sm">Message sent!</p>
                  <p className="text-xs text-gray-400 mt-1">You'll hear back from {ad.contactName} soon.</p>
                  <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-[#4A5CE8] text-white text-sm font-bold hover:opacity-90">Done</button>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  onSubmit={handleSendMessage}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-bold text-gray-800">Message {ad.contactName}</p>
                    <button type="button" onClick={() => setComposing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                  </div>
                  <textarea
                    value={msgText}
                    onChange={(e) => setMsgText(e.target.value)}
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                    placeholder="Write your message..."
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#4A5CE8] to-[#3B4FD8] text-white font-bold text-sm hover:opacity-90"
                  >
                    <MessageSquare className="w-4 h-4" /> Send Message
                  </button>
                </motion.form>
              )
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setComposing(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-[#4A5CE8] to-[#3B4FD8] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <MessageSquare className="w-4 h-4" /> Send Message
                </button>
                <button
                  onClick={() => setReported(true)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl border text-sm font-semibold transition-colors ${
                    reported
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"
                  }`}
                >
                  {reported ? <CheckCircle2 className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
                  {reported ? "Reported" : "Report"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Post Ad Modal ─────────────────────────────────────────────────────────────
function PostAdModal({ onClose, onPost }: { onClose: () => void; onPost: (ad: ClassifiedAd) => void }) {
  const { formatPrice, currency } = useCurrency();
  const { user } = useAuth();

  const [type, setType]           = useState<ClassifiedType>("offer");
  const [category, setCategory]   = useState<ClassifiedCategory>("animals");
  const [subcategory, setSubcategory] = useState("");
  const [photos, setPhotos]       = useState<string[]>([]);
  const [title, setTitle]         = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("good");
  const [price, setPrice]         = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [urgency, setUrgency]     = useState<ClassifiedUrgency>("flexible");
  const [location, setLocation]   = useState("");
  const [contactName, setContactName] = useState(user?.name ?? "");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [tags, setTags]           = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors]       = useState<string[]>([]);

  const photoInputRef = useRef<HTMLInputElement>(null);

  const cat = CLASSIFIED_CATEGORIES.find((c) => c.slug === category);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const remaining = 5 - photos.length;
    files.slice(0, remaining).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result;
        if (typeof result === "string") {
          setPhotos((prev) => prev.length < 5 ? [...prev, result] : prev);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: string[] = [];
    if (!title.trim())       errs.push("Title is required");
    if (!description.trim()) errs.push("Description is required");
    if (!location.trim())    errs.push("Location is required");
    if (!contactName.trim()) errs.push("Your name is required");
    if (errs.length > 0) { setErrors(errs); window.scrollTo({ top: 0 }); return; }

    setSubmitting(true);
    try {
      const parsedPrice = price ? parseFloat(price) : null;
      const res = await fetch("/api/classifieds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory: subcategory || null,
          type,
          price: parsedPrice,
          priceLabel: parsedPrice ? formatPrice(parsedPrice) : null,
          negotiable,
          condition,
          location: location.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim() || null,
          contactPhone: contactPhone.trim() || null,
          urgency,
          photos: photos.length > 0 ? photos : null,
        }),
      });
      if (!res.ok) { setErrors(["Failed to post ad — please try again."]); return; }
      const row = await res.json() as Record<string, unknown>;
      onPost(rowToAd(row));
      setSubmitted(true);
    } catch {
      setErrors(["Network error — please check your connection and try again."]);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 text-center"
        >
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }}
            className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ad Posted!</h2>
          <p className="text-sm text-gray-400 mb-6">Your classified ad is now live and visible to everyone nearby.</p>
          <button onClick={onClose} className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#e05a10] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Done
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
        >
          {/* Gradient header */}
          <div className={`rounded-t-3xl px-6 pt-6 pb-5 flex items-start justify-between ${
            type === "offer"
              ? "bg-gradient-to-r from-[#F26B21] to-[#e05a10]"
              : "bg-gradient-to-r from-[#4A5CE8] to-[#3B4FD8]"
          }`}>
            <div>
              <h2 className="text-xl font-bold text-white">Post a Classified Ad</h2>
              <p className="text-sm text-white/70 mt-0.5">Free to list — visible to everyone</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-5">

            {/* Validation errors */}
            <AnimatePresence>
              {errors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-4 bg-red-50 border border-red-200 rounded-xl"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <ul className="text-sm text-red-600 space-y-0.5 list-disc list-inside">
                      {errors.map((err) => <li key={err}>{err}</li>)}
                    </ul>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Offer / Wanted toggle */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">I am…</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "offer" as ClassifiedType,  label: "Offering / Selling", sub: "I have something to give or sell", color: "#F26B21", bg: "from-orange-500 to-orange-600" },
                  { value: "wanted" as ClassifiedType, label: "Looking / Wanted",   sub: "I'm looking for something",       color: "#4A5CE8", bg: "from-indigo-500 to-indigo-600" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setType(opt.value)}
                    className={`relative p-4 rounded-2xl border-2 text-left transition-all ${
                      type === opt.value
                        ? "border-transparent shadow-lg text-white"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                    style={type === opt.value ? {
                      background: `linear-gradient(135deg, ${opt.color}dd, ${opt.color})`,
                    } : {}}
                  >
                    <p className={`text-sm font-bold ${type === opt.value ? "text-white" : "text-gray-800"}`}>{opt.label}</p>
                    <p className={`text-[11px] mt-0.5 ${type === opt.value ? "text-white/75" : "text-gray-400"}`}>{opt.sub}</p>
                    {type === opt.value && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/30 flex items-center justify-center">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Category grid */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Category <span className="text-red-400">*</span></p>
              <div className="grid grid-cols-5 gap-2">
                {CLASSIFIED_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c.icon] ?? MoreHorizontal;
                  const active = category === c.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => { setCategory(c.slug); setSubcategory(""); }}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all ${
                        active ? "border-transparent shadow-md" : "border-gray-100 hover:border-gray-200 bg-gray-50/50"
                      }`}
                      style={active ? { backgroundColor: `${c.color}18`, borderColor: `${c.color}60` } : {}}
                    >
                      <Icon className="w-5 h-5" style={{ color: active ? c.color : "#9CA3AF" }} />
                      <span className={`text-[9px] font-bold text-center leading-tight ${active ? "" : "text-gray-500"}`}
                        style={active ? { color: c.color } : {}}>
                        {c.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Subcategory picker */}
              {cat && cat.subcategoryGroups.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Subcategory</p>
                  <div className="relative">
                    <select
                      value={subcategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
                    >
                      <option value="">— All {cat.label} —</option>
                      {cat.subcategoryGroups.map((group) => (
                        <optgroup key={group.label} label={group.label}>
                          {group.items.map((item) => (
                            <option key={item} value={item}>{item}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Photos <span className="text-gray-400 font-normal">(up to 5)</span></p>
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoChange} />
              <div className="grid grid-cols-5 gap-2">
                {photos.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-200 group"
                  >
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 text-[8px] font-bold text-center py-0.5 text-white"
                        style={{ backgroundColor: cat?.color ?? "#F26B21" }}>
                        COVER
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-gray-900/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </motion.div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-[#F26B21] hover:text-[#F26B21] transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span className="text-[9px] font-medium">Add</span>
                  </button>
                )}
              </div>
              {photos.length === 0 && (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="mt-2 w-full border-2 border-dashed border-gray-200 rounded-xl py-5 flex flex-col items-center gap-1.5 text-gray-400 hover:border-[#F26B21] hover:text-[#F26B21] transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-xs font-medium">Upload photos</span>
                </button>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Ad Title <span className="text-red-400">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Professional Plumber Available"
                maxLength={80}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{title.length}/80</p>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your ad in detail — what it is, condition, any requirements…"
                rows={4}
                maxLength={600}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] resize-none"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">{description.length}/600</p>
            </div>

            {/* Condition (shown for offer type) */}
            {type === "offer" && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Condition</p>
                <div className="flex flex-wrap gap-2">
                  {CONDITIONS.map((c) => {
                    const Icon = c.icon;
                    const active = condition === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCondition(c.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                          active
                            ? "bg-[#F26B21] border-[#F26B21] text-white shadow-sm"
                            : "border-gray-200 text-gray-600 hover:border-[#F26B21] hover:text-[#F26B21]"
                        }`}
                      >
                        <Icon className="w-3 h-3" /> {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Price + negotiable */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Price</label>
              <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-semibold">{currency.symbol}</span>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0.00 — leave blank if free or POA"
                    min={0}
                    className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setNegotiable((v) => !v)}
                  className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border text-xs font-bold transition-all whitespace-nowrap ${
                    negotiable
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Negotiable
                </button>
              </div>
            </div>

            {/* Urgency */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Urgency</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {URGENCIES.map((u) => {
                  const Icon = u.icon;
                  const active = urgency === u.id;
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setUrgency(u.id)}
                      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        active ? u.color + " shadow-sm" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />{u.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">
                Location <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, e.g. London, Manchester, Birmingham"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">Tags</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="plumber, emergency, london (comma-separated)"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Contact Info</p>
              <div className="space-y-3">
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Your name or company *"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="Email (optional)"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="Phone (optional)"
                      className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`w-full py-4 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                type === "offer"
                  ? "bg-gradient-to-r from-[#F26B21] to-[#e05a10]"
                  : "bg-gradient-to-r from-[#4A5CE8] to-[#3B4FD8]"
              }`}
            >
              {submitting
                ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Posting…</>
                : <><Plus className="w-4 h-4" /> Post Ad for Free</>
              }
            </button>

            <p className="text-[10px] text-gray-400 text-center">
              By posting you agree to our Community Guidelines. Ads are reviewed within 24 hours.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Row mapper (API snake_case → ClassifiedAd) ───────────────────────────────
function rowToAd(row: Record<string, unknown>): ClassifiedAd {
  return {
    id:           row.id as number,
    title:        row.title as string,
    description:  row.description as string,
    category:     row.category as ClassifiedCategory,
    subcategory:  (row.subcategory as string | null) ?? undefined,
    type:         row.type as ClassifiedType,
    price:        row.price != null ? parseFloat(String(row.price)) : undefined,
    priceLabel:   (row.priceLabel as string | null) ?? (row.price_label as string | null) ?? undefined,
    negotiable:   Boolean(row.negotiable),
    condition:    (row.condition as string | null) ?? undefined,
    location:     row.location as string,
    contactName:  (row.contactName as string) ?? (row.contact_name as string),
    contactEmail: (row.contactEmail as string | null) ?? (row.contact_email as string | null) ?? undefined,
    contactPhone: (row.contactPhone as string | null) ?? (row.contact_phone as string | null) ?? undefined,
    urgency:      (row.urgency as ClassifiedUrgency | null) ?? undefined,
    images:       row.photos ? (() => { try { return JSON.parse(row.photos as string); } catch { return undefined; } })() : undefined,
    externalLink: (row.externalLink as string | null) ?? (row.external_link as string | null) ?? undefined,
    postedAt:     String(row.postedAt ?? row.posted_at ?? new Date().toISOString()),
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function ClassifiedsPage() {
  const search = useSearch();
  const [ads, setAds] = useState<ClassifiedAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<ClassifiedCategory | "all">("all");
  const [activeSubcategory, setActiveSubcategory] = useState("");
  const [activeType, setActiveType] = useState<"all" | ClassifiedType>("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showModal, setShowModal] = useState(() => new URLSearchParams(search).get("post") === "1");
  const [view, setView] = useState<"categories" | "list">("categories");
  const [selectedAd, setSelectedAd] = useState<ClassifiedAd | null>(null);

  useEffect(() => {
    fetch("/api/classifieds")
      .then((r) => r.json())
      .then((rows: Record<string, unknown>[]) => { setAds(rows.map(rowToAd)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cat of CLASSIFIED_CATEGORIES) {
      map[cat.slug] = ads.filter((a) => a.category === cat.slug).length;
    }
    return map;
  }, [ads]);

  const filtered = useMemo(() => {
    let result = [...ads];
    if (activeCategory !== "all") result = result.filter((a) => a.category === activeCategory);
    if (activeSubcategory) result = result.filter((a) => a.subcategory === activeSubcategory);
    if (activeType !== "all") result = result.filter((a) => a.type === activeType);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) =>
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q) ||
        (a.tags ?? []).some((t) => t.includes(q))
      );
    }
    if (sortBy === "newest")     result.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
    else if (sortBy === "oldest") result.sort((a, b) => a.postedAt.localeCompare(b.postedAt));
    else if (sortBy === "price-asc")  result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sortBy === "price-desc") result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    return result;
  }, [ads, activeCategory, activeType, searchQuery, sortBy]);

  function handlePostAd(ad: ClassifiedAd) {
    setAds((prev) => [ad, ...prev.filter((a) => a.id !== ad.id)]);
  }

  function handleCategoryClick(slug: ClassifiedCategory) {
    setActiveCategory(slug);
    setActiveSubcategory("");
    setView("list");
  }

  const activeCat = CLASSIFIED_CATEGORIES.find((c) => c.slug === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#F26B21]/10 via-orange-50 to-white border-b border-orange-100">
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-[#F26B21]/10 text-[#F26B21] text-xs font-bold px-3 py-1.5 rounded-full mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Free to list — No fees
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-3">
              Classified Ads
            </h1>
            <p className="text-gray-500 text-base mb-8 max-w-md mx-auto">
              Find local services, jobs, rentals, and community connections across the UK
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-[#F26B21] to-[#e05a10] text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-orange-200"
              >
                <Plus className="w-4 h-4" /> Post Your Ad Free
              </button>
              <button
                onClick={() => { setView("list"); setActiveCategory("all"); }}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold hover:border-gray-300 transition-colors"
              >
                <Search className="w-4 h-4" /> Browse All Ads
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">{ads.length} active ads • Updated daily</p>
          </div>
        </div>
      </div>

      <AdSlot slotKey="classifieds_mid" />

      <div className="container mx-auto px-4 py-8 max-w-5xl flex-1">

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-1 relative">
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setView("list"); }}
                  placeholder="Search ads..."
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21]"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Category</label>
              <div className="relative">
                <select
                  value={activeCategory}
                  onChange={(e) => { setActiveCategory(e.target.value as ClassifiedCategory | "all"); setView("list"); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
                >
                  <option value="all">All Categories</option>
                  {CLASSIFIED_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Type</label>
              <div className="relative">
                <select
                  value={activeType}
                  onChange={(e) => { setActiveType(e.target.value as "all" | ClassifiedType); setView("list"); }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
                >
                  {TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Sort By</label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
                >
                  {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Subcategory filter — shown when a category is selected */}
          {activeCategory !== "all" && activeCat && activeCat.subcategoryGroups.length > 0 && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs font-semibold text-gray-400 flex-shrink-0">Subcategory:</span>
              <div className="relative flex-1">
                <select
                  value={activeSubcategory}
                  onChange={(e) => setActiveSubcategory(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 appearance-none focus:outline-none focus:ring-2 focus:ring-[#F26B21]/30 focus:border-[#F26B21] bg-white"
                >
                  <option value="">All {activeCat.label}</option>
                  {activeCat.subcategoryGroups.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}

          {(activeCategory !== "all" || activeType !== "all" || searchQuery) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {activeCategory !== "all" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#F26B21]/10 text-[#F26B21] rounded-full text-xs font-semibold">
                  {activeCat?.label}
                  <button onClick={() => { setActiveCategory("all"); setActiveSubcategory(""); }}><X className="w-3 h-3" /></button>
                </span>
              )}
              {activeSubcategory && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: activeCat?.color ?? "#F26B21" }}>
                  {activeSubcategory}
                  <button onClick={() => setActiveSubcategory("")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {activeType !== "all" && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#4A5CE8]/10 text-[#4A5CE8] rounded-full text-xs font-semibold">
                  {activeType === "offer" ? "Offering" : "Wanted"}
                  <button onClick={() => setActiveType("all")}><X className="w-3 h-3" /></button>
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold">
                  "{searchQuery}"
                  <button onClick={() => setSearchQuery("")}><X className="w-3 h-3" /></button>
                </span>
              )}
              <button
                onClick={() => { setActiveCategory("all"); setActiveSubcategory(""); setActiveType("all"); setSearchQuery(""); setView("categories"); }}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* View toggle */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            {view === "categories"
              ? "Browse by Category"
              : activeCat ? activeCat.label : "All Ads"}
          </h2>
          <div className="flex items-center gap-2">
            {view === "list" && (
              <button
                onClick={() => { setActiveCategory("all"); setView("categories"); }}
                className="text-xs text-[#F26B21] font-semibold hover:underline"
              >
                ← All Categories
              </button>
            )}
          </div>
        </div>

        {/* Categories grid */}
        {view === "categories" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-8">
            {CLASSIFIED_CATEGORIES.map((cat) => (
              <CategoryCard
                key={cat.slug}
                cat={cat}
                count={categoryCounts[cat.slug] ?? 0}
                active={activeCategory === cat.slug}
                onClick={() => handleCategoryClick(cat.slug)}
              />
            ))}
          </div>
        )}

        {/* Ads list */}
        {view === "list" && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-center py-16"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Search className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="font-semibold text-gray-600 mb-1">No ads found</p>
                  <p className="text-sm text-gray-400 mb-4">Try a different search or be the first to post here!</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#e05a10] text-white font-bold text-sm hover:opacity-90"
                  >
                    <Plus className="w-4 h-4" /> Post the First Ad
                  </button>
                </motion.div>
              ) : (
                filtered.map((ad) => (
                  <AdCard key={ad.id} ad={ad} onClick={() => setSelectedAd(ad)} />
                ))
              )}
            </AnimatePresence>
          </div>
        )}

        {/* "Browse all" CTA at bottom of categories view */}
        {view === "categories" && ads.length > 0 && (
          <div className="text-center mt-4">
            <button
              onClick={() => setView("list")}
              className="inline-flex items-center gap-2 text-sm text-[#F26B21] font-semibold hover:underline"
            >
              View all {ads.length} ads <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <Footer />

      {showModal && (
        <PostAdModal
          onClose={() => setShowModal(false)}
          onPost={(ad) => { handlePostAd(ad); }}
        />
      )}

      {selectedAd && (
        <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
      )}
    </div>
  );
}

import { useState, useEffect, type ReactNode } from "react";
import { useParams, Link, useLocation as useWouter } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart, Eye, Users, MapPin, CheckCircle2, Star, Share2,
  ShoppingCart, Tag, MessageSquare, Shield, Truck,
  ChevronLeft, ChevronRight, Package, Calendar, Flag, ArrowRight, Zap, TrendingUp,
  BookOpen, Hash, Info, List, FileText, Flame, Phone, Mail,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BuyerProtectionBadge } from "@/components/BuyerProtectionBadge";
import { VariantSelector } from "@/components/VariantSelector";
import { ALL_PRODUCTS } from "@/data/products";
import { CATEGORIES } from "@/data/categories";
import { useCart } from "@/context/CartContext";
import { useWatchlist } from "@/context/WatchlistContext";
import { useOffers } from "@/context/OfferContext";
import { useCurrency } from "@/context/CurrencyContext";

const CONDITION_COLORS: Record<string, string> = {
  "new":        "bg-emerald-100 text-emerald-700 border-emerald-200",
  "brand-new":  "bg-emerald-100 text-emerald-700 border-emerald-200",
  "like new":   "bg-teal-100 text-teal-700 border-teal-200",
  "like-new":   "bg-teal-100 text-teal-700 border-teal-200",
  "good":       "bg-blue-100 text-blue-700 border-blue-200",
  "fair":       "bg-yellow-100 text-yellow-700 border-yellow-200",
  "poor":       "bg-red-100 text-red-700 border-red-200",
};

const CONDITION_DESC: Record<string, string> = {
  "new":        "Never used, in original packaging",
  "brand-new":  "Never used, in original packaging",
  "like new":   "Used once or twice, excellent condition",
  "like-new":   "Used once or twice, excellent condition",
  "good":       "Used but well maintained",
  "fair":       "Shows wear but fully functional",
  "poor":       "Significant wear, may need repair",
};

function getProductImages(image: string) {
  return image ? [image] : [];
}

interface RelatedItem { id: number; public_id: string; title: string; price: string; image: string | null; category: string }

function RelatedListingsBox({ category, excludeId }: { category: string; excludeId: number | string }) {
  const [items, setItems] = useState<RelatedItem[]>([]);
  useEffect(() => {
    fetch(`/api/promotions/related?category=${encodeURIComponent(category)}&exclude=${excludeId}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: RelatedItem[]) => {
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setItems(shuffled.slice(0, 3));
      })
      .catch(() => {});
  }, [category, excludeId]);

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#F26B21]/10 flex items-center justify-center flex-shrink-0">
          <Flame className="w-3.5 h-3.5 text-[#F26B21]" />
        </div>
        <h3 className="text-sm font-bold text-gray-900">Featured in this Category</h3>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <Link key={item.id} href={`/listing/${item.public_id ?? item.id}`} className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.image
                ? <img src={item.image} alt={item.title} className="w-full h-full object-contain p-1" />
                : <Package className="w-5 h-5 text-gray-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-[#4A5CE8] transition-colors">{item.title}</p>
              <p className="text-sm font-bold text-gray-900 mt-0.5">£{Number(item.price).toFixed(2)}</p>
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400">Sponsored · <Link href="/promotions" className="hover:text-[#4A5CE8] transition-colors">Promote your listing</Link></p>
      </div>
    </div>
  );
}

function SellerCard({ sellerName, sellerUsername, location, verified }: { sellerName: string; sellerUsername?: string; location: string; verified: boolean }) {
  const initial = sellerName.charAt(0).toUpperCase();
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-4">Seller Information</h3>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {initial}
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-gray-900 text-sm">{sellerName}</p>
            {verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          </div>
          {sellerUsername && <p className="text-xs text-gray-400 mt-0.5">@{sellerUsername}</p>}
          {!sellerUsername && <p className="text-xs text-gray-400 mt-0.5">Bazunk seller</p>}
        </div>
      </div>

      <div className="space-y-2 mb-4 text-xs text-gray-500">
        <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" />{location}</div>
        {verified && (
          <div className="flex items-center gap-2 text-emerald-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />ID Verified Seller</div>
        )}
      </div>
    </div>
  );
}

function normaliseCondition(raw: unknown): string {
  const s = String(raw ?? "").toLowerCase().trim();
  if (s === "brand-new" || s === "brand new") return "brand-new";
  if (s === "like-new" || s === "like new") return "like-new";
  if (s === "new") return "new";
  if (s === "good") return "good";
  if (s === "fair") return "fair";
  if (s === "poor") return "poor";
  return "good";
}

type SpecRow = { key: string; value: string };
type ApiListingExtra = { _sellerName?: string; _sellerUsername?: string; _publicId?: string | null; _promotions?: string[]; _tags?: string[]; _specifications?: SpecRow[]; subcategory?: string; extra_categories?: string };

const TAG_COLORS = [
  "bg-[#4A5CE8]/10 text-[#4A5CE8]",
  "bg-[#F26B21]/10 text-[#F26B21]",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-pink-100 text-pink-700",
  "bg-amber-100 text-amber-700",
  "bg-cyan-100 text-cyan-700",
];

function mapApiToProduct(l: Record<string, unknown>): typeof ALL_PRODUCTS[0] & ApiListingExtra {
  let parsedSpecs: SpecRow[] | undefined;
  try { parsedSpecs = l.specifications ? JSON.parse(l.specifications as string) : undefined; } catch { parsedSpecs = undefined; }
  const tagsRaw = typeof l.tags === "string" && l.tags.trim() ? l.tags.split(",").map((t) => t.trim()).filter(Boolean) : undefined;
  return {
    id: l.id as number,
    title: l.title as string,
    price: parseFloat(l.price as string),
    condition: normaliseCondition(l.condition) as typeof ALL_PRODUCTS[0]["condition"],
    category: (l.category as string) ?? "",
    subcategory: (l.subcategory as string) ?? "",
    image: (l.image as string) ?? "",
    views: (l.views as number) ?? 0,
    watchers: (l.watchers as number) ?? 0,
    verified: (l.sellerVerified as boolean) ?? false,
    location: "UK",
    listed: (l.createdAt as string) ?? new Date().toISOString(),
    description: (l.description as string) ?? "",
    extra_categories: (l.extraCategories as string) ?? "",
    _sellerName: (l.sellerName as string) ?? "Seller",
    _sellerUsername: (l.sellerUsername as string) ?? undefined,
    _publicId: (l.publicId as string) ?? null,
    _promotions: Array.isArray(l.promotions) ? (l.promotions as string[]) : [],
    _tags: tagsRaw,
    _specifications: parsedSpecs,
  } as unknown as typeof ALL_PRODUCTS[0] & ApiListingExtra;
}

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useWouter();
  const staticProduct = ALL_PRODUCTS.find((p) => p.id === parseInt(id ?? "0"));
  const [apiProduct, setApiProduct] = useState<(typeof ALL_PRODUCTS[0] & ApiListingExtra) | null>(null);
  const [loading, setLoading] = useState(!staticProduct);

  useEffect(() => {
    if (!staticProduct && id) {
      setLoading(true);
      fetch(`/api/listings/${id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data?.id) setApiProduct(mapApiToProduct(data)); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [id, staticProduct]);

  const product = staticProduct ?? apiProduct;

  const { addToCart, openCart } = useCart();
  const { addToWatchlist, removeFromWatchlist, isWatched } = useWatchlist();
  const { makeOffer } = useOffers();
  const { formatPrice } = useCurrency();
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [activeImg, setActiveImg] = useState(0);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPreset, setOfferPreset] = useState<number | null>(null);
  const [offerCustom, setOfferCustom] = useState("");
  const [offerMsg, setOfferMsg] = useState("");
  const [offerSent, setOfferSent] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  const [watchToast, setWatchToast] = useState<"added" | "removed" | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-[#F26B21] border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center flex-col gap-4 text-center py-20">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
            <Package className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Listing not found</h2>
          <p className="text-gray-400 text-sm">This item may have been removed or sold.</p>
          <Link href="/browse" className="px-6 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-semibold text-sm hover:opacity-90 transition-opacity">
            Browse Listings
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const images = getProductImages(product.image);
  // Resolve top-level category and optional subcategory label.
  // Handles both new data (category=top-slug, subcategory=sub-slug) and
  // old imports where a subcategory slug was mistakenly stored in the category column.
  const richProduct = product as typeof product & ApiListingExtra;
  let category = CATEGORIES.find((c) => c.slug === product.category);
  let subcategoryLabel: string | null = null;
  if (!category) {
    // Fallback: category column contains a subcategory slug (old data)
    for (const cat of CATEGORIES) {
      const sub = cat.subcategories.find((s) => s.slug === product.category);
      if (sub) { category = cat; subcategoryLabel = sub.name; break; }
    }
  }
  if (category && !subcategoryLabel && richProduct.subcategory) {
    const sub = category.subcategories.find((s) => s.slug === richProduct.subcategory);
    if (sub) subcategoryLabel = sub.name;
  }
  const similar = ALL_PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);

  function handlePrevImg() { setActiveImg((i) => (i === 0 ? images.length - 1 : i - 1)); }
  function handleNextImg() { setActiveImg((i) => (i === images.length - 1 ? 0 : i + 1)); }

  function handleBuyNow() {
    if (product) { addToCart(product); openCart(); }
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: product?.title ?? "Bazunk listing", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  }

  function handleReport() {
    setReported(true);
    setTimeout(() => setReported(false), 3000);
  }

  function handleWatchlist() {
    if (!product) return;
    if (isWatched(product.id)) {
      removeFromWatchlist(product.id);
      setWatchToast("removed");
    } else {
      addToWatchlist(product);
      setWatchToast("added");
    }
    setTimeout(() => setWatchToast(null), 2000);
  }

  const offerPrice = offerPreset ?? (offerCustom ? parseFloat(offerCustom) : 0);
  const offerRatio = product ? offerPrice / product.price : 0;

  function handleSendOffer() {
    if (!offerPrice || offerPrice <= 0 || !product) return;
    makeOffer(product, offerPrice, offerMsg.trim() || undefined);
    setOfferSent(true);
    setTimeout(() => {
      setOfferSent(false);
      setOfferOpen(false);
      setOfferPreset(null);
      setOfferCustom("");
      setOfferMsg("");
    }, 3500);
  }

  function resetOfferModal() {
    setOfferOpen(false);
    setOfferPreset(null);
    setOfferCustom("");
    setOfferMsg("");
    setOfferSent(false);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-6xl">

        {/* Back link */}
        <button
          onClick={() => navigate("/browse")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#4A5CE8] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Browse
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-5 flex-wrap">
          <Link href="/" className="hover:text-[#4A5CE8] transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/browse" className="hover:text-[#4A5CE8] transition-colors">Browse</Link>
          {category && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/browse?category=${category.slug}`} className="hover:text-[#4A5CE8] transition-colors">{category.name}</Link>
            </>
          )}
          {category && subcategoryLabel && (
            <>
              <ChevronRight className="w-3 h-3" />
              <Link href={`/browse?category=${category.slug}&sub=${richProduct.subcategory || product.category}`} className="hover:text-[#4A5CE8] transition-colors">{subcategoryLabel}</Link>
            </>
          )}
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-600 line-clamp-1 max-w-[200px]">{product.title}</span>
        </nav>

        {/* Extra categories tags */}
        {(() => {
          const extras: { category: string; subcategory: string }[] = (() => {
            try { return richProduct.extra_categories ? JSON.parse(richProduct.extra_categories) : []; } catch { return []; }
          })();
          if (!extras.length) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className="text-xs text-gray-500 font-semibold">Also in:</span>
              {extras.map((ec, i) => {
                const cat = CATEGORIES.find(c => c.slug === ec.category);
                const sub = cat?.subcategories.find(s => s.slug === ec.subcategory);
                return (
                  <Link key={i} href={`/browse?category=${ec.category}${ec.subcategory ? `&sub=${ec.subcategory}` : ""}`}
                    className="inline-flex items-center text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full hover:bg-indigo-100 transition-colors">
                    {cat?.name ?? ec.category}{sub ? ` › ${sub.name}` : ""}
                  </Link>
                );
              })}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Image gallery + details */}
          <div className="lg:col-span-2 space-y-5">

            {/* Image gallery */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Main image */}
              <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
                <motion.img
                  key={activeImg}
                  src={images[activeImg]}
                  alt={product.title}
                  className="w-full h-full object-contain p-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                />
                {/* Nav arrows */}
                {images.length > 1 && (
                  <>
                    <button onClick={handlePrevImg} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors" data-testid="button-prev-image">
                      <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </button>
                    <button onClick={handleNextImg} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:bg-white transition-colors" data-testid="button-next-image">
                      <ChevronRight className="w-5 h-5 text-gray-700" />
                    </button>
                  </>
                )}
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${CONDITION_COLORS[product.condition]}`}>
                      {product.condition}
                    </span>
                    {product.verified && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500 text-white flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  {(() => {
                    const promos: string[] = (product as unknown as { _promotions?: string[] })._promotions ?? [];
                    if (promos.includes("homepage-spotlight") || promos.includes("spotlight")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#F26B21] text-white flex items-center gap-1 w-fit shadow-md">
                        <Zap className="w-3 h-3 fill-white" /> Homepage Spotlight
                      </span>
                    );
                    if (promos.includes("premium-placement")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-pink-500 text-white flex items-center gap-1 w-fit shadow-md">
                        👑 Premium Placement
                      </span>
                    );
                    if (promos.includes("featured-badge") || promos.includes("featured")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-400 text-white flex items-center gap-1 w-fit shadow-md">
                        ⭐ Featured Listing
                      </span>
                    );
                    if (promos.includes("visibility-boost") || promos.includes("move-to-top") || promos.includes("flash")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#4A5CE8] text-white flex items-center gap-1 w-fit shadow-md">
                        <TrendingUp className="w-3 h-3" /> Boosted
                      </span>
                    );
                    if (promos.includes("badge-new-listing")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-orange-500 text-white flex items-center gap-1 w-fit shadow-md">
                        🔥 Hot Seller
                      </span>
                    );
                    if (promos.includes("badge-price-reduced")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-red-500 text-white flex items-center gap-1 w-fit shadow-md">
                        🏷️ Price Reduced
                      </span>
                    );
                    if (promos.includes("badge-renovated")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-teal-500 text-white flex items-center gap-1 w-fit shadow-md">
                        🔨 Recently Renovated
                      </span>
                    );
                    if (promos.includes("badge-best-seller")) return (
                      <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-500 text-white flex items-center gap-1 w-fit shadow-md">
                        🏆 Best Seller
                      </span>
                    );
                    return null;
                  })()}
                </div>
                {/* Wishlist */}
                <button
                  onClick={() => product && (isWatched(product.id) ? removeFromWatchlist(product.id) : addToWatchlist(product))}
                  className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                  data-testid="button-wishlist"
                >
                  <Heart className={`w-4 h-4 ${product && isWatched(product.id) ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
                </button>
              </div>

              {/* Thumbnails */}
              <div className="flex gap-2 p-3 bg-white border-t border-gray-100">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors flex-shrink-0 ${activeImg === i ? "border-[#4A5CE8]" : "border-gray-200 hover:border-gray-300"}`}
                    data-testid={`button-thumbnail-${i}`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-1.5 bg-gray-50" />
                  </button>
                ))}
              </div>
            </div>

            {/* Description & Details */}
            {(() => {
              const extra = product as typeof product & ApiListingExtra;
              const specs = extra._specifications ?? [];
              const tags = extra._tags ?? [];
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  {/* Gradient header */}
                  <div className="bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED] px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <h2 className="font-bold text-white text-base">Description & Details</h2>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#4A5CE8]" /> Description
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                        {product.description && product.description.trim()
                          ? product.description
                              // Strip legacy Amazon footer added before it was removed from imports
                              .replace(/\n+Product sourced from Amazon UK\.[\s\S]*$/, "")
                              // Strip any "See more" at end
                              .replace(/\s*[Ss]ee\s+more\.?\s*$/, "")
                              .trim()
                          : "No description provided."}
                      </p>
                    </div>

                    {/* Specifications */}
                    {specs.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                          <List className="w-4 h-4 text-[#F26B21]" /> Specifications
                        </h3>
                        <div className="rounded-xl overflow-hidden border border-gray-100">
                          {specs.map((spec, i) => (
                            <div key={i} className={`flex items-center px-4 py-2.5 text-sm ${i % 2 === 0 ? "bg-blue-50" : "bg-white"}`}>
                              <span className="font-semibold text-gray-600 w-36 flex-shrink-0">{spec.key}</span>
                              <span className="text-gray-900 font-medium">{spec.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                          <Hash className="w-4 h-4 text-emerald-500" /> Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {tags.map((tag, i) => (
                            <span key={i} className={`px-3 py-1 rounded-full text-xs font-semibold ${TAG_COLORS[i % TAG_COLORS.length]}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Item Details table */}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-violet-500" /> Item Details
                      </h3>
                      <div className="rounded-xl overflow-hidden border border-gray-100">
                        {([
                          { label: "Condition", value: <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${CONDITION_COLORS[product.condition]}`}>{product.condition}</span>, bg: "bg-orange-50" },
                          { label: "Condition Note", value: CONDITION_DESC[product.condition], bg: "bg-white" },
                          { label: "Category", value: category?.name ?? product.category, bg: "bg-violet-50" },
                          { label: "Location", value: product.location, bg: "bg-white" },
                          { label: "Listed", value: new Date(product.listed).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), bg: "bg-emerald-50" },
                          { label: "Listing ID", value: `#SBD${product.id.toString().padStart(6, "0")}`, bg: "bg-white" },
                        ] as { label: string; value: ReactNode; bg: string }[]).map(({ label, value, bg }) => (
                          <div key={label} className={`flex items-center px-4 py-2.5 text-sm ${bg}`}>
                            <span className="font-semibold text-gray-500 w-36 flex-shrink-0">{label}</span>
                            <span className="text-gray-900">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" />{product.views.toLocaleString()} views</span>
                      <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />{product.watchers} watching</span>
                      <button onClick={handleShare} className={`flex items-center gap-1.5 ml-auto transition-colors ${copied ? "text-emerald-600" : "hover:text-[#4A5CE8]"}`} data-testid="button-share">
                        <Share2 className="w-3.5 h-3.5" /> {copied ? "Copied!" : "Share"}
                      </button>
                      <button onClick={handleReport} className={`flex items-center gap-1.5 transition-colors ${reported ? "text-emerald-600" : "text-red-400 hover:text-red-500"}`} data-testid="button-report">
                        <Flag className="w-3.5 h-3.5" /> {reported ? "Reported" : "Report"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Trust signals */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Buying safely</h3>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { icon: Shield, title: "Secure Checkout", desc: "Pay via Bazunk" },
                  { icon: Truck,  title: "Seller Ships",    desc: "Arranged by seller"  },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <div key={t.title} className="flex flex-col items-center text-center gap-2 p-3 bg-gray-50 rounded-xl">
                      <div className="w-9 h-9 rounded-full bg-[#4A5CE8]/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#4A5CE8]" />
                      </div>
                      <p className="text-xs font-semibold text-gray-800">{t.title}</p>
                      <p className="text-[10px] text-gray-400">{t.desc}</p>
                    </div>
                  );
                })}
              </div>
              <BuyerProtectionBadge />
            </div>
          </div>

          {/* Right: Price + actions + seller */}
          <div className="space-y-4">

            {/* Price card */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <h1 className="text-base font-semibold text-gray-800 leading-snug mb-3">{product.title}</h1>

              {(() => {
                const priceDelta = product.variants
                  ? product.variants.reduce((sum, v) => {
                      const sel = v.options.find((o) => o.value === selectedVariants[v.type]);
                      return sum + (sel?.priceDelta ?? 0);
                    }, 0)
                  : 0;
                const totalPrice = product.price + priceDelta;
                return (
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-gray-900">{formatPrice(totalPrice)}</span>
                  </div>
                );
              })()}

              {/* Variants */}
              {product.variants && product.variants.length > 0 && (
                <div className="mb-5 pb-5 border-b border-gray-100">
                  <VariantSelector
                    variants={product.variants}
                    selected={selectedVariants}
                    onChange={(type, value) =>
                      setSelectedVariants((prev) => ({ ...prev, [type]: value }))
                    }
                    formatPrice={formatPrice}
                  />
                </div>
              )}

              {/* Buy Now */}
              <button
                onClick={handleBuyNow}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all mb-2.5 shadow-sm bg-gradient-to-r from-[#F26B21] to-[#D97706] text-white hover:opacity-90"
                data-testid="button-buy-now"
              >
                <ShoppingCart className="w-4 h-4" />
                Buy It Now
              </button>

              {/* Make an Offer */}
              <button
                onClick={() => setOfferOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm border-2 border-[#4A5CE8] text-[#4A5CE8] hover:bg-[#4A5CE8]/5 transition-colors mb-2.5"
                data-testid="button-make-offer"
              >
                <Tag className="w-4 h-4" /> Make an Offer
              </button>

              {/* Message Seller */}
              <button
                onClick={() => navigate("/messages")}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm border border-gray-200 text-gray-700 hover:border-gray-300 transition-colors mb-4"
                data-testid="button-message-seller"
              >
                <MessageSquare className="w-4 h-4" /> Message Seller
              </button>

              {/* Watchlist */}
              <button
                onClick={handleWatchlist}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${
                  product && isWatched(product.id)
                    ? "bg-red-50 border-red-200 text-red-500"
                    : "border-gray-100 text-gray-500 hover:border-red-200 hover:text-red-400"
                }`}
                data-testid="button-add-watchlist"
              >
                <Heart className={`w-4 h-4 ${product && isWatched(product.id) ? "fill-red-500" : ""}`} />
                {watchToast === "added" ? "✓ Added to Watchlist!" : watchToast === "removed" ? "Removed" : product && isWatched(product.id) ? "Saved to Watchlist" : "Add to Watchlist"}
              </button>

              {/* Meta */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{product.views} views</span>
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{product.watchers} watching</span>
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{product.location}</span>
              </div>
            </div>

            {/* Seller card */}
            <SellerCard
              sellerName={(product as typeof product & ApiListingExtra)._sellerName ?? product.title.split(" ")[0]}
              sellerUsername={(product as typeof product & ApiListingExtra)._sellerUsername}
              location={product.location}
              verified={product.verified}
            />

            {/* Engagement contact buttons — shown when seller has engagement-boost promo */}
            {(() => {
              const promos: string[] = (product as unknown as { _promotions?: string[] })._promotions ?? [];
              if (!promos.includes("engagement-boost")) return null;
              return (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#4A5CE8]" /> Contact Seller
                  </h3>
                  <div className="space-y-2">
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors">
                      <MessageSquare className="w-4 h-4" /> Ask a Question
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors">
                      <Calendar className="w-4 h-4" /> Schedule a Visit
                    </button>
                    <button className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-[#4A5CE8] hover:text-[#4A5CE8] transition-colors">
                      <Mail className="w-4 h-4" /> Request More Info
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Related listings sidebar — randomly rotated featured listings in same category */}
            <RelatedListingsBox
              category={product.category}
              excludeId={product.id}
            />
          </div>
        </div>

        {/* Similar Listings */}
        {similar.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-gray-900">Similar Listings</h2>
              <Link href={`/browse?category=${product.category}`} className="text-sm text-[#4A5CE8] font-semibold hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similar.map((p) => (
                <Link key={p.id} href={`/listing/${p.id}`}>
                  <motion.div
                    whileHover={{ y: -4 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer group"
                    data-testid={`card-similar-${p.id}`}
                  >
                    <div className="aspect-square bg-gray-50 p-3 relative">
                      <img src={p.image} alt={p.title} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      <span className={`absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${CONDITION_COLORS[p.condition]}`}>{p.condition}</span>
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-semibold text-gray-800 line-clamp-2 group-hover:text-[#4A5CE8] transition-colors">{p.title}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</span>
                        {p.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Make an Offer modal */}
      <AnimatePresence>
        {offerOpen && product && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-50"
              onClick={resetOfferModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#3B4FD8] to-[#4A5CE8] px-5 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <img src={product.image} alt="" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white line-clamp-1">{product.title}</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Asking price: <span className="font-bold">£{product.price.toFixed(2)}</span></p>
                  </div>
                  <button onClick={resetOfferModal} className="text-white/60 hover:text-white transition-colors">
                    <Star className="w-4 h-4 rotate-45" style={{ transform: "rotate(45deg)" }} />
                  </button>
                </div>

                <div className="p-5">
                  {offerSent ? (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-6">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }}
                        className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      </motion.div>
                      <p className="font-bold text-gray-900 text-lg">Offer Sent! 🎉</p>
                      <p className="text-sm text-gray-400 mt-1 mb-4">The seller is reviewing your offer of <span className="font-bold text-gray-700">£{offerPrice.toFixed(2)}</span>.</p>
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={resetOfferModal}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Done
                        </button>
                        <button
                          onClick={() => { resetOfferModal(); navigate("/offers"); }}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" /> My Offers
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <>
                      {/* Quick presets */}
                      <p className="text-xs font-semibold text-gray-500 mb-2">Quick offers</p>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[0.9, 0.85, 0.8, 0.75].map((ratio) => {
                          const price = parseFloat((product.price * ratio).toFixed(2));
                          const pct = Math.round((1 - ratio) * 100);
                          const active = offerPreset === price;
                          return (
                            <button
                              key={ratio}
                              onClick={() => { setOfferPreset(active ? null : price); setOfferCustom(""); }}
                              className={`flex flex-col items-center py-2 rounded-xl border-2 transition-colors text-center ${
                                active ? "border-[#4A5CE8] bg-[#4A5CE8]/5" : "border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <span className={`text-xs font-bold ${active ? "text-[#4A5CE8]" : "text-gray-800"}`}>
                                £{price.toFixed(0)}
                              </span>
                              <span className="text-[9px] text-gray-400 mt-0.5">−{pct}%</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom input */}
                      <p className="text-xs font-semibold text-gray-500 mb-2">Or enter a custom amount</p>
                      <div className="relative mb-3">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold">£</span>
                        <input
                          type="number"
                          min="1"
                          max={product.price * 2}
                          value={offerCustom}
                          onChange={(e) => { setOfferCustom(e.target.value); setOfferPreset(null); }}
                          placeholder="Custom amount"
                          className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-base font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                          data-testid="input-offer-amount"
                        />
                      </div>

                      {/* Feedback */}
                      {offerPrice > 0 && (
                        <p className={`text-xs mb-3 font-medium ${
                          offerRatio < 0.7 ? "text-red-500" :
                          offerRatio < 0.85 ? "text-amber-600" :
                          offerRatio < 1 ? "text-emerald-600" : "text-emerald-700"
                        }`}>
                          {offerRatio < 0.7
                            ? "⚠ Very low — seller is likely to decline this offer"
                            : offerRatio < 0.85
                            ? `💬 Reasonable — seller may counter at around £${(product.price * 0.93).toFixed(2)}`
                            : offerRatio < 1
                            ? `✓ Strong offer — ${Math.round((1 - offerRatio) * 100)}% below asking, likely to be accepted`
                            : "✓ At or above asking price — almost certain to be accepted!"}
                        </p>
                      )}

                      {/* Optional message */}
                      <textarea
                        value={offerMsg}
                        onChange={(e) => setOfferMsg(e.target.value)}
                        placeholder="Add a message to the seller (optional)"
                        rows={2}
                        maxLength={200}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none mb-1"
                      />
                      <p className="text-right text-[10px] text-gray-400 mb-4">{offerMsg.length}/200</p>

                      <div className="flex gap-3">
                        <button onClick={resetOfferModal}
                          className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors"
                          data-testid="button-cancel-offer">
                          Cancel
                        </button>
                        <button
                          onClick={handleSendOffer}
                          disabled={!offerPrice || offerPrice <= 0}
                          className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#3B4FD8] to-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 shadow-sm"
                          data-testid="button-send-offer">
                          {offerPrice > 0 ? `Send Offer · £${offerPrice.toFixed(2)}` : "Send Offer"}
                        </button>
                      </div>
                      <p className="text-center text-[10px] text-gray-400 mt-3">Offer expires in 48 hours · Seller typically responds in &lt; 1 hour</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

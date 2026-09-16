import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Heart, Eye, CheckCircle2, Flame, ArrowRight, Zap, Star, Crown, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useCurrency } from "@/context/CurrencyContext";

interface Listing {
  id: number;
  publicId: string;
  title: string;
  price: string;
  condition: string;
  image?: string | null;
  views: number;
  category: string;
  promotions: string[];
  sellerName: string;
}

const CONDITION_COLORS: Record<string, string> = {
  "New":      "bg-emerald-50 text-emerald-700",
  "Like New": "bg-blue-50 text-blue-700",
  "Good":     "bg-amber-50 text-amber-700",
  "Fair":     "bg-orange-50 text-orange-700",
  "Poor":     "bg-red-50 text-red-700",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function PromoBadge({ promotions }: { promotions: string[] }) {
  if (promotions.includes("homepage-spotlight") || promotions.includes("spotlight")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#F26B21] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
        <Zap className="w-2.5 h-2.5 fill-white" /> SPOTLIGHT
      </div>
    );
  }
  if (promotions.includes("premium-placement")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-pink-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
        <Crown className="w-2.5 h-2.5" /> PREMIUM
      </div>
    );
  }
  if (promotions.includes("featured-badge") || promotions.includes("featured")) {
    return (
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-amber-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
        <Star className="w-2.5 h-2.5 fill-white" /> FEATURED
      </div>
    );
  }
  return (
    <div className="absolute top-2.5 left-2.5 flex items-center gap-1 bg-[#F26B21] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
      <Flame className="w-2.5 h-2.5 fill-white" /> HOT
    </div>
  );
}

export function FeaturedListings() {
  const { formatPrice } = useCurrency();
  const [spotlightListings, setSpotlightListings] = useState<Listing[]>([]);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [spotlightRes, recentRes] = await Promise.all([
          fetch("/api/listings/spotlight"),
          fetch("/api/listings?limit=16"),
        ]);
        if (spotlightRes.ok) {
          const data = await spotlightRes.json();
          setSpotlightListings(Array.isArray(data) ? shuffle(data) : []);
        }
        if (recentRes.ok) {
          const data = await recentRes.json();
          setRecentListings(Array.isArray(data) ? shuffle(data) : []);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const hasSpotlight = spotlightListings.length > 0;
  const displayListings = hasSpotlight ? spotlightListings : recentListings;

  function updateScrollButtons() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);
    return () => {
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [displayListings]);

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }

  if (loading) {
    return (
      <section className="py-12 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-52 shrink-0 rounded-2xl bg-gray-100 animate-pulse aspect-[3/4]" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (displayListings.length === 0) return null;

  return (
    <section className="py-12 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-xs font-black text-[#F26B21] uppercase tracking-widest mb-1"
            >
              {hasSpotlight ? "Promoted Listings" : "Trending Today"}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-2xl md:text-3xl font-black text-gray-900"
            >
              {hasSpotlight ? "Homepage Spotlight" : "Featured Listings"}
            </motion.h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Scroll arrows */}
            <button
              onClick={() => scrollBy(-700)}
              disabled={!canScrollLeft}
              className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => scrollBy(700)}
              disabled={!canScrollRight}
              className="hidden sm:flex w-9 h-9 rounded-full border border-gray-200 items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <Link href="/browse">
              <button className="flex items-center gap-1.5 text-sm font-bold text-[#4A5CE8] hover:text-[#3B4DD6] transition-colors ml-1">
                Browse All <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>

        {/* Horizontal scroll row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-none pb-2 -mx-4 px-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {displayListings.map((listing, index) => (
            <Link key={listing.id} href={`/listing/${listing.publicId}`}>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.04, 0.3) }}
                style={{ scrollSnapAlign: "start" }}
                className="w-52 shrink-0 group bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 overflow-hidden cursor-pointer"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gray-100 overflow-hidden">
                  {listing.image ? (
                    <img
                      src={listing.image}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-50">
                      <Package className="w-12 h-12 text-gray-200" />
                    </div>
                  )}

                  <PromoBadge promotions={listing.promotions} />

                  <button className="absolute top-2.5 right-2.5 w-7 h-7 bg-white rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100 z-10">
                    <Heart className="w-3.5 h-3.5" />
                  </button>

                  <div className="absolute bottom-2.5 left-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CONDITION_COLORS[listing.condition] ?? CONDITION_COLORS["Good"]}`}>
                      {listing.condition}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className="p-3.5 pt-3">
                  <p className="text-sm font-medium text-gray-800 line-clamp-2 min-h-[2.5rem] mb-2 group-hover:text-[#4A5CE8] transition-colors leading-snug">
                    {listing.title}
                  </p>

                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base font-black text-[#F26B21]">
                      {formatPrice(parseFloat(listing.price))}
                    </span>
                    {listing.views > 0 && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Eye className="w-3 h-3" /> {listing.views.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {listing.sellerName || "Verified Seller"}
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}

          {/* Browse All end card */}
          <Link href="/browse">
            <div className="w-52 shrink-0 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-[#4A5CE8] hover:bg-[#4A5CE8]/5 transition-all group" style={{ minHeight: "280px" }}>
              <div className="w-12 h-12 rounded-full bg-[#4A5CE8]/10 flex items-center justify-center group-hover:bg-[#4A5CE8]/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-[#4A5CE8]" />
              </div>
              <p className="text-sm font-bold text-gray-500 group-hover:text-[#4A5CE8] transition-colors text-center px-4">
                Browse All Listings
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

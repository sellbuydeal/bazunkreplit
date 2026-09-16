import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import {
  Radio, Users, Clock, ExternalLink, ShoppingCart,
  ChevronLeft, Share2, CheckCircle2, Heart,
  ArrowRight, Bell, BellOff, Tag, MessageSquare, Zap, AlertTriangle, X,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useLiveStream } from "@/context/LiveStreamContext";
import { PLATFORM_META, extractEmbedSrc } from "@/data/livestreams";
import { LiveKitViewer } from "@/components/LiveKitViewer";
import { useCart } from "@/context/CartContext";

function timeOnAir(startedAt: string): string {
  const mins = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);
  if (mins < 60) return `${mins}m on air`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m on air`;
}

function PlatformBadge({ platform }: { platform: string }) {
  const labels: Record<string, string> = {
    youtube: "YT", twitch: "TV", tiktok: "TT",
    zoom: "ZM", instagram: "IG", facebook: "FB",
  };
  const meta = PLATFORM_META[platform as keyof typeof PLATFORM_META];
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md ${meta?.bg ?? "bg-gray-400"} text-white text-[10px] font-black`}>
      {labels[platform] ?? "??"}
    </span>
  );
}

/* ─── Live Hub — /live ─── */
export function LiveHubPage() {
  const { sessions } = useLiveStream();
  const live = sessions.filter((s) => s.isLive);
  const upcoming = sessions.filter((s) => !s.isLive);

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-950 border-b border-gray-800">
        <Navbar />
      </div>

      <main className="max-w-6xl mx-auto w-full px-4 py-10 flex-1">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <span className="flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
            </span>
          </div>
          <h1 className="text-2xl font-black text-white">Live Now</h1>
          <span className="text-sm font-bold text-gray-500">{live.length} stream{live.length !== 1 ? "s" : ""} active</span>
        </div>

        {/* Live streams */}
        {live.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
              <Radio className="w-10 h-10 text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">No streams live right now</h2>
            <p className="text-gray-500 text-sm max-w-sm">Check back soon — sellers go live every day. You can also watch past streams or browse listings.</p>
            <Link href="/browse" className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
              Browse Listings <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {live.map((session) => {
              const meta = PLATFORM_META[session.platform as keyof typeof PLATFORM_META];
              return (
                <Link key={session.id} href={`/live/${session.id}`}>
                  <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-600 hover:shadow-xl hover:shadow-black/40 transition-all group cursor-pointer">
                    {/* Thumbnail placeholder */}
                    <div className={`h-40 ${meta.bg} flex items-center justify-center relative`}>
                      <span className="text-white text-4xl font-black opacity-20">{session.sellerInitials}</span>
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full">
                        <span className="flex h-1.5 w-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        LIVE
                      </div>
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs font-semibold px-2 py-1 rounded-full backdrop-blur-sm">
                        <Users className="w-3 h-3" /> {session.viewerCount.toLocaleString()}
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#F26B21] flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {session.sellerInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-bold text-sm truncate">{session.sellerName}</p>
                          <p className="text-gray-500 text-xs">{meta.label}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm font-medium line-clamp-2 mb-3">{session.title}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">{session.productIds.length} items for sale</span>
                        <span className="text-xs font-bold text-[#F26B21] group-hover:underline">Watch & Shop →</span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <>
            <h2 className="text-lg font-bold text-white mb-4">Upcoming Streams</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.map((session) => {
                const meta = PLATFORM_META[session.platform as keyof typeof PLATFORM_META];
                return (
                  <div key={session.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl ${meta.bg} flex items-center justify-center text-white font-black text-sm flex-shrink-0`}>
                      {session.sellerInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{session.sellerName}</p>
                      <p className="text-gray-400 text-xs line-clamp-1">{session.title}</p>
                      {session.scheduledAt && (
                        <p className="text-gray-600 text-[10px] mt-0.5 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {new Date(session.scheduledAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded-full flex-shrink-0">Soon</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

type LiveProduct = { id: number; title: string; price: number | string; images: string[]; condition?: string; public_id?: string };

/* ─── Live Room — /live/:id ─── */
export function LivePage() {
  const { id } = useParams<{ id: string }>();
  const { sessions, getFeatured } = useLiveStream();
  const { addToCart: addItem } = useCart();

  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [offerProduct, setOfferProduct] = useState<LiveProduct | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSent, setOfferSent] = useState(false);
  const prevFeaturedAtRef = useRef<number | null>(null);
  const [spotlightKey, setSpotlightKey] = useState(0);
  const [liveListings, setLiveListings] = useState<LiveProduct[]>([]);

  const session = sessions.find((s) => s.id === id);

  const [viewerCount, setViewerCount] = useState(
    () => (session?.viewerCount ?? 0) + Math.floor(Math.random() * 40) + 15
  );

  useEffect(() => {
    const t = setInterval(() => {
      setViewerCount((c) => Math.max(1, c + Math.floor(Math.random() * 5) - 2));
    }, 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!session || session.productIds.length === 0) return;
    fetch(`/api/listings?ids=${session.productIds.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const items: LiveProduct[] = Array.isArray(data) ? data : (data.listings ?? []);
        setLiveListings(items.filter((p) => session.productIds.includes(p.id)));
      })
      .catch(() => {});
  }, [session?.id]);

  const featuredItem = session ? getFeatured(session.id) : null;
  const featuredProduct = featuredItem
    ? (liveListings.find((p) => p.id === featuredItem.productId) ?? null)
    : null;

  useEffect(() => {
    if (featuredItem && featuredItem.featuredAt !== prevFeaturedAtRef.current) {
      prevFeaturedAtRef.current = featuredItem.featuredAt;
      setSpotlightKey((k) => k + 1);
    }
  }, [featuredItem?.featuredAt]);

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-4">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
            <Radio className="w-10 h-10 text-red-300" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Stream not found</h1>
          <p className="text-gray-400 text-sm">This stream may have ended or the link is invalid.</p>
          <Link href="/" className="flex items-center gap-1.5 text-sm font-bold text-[#4A5CE8] hover:underline">
            <ChevronLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const meta = PLATFORM_META[session.platform];
  const embedSrc = meta.canEmbed
    ? extractEmbedSrc(session.platform, session.streamUrl, window.location.hostname)
    : null;

  const products = liveListings;
  const nonFeaturedProducts = products.filter((p) => p.id !== featuredProduct?.id);

  function discountedPrice(price: number | string, discount?: number) {
    const n = Number(price);
    return discount ? n * (1 - discount / 100) : n;
  }

  function handleAddToCart(product: LiveProduct) {
    addItem({ id: product.id, title: product.title, price: Number(product.price), image: product.images?.[0] ?? "" } as never, 1);
    setAddedIds((prev) => new Set(prev).add(product.id));
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function sendOffer() {
    if (!offerAmount.trim() || !offerProduct) return;
    setOfferSent(true);
    setTimeout(() => {
      setOfferSent(false);
      setOfferProduct(null);
      setOfferAmount("");
    }, 2500);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="bg-gray-950 border-b border-gray-800">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: stream ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Title bar */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#F26B21] flex items-center justify-center text-white font-bold text-sm">
                  {session.sellerInitials}
                </div>
                {session.isLive && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-gray-950">
                    <Radio className="w-2 h-2 text-white" />
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-white text-sm">{session.sellerName}</p>
                  <PlatformBadge platform={session.platform} />
                  {session.isLive && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500 text-white animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{session.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <Users className="w-3.5 h-3.5" />
                {viewerCount.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-400 hidden sm:flex">
                <Clock className="w-3.5 h-3.5" />
                {timeOnAir(session.startedAt)}
              </span>
              <button
                onClick={() => setFollowing((f) => !f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  following
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                {following ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                {following ? "Following" : "Follow"}
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Share"}
              </button>
            </div>
          </div>

          {/* Stream embed / link-out */}
          {session.platform === "livekit" ? (
            <div className="w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800" style={{ aspectRatio: "16/9" }}>
              <LiveKitViewer
                roomName={session.streamUrl}
                viewerIdentity={`viewer_${Math.random().toString(36).slice(2, 9)}`}
              />
            </div>
          ) : embedSrc ? (
            <div className="w-full rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
              <iframe
                src={embedSrc}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={session.title}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-2xl bg-gray-900 border border-gray-800 flex flex-col items-center justify-center text-center gap-6 py-20 px-8"
              style={{ minHeight: 320 }}
            >
              <div className={`w-20 h-20 rounded-2xl ${meta.bg} flex items-center justify-center`}>
                <span className="text-white text-2xl font-black">
                  {session.platform.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-white font-bold text-lg mb-2">
                  {session.sellerName} is live on {meta.label}
                </p>
                <p className="text-gray-400 text-sm max-w-sm">
                  {meta.label} doesn't support in-page embedding. Open the stream in a new tab, then come back here to browse and buy the items below.
                </p>
              </div>
              <a
                href={session.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold text-sm hover:opacity-90 transition-opacity ${meta.bg}`}
              >
                <ExternalLink className="w-4 h-4" />
                Watch on {meta.label}
              </a>
            </motion.div>
          )}

          {/* Stream info + chat CTA */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white text-sm mb-1">{session.title}</p>
              <div className="flex flex-wrap gap-3 mt-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${meta.bg}`}>
                  {meta.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />
                  {viewerCount.toLocaleString()} watching
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {timeOnAir(session.startedAt)}
                </span>
              </div>
            </div>
            {session.platform !== "livekit" && (
              <a
                href={session.streamUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <MessageSquare className="w-4 h-4" /> Chat on {meta.label}
              </a>
            )}
          </div>
        </div>

        {/* ── Right column: featured spotlight + products ── */}
        <div className="flex flex-col gap-4">

          {/* Featured Product Spotlight */}
          <AnimatePresence mode="wait">
            {featuredProduct && featuredItem && (
              <motion.div
                key={spotlightKey}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", stiffness: 380, damping: 24 }}
                className="rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-gray-900 shadow-lg shadow-amber-500/10"
              >
                <div className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
                  </span>
                  <span className="text-white text-xs font-black uppercase tracking-widest flex-1">
                    Now Featured
                  </span>
                  {featuredItem.flashDeal && (
                    <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                      FLASH DEAL
                    </span>
                  )}
                </div>

                <div className="p-4">
                  <div
                    className="relative rounded-xl overflow-hidden bg-gray-800 mb-3"
                    style={{ aspectRatio: "1/1" }}
                  >
                    <img
                      src={featuredProduct.images?.[0] ?? ""}
                      alt={featuredProduct.title}
                      className="w-full h-full object-contain p-4"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    {featuredItem.discount && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-lg">
                        -{featuredItem.discount}% OFF
                      </div>
                    )}
                  </div>

                  <p className="font-bold text-white text-sm mb-2 line-clamp-2">
                    {featuredProduct.title}
                  </p>

                  <div className="flex items-baseline gap-2 mb-2">
                    <p className="text-amber-400 font-black text-2xl">
                      £{discountedPrice(featuredProduct.price, featuredItem.discount).toFixed(2)}
                    </p>
                    {featuredItem.discount && (
                      <p className="text-gray-500 text-sm line-through">
                        £{Number(featuredProduct.price).toFixed(2)}
                      </p>
                    )}
                  </div>

                  {featuredItem.stockAlert != null && featuredItem.stockAlert > 0 && (
                    <div className="flex items-center gap-1.5 mb-3 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                      <span className="text-orange-400 text-xs font-bold">
                        Only {featuredItem.stockAlert} remaining!
                      </span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAddToCart(featuredProduct)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-sm transition-all ${
                        addedIds.has(featuredProduct.id)
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500 text-black hover:bg-amber-400"
                      }`}
                    >
                      {addedIds.has(featuredProduct.id) ? (
                        <><CheckCircle2 className="w-4 h-4" /> Added!</>
                      ) : (
                        <><ShoppingCart className="w-4 h-4" /> Buy Now</>
                      )}
                    </button>
                    <button
                      onClick={() => setOfferProduct(featuredProduct)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-amber-500/40 text-amber-400 font-bold text-sm hover:bg-amber-500/10 transition-colors"
                    >
                      <Tag className="w-4 h-4" /> Offer
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Products panel */}
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-white text-sm">Items for Sale</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {products.length} listing{products.length !== 1 ? "s" : ""} in this stream
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F26B21] text-white">
                Buy Now
              </span>
            </div>

            <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Heart className="w-8 h-8 text-gray-700 mb-2" />
                  <p className="text-gray-500 text-sm">No products listed yet</p>
                  <p className="text-gray-600 text-xs mt-1">The seller will add items during the stream</p>
                </div>
              ) : nonFeaturedProducts.length === 0 && featuredProduct ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <p className="text-gray-500 text-sm">All items are featured above</p>
                </div>
              ) : (
                nonFeaturedProducts.map((product) => {
                  const added = addedIds.has(product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center gap-3 p-4 hover:bg-gray-800/50 transition-colors"
                    >
                      <img
                        src={product.images?.[0] ?? ""}
                        alt={product.title}
                        className="w-14 h-14 rounded-xl object-cover bg-gray-800 flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/listing/${product.id}`}
                          className="font-semibold text-white text-xs line-clamp-2 hover:text-[#F26B21] transition-colors"
                        >
                          {product.title}
                        </Link>
                        <p className="font-black text-[#F26B21] text-sm mt-0.5">
                          £{Number(product.price).toFixed(2)}
                        </p>
                        <p className="text-[10px] text-gray-500 capitalize mt-0.5">
                          {product.condition}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleAddToCart(product)}
                          disabled={added}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            added
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-[#F26B21] text-white hover:opacity-80"
                          }`}
                          title="Add to cart"
                        >
                          {added ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <ShoppingCart className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => setOfferProduct(product)}
                          className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center hover:bg-gray-700 transition-colors"
                          title="Make offer"
                        >
                          <Tag className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-800">
              <Link
                href="/browse"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold hover:bg-gray-700 transition-colors"
              >
                Browse all listings <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Make Offer Modal */}
      <AnimatePresence>
        {offerProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => { setOfferProduct(null); setOfferSent(false); }}
          >
            <motion.div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-gray-900 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-800">
                <div>
                  <h3 className="font-black text-white text-lg">Make an Offer</h3>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{offerProduct.title}</p>
                </div>
                <button
                  onClick={() => { setOfferProduct(null); setOfferSent(false); }}
                  className="text-gray-500 hover:text-gray-300 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {offerSent ? (
                <div className="px-6 py-10 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="font-black text-white text-xl mb-2">Offer Sent!</h4>
                  <p className="text-sm text-gray-400">
                    The seller will respond during or after the stream.
                  </p>
                </div>
              ) : (
                <div className="px-6 py-5 space-y-4">
                  <div className="flex items-center gap-3 bg-gray-800 rounded-xl p-3">
                    <img
                      src={offerProduct.images?.[0] ?? ""}
                      alt={offerProduct.title}
                      className="w-12 h-12 rounded-lg object-contain bg-gray-700 p-1 flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white line-clamp-1">{offerProduct.title}</p>
                      <p className="text-xs text-[#F26B21] font-bold">
                        Listed at £{Number(offerProduct.price).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-400 mb-1.5">
                      Your offer (£)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">£</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={offerAmount}
                        onChange={(e) => setOfferAmount(e.target.value)}
                        placeholder={`${(Number(offerProduct.price) * 0.85).toFixed(2)}`}
                        className="w-full pl-8 pr-4 py-3 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-amber-500"
                        autoFocus
                      />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Suggested: £{(Number(offerProduct.price) * 0.7).toFixed(2)} – £{(Number(offerProduct.price) * 0.95).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => { setOfferProduct(null); setOfferAmount(""); }}
                      className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-400 font-semibold text-sm hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={sendOffer}
                      disabled={!offerAmount.trim()}
                      className="flex-1 py-3 rounded-xl bg-amber-500 text-black font-black text-sm hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" /> Send Offer
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-gray-950 border-t border-gray-800">
        <Footer />
      </div>
    </div>
  );
}

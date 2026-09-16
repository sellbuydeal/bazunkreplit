import { useState, useMemo } from "react";
import { useParams, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star, CheckCircle2, MapPin, Calendar, Package, MessageSquare,
  ThumbsUp, ChevronLeft, ShieldCheck, Clock, TrendingUp,
  BarChart2, Flag, ChevronDown, Check, Heart,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ALL_PRODUCTS } from "@/data/products";
import { SELLER_PROFILES, MOCK_REVIEWS, type Review } from "@/data/reviews";
import { useCart } from "@/context/CartContext";
import { useWatchlist } from "@/context/WatchlistContext";

const AVATAR_COLORS = [
  "bg-blue-500","bg-emerald-500","bg-amber-500","bg-purple-500","bg-[#4A5CE8]","bg-rose-500",
];

function StarRow({ rating, count, max }: { rating: number; count: number; max: number }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-xs text-gray-500 w-2">{rating}</span>
      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all"
          style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }}
        />
      </div>
      <span className="text-xs text-gray-400 w-4 text-right">{count}</span>
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-8 h-8 transition-colors ${(hover || value) >= s ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

function ReviewCard({ review, onHelpful }: { review: Review; onHelpful: (id: number) => void }) {
  const [marked, setMarked] = useState(false);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
    >
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${AVATAR_COLORS[review.id % AVATAR_COLORS.length]}`}>
          {review.buyerInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold text-sm text-gray-800">{review.buyerName}</span>
            {review.verified && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Verified Purchase
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
              {new Date(review.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-center gap-1 mb-2">
            {[1,2,3,4,5].map((s) => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
            ))}
            <span className="text-xs font-semibold text-gray-600 ml-1">{STAR_LABELS[review.rating]}</span>
          </div>
          <h4 className="text-sm font-bold text-gray-900 mb-1">{review.title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed mb-2">{review.body}</p>
          <div className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-lg">
            <Package className="w-3 h-3" />
            {review.itemTitle} — £{review.itemPrice.toFixed(2)}
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={() => { if (!marked) { onHelpful(review.id); setMarked(true); } }}
              className={`flex items-center gap-1.5 text-xs transition-colors ${marked ? "text-[#4A5CE8] font-semibold" : "text-gray-400 hover:text-gray-600"}`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 ${marked ? "fill-[#4A5CE8]" : ""}`} />
              Helpful ({review.helpful + (marked ? 1 : 0)})
            </button>
            <button className="text-xs text-gray-300 hover:text-red-400 transition-colors flex items-center gap-1">
              <Flag className="w-3 h-3" /> Report
            </button>
          </div>
        </div>
      </div>
      {review.sellerReply && (
        <div className="mt-4 ml-12 bg-[#4A5CE8]/5 border border-[#4A5CE8]/10 rounded-xl p-3.5">
          <p className="text-xs font-bold text-[#4A5CE8] mb-1">
            Seller's response · {new Date(review.sellerReplyDate!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
          </p>
          <p className="text-sm text-gray-700">{review.sellerReply}</p>
        </div>
      )}
    </motion.div>
  );
}

export function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const sellerId = parseInt(id ?? "1");
  const seller = SELLER_PROFILES.find((s) => s.id === sellerId);
  const { addToCart } = useCart();
  const { addToWatchlist, isWatched, removeFromWatchlist } = useWatchlist();

  const [reviews, setReviews] = useState<Review[]>(
    seller ? MOCK_REVIEWS.filter((r) => r.sellerId === seller.id) : []
  );
  const [sortBy, setSortBy] = useState<"newest" | "highest" | "lowest" | "helpful">("newest");
  const [filterRating, setFilterRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formSubmitted, setFormSubmitted] = useState(false);

  const sellerListings = seller
    ? ALL_PRODUCTS.filter((p) => ((p.id - 1) % Math.max(SELLER_PROFILES.length, 1)) + 1 === seller.id).slice(0, 6)
    : [];

  const breakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    reviews.forEach((r) => counts[r.rating - 1]++);
    return counts;
  }, [reviews]);

  const avgRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const filtered = useMemo(() => {
    let result = [...reviews];
    if (filterRating > 0) result = result.filter((r) => r.rating === filterRating);
    if (sortBy === "newest") result.sort((a, b) => b.date.localeCompare(a.date));
    else if (sortBy === "highest") result.sort((a, b) => b.rating - a.rating);
    else if (sortBy === "lowest") result.sort((a, b) => a.rating - b.rating);
    else if (sortBy === "helpful") result.sort((a, b) => b.helpful - a.helpful);
    return result;
  }, [reviews, filterRating, sortBy]);

  function handleHelpful(id: number) {
    setReviews((prev) => prev.map((r) => r.id === id ? { ...r, helpful: r.helpful + 1 } : r));
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!seller || formRating === 0 || !formTitle.trim() || !formBody.trim()) return;
    const newReview: Review = {
      id: Date.now(),
      sellerId: seller.id,
      buyerName: "You",
      buyerInitials: "YO",
      rating: formRating,
      title: formTitle.trim(),
      body: formBody.trim(),
      itemTitle: "Recent purchase",
      itemPrice: 0,
      date: new Date().toISOString().split("T")[0],
      verified: true,
      helpful: 0,
    };
    setReviews((prev) => [newReview, ...prev]);
    setFormSubmitted(true);
    setTimeout(() => {
      setShowReviewForm(false);
      setFormSubmitted(false);
      setFormRating(0);
      setFormTitle("");
      setFormBody("");
    }, 2500);
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
          <p className="text-5xl mb-4">🔍</p>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Seller not found</h1>
          <p className="text-gray-500 mb-6">This seller profile doesn't exist or has been removed.</p>
          <Link href="/browse" className="px-6 py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity">
            Back to Browse
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const memberSinceStr = new Date(seller.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-5xl flex-1">
        <Link href="/browse" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-6">
          <ChevronLeft className="w-4 h-4" /> Back to listings
        </Link>

        {/* Seller Hero */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-r from-[#4A5CE8] to-[#7C3AED]" />
          <div className="px-6 pb-6">
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className={`w-20 h-20 rounded-2xl ${seller.avatarColor} border-4 border-white shadow-md flex items-center justify-center text-white font-black text-2xl flex-shrink-0`}>
                {seller.initials}
              </div>
              <div className="flex-1 min-w-0 pt-8">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-black text-gray-900">{seller.name}</h1>
                  {seller.verified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{seller.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Member since {memberSinceStr}</span>
                  <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{seller.totalSales} sales</span>
                </div>
              </div>
              <Link
                href="/messages"
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="w-4 h-4" /> Message
              </Link>
            </div>
            {seller.bio && <p className="text-sm text-gray-500 leading-relaxed mb-5">{seller.bio}</p>}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { icon: Star,       label: "Avg. Rating",       value: `${avgRating.toFixed(1)} / 5`,   color: "text-amber-500 bg-amber-50" },
                { icon: TrendingUp, label: "Positive Feedback",  value: `${seller.positivePercent}%`,   color: "text-emerald-600 bg-emerald-50" },
                { icon: Clock,      label: "Response Time",      value: seller.avgResponseTime,          color: "text-[#4A5CE8] bg-[#4A5CE8]/10" },
                { icon: BarChart2,  label: "Response Rate",      value: `${seller.responseRate}%`,      color: "text-purple-600 bg-purple-50" },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                  <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center mx-auto mb-1.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="font-bold text-gray-900 text-sm">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Reviews */}
          <div className="lg:col-span-2 space-y-5">

            {/* Rating summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">Ratings & Reviews</h2>
                <button
                  onClick={() => setShowReviewForm(!showReviewForm)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F26B21] text-white font-bold text-xs hover:opacity-90 transition-opacity"
                >
                  <Star className="w-3.5 h-3.5" /> Leave a Review
                </button>
              </div>
              <div className="flex gap-6 items-center mb-4">
                <div className="text-center flex-shrink-0">
                  <p className="text-5xl font-black text-gray-900">{avgRating.toFixed(1)}</p>
                  <div className="flex gap-0.5 justify-center mt-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="flex-1 space-y-1.5">
                  {[5,4,3,2,1].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFilterRating(filterRating === star ? 0 : star)}
                      className={`w-full transition-opacity ${filterRating > 0 && filterRating !== star ? "opacity-40" : ""}`}
                    >
                      <StarRow rating={star} count={breakdown[star - 1]} max={Math.max(...breakdown, 1)} />
                    </button>
                  ))}
                </div>
              </div>
              {filterRating > 0 && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-500">Filtered:</span>
                  <button
                    onClick={() => setFilterRating(0)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold hover:bg-amber-200 transition-colors"
                  >
                    {filterRating} stars <span className="text-amber-500 ml-0.5">×</span>
                  </button>
                </div>
              )}
            </div>

            {/* Leave a Review form */}
            <AnimatePresence>
              {showReviewForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white rounded-2xl border border-[#4A5CE8]/20 shadow-sm p-5">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" /> Write a Review for {seller.name}
                    </h3>
                    {formSubmitted ? (
                      <div className="flex flex-col items-center py-8 text-center">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 14 }}
                          className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
                          <Check className="w-8 h-8 text-emerald-500" />
                        </motion.div>
                        <p className="font-bold text-gray-900">Review submitted!</p>
                        <p className="text-sm text-gray-400 mt-1">Thank you for your feedback.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmitReview} className="space-y-4">
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-2 block">Your Rating *</label>
                          <div className="flex items-center gap-3">
                            <StarPicker value={formRating} onChange={setFormRating} />
                            {formRating > 0 && <span className="text-sm font-semibold text-amber-600">{STAR_LABELS[formRating]}</span>}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Review Title *</label>
                          <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="Summarise your experience"
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                            maxLength={80}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Review *</label>
                          <textarea
                            value={formBody}
                            onChange={(e) => setFormBody(e.target.value)}
                            placeholder="Tell others about your experience — accuracy of description, communication, packaging, speed..."
                            rows={4}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                            maxLength={500}
                          />
                          <p className="text-right text-[10px] text-gray-400 mt-0.5">{formBody.length}/500</p>
                        </div>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setShowReviewForm(false)}
                            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:border-gray-300 transition-colors">
                            Cancel
                          </button>
                          <button type="submit"
                            disabled={formRating === 0 || !formTitle.trim() || !formBody.trim()}
                            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-[#F26B21] to-[#D97706] text-white font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                            Submit Review
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Sort row */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-600 font-medium">{filtered.length} review{filtered.length !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Sort:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="appearance-none bg-white border border-gray-200 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/20 cursor-pointer"
                  >
                    <option value="newest">Newest</option>
                    <option value="highest">Highest Rated</option>
                    <option value="lowest">Lowest Rated</option>
                    <option value="helpful">Most Helpful</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Reviews list */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <Star className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="font-semibold text-gray-600">No reviews match this filter</p>
                <button onClick={() => setFilterRating(0)} className="mt-3 text-sm text-[#4A5CE8] hover:underline">Clear filter</button>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-4">
                  {filtered.map((review) => (
                    <ReviewCard key={review.id} review={review} onHelpful={handleHelpful} />
                  ))}
                </div>
              </AnimatePresence>
            )}
          </div>

          {/* Right: Active listings */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 text-sm">Active Listings</h3>
                <Link href="/browse" className="text-xs text-[#4A5CE8] hover:underline">View all</Link>
              </div>
              {sellerListings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No active listings</p>
              ) : (
                <div className="space-y-3">
                  {sellerListings.map((product) => {
                    const watched = isWatched(product.id);
                    return (
                      <div key={product.id} className="flex gap-3 items-center">
                        <Link href={`/listing/${product.id}`} className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0 hover:border-[#4A5CE8] transition-colors">
                          <img src={product.image} alt={product.title} className="w-full h-full object-contain p-1" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/listing/${product.id}`} className="text-xs font-semibold text-gray-800 line-clamp-1 hover:text-[#4A5CE8] transition-colors">
                            {product.title}
                          </Link>
                          <p className="text-sm font-bold text-[#F26B21] mt-0.5">£{product.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <button onClick={() => addToCart(product, 1)}
                            className="text-[10px] px-2 py-1 rounded-lg bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity">
                            Cart
                          </button>
                          <button
                            onClick={() => watched ? removeFromWatchlist(product.id) : addToWatchlist(product)}
                            className={`p-1 rounded-lg border transition-colors ${watched ? "border-red-200 text-red-500 bg-red-50" : "border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-400"}`}
                          >
                            <Heart className={`w-3 h-3 ${watched ? "fill-red-500" : ""}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link href="/messages"
                className="mt-5 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                <MessageSquare className="w-4 h-4" /> Contact Seller
              </Link>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {[
                  { icon: ShieldCheck, text: "Buyer protection on all purchases" },
                  { icon: TrendingUp, text: `${seller.positivePercent}% positive feedback` },
                  ...(seller.verified ? [{ icon: CheckCircle2, text: "Identity verified" }] : []),
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-xs text-gray-400">
                    <Icon className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

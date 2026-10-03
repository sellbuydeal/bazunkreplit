import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { Calendar, CheckCircle2, Clock, Package, Repeat2, ShoppingBag, Star, Trophy } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

interface Reputation {
  reviews: { total: number; positive: number; neutral: number; negative: number; average: number };
  positivePercent: number | null;
  successfulSales: number;
  repeatBuyers: number;
  dispatchMedianHours: number | null;
  dispatchSampleSize: number;
  memberSince: string | null;
  profile: { name: string; username: string | null; verified: boolean };
}
interface ReviewRow { id: number; rating: number; comment: string | null; item_title: string | null; created_at: string; reviewer: string }
interface ListingRow { id: number; publicId?: string | null; public_id?: string | null; title: string; price: string; image: string | null; condition: string }

function Stars({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return <span className="inline-flex gap-0.5">{[1,2,3,4,5].map(i => <Star key={i} className={`${size} ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />)}</span>;
}
function dispatchLabel(hours: number) {
  if (hours <= 24) return "Usually dispatches within 24h";
  if (hours <= 48) return "Usually dispatches within 2 days";
  if (hours <= 72) return "Usually dispatches within 3 days";
  return `Usually dispatches within ${Math.ceil(hours / 24)} days`;
}

export function SellerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const sellerEmail = useMemo(() => { try { return decodeURIComponent(id ?? ""); } catch { return id ?? ""; } }, [id]);
  const [rep, setRep] = useState<Reputation | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sellerEmail) { setError("Seller not found"); setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetch(`/api/sellers/reputation?email=${encodeURIComponent(sellerEmail)}`).then(async r => { if (!r.ok) throw new Error("Seller not found"); return r.json(); }),
      fetch(`/api/reviews/seller?email=${encodeURIComponent(sellerEmail)}&limit=50`).then(r => r.ok ? r.json() : []),
      fetch(`/api/listings?sellerEmail=${encodeURIComponent(sellerEmail)}&limit=24`).then(r => r.ok ? r.json() : []),
    ]).then(([reputation, reviewRows, listingRows]) => {
      setRep(reputation); setReviews(reviewRows); setListings(listingRows);
    }).catch(e => setError(e instanceof Error ? e.message : "Couldn't load this seller"))
      .finally(() => setLoading(false));
  }, [sellerEmail]);

  const breakdown = useMemo(() => [5,4,3,2,1].map(star => ({ star, count: reviews.filter(r => r.rating === star).length })), [reviews]);
  const maxBreakdown = Math.max(1, ...breakdown.map(x => x.count));

  return <>
    <Navbar />
    <main className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {loading && <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">Loading seller profile…</div>}
        {!loading && error && <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center"><h1 className="font-black text-xl text-gray-900">Seller profile unavailable</h1><p className="text-sm text-gray-500 mt-2">{error}</p></div>}
        {!loading && rep && <>
          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4A5CE8] to-[#7C3AED] text-white text-3xl font-black flex items-center justify-center flex-shrink-0">{rep.profile.name.charAt(0).toUpperCase()}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap"><h1 className="text-2xl sm:text-3xl font-black text-gray-900">{rep.profile.name}</h1>{rep.profile.verified && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}</div>
                {rep.profile.username && <p className="text-gray-400 text-sm mt-1">@{rep.profile.username}</p>}
                <div className="flex items-center gap-2 mt-3"><Stars rating={rep.reviews.average} size="w-5 h-5" /><span className="font-bold text-gray-800">{rep.reviews.total ? rep.reviews.average.toFixed(1) : "New"}</span><span className="text-sm text-gray-400">({rep.reviews.total} review{rep.reviews.total === 1 ? "" : "s"})</span></div>
                {rep.memberSince && <p className="flex items-center gap-1.5 text-xs text-gray-400 mt-3"><Calendar className="w-3.5 h-3.5" /> Member since {new Date(rep.memberSince).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p>}
              </div>
              {rep.positivePercent !== null && <div className="rounded-2xl bg-emerald-50 px-6 py-4 text-center"><div className="text-3xl font-black text-emerald-700">{rep.positivePercent}%</div><div className="text-xs font-bold text-emerald-700">positive</div></div>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
              {rep.dispatchMedianHours !== null && <div className="rounded-2xl bg-gray-50 p-4 flex gap-3"><Clock className="w-5 h-5 text-[#4A5CE8]" /><div><p className="font-bold text-sm text-gray-800">{dispatchLabel(rep.dispatchMedianHours)}</p><p className="text-xs text-gray-400">Based on recent dispatches</p></div></div>}
              <div className="rounded-2xl bg-gray-50 p-4 flex gap-3"><Trophy className="w-5 h-5 text-amber-500" /><div><p className="font-bold text-sm text-gray-800">{rep.successfulSales.toLocaleString()} successful sales</p><p className="text-xs text-gray-400">Orders sent, not cancelled</p></div></div>
              <div className="rounded-2xl bg-gray-50 p-4 flex gap-3"><Repeat2 className="w-5 h-5 text-emerald-500" /><div><p className="font-bold text-sm text-gray-800">{rep.repeatBuyers.toLocaleString()} repeat buyers</p><p className="text-xs text-gray-400">Bought from this seller 2+ times</p></div></div>
            </div>
          </section>

          <div className="grid lg:grid-cols-[1fr_320px] gap-6">
            <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-5"><ShoppingBag className="w-5 h-5 text-[#4A5CE8]" /><h2 className="font-black text-xl text-gray-900">Items for sale</h2><span className="text-sm text-gray-400">({listings.length})</span></div>
              {listings.length === 0 ? <p className="text-sm text-gray-400 py-8 text-center">This seller has no active listings right now.</p> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{listings.map(l => <Link key={l.id} href={`/listing/${l.publicId ?? l.public_id ?? l.id}`} className="rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow bg-white"><div className="aspect-square bg-gray-50">{l.image ? <img src={l.image} alt="" className="w-full h-full object-contain p-3" /> : <Package className="w-10 h-10 text-gray-200 m-auto mt-16" />}</div><div className="p-3"><p className="text-sm font-semibold text-gray-800 line-clamp-2">{l.title}</p><p className="font-black text-gray-900 mt-2">£{Number(l.price).toFixed(2)}</p></div></Link>)}</div>}
            </section>

            <aside className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 h-fit">
              <h2 className="font-black text-xl text-gray-900 mb-4">Review summary</h2>
              {rep.reviews.total === 0 ? <p className="text-sm text-gray-400">No reviews yet.</p> : <>{breakdown.map(x => <div key={x.star} className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-500 w-3">{x.star}</span><Star className="w-3 h-3 fill-amber-400 text-amber-400" /><div className="h-2 bg-gray-100 rounded-full flex-1 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${(x.count/maxBreakdown)*100}%` }} /></div><span className="text-xs text-gray-400 w-5 text-right">{x.count}</span></div>)}</>}
            </aside>
          </div>

          <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 mt-6">
            <h2 className="font-black text-xl text-gray-900 mb-5">Seller reviews</h2>
            {reviews.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">No reviews have been left for this seller yet.</p> : <div className="divide-y divide-gray-100">{reviews.map(review => <article key={review.id} className="py-5 first:pt-0"><div className="flex justify-between gap-4"><div><div className="flex items-center gap-2"><Stars rating={review.rating} /><span className="text-xs font-semibold text-gray-500">Verified purchase</span></div><p className="text-xs text-gray-400 mt-1">{review.reviewer} · {review.item_title ?? "Bazunk purchase"}</p></div><time className="text-xs text-gray-400 whitespace-nowrap">{new Date(review.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</time></div>{review.comment && <p className="text-sm text-gray-700 leading-relaxed mt-3">{review.comment}</p>}</article>)}</div>}
          </section>
        </>}
      </div>
    </main>
    <Footer />
  </>;
}

import { useEffect, useState } from "react";
import { Star, ChevronDown } from "lucide-react";

interface Reputation {
  reviews: { total: number; positive: number; neutral: number; negative: number; average: number };
  positivePercent: number | null;
  successfulSales: number;
  repeatBuyers: number;
  dispatchMedianHours: number | null;
  replyMedianHours: number | null;
  memberSince: string | null;
}
interface ReviewRow { id: number; rating: number; comment: string | null; item_title: string | null; created_at: string; reviewer: string }

function dispatchLabel(h: number): string {
  if (h <= 24) return "Usually dispatches within 24h";
  if (h <= 48) return "Usually dispatches within 2 days";
  if (h <= 72) return "Usually dispatches within 3 days";
  return `Usually dispatches within ${Math.ceil(h / 24)} days`;
}
function replyLabel(h: number): string {
  if (h <= 1) return "Usually replies within 1 hour";
  if (h <= 24) return `Usually replies within ${Math.ceil(h)} hours`;
  return `Usually replies within ${Math.ceil(h / 24)} days`;
}

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex">
      {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`w-3 h-3 ${i <= n ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />)}
    </span>
  );
}

/**
 * "Seller profile" block: instead of one star score, show how the seller actually behaves.
 * Anything we can't measure yet is simply left out rather than faked.
 */
export function SellerProfileCard({ sellerEmail }: { sellerEmail: string }) {
  const [rep, setRep] = useState<Reputation | null>(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);

  useEffect(() => {
    fetch(`/api/sellers/reputation?email=${encodeURIComponent(sellerEmail)}`)
      .then(r => (r.ok ? r.json() : null)).then(setRep).catch(() => {});
  }, [sellerEmail]);

  useEffect(() => {
    if (!showReviews || reviews) return;
    fetch(`/api/reviews/seller?email=${encodeURIComponent(sellerEmail)}&limit=10`)
      .then(r => (r.ok ? r.json() : [])).then(setReviews).catch(() => setReviews([]));
  }, [showReviews, reviews, sellerEmail]);

  if (!rep) return null;

  const pct = rep.positivePercent;
  const dot = pct === null ? "bg-gray-300" : pct >= 95 ? "bg-emerald-500" : pct >= 85 ? "bg-lime-500" : pct >= 70 ? "bg-amber-400" : "bg-red-500";
  const total = rep.reviews.total;

  const rows: { icon: string; text: React.ReactNode }[] = [];
  rows.push({
    icon: "",
    text: pct !== null
      ? <><b>{pct}% positive</b> <span className="text-gray-400">({total} review{total === 1 ? "" : "s"})</span></>
      : total > 0
        ? <span className="text-gray-500">{total} review{total === 1 ? "" : "s"} so far — percentage shows after 3</span>
        : <span className="text-gray-500">No reviews yet</span>,
  });
  if (rep.replyMedianHours !== null) rows.push({ icon: "⚡", text: replyLabel(rep.replyMedianHours) });
  if (rep.dispatchMedianHours !== null) rows.push({ icon: "📦", text: dispatchLabel(rep.dispatchMedianHours) });
  rows.push({ icon: "🏆", text: <><b>{rep.successfulSales.toLocaleString()}</b> successful sale{rep.successfulSales === 1 ? "" : "s"}</> });
  if (rep.repeatBuyers > 0) rows.push({ icon: "🔄", text: <><b>{rep.repeatBuyers.toLocaleString()}</b> repeat buyer{rep.repeatBuyers === 1 ? "" : "s"}</> });

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-[11px] font-black uppercase tracking-wider text-gray-400 mb-2.5">Seller profile</p>
      <ul className="space-y-1.5 text-[13px] text-gray-700">
        {rows.map((r, i) => (
          <li key={i} className="flex items-center gap-2">
            {i === 0 ? <span className={`w-3 h-3 rounded-full ${dot} flex-shrink-0 mx-0.5`} /> : <span className="w-4 text-center flex-shrink-0">{r.icon}</span>}
            <span>{r.text}</span>
          </li>
        ))}
      </ul>
      {total > 0 && (
        <>
          <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-400">
            <Stars n={Math.round(rep.reviews.average)} />
            <span>{rep.reviews.average.toFixed(1)} average · {rep.reviews.positive} positive · {rep.reviews.neutral} neutral · {rep.reviews.negative} negative</span>
          </div>
          <button onClick={() => setShowReviews(s => !s)} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#4A5CE8] hover:underline">
            {showReviews ? "Hide reviews" : "Read reviews"} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showReviews ? "rotate-180" : ""}`} />
          </button>
        </>
      )}
      {showReviews && (
        <div className="mt-3 space-y-3">
          {!reviews && <p className="text-xs text-gray-400">Loading…</p>}
          {reviews?.map(r => (
            <div key={r.id} className="rounded-xl bg-gray-50 p-3">
              <div className="flex items-center justify-between gap-2">
                <Stars n={r.rating} />
                <span className="text-[10px] text-gray-400">{new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              </div>
              {r.comment && <p className="text-xs text-gray-700 mt-1.5 leading-relaxed">{r.comment}</p>}
              <p className="text-[10px] text-gray-400 mt-1.5">{r.reviewer} · {r.item_title ?? "Purchase"}</p>
            </div>
          ))}
          {reviews && reviews.length === 0 && <p className="text-xs text-gray-400">No written reviews yet.</p>}
        </div>
      )}
    </div>
  );
}

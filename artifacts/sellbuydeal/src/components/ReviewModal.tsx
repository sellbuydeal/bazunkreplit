import { useState } from "react";
import { X, Star, Loader2, Check } from "lucide-react";
import { useSession } from "@clerk/react";

const LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export function ReviewModal({
  orderId, itemTitle, role, onClose, onDone,
}: {
  orderId: string; itemTitle: string; role: "buyer" | "seller";
  onClose: () => void; onDone: (rating: number) => void;
}) {
  const { session } = useSession();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const shown = hover || rating;

  async function submit() {
    setBusy(true); setError("");
    try {
      const token = await session?.getToken();
      if (!token) { setError("Please sign in again to leave a review"); return; }
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderId, rating, comment }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d.error ?? "Couldn't save your review"); return; }
      setDone(true);
      onDone(rating);
    } catch { setError("Network error — please try again"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-1">
          <h2 className="font-black text-gray-900">{role === "buyer" ? "Review your seller" : "Review this buyer"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-gray-400 mb-5 line-clamp-1">{itemTitle}</p>

        {done ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6 text-emerald-600" /></div>
            <p className="font-bold text-gray-900">Thanks for your review!</p>
            <button onClick={onClose} className="mt-4 px-6 py-2 rounded-xl bg-[#1A1D2E] text-white text-sm font-bold">Close</button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-4">
              <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                {[1, 2, 3, 4, 5].map(i => (
                  <button key={i} type="button" onMouseEnter={() => setHover(i)} onClick={() => setRating(i)} aria-label={`${i} star${i === 1 ? "" : "s"}`}>
                    <Star className={`w-9 h-9 transition-colors ${i <= shown ? "text-amber-400 fill-amber-400" : "text-gray-200"}`} />
                  </button>
                ))}
              </div>
              <p className="h-5 mt-1 text-sm font-semibold text-gray-600">{LABELS[shown]}</p>
            </div>
            <textarea
              value={comment} onChange={e => setComment(e.target.value)} rows={4} maxLength={1000}
              placeholder={role === "buyer" ? "How was the item, the packaging and the dispatch? (optional)" : "How was this buyer to deal with? (optional)"}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 resize-none"
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            <button onClick={submit} disabled={busy || rating === 0}
              className="w-full mt-4 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Submit review
            </button>
            <p className="text-[11px] text-gray-400 text-center mt-2">Reviews are public and can't be edited once submitted.</p>
          </>
        )}
      </div>
    </div>
  );
}

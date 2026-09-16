import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, ChevronLeft, Search, MoreVertical, Phone, Flag,
  Star, MapPin, ShieldCheck, Package, ChevronRight,
  Smile, Image as ImageIcon, Paperclip, Check, CheckCheck, X,
  MessageSquare, Archive, Trash2, ArrowLeft, Tag,
  CheckCircle2, XCircle, ArrowRight, Clock, ShoppingCart,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { MOCK_CONVERSATIONS, type Conversation, type Message } from "@/data/messages";
import { useOffers, type Offer, type OfferStatus } from "@/context/OfferContext";
import { useCart } from "@/context/CartContext";
import { ALL_PRODUCTS } from "@/data/products";

function timeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diff = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS: Record<string, string> = {
  MD: "bg-blue-500", SM: "bg-emerald-500", PK: "bg-purple-500",
  JT: "bg-amber-500", TA: "bg-[#4A5CE8]",
};

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const color = AVATAR_COLORS[initials] ?? "bg-gray-400";
  return (
    <div className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function ConversationRow({ convo, active, onClick }: { convo: Conversation; active: boolean; onClick: () => void }) {
  const last = convo.messages[convo.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 border-b border-gray-100 ${active ? "bg-[#4A5CE8]/5 border-l-2 border-l-[#4A5CE8]" : ""}`}
    >
      <div className="relative flex-shrink-0">
        <Avatar initials={convo.with.avatar} />
        {convo.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#F26B21] text-white text-[9px] font-bold flex items-center justify-center">
            {convo.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm ${convo.unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-700"}`}>
            {convo.with.name}
          </p>
          <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{timeAgo(last.timestamp)}</span>
        </div>
        <p className="text-[11px] text-[#F26B21] font-medium truncate mb-0.5">{convo.listingTitle}</p>
        <p className={`text-xs truncate ${convo.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
          {last.senderId === "me" ? "You: " : ""}{last.text}
        </p>
      </div>
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isMe = msg.senderId === "me";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? "bg-[#4A5CE8] text-white rounded-br-sm"
            : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
        }`}>
          {msg.text}
        </div>
        <div className="flex items-center gap-1 mt-1 px-1">
          <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
          {isMe && (
            <span className="text-[10px] text-gray-400">
              {msg.read ? <CheckCheck className="w-3 h-3 text-[#4A5CE8]" /> : <Check className="w-3 h-3" />}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function SellerPanel({ convo, onClose }: { convo: Conversation; onClose: () => void }) {
  return (
    <div className="w-64 bg-white border-l border-gray-100 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
        <p className="text-sm font-bold text-gray-800">Listing Info</p>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      <div className="p-4 border-b border-gray-100">
        <div className="w-full h-28 rounded-xl bg-gray-50 flex items-center justify-center mb-3 overflow-hidden">
          <img src={convo.listingImage} alt={convo.listingTitle} className="h-full object-contain p-2" />
        </div>
        <p className="text-sm font-bold text-gray-900 line-clamp-2">{convo.listingTitle}</p>
        <p className="text-lg font-black text-[#F26B21] mt-1">£{convo.listingPrice.toLocaleString()}</p>
        <Link
          href={`/listing/${convo.listingId}`}
          className="mt-3 w-full py-2 rounded-lg bg-[#4A5CE8] text-white text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90 transition-opacity"
        >
          View Listing <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wide">Seller</p>
        <div className="flex items-center gap-2.5 mb-3">
          <Avatar initials={convo.with.avatar} size="lg" />
          <div>
            <p className="font-bold text-gray-900 text-sm">{convo.with.name}</p>
            <div className="flex items-center gap-1 text-xs text-amber-500">
              <Star className="w-3 h-3 fill-current" />
              <span className="font-semibold">{convo.with.rating}</span>
              <span className="text-gray-400">({convo.with.reviews})</span>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{convo.with.location}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> Verified seller
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Package className="w-3.5 h-3.5 text-[#4A5CE8] flex-shrink-0" /> {convo.with.reviews} sales
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        <button className="w-full py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 flex items-center justify-center gap-1.5 hover:border-gray-300 transition-colors">
          <Phone className="w-3.5 h-3.5" /> Request Phone Number
        </button>
        <button className="w-full py-2 rounded-lg border border-red-100 text-xs font-semibold text-red-500 flex items-center justify-center gap-1.5 hover:bg-red-50 transition-colors">
          <Flag className="w-3.5 h-3.5" /> Report Seller
        </button>
      </div>
    </div>
  );
}

// ─── Offer status helpers ────────────────────────────────────────────────────

const STATUS_CONFIG: Record<OfferStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: "Awaiting Response", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200",  dot: "bg-amber-400" },
  accepted:         { label: "Accepted",           color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  declined:         { label: "Declined",            color: "text-red-600",    bg: "bg-red-50 border-red-200",     dot: "bg-red-500" },
  countered:        { label: "Counter Received",    color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   dot: "bg-blue-500" },
  counter_accepted: { label: "Counter Accepted",    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  counter_declined: { label: "Counter Declined",    color: "text-red-600",    bg: "bg-red-50 border-red-200",     dot: "bg-red-500" },
};

function OfferRow({ offer, active, onClick }: { offer: Offer; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CONFIG[offer.status];
  const savings = ((1 - offer.offerPrice / offer.listingPrice) * 100).toFixed(0);
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-gray-50 border-b border-gray-100 ${active ? "bg-[#4A5CE8]/5 border-l-2 border-l-[#4A5CE8]" : ""}`}
    >
      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
        <img src={offer.productImage} alt="" className="w-full h-full object-contain p-1" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-800 line-clamp-1 mb-0.5">{offer.productTitle}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-bold text-gray-900">£{offer.offerPrice.toFixed(2)}</span>
          <span className="text-[10px] text-gray-400 line-through">£{offer.listingPrice.toFixed(2)}</span>
          {parseFloat(savings) > 0 && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 rounded">−{savings}%</span>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border mt-1 ${cfg.bg} ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 flex-shrink-0">{timeAgo(offer.createdAt)}</span>
    </button>
  );
}

function OfferDetail({
  offer,
  onRespond,
  onRespondToCounter,
}: {
  offer: Offer;
  onRespond: (action: "accept" | "decline" | "counter", price?: number, msg?: string) => void;
  onRespondToCounter: (accept: boolean) => void;
}) {
  const { addToCart } = useCart();
  const product = ALL_PRODUCTS.find((p) => p.id === offer.productId);
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmt, setCounterAmt] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const cfg = STATUS_CONFIG[offer.status];
  const savings = ((1 - offer.offerPrice / offer.listingPrice) * 100).toFixed(1);
  const isResolved = ["accepted","declined","counter_accepted","counter_declined"].includes(offer.status);

  function submitCounter() {
    const price = parseFloat(counterAmt);
    if (!price || price <= 0) return;
    onRespond("counter", price, counterMsg.trim() || undefined);
    setShowCounter(false);
    setCounterAmt("");
    setCounterMsg("");
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Offer header */}
      <div className="px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
            <img src={offer.productImage} alt="" className="w-full h-full object-contain p-1.5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm line-clamp-1">{offer.productTitle}</p>
            <p className="text-xs text-gray-400">Asking: £{offer.listingPrice.toFixed(2)}</p>
          </div>
          {product && (
            <Link href={`/listing/${product.id}`}
              className="flex-shrink-0 text-xs text-[#4A5CE8] hover:underline flex items-center gap-0.5">
              View <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

        {/* Price card */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-6 justify-center">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Your Offer</p>
            <p className="text-2xl font-black text-[#4A5CE8]">£{offer.offerPrice.toFixed(2)}</p>
            {parseFloat(savings) > 0 && (
              <p className="text-xs text-emerald-600 font-semibold mt-0.5">−{savings}% off asking</p>
            )}
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Asking Price</p>
            <p className="text-2xl font-black text-gray-900">£{offer.listingPrice.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Listed price</p>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Negotiation Timeline</p>
          <div className="space-y-3">

            {/* Offer sent */}
            <div className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-[#4A5CE8] flex items-center justify-center flex-shrink-0">
                  <Tag className="w-3.5 h-3.5 text-white" />
                </div>
                {(offer.status !== "pending") && <div className="w-0.5 h-4 bg-gray-200 mt-1" />}
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-semibold text-gray-900">You offered <span className="text-[#4A5CE8]">£{offer.offerPrice.toFixed(2)}</span></p>
                {offer.message && <p className="text-xs text-gray-500 italic mt-0.5">"{offer.message}"</p>}
                <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {timeAgo(offer.createdAt)}
                </p>
              </div>
            </div>

            {/* Seller response */}
            {offer.status === "pending" ? (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm text-gray-400">Waiting for seller response…</p>
                </div>
              </div>
            ) : offer.status === "accepted" ? (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-gray-900">{offer.sellerName} <span className="text-emerald-600">accepted your offer</span></p>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {offer.respondedAt ? timeAgo(offer.respondedAt) : ""}
                  </p>
                </div>
              </div>
            ) : offer.status === "declined" ? (
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-gray-900">{offer.sellerName} <span className="text-red-600">declined your offer</span></p>
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {offer.respondedAt ? timeAgo(offer.respondedAt) : ""}
                  </p>
                </div>
              </div>
            ) : (offer.status === "countered" || offer.status === "counter_accepted" || offer.status === "counter_declined") ? (
              <>
                <div className="flex gap-3 items-start">
                  <div className={`flex flex-col items-center`}>
                    <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                    {(offer.status === "counter_accepted" || offer.status === "counter_declined") && (
                      <div className="w-0.5 h-4 bg-gray-200 mt-1" />
                    )}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-sm font-semibold text-gray-900">
                      {offer.sellerName} countered at <span className="text-blue-600">£{offer.counterPrice?.toFixed(2)}</span>
                    </p>
                    {offer.counterMessage && (
                      <p className="text-xs text-gray-500 italic mt-0.5">"{offer.counterMessage}"</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {offer.respondedAt ? timeAgo(offer.respondedAt) : ""}
                    </p>
                  </div>
                </div>
                {offer.status === "counter_accepted" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-semibold text-emerald-700">You accepted the counter offer</p>
                    </div>
                  </div>
                )}
                {offer.status === "counter_declined" && (
                  <div className="flex gap-3 items-start">
                    <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 pt-0.5">
                      <p className="text-sm font-semibold text-red-600">You declined the counter offer</p>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Action area */}
      {!isResolved && (
        <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0 space-y-3">
          {offer.status === "pending" && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              Offer sent — the seller is reviewing it. You'll be notified when they respond.
            </div>
          )}

          {offer.status === "countered" && (
            <>
              <p className="text-xs font-semibold text-gray-600 text-center">
                Seller countered at <span className="text-blue-600 font-bold">£{offer.counterPrice?.toFixed(2)}</span> — respond below:
              </p>
              {!showCounter ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => onRespondToCounter(false)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" /> Decline
                  </button>
                  <button
                    onClick={() => setShowCounter(true)}
                    className="flex-1 py-2.5 rounded-xl border-2 border-[#4A5CE8]/30 text-[#4A5CE8] font-bold text-sm hover:bg-[#4A5CE8]/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" /> Counter
                  </button>
                  <button
                    onClick={() => onRespondToCounter(true)}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Accept
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">£</span>
                      <input
                        type="number" min="1"
                        value={counterAmt}
                        onChange={(e) => setCounterAmt(e.target.value)}
                        placeholder="Your counter offer"
                        className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                        autoFocus
                      />
                    </div>
                    <textarea
                      value={counterMsg}
                      onChange={(e) => setCounterMsg(e.target.value)}
                      placeholder="Message (optional)"
                      rows={2}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setShowCounter(false)}
                        className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs hover:border-gray-300 transition-colors">
                        Cancel
                      </button>
                      <button onClick={submitCounter} disabled={!counterAmt || parseFloat(counterAmt) <= 0}
                        className="flex-[2] py-2 rounded-xl bg-[#4A5CE8] text-white font-bold text-xs hover:opacity-90 transition-opacity disabled:opacity-40">
                        Send Counter Offer
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>
              )}
            </>
          )}
        </div>
      )}

      {/* Resolved CTA */}
      {(offer.status === "accepted" || offer.status === "counter_accepted") && product && (
        <div className="px-6 py-4 border-t border-gray-100 bg-emerald-50 flex-shrink-0">
          <p className="text-xs font-bold text-emerald-700 text-center mb-2.5">🎉 Offer accepted! Ready to buy?</p>
          <div className="flex gap-2">
            <Link href={`/listing/${product.id}`}
              className="flex-1 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 font-bold text-sm text-center hover:bg-emerald-100 transition-colors">
              View Listing
            </Link>
            <button
              onClick={() => product && addToCart(product, 1)}
              className="flex-[2] py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" /> Add to Cart
            </button>
          </div>
        </div>
      )}

      {(offer.status === "declined" || offer.status === "counter_declined") && product && (
        <div className="px-6 py-4 border-t border-gray-100 bg-red-50 flex-shrink-0">
          <p className="text-xs font-bold text-red-600 text-center mb-2.5">Offer not accepted. Try again or buy at full price.</p>
          <div className="flex gap-2">
            <Link href={`/listing/${product.id}`}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-sm text-center hover:bg-red-100 transition-colors">
              New Offer
            </Link>
            <button
              onClick={() => product && addToCart(product, 1)}
              className="flex-[2] py-2.5 rounded-xl bg-[#F26B21] text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <ShoppingCart className="w-4 h-4" /> Buy at £{product.price.toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showPanel, setShowPanel] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Offers tab
  const [activeTab, setActiveTab] = useState<"messages" | "offers">("messages");
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const { offers, respondToOffer, respondToCounter, pendingCount } = useOffers();

  const activeConvo = conversations.find((c) => c.id === activeId) ?? null;
  const activeOffer = offers.find((o) => o.id === activeOfferId) ?? null;

  const filteredConvos = conversations.filter((c) =>
    c.with.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listingTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  function openConvo(id: number) {
    setActiveId(id);
    setMobileView("chat");
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, unread: 0, messages: c.messages.map((m) => ({ ...m, read: true })) }
          : c
      )
    );
  }

  function sendMessage() {
    if (!inputText.trim() || !activeId) return;
    const text = inputText.trim();
    setInputText("");
    const newMsg: Message = {
      id: Date.now(),
      senderId: "me",
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setConversations((prev) =>
      prev.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, newMsg] } : c)
    );
    setTimeout(() => {
      const replies = [
        "Thanks for getting back to me!",
        "That sounds good to me.",
        "Great, let me know if you have any other questions.",
        "Works for me, I'll confirm shortly.",
        "Appreciate the quick response!",
      ];
      const reply: Message = {
        id: Date.now() + 1,
        senderId: "them",
        text: replies[Math.floor(Math.random() * replies.length)],
        timestamp: new Date().toISOString(),
        read: false,
      };
      setConversations((prev) =>
        prev.map((c) => c.id === activeId ? { ...c, messages: [...c.messages, reply] } : c)
      );
    }, 1500);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo?.messages.length]);

  // Select first offer when switching to offers tab
  useEffect(() => {
    if (activeTab === "offers" && offers.length > 0 && !activeOfferId) {
      setActiveOfferId(offers[0].id);
    }
  }, [activeTab, offers]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
            {totalUnread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-[#F26B21] text-white text-xs font-bold">
                {totalUnread} unread
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex h-[calc(100vh-220px)] min-h-[500px]">

          {/* Sidebar */}
          <div className={`w-full sm:w-72 md:w-80 border-r border-gray-100 flex flex-col flex-shrink-0 ${mobileView === "chat" ? "hidden sm:flex" : "flex"}`}>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              <button
                onClick={() => setActiveTab("messages")}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === "messages"
                    ? "text-[#4A5CE8] border-b-2 border-[#4A5CE8]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Messages
                {totalUnread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#F26B21] text-white text-[9px] font-bold">{totalUnread}</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("offers")}
                className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  activeTab === "offers"
                    ? "text-[#4A5CE8] border-b-2 border-[#4A5CE8]"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                Offers
                {pendingCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#4A5CE8] text-white text-[9px] font-bold">{pendingCount}</span>
                )}
              </button>
            </div>

            {activeTab === "messages" ? (
              <>
                {/* Search */}
                <div className="p-3 border-b border-gray-100 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/20 focus:border-[#4A5CE8]"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {filteredConvos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm font-semibold text-gray-500">No conversations found</p>
                    </div>
                  ) : (
                    filteredConvos.map((convo) => (
                      <ConversationRow
                        key={convo.id}
                        convo={convo}
                        active={activeId === convo.id}
                        onClick={() => openConvo(convo.id)}
                      />
                    ))
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {offers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <Tag className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm font-semibold text-gray-500">No offers yet</p>
                    <p className="text-xs text-gray-400 mt-1">Browse listings and click "Make an Offer"</p>
                    <Link href="/browse"
                      className="mt-4 px-4 py-2 rounded-xl bg-[#4A5CE8] text-white font-bold text-xs hover:opacity-90 transition-opacity">
                      Browse Listings
                    </Link>
                  </div>
                ) : (
                  offers.map((offer) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      active={activeOfferId === offer.id}
                      onClick={() => { setActiveOfferId(offer.id); setMobileView("chat"); }}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          {/* Main panel */}
          <div className={`flex-1 flex flex-col min-w-0 ${mobileView === "list" ? "hidden sm:flex" : "flex"}`}>

            {activeTab === "messages" ? (
              !activeConvo ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-20 h-20 rounded-2xl bg-[#4A5CE8]/10 flex items-center justify-center mb-5">
                    <MessageSquare className="w-10 h-10 text-[#4A5CE8]/50" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">Select a conversation</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Choose a thread from the left to start chatting with buyers and sellers.
                  </p>
                </div>
              ) : (
                <>
                  {/* Chat header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                    <button onClick={() => setMobileView("list")} className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <Avatar initials={activeConvo.with.avatar} />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{activeConvo.with.name}</p>
                      <p className="text-xs text-[#F26B21] font-medium truncate">{activeConvo.listingTitle} — £{activeConvo.listingPrice.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setShowPanel(!showPanel)}
                        className={`p-2 rounded-lg transition-colors ${showPanel ? "bg-[#4A5CE8]/10 text-[#4A5CE8]" : "hover:bg-gray-100 text-gray-500"}`}>
                        <Package className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                        <Archive className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 min-h-0">
                    {/* Messages */}
                    <div className="flex-1 flex flex-col min-h-0">
                      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-2">
                        <div className="flex items-center gap-3 py-2">
                          <div className="flex-1 h-px bg-gray-100" />
                          <span className="text-[10px] text-gray-400 font-medium">
                            {new Date(activeConvo.messages[0].timestamp).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                          <div className="flex-1 h-px bg-gray-100" />
                        </div>
                        <AnimatePresence initial={false}>
                          {activeConvo.messages.map((msg) => (
                            <MessageBubble key={msg.id} msg={msg} />
                          ))}
                        </AnimatePresence>
                        <div ref={bottomRef} />
                      </div>

                      {/* Suggested replies */}
                      <div className="px-4 pb-2 flex gap-2 flex-wrap">
                        {["Is this still available?", "Can you do a lower price?", "I'll take it!"].map((s) => (
                          <button key={s} onClick={() => setInputText(s)}
                            className="text-xs px-3 py-1.5 rounded-full border border-[#4A5CE8]/30 text-[#4A5CE8] bg-[#4A5CE8]/5 hover:bg-[#4A5CE8]/10 transition-colors font-medium">
                            {s}
                          </button>
                        ))}
                      </div>

                      {/* Input */}
                      <div className="px-4 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#4A5CE8] focus-within:ring-2 focus-within:ring-[#4A5CE8]/20 transition-all">
                          <div className="flex gap-1 pb-1">
                            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><Smile className="w-4 h-4" /></button>
                            <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors"><Paperclip className="w-4 h-4" /></button>
                          </div>
                          <textarea
                            ref={inputRef}
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            placeholder="Type a message…"
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-32 py-1"
                            style={{ lineHeight: "1.5" }}
                          />
                          <button onClick={sendMessage} disabled={!inputText.trim()}
                            className={`p-2 rounded-xl transition-all flex-shrink-0 ${inputText.trim() ? "bg-[#4A5CE8] text-white hover:opacity-90 shadow-sm" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
                      </div>
                    </div>

                    {/* Seller info panel */}
                    <AnimatePresence>
                      {showPanel && (
                        <motion.div
                          initial={{ width: 0, opacity: 0 }}
                          animate={{ width: 256, opacity: 1 }}
                          exit={{ width: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden flex-shrink-0 hidden lg:block"
                        >
                          <SellerPanel convo={activeConvo} onClose={() => setShowPanel(false)} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )
            ) : (
              /* Offers panel */
              !activeOffer ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                  <div className="w-20 h-20 rounded-2xl bg-[#4A5CE8]/10 flex items-center justify-center mb-5">
                    <Tag className="w-10 h-10 text-[#4A5CE8]/50" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {offers.length === 0 ? "No offers yet" : "Select an offer"}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    {offers.length === 0
                      ? "Make an offer on any listing to start negotiating."
                      : "Select an offer from the left to see details and respond."}
                  </p>
                  {offers.length === 0 && (
                    <Link href="/browse"
                      className="mt-4 px-5 py-2.5 rounded-xl bg-[#4A5CE8] text-white font-bold text-sm hover:opacity-90 transition-opacity">
                      Browse Listings
                    </Link>
                  )}
                </div>
              ) : (
                <>
                  {/* Offer detail header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                    <button onClick={() => setMobileView("list")} className="sm:hidden flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors">
                      <ArrowLeft className="w-4 h-4 text-gray-600" />
                    </button>
                    <Tag className="w-4 h-4 text-[#4A5CE8] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">Offer Negotiation</p>
                      <p className="text-xs text-gray-400">with {activeOffer.sellerName}</p>
                    </div>
                    {(() => {
                      const cfg = STATUS_CONFIG[activeOffer.status];
                      return (
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  <OfferDetail
                    offer={activeOffer}
                    onRespond={(action, price, msg) => respondToOffer(activeOffer.id, action, price, msg)}
                    onRespondToCounter={(accept) => respondToCounter(activeOffer.id, accept)}
                  />
                </>
              )
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

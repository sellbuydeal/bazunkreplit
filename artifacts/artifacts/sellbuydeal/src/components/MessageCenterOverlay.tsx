import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  X, Search, MessageSquare, Send, Trash2, Archive, FolderPlus,
  Tag, ChevronRight, Check, CheckCheck, MoreHorizontal, ArrowLeft,
  Smile, Paperclip, Star, MapPin, ShieldCheck, Package, Phone, Flag,
  HelpCircle, CheckCircle2, XCircle, Clock, FolderOpen, Inbox,
  Users, Bell, ShoppingCart, ArrowRight,
} from "lucide-react";
import { MOCK_CONVERSATIONS, type Conversation, type Message } from "@/data/messages";
import { useOffers, type Offer, type OfferStatus } from "@/context/OfferContext";
import { useCart } from "@/context/CartContext";
import { ALL_PRODUCTS } from "@/data/products";

// ── Types ─────────────────────────────────────────────────────────────────────

type SupportMessage = {
  id: number;
  senderId: "bazunk" | "me";
  text: string;
  timestamp: string;
  read: boolean;
};

type SupportTicket = {
  id: number;
  type: "support";
  subject: string;
  status: "open" | "closed" | "pending";
  category: string;
  messages: SupportMessage[];
  unread: number;
};

type FolderKey =
  | "inbox" | "from-members" | "unread-members"
  | "from-bazunk" | "unread-bazunk"
  | "sent" | "deleted" | "archive"
  | "offers";

// ── Mock support tickets ───────────────────────────────────────────────────────

const MOCK_TICKETS: SupportTicket[] = [
  {
    id: 101,
    type: "support",
    subject: "Welcome to Bazunk!",
    status: "closed",
    category: "General",
    unread: 0,
    messages: [
      {
        id: 1,
        senderId: "bazunk",
        text: "Welcome to Bazunk — the UK's peer-to-peer marketplace! 🎉\n\nYour account is all set up. You can start browsing listings, make offers, or list your first item today.\n\nIf you ever need help, just reply here and our team will get back to you within 24 hours.",
        timestamp: new Date(Date.now() - 7 * 86400000).toISOString(),
        read: true,
      },
    ],
  },
  {
    id: 102,
    type: "support",
    subject: "Identity verification approved",
    status: "closed",
    category: "Account",
    unread: 0,
    messages: [
      {
        id: 1,
        senderId: "bazunk",
        text: "Great news! Your identity has been successfully verified. ✅\n\nYou can now list items for sale on Bazunk. Your seller badge will appear on your profile and listings.",
        timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
        read: true,
      },
    ],
  },
  {
    id: 103,
    type: "support",
    subject: "Refund request — order #BZK-20260628",
    status: "open",
    category: "Refunds",
    unread: 1,
    messages: [
      {
        id: 1,
        senderId: "me",
        text: "Hi, I'd like to request a refund for my recent order. The item arrived damaged.",
        timestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
        read: true,
      },
      {
        id: 2,
        senderId: "bazunk",
        text: "Hi there, thanks for getting in touch. We're sorry to hear about the damaged item.\n\nWe've opened a case (Case #CAS-4421) and our team is reviewing it now. You'll receive an update within 2 business days.\n\nCould you please upload photos of the damage? Reply to this message with the images attached.",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: false,
      },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

const AVATAR_COLORS: Record<string, string> = {
  MD: "bg-blue-500", SM: "bg-emerald-500", PK: "bg-purple-500",
  JT: "bg-amber-500", TA: "bg-[#4A5CE8]",
};

function UserAvatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-11 h-11 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} ${AVATAR_COLORS[initials] ?? "bg-gray-400"} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
      {initials}
    </div>
  );
}

function BazunkAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-8 h-8 text-[10px]" : size === "lg" ? "w-11 h-11 text-sm" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} bg-[#F26B21] rounded-full flex items-center justify-center text-white font-black flex-shrink-0`}>
      BZ
    </div>
  );
}

// ── Folder sidebar ────────────────────────────────────────────────────────────

type FolderItem = {
  key: FolderKey;
  label: string;
  icon: React.ElementType;
  count?: number;
  indent?: boolean;
};

function FolderSidebar({
  active,
  onSelect,
  memberUnread,
  bazunkUnread,
  offerPending,
  onClose,
}: {
  active: FolderKey;
  onSelect: (f: FolderKey) => void;
  memberUnread: number;
  bazunkUnread: number;
  offerPending: number;
  onClose: () => void;
}) {
  const folders: (FolderItem | "divider" | "header")[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, count: memberUnread + bazunkUnread },
    { key: "from-members", label: "From members", icon: Users, indent: true },
    { key: "unread-members", label: "Unread from members", icon: Bell, count: memberUnread, indent: true },
    "divider",
    { key: "from-bazunk", label: "From Bazunk", icon: HelpCircle, indent: true },
    { key: "unread-bazunk", label: "Unread from Bazunk", icon: Bell, count: bazunkUnread, indent: true },
    "divider",
    { key: "offers", label: "My Offers", icon: Tag, count: offerPending },
    { key: "sent", label: "Sent", icon: Send },
    { key: "deleted", label: "Deleted", icon: Trash2 },
    { key: "archive", label: "Archive", icon: Archive },
    "divider",
    "header",
  ];

  return (
    <div className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#4A5CE8]" />
          <span className="font-bold text-gray-900 text-sm">Messages</span>
        </div>
        <button onClick={onClose} className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors">
          <X className="w-3.5 h-3.5 text-gray-600" />
        </button>
      </div>

      {/* Folder list */}
      <div className="flex-1 overflow-y-auto py-2">
        {folders.map((item, i) => {
          if (item === "divider") {
            return <div key={`d${i}`} className="my-1.5 mx-3 border-t border-gray-200" />;
          }
          if (item === "header") {
            return (
              <div key="folders-header">
                <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Folders</p>
                <button className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#4A5CE8] font-semibold hover:bg-[#4A5CE8]/5 transition-colors rounded-lg mx-0">
                  <FolderPlus className="w-3.5 h-3.5" /> Create folder
                </button>
              </div>
            );
          }
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold transition-colors rounded-lg mx-1 ${
                item.indent ? "pl-5" : ""
              } ${
                isActive
                  ? "bg-[#4A5CE8] text-white"
                  : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
              }`}
              style={{ width: "calc(100% - 8px)" }}
            >
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400"}`} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {item.count != null && item.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                  isActive ? "bg-white/30 text-white" : "bg-[#F26B21] text-white"
                }`}>
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Thread list ───────────────────────────────────────────────────────────────

function MemberThreadRow({
  convo, active, onClick, selected, onSelect,
}: {
  convo: Conversation; active: boolean; onClick: () => void;
  selected: boolean; onSelect: (e: React.MouseEvent) => void;
}) {
  const last = convo.messages[convo.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 transition-colors group ${
        active ? "bg-[#4A5CE8]/5 border-l-[3px] border-l-[#4A5CE8]" : "hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onClick={onSelect}
        onChange={() => {}}
        className="flex-shrink-0 w-3.5 h-3.5 rounded border-gray-300 text-[#4A5CE8] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
      />
      <div className="relative flex-shrink-0">
        <UserAvatar initials={convo.with.avatar} size="sm" />
        {convo.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F26B21] text-white text-[8px] font-bold flex items-center justify-center">
            {convo.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-xs ${convo.unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-600"}`}>
            {convo.with.name}
          </p>
          <span className="text-[10px] text-gray-400">{timeAgo(last.timestamp)}</span>
        </div>
        <p className="text-[10px] text-[#F26B21] font-medium truncate mb-0.5">{convo.listingTitle}</p>
        <p className={`text-[10px] truncate ${convo.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"}`}>
          {last.senderId === "me" ? "You: " : ""}{last.text}
        </p>
      </div>
    </button>
  );
}

function SupportThreadRow({
  ticket, active, onClick,
}: {
  ticket: SupportTicket; active: boolean; onClick: () => void;
}) {
  const last = ticket.messages[ticket.messages.length - 1];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 transition-colors ${
        active ? "bg-[#F26B21]/5 border-l-[3px] border-l-[#F26B21]" : "hover:bg-gray-50"
      }`}
    >
      <div className="relative flex-shrink-0">
        <BazunkAvatar size="sm" />
        {ticket.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#F26B21] text-white text-[8px] font-bold flex items-center justify-center">
            {ticket.unread}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-xs ${ticket.unread > 0 ? "font-bold text-gray-900" : "font-semibold text-gray-600"}`}>
            Bazunk Support
          </p>
          <span className="text-[10px] text-gray-400">{timeAgo(last.timestamp)}</span>
        </div>
        <p className={`text-[10px] truncate ${ticket.unread > 0 ? "text-gray-700 font-medium" : "text-gray-400"} mb-0.5`}>
          {ticket.subject}
        </p>
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
            ticket.status === "open" ? "bg-emerald-50 text-emerald-600" :
            ticket.status === "pending" ? "bg-amber-50 text-amber-600" :
            "bg-gray-100 text-gray-500"
          }`}>
            {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
          </span>
          <span className="text-[9px] text-gray-400">{ticket.category}</span>
        </div>
      </div>
    </button>
  );
}

// ── Offer row (for offers folder) ─────────────────────────────────────────────

const STATUS_CFG: Record<OfferStatus, { label: string; color: string; bg: string; dot: string }> = {
  pending:          { label: "Awaiting Response", color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",   dot: "bg-amber-400" },
  accepted:         { label: "Accepted",          color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  declined:         { label: "Declined",          color: "text-red-600",     bg: "bg-red-50 border-red-200",       dot: "bg-red-500" },
  countered:        { label: "Counter Received",  color: "text-blue-700",    bg: "bg-blue-50 border-blue-200",     dot: "bg-blue-500" },
  counter_accepted: { label: "Counter Accepted",  color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  counter_declined: { label: "Counter Declined",  color: "text-red-600",     bg: "bg-red-50 border-red-200",       dot: "bg-red-500" },
};

function OfferThreadRow({ offer, active, onClick }: { offer: Offer; active: boolean; onClick: () => void }) {
  const cfg = STATUS_CFG[offer.status];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-100 transition-colors ${
        active ? "bg-[#4A5CE8]/5 border-l-[3px] border-l-[#4A5CE8]" : "hover:bg-gray-50"
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0 overflow-hidden">
        <img src={offer.productImage} alt="" className="w-full h-full object-contain p-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-gray-800 truncate mb-0.5">{offer.productTitle}</p>
        <p className="text-xs font-bold text-gray-900 mb-0.5">£{offer.offerPrice.toFixed(2)}</p>
        <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>
      <span className="text-[10px] text-gray-400">{timeAgo(offer.createdAt)}</span>
    </button>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isMe = msg.senderId === "me";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
          isMe ? "bg-[#4A5CE8] text-white rounded-br-sm" : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm"
        }`}>{msg.text}</div>
        <div className="flex items-center gap-1 mt-0.5 px-1">
          <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
          {isMe && (msg.read
            ? <CheckCheck className="w-3 h-3 text-[#4A5CE8]" />
            : <Check className="w-3 h-3 text-gray-400" />)}
        </div>
      </div>
    </motion.div>
  );
}

function SupportBubble({ msg }: { msg: SupportMessage }) {
  const isMe = msg.senderId === "me";
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
      {!isMe && <BazunkAvatar size="sm" />}
      <div className={`max-w-[78%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && <p className="text-[10px] font-bold text-[#F26B21] mb-1 px-1">Bazunk Support</p>}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
          isMe ? "bg-[#4A5CE8] text-white rounded-br-sm" : "bg-[#FFF7F2] border border-[#F26B21]/20 text-gray-800 rounded-bl-sm"
        }`}>{msg.text}</div>
        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
      </div>
    </motion.div>
  );
}

// ── Offer detail ──────────────────────────────────────────────────────────────

function OfferDetail({ offer, onRespond, onRespondToCounter }: {
  offer: Offer;
  onRespond: (action: "accept" | "decline" | "counter", price?: number, msg?: string) => void;
  onRespondToCounter: (accept: boolean) => void;
}) {
  const { addToCart } = useCart();
  const product = ALL_PRODUCTS.find((p) => p.id === offer.productId);
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmt, setCounterAmt] = useState("");
  const [counterMsg, setCounterMsg] = useState("");
  const cfg = STATUS_CFG[offer.status];
  const savings = ((1 - offer.offerPrice / offer.listingPrice) * 100).toFixed(1);
  const isResolved = ["accepted", "declined", "counter_accepted", "counter_declined"].includes(offer.status);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
            <img src={offer.productImage} alt="" className="w-full h-full object-contain p-1" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm line-clamp-1">{offer.productTitle}</p>
            <p className="text-xs text-gray-400">Asking: £{offer.listingPrice.toFixed(2)}</p>
          </div>
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />{cfg.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-6 justify-center">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Your Offer</p>
            <p className="text-2xl font-black text-[#4A5CE8]">£{offer.offerPrice.toFixed(2)}</p>
            {parseFloat(savings) > 0 && <p className="text-xs text-emerald-600 font-semibold mt-0.5">−{savings}% off</p>}
          </div>
          <ArrowRight className="w-5 h-5 text-gray-300" />
          <div className="text-center">
            <p className="text-[10px] text-gray-400 mb-1 uppercase tracking-wide">Asking Price</p>
            <p className="text-2xl font-black text-gray-900">£{offer.listingPrice.toFixed(2)}</p>
          </div>
        </div>

        {/* Timeline */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Negotiation Timeline</p>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-6 h-6 rounded-full bg-[#4A5CE8] flex items-center justify-center flex-shrink-0">
                <Tag className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1 pt-0.5">
                <p className="text-sm font-semibold text-gray-900">You offered <span className="text-[#4A5CE8]">£{offer.offerPrice.toFixed(2)}</span></p>
                {offer.message && <p className="text-xs text-gray-500 italic mt-0.5">"{offer.message}"</p>}
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" /> {timeAgo(offer.createdAt)}</p>
              </div>
            </div>
            {offer.status === "pending" && (
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-3 h-3 text-gray-400" />
                </div>
                <p className="text-sm text-gray-400 pt-0.5">Waiting for seller response…</p>
              </div>
            )}
            {offer.status === "accepted" && (
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm font-semibold text-emerald-700 pt-0.5">{offer.sellerName} accepted your offer</p>
              </div>
            )}
            {offer.status === "declined" && (
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-3 h-3 text-white" />
                </div>
                <p className="text-sm font-semibold text-red-600 pt-0.5">{offer.sellerName} declined your offer</p>
              </div>
            )}
            {(offer.status === "countered" || offer.status === "counter_accepted" || offer.status === "counter_declined") && (
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm font-semibold text-gray-900">{offer.sellerName} countered at <span className="text-blue-600">£{offer.counterPrice?.toFixed(2)}</span></p>
                  {offer.counterMessage && <p className="text-xs text-gray-500 italic mt-0.5">"{offer.counterMessage}"</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isResolved && (
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex-shrink-0 space-y-2">
          {offer.status === "countered" && !showCounter && (
            <div className="flex gap-2">
              <button onClick={() => onRespondToCounter(false)} className="flex-1 py-2 rounded-xl border-2 border-red-200 text-red-600 font-bold text-xs hover:bg-red-50 transition-colors flex items-center justify-center gap-1"><XCircle className="w-3.5 h-3.5" /> Decline</button>
              <button onClick={() => setShowCounter(true)} className="flex-1 py-2 rounded-xl border-2 border-[#4A5CE8]/30 text-[#4A5CE8] font-bold text-xs hover:bg-[#4A5CE8]/5 transition-colors flex items-center justify-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Counter</button>
              <button onClick={() => onRespondToCounter(true)} className="flex-1 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs hover:opacity-90 transition-opacity flex items-center justify-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Accept</button>
            </div>
          )}
          {showCounter && (
            <div className="space-y-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-sm">£</span>
                <input type="number" value={counterAmt} onChange={e => setCounterAmt(e.target.value)} placeholder="Counter amount"
                  className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]" autoFocus />
              </div>
              <textarea value={counterMsg} onChange={e => setCounterMsg(e.target.value)} placeholder="Message (optional)" rows={2}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8] resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowCounter(false)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 font-semibold text-xs">Cancel</button>
                <button onClick={() => { const p = parseFloat(counterAmt); if (!p) return; onRespond("counter", p, counterMsg.trim() || undefined); setShowCounter(false); setCounterAmt(""); setCounterMsg(""); }}
                  disabled={!counterAmt} className="flex-[2] py-2 rounded-xl bg-[#4A5CE8] text-white font-bold text-xs hover:opacity-90 disabled:opacity-40">Send Counter</button>
              </div>
            </div>
          )}
        </div>
      )}

      {(offer.status === "accepted" || offer.status === "counter_accepted") && product && (
        <div className="px-5 py-3 border-t border-gray-100 bg-emerald-50 flex-shrink-0">
          <p className="text-xs font-bold text-emerald-700 text-center mb-2">🎉 Offer accepted! Ready to buy?</p>
          <div className="flex gap-2">
            <Link href={`/listing/${product.id}`} className="flex-1 py-2 rounded-xl border border-emerald-300 text-emerald-700 font-bold text-xs text-center hover:bg-emerald-100 transition-colors">View Listing</Link>
            <button onClick={() => product && addToCart(product, 1)} className="flex-[2] py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:opacity-90 flex items-center justify-center gap-1">
              <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main overlay component ────────────────────────────────────────────────────

export function MessageCenterOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [folder, setFolder] = useState<FolderKey>("inbox");
  const [conversations, setConversations] = useState<Conversation[]>(MOCK_CONVERSATIONS);
  const [tickets, setTickets] = useState<SupportTicket[]>(MOCK_TICKETS);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [activeSupportId, setActiveSupportId] = useState<number | null>(null);
  const [activeOfferId, setActiveOfferId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [supportInput, setSupportInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mobileView, setMobileView] = useState<"folders" | "list" | "chat">("list");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { offers, respondToOffer, respondToCounter, pendingCount } = useOffers();

  const memberUnread = conversations.reduce((s, c) => s + c.unread, 0);
  const bazunkUnread = tickets.reduce((s, t) => s + t.unread, 0);

  const activeConvo = conversations.find(c => c.id === activeId) ?? null;
  const activeTicket = tickets.find(t => t.id === activeSupportId) ?? null;
  const activeOffer = offers.find(o => o.id === activeOfferId) ?? null;

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvo?.messages.length, activeTicket?.messages.length]);

  // Auto-select first offer when switching to offers folder
  useEffect(() => {
    if (folder === "offers" && offers.length > 0 && !activeOfferId) {
      setActiveOfferId(offers[0].id);
    }
  }, [folder, offers]);

  // Filter threads based on folder
  const visibleConvos: Conversation[] = (() => {
    let list = conversations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.with.name.toLowerCase().includes(q) || c.listingTitle.toLowerCase().includes(q));
    }
    if (folder === "from-members" || folder === "inbox") return list;
    if (folder === "unread-members") return list.filter(c => c.unread > 0);
    if (folder === "sent") return list.filter(c => c.messages[c.messages.length - 1]?.senderId === "me");
    if (folder === "from-bazunk" || folder === "unread-bazunk") return [];
    if (folder === "offers") return [];
    return list;
  })();

  const visibleTickets: SupportTicket[] = (() => {
    if (folder === "inbox" || folder === "from-bazunk") return tickets;
    if (folder === "unread-bazunk") return tickets.filter(t => t.unread > 0);
    return [];
  })();

  const visibleOffers: Offer[] = folder === "offers" || folder === "inbox" ? offers : [];

  function openConvo(id: number) {
    setActiveId(id);
    setActiveSupportId(null);
    setActiveOfferId(null);
    setMobileView("chat");
    setConversations(prev => prev.map(c =>
      c.id === id ? { ...c, unread: 0, messages: c.messages.map(m => ({ ...m, read: true })) } : c
    ));
  }

  function openTicket(id: number) {
    setActiveSupportId(id);
    setActiveId(null);
    setActiveOfferId(null);
    setMobileView("chat");
    setTickets(prev => prev.map(t => t.id === id ? {
      ...t, unread: 0, messages: t.messages.map(m => ({ ...m, read: true }))
    } : t));
  }

  function openOffer(id: string) {
    setActiveOfferId(id);
    setActiveId(null);
    setActiveSupportId(null);
    setMobileView("chat");
  }

  function sendMessage() {
    if (!inputText.trim() || !activeId) return;
    const text = inputText.trim();
    setInputText("");
    const newMsg: Message = { id: Date.now(), senderId: "me", text, timestamp: new Date().toISOString(), read: false };
    setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, newMsg] } : c));
    setTimeout(() => {
      const replies = ["Thanks for the message!", "Got it, I'll get back to you shortly.", "Sounds good!", "I appreciate your quick response.", "Let me check and confirm."];
      const reply: Message = { id: Date.now() + 1, senderId: "them", text: replies[Math.floor(Math.random() * replies.length)], timestamp: new Date().toISOString(), read: false };
      setConversations(prev => prev.map(c => c.id === activeId ? { ...c, messages: [...c.messages, reply] } : c));
    }, 1800);
  }

  function sendSupportReply() {
    if (!supportInput.trim() || !activeSupportId) return;
    const text = supportInput.trim();
    setSupportInput("");
    const newMsg: SupportMessage = { id: Date.now(), senderId: "me", text, timestamp: new Date().toISOString(), read: true };
    setTickets(prev => prev.map(t => t.id === activeSupportId ? { ...t, messages: [...t.messages, newMsg] } : t));
    setTimeout(() => {
      const ack: SupportMessage = {
        id: Date.now() + 1, senderId: "bazunk",
        text: "Thanks for your reply! Our support team has received your message and will respond within 24 hours. Your case reference is #CAS-4421.",
        timestamp: new Date().toISOString(), read: false,
      };
      setTickets(prev => prev.map(t => t.id === activeSupportId ? { ...t, messages: [...t.messages, ack] } : t));
    }, 2000);
  }

  function toggleSelect(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const folderTitle: Record<FolderKey, string> = {
    inbox: "Inbox", "from-members": "From members", "unread-members": "Unread from members",
    "from-bazunk": "From Bazunk", "unread-bazunk": "Unread from Bazunk",
    sent: "Sent", deleted: "Deleted", archive: "Archive", offers: "My Offers",
  };

  const totalThreads = visibleConvos.length + visibleTickets.length + visibleOffers.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-4 md:inset-8 z-[101] flex flex-col rounded-2xl overflow-hidden shadow-2xl bg-white"
            style={{ maxWidth: 1200, maxHeight: 800, margin: "auto" }}
          >
            <div className="flex h-full min-h-0">

              {/* ── Left: Folder sidebar ── */}
              <div className={`${mobileView === "list" || mobileView === "chat" ? "hidden md:flex" : "flex"} flex-col`}>
                <FolderSidebar
                  active={folder}
                  onSelect={(f) => { setFolder(f); setMobileView("list"); }}
                  memberUnread={memberUnread}
                  bazunkUnread={bazunkUnread}
                  offerPending={pendingCount}
                  onClose={onClose}
                />
              </div>

              {/* ── Middle: Thread list ── */}
              <div className={`${mobileView === "chat" ? "hidden md:flex" : "flex"} w-full md:w-72 lg:w-80 flex-shrink-0 border-r border-gray-200 flex-col`}>

                {/* Thread list header */}
                <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2 mb-2">
                    <button onClick={() => setMobileView("folders")} className="md:hidden w-6 h-6 flex items-center justify-center">
                      <ArrowLeft className="w-4 h-4 text-gray-500" />
                    </button>
                    <h2 className="font-bold text-sm text-gray-900 flex-1">{folderTitle[folder]}</h2>
                    {selectedIds.size > 0 && (
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-[10px] font-semibold">Clear</button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Archive className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search all member messages"
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/20 focus:border-[#4A5CE8]"
                    />
                  </div>
                </div>

                {/* Thread rows */}
                <div className="flex-1 overflow-y-auto">
                  {totalThreads === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <FolderOpen className="w-10 h-10 text-gray-200 mb-3" />
                      <p className="text-sm font-semibold text-gray-400">No messages here</p>
                      {folder === "offers" && (
                        <p className="text-xs text-gray-400 mt-1">Make an offer on any listing</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {visibleConvos.map(convo => (
                        <MemberThreadRow
                          key={convo.id}
                          convo={convo}
                          active={activeId === convo.id}
                          onClick={() => openConvo(convo.id)}
                          selected={selectedIds.has(convo.id)}
                          onSelect={e => toggleSelect(e, convo.id)}
                        />
                      ))}
                      {visibleTickets.map(ticket => (
                        <SupportThreadRow
                          key={ticket.id}
                          ticket={ticket}
                          active={activeSupportId === ticket.id}
                          onClick={() => openTicket(ticket.id)}
                        />
                      ))}
                      {visibleOffers.map(offer => (
                        <OfferThreadRow
                          key={offer.id}
                          offer={offer}
                          active={activeOfferId === offer.id}
                          onClick={() => openOffer(offer.id)}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* ── Right: Detail panel ── */}
              <div className={`${mobileView === "list" ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0`}>

                {/* Nothing selected */}
                {!activeConvo && !activeTicket && !activeOffer && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="w-16 h-16 rounded-2xl bg-[#4A5CE8]/10 flex items-center justify-center mb-4">
                      <MessageSquare className="w-8 h-8 text-[#4A5CE8]/40" />
                    </div>
                    <h3 className="text-base font-bold text-gray-700 mb-1">Select a message</h3>
                    <p className="text-sm text-gray-400 max-w-xs">Choose a conversation from the list to view it here.</p>
                  </div>
                )}

                {/* Member chat */}
                {activeConvo && (
                  <>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                      <button onClick={() => setMobileView("list")} className="md:hidden">
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <UserAvatar initials={activeConvo.with.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{activeConvo.with.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <div className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{activeConvo.with.rating}</div>
                          <span>·</span>
                          <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{activeConvo.with.location}</div>
                          <span>·</span>
                          <div className="flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" />Verified</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="hidden sm:block text-xs text-[#F26B21] font-semibold truncate max-w-[140px]">{activeConvo.listingTitle} — £{activeConvo.listingPrice.toLocaleString()}</span>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Archive className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Flag className="w-4 h-4" /></button>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Listing context bar */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-gray-100 overflow-hidden flex-shrink-0">
                        <img src={activeConvo.listingImage} alt="" className="w-full h-full object-contain p-0.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{activeConvo.listingTitle}</p>
                        <p className="text-xs font-bold text-[#F26B21]">£{activeConvo.listingPrice.toLocaleString()}</p>
                      </div>
                      <Link href={`/listing/${activeConvo.listingId}`} onClick={onClose}
                        className="flex-shrink-0 text-[10px] text-[#4A5CE8] font-semibold hover:underline flex items-center gap-0.5">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 bg-gray-50">
                      {activeConvo.messages.length > 0 && (
                        <div className="flex items-center gap-3 py-1">
                          <div className="flex-1 h-px bg-gray-200" />
                          <span className="text-[10px] text-gray-400">
                            {new Date(activeConvo.messages[0].timestamp).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                          <div className="flex-1 h-px bg-gray-200" />
                        </div>
                      )}
                      <AnimatePresence initial={false}>
                        {activeConvo.messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
                      </AnimatePresence>
                      <div ref={bottomRef} />
                    </div>

                    {/* Quick replies */}
                    <div className="px-4 py-1.5 flex gap-2 flex-wrap border-t border-gray-100 bg-white">
                      {["Is this still available?", "Can you do a lower price?", "I'll take it!"].map(s => (
                        <button key={s} onClick={() => setInputText(s)}
                          className="text-[10px] px-2.5 py-1 rounded-full border border-[#4A5CE8]/30 text-[#4A5CE8] bg-[#4A5CE8]/5 hover:bg-[#4A5CE8]/10 transition-colors font-medium">
                          {s}
                        </button>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="px-4 pb-4 pt-2 bg-white flex-shrink-0">
                      <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#4A5CE8] focus-within:ring-2 focus-within:ring-[#4A5CE8]/20 transition-all">
                        <div className="flex gap-1 pb-0.5">
                          <button className="p-1 text-gray-400 hover:text-gray-600"><Smile className="w-4 h-4" /></button>
                          <button className="p-1 text-gray-400 hover:text-gray-600"><Paperclip className="w-4 h-4" /></button>
                        </div>
                        <textarea
                          ref={inputRef}
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Send message…"
                          rows={1}
                          className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-28 py-0.5"
                        />
                        <button onClick={sendMessage} disabled={!inputText.trim()}
                          className={`p-2 rounded-xl flex-shrink-0 transition-all ${inputText.trim() ? "bg-[#4A5CE8] text-white hover:opacity-90 shadow-sm" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
                    </div>
                  </>
                )}

                {/* Support ticket */}
                {activeTicket && (
                  <>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                      <button onClick={() => setMobileView("list")} className="md:hidden">
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <BazunkAvatar />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">Bazunk Support</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{activeTicket.subject}</span>
                          <span>·</span>
                          <span className={`font-semibold ${
                            activeTicket.status === "open" ? "text-emerald-600" :
                            activeTicket.status === "pending" ? "text-amber-600" : "text-gray-400"
                          }`}>
                            {activeTicket.status.charAt(0).toUpperCase() + activeTicket.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] bg-gray-100 text-gray-500 font-semibold px-2 py-1 rounded-full">{activeTicket.category}</span>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><MoreHorizontal className="w-4 h-4" /></button>
                      </div>
                    </div>

                    {/* Info bar */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-[#FFF7F2] border-b border-[#F26B21]/20 flex-shrink-0">
                      <HelpCircle className="w-4 h-4 text-[#F26B21] flex-shrink-0" />
                      <p className="text-xs text-[#F26B21] font-medium">Support tickets are handled by the Bazunk team. Response time is usually within 24 hours.</p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                      <AnimatePresence initial={false}>
                        {activeTicket.messages.map(msg => <SupportBubble key={msg.id} msg={msg} />)}
                      </AnimatePresence>
                      <div ref={bottomRef} />
                    </div>

                    {/* Reply input (only if ticket is open) */}
                    {activeTicket.status !== "closed" ? (
                      <div className="px-4 pb-4 pt-3 bg-white border-t border-gray-100 flex-shrink-0">
                        <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-[#F26B21] focus-within:ring-2 focus-within:ring-[#F26B21]/20 transition-all">
                          <button className="p-1 text-gray-400 hover:text-gray-600 pb-0.5"><Paperclip className="w-4 h-4" /></button>
                          <textarea
                            value={supportInput}
                            onChange={e => setSupportInput(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendSupportReply(); } }}
                            placeholder="Reply to Bazunk Support…"
                            rows={1}
                            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none max-h-28 py-0.5"
                          />
                          <button onClick={sendSupportReply} disabled={!supportInput.trim()}
                            className={`p-2 rounded-xl flex-shrink-0 transition-all ${supportInput.trim() ? "bg-[#F26B21] text-white hover:opacity-90 shadow-sm" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-400 text-center mt-1.5">Enter to send · Shift+Enter for new line</p>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0 text-center">
                        <p className="text-xs text-gray-400 font-semibold">This ticket is closed.</p>
                        <Link href="/support" onClick={onClose} className="text-xs text-[#F26B21] font-semibold hover:underline mt-0.5 inline-block">
                          Open a new support ticket →
                        </Link>
                      </div>
                    )}
                  </>
                )}

                {/* Offer detail */}
                {activeOffer && (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0">
                      <button onClick={() => setMobileView("list")} className="md:hidden">
                        <ArrowLeft className="w-4 h-4 text-gray-500" />
                      </button>
                      <Tag className="w-4 h-4 text-[#4A5CE8]" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm">Offer Negotiation</p>
                        <p className="text-xs text-gray-400">with {activeOffer.sellerName}</p>
                      </div>
                    </div>
                    <OfferDetail
                      offer={activeOffer}
                      onRespond={(action, price, msg) => respondToOffer(activeOffer.id, action, price, msg)}
                      onRespondToCounter={(accept) => respondToCounter(activeOffer.id, accept)}
                    />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

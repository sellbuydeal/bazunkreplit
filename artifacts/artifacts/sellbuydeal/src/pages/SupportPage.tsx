import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ChevronDown, HelpCircle, ShoppingBag, Package, CreditCard,
  Shield, MessageSquare, RotateCcw, ArrowRight, Gavel, Zap,
  Radio, Layers, Tag,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AdSlot } from "@/components/AdSlot";

const CATEGORIES = [
  {
    icon: ShoppingBag,
    label: "Buying",
    color: "bg-blue-100 text-blue-600",
    faqs: [
      { q: "How do I make an offer on an item?", a: "Visit any listing and click 'Make an Offer'. Enter your price and a message to the seller. They can accept, decline, or counter within 48 hours. You'll be notified by email either way." },
      { q: "Is it safe to buy on Bazunk?", a: "Yes. All payments go through Bazunk — you never send money directly to a seller. Every order is covered by our Buyer Protection policy. If something goes wrong you can open a dispute from your Dashboard." },
      { q: "Can I track my order?", a: "Once an item ships you'll receive a tracking number by email and inside Dashboard → Orders. Click the order to see live tracking steps from dispatch to delivery." },
      { q: "What payment methods are accepted?", a: "We accept all major credit and debit cards (Visa, Mastercard, Amex), PayPal, and Apple Pay. All transactions are processed over encrypted, PCI-compliant connections." },
      { q: "Can I buy from multiple sellers at once?", a: "Yes — add items from different sellers to your cart and check out together. Each seller's items are grouped and shipped separately, and fees are calculated per seller." },
      { q: "What is Buyer Protection?", a: "Buyer Protection means if an item doesn't arrive, arrives significantly different from the listing, or is damaged, we'll refund you in full. Open a dispute within 30 days of the estimated delivery date." },
    ],
  },
  {
    icon: Package,
    label: "Selling",
    color: "bg-orange-100 text-orange-600",
    faqs: [
      { q: "How do I list an item for sale?", a: "Click Sell in the top navigation and choose Quick Sell. Fill in the title, description, price, photos, and condition, then publish. Your listing goes live immediately and is visible to all buyers." },
      { q: "What are the selling fees?", a: "Listing is free. We charge a final value fee of 5–8% (depending on category) when your item sells. There are no monthly fees or hidden charges." },
      { q: "How do I get paid?", a: "Funds are released to your Bazunk balance 2 business days after the buyer confirms receipt. You can withdraw to your UK bank account or spend your balance on future purchases and promotions." },
      { q: "Can I pause or end a listing early?", a: "Yes. Go to Dashboard → My Listings, find the item, and click the menu icon. You can pause, edit, relist, or permanently remove any listing at any time." },
      { q: "How do I set auto-accept on offers?", a: "Go to Dashboard → Auto-Accept Offers and set a minimum threshold per listing or store-wide. Any offer at or above that price accepts automatically — no manual action needed." },
      { q: "Can I sell internationally?", a: "Currently Bazunk ships within the UK. International selling is planned for a future update. You can indicate your shipping regions on each listing." },
    ],
  },
  {
    icon: Gavel,
    label: "Auctions",
    color: "bg-violet-100 text-violet-600",
    faqs: [
      { q: "How do auctions work on Bazunk?", a: "Sellers set a starting price and an optional reserve. Buyers place bids and the highest bidder when the timer hits zero wins. You'll receive an email if you're outbid." },
      { q: "What is a reserve price?", a: "A reserve is the minimum amount the seller is willing to accept. If bids don't reach the reserve, the item won't sell. Reserve prices are hidden from buyers during the auction." },
      { q: "Can I set a Buy It Now price on an auction?", a: "Yes. Sellers can add a Buy It Now price alongside the auction. Any buyer can pay that price immediately to end the auction early and secure the item." },
      { q: "What happens if I win an auction?", a: "You'll be notified by email. Payment is taken automatically from your saved payment method. If payment fails you'll have 24 hours to complete it before the item is offered to the next highest bidder." },
      { q: "Can I retract a bid?", a: "Bids are binding on Bazunk. You can only retract a bid if the listing contained a significant error — contact support immediately and we'll review the case." },
      { q: "How do I create an auction listing?", a: "Go to Sell → Auction Listing. Set your starting price, optional reserve, optional Buy It Now price, and duration (1, 3, 5, 7, or 10 days). You can add up to 12 photos." },
    ],
  },
  {
    icon: Zap,
    label: "Flash Sales",
    color: "bg-amber-100 text-amber-600",
    faqs: [
      { q: "What is a Flash Sale?", a: "A Flash Sale lets you discount one or more items for a short, limited window (1–24 hours). Flash Sales appear in the dedicated Flash Sales section and are highlighted across the platform to drive urgency." },
      { q: "How do I create a Flash Sale?", a: "Go to Dashboard → My Flash Sales and click New Flash Sale. Choose items from your active listings, set a discount percentage, and pick a duration. The sale goes live immediately." },
      { q: "Can I run multiple Flash Sales at once?", a: "You can have one active Flash Sale per listing at a time, but you can create Flash Sales across multiple listings simultaneously. Each sale has its own timer and discount." },
      { q: "What discounts can I offer?", a: "You can offer any discount between 5% and 90% off your listed price. The discounted price and a countdown timer are shown prominently on the listing." },
      { q: "What happens when a Flash Sale ends?", a: "The item automatically reverts to its original price. If the item didn't sell, it remains listed normally. You can create another Flash Sale at any time." },
      { q: "Do Flash Sales affect my listing visibility?", a: "Yes — active Flash Sales get a promotional boost across browse, search results, and the homepage Flash Sales carousel, giving your items extra exposure during the sale window." },
    ],
  },
  {
    icon: Radio,
    label: "Live Shopping",
    color: "bg-red-100 text-red-600",
    faqs: [
      { q: "What is Live Shopping on Bazunk?", a: "Live Shopping lets sellers broadcast live video while showcasing items for sale. Viewers can buy directly from the stream. Live streams appear on the Live tab and can also be shared to external platforms." },
      { q: "How do I start a live stream?", a: "Go to Dashboard → Go Live and connect a streaming platform (Twitch, YouTube, or use Bazunk's built-in broadcaster). Set up your listing carousel, then go live. Viewers can tap items to purchase instantly." },
      { q: "Can viewers make offers during a live stream?", a: "Yes. Viewers can click any pinned listing and make an offer. You can accept, decline, or counter in real time while continuing to broadcast." },
      { q: "Is there a fee for going live?", a: "Going live is free. Normal selling fees apply to any items sold during a stream. Boosting your stream for extra homepage visibility uses Bazunk Credits." },
      { q: "How long can I stream for?", a: "There's no hard limit on stream duration. We recommend sessions of 30–90 minutes for the best engagement. Streams are automatically saved as replays after they end." },
      { q: "What equipment do I need?", a: "A smartphone with a stable internet connection is enough to get started. For better quality, use a ring light and external microphone. The Bazunk broadcaster works in any modern browser." },
    ],
  },
  {
    icon: Layers,
    label: "Bundles & Deals",
    color: "bg-indigo-100 text-indigo-600",
    faqs: [
      { q: "What is a Bundle Deal?", a: "Bundle Deals let you group multiple listings together and offer buyers a tiered discount. The more items in the bundle, the bigger the discount: 2 items = 5% off, 3 = 10%, 4 = 15%, 5+ = 20% off." },
      { q: "How do I create a Bundle Deal?", a: "Go to Sell → Create Bundle (or Dashboard → Bundle Builder). Select at least 2 of your active listings, review the auto-calculated discounts, and publish. Buyers can then buy the bundle in one checkout." },
      { q: "Can I include auction items in a bundle?", a: "No. Bundles are for fixed-price listings only. Auction and Flash Sale items cannot be added to a bundle while they're in those states." },
      { q: "What are Classifieds?", a: "Classifieds are free text-based ads for items and services that don't require the full checkout flow — useful for local collections, large items, or services. Buyers contact you directly to arrange the transaction." },
      { q: "Are Classifieds covered by Buyer Protection?", a: "No. Classified ads are contact-only listings and are outside Bazunk's payment and protection systems. We recommend meeting in a safe public place for in-person exchanges." },
      { q: "Can I feature my Bundle or Classified on the homepage?", a: "Yes — use Credits to purchase a Homepage Spotlight or Featured Badge for any listing type. Go to Dashboard → Promotions to choose a boost package." },
    ],
  },
  {
    icon: RotateCcw,
    label: "Returns & Refunds",
    color: "bg-emerald-100 text-emerald-600",
    faqs: [
      { q: "What is your returns policy?", a: "Buyers have 30 days from delivery to request a return if the item is not as described, is damaged, or doesn't arrive. Items must be returned unused and in original packaging where possible." },
      { q: "How long do refunds take?", a: "Once we approve a return, refunds are processed within 3–5 business days back to your original payment method." },
      { q: "What if the seller refuses a return?", a: "If a seller won't accept a valid return, open a dispute in Dashboard → Disputes. Our team reviews all disputes within 24 hours and will issue a refund where applicable." },
      { q: "Can I exchange an item instead of returning?", a: "Exchanges are arranged directly between buyer and seller. Message the seller first to agree terms, then initiate a return for the original item while completing a new purchase." },
      { q: "Who pays for return shipping?", a: "If the item is not as described or is faulty, the seller covers return postage. For change-of-mind returns, the buyer is responsible for return shipping costs." },
      { q: "How do I open a return request?", a: "Go to Dashboard → Returns and click New Return Request. Select your order, choose a reason, upload photos if the item is damaged, and submit. The seller has 48 hours to respond before we step in." },
    ],
  },
  {
    icon: CreditCard,
    label: "Credits & Payments",
    color: "bg-purple-100 text-purple-600",
    faqs: [
      { q: "What are Bazunk Credits?", a: "Credits are Bazunk's platform currency used to promote your listings. 100 Credits = £1. You earn Credits through milestones and rewards, or purchase them directly in Dashboard → Credits." },
      { q: "What can I spend Credits on?", a: "Credits can be used for: Move to Top (re-list to top of search), Featured Badge (highlighted listing), Homepage Spotlight, live stream boosts, and priority support." },
      { q: "How do I buy Credits?", a: "Go to Dashboard → Credits and choose a bundle. Credits are added instantly and never expire." },
      { q: "Can I earn Credits for free?", a: "Yes. Complete milestones in Dashboard → Credits → Earn Rewards to claim free Credits. Examples: posting your first listing, going live, making your first sale, and more." },
      { q: "Can I get a refund on unused Credits?", a: "Credits are non-refundable once purchased, but they never expire and can be used on any listing at any time." },
      { q: "Is my payment information secure?", a: "Yes. We use SSL encryption and never store raw card details. All transactions are processed through a PCI-compliant payment processor. Your data is never shared with sellers." },
    ],
  },
  {
    icon: Shield,
    label: "Account & Security",
    color: "bg-red-100 text-red-600",
    faqs: [
      { q: "How do I reset my password?", a: "On the login page click 'Forgot password?' and enter your email address. We'll send a reset link valid for 24 hours." },
      { q: "How do I update my email or display name?", a: "Go to Dashboard → Profile and click Edit Profile. You can update your name, email, username, and avatar at any time." },
      { q: "How do I close my account?", a: "Open a support ticket from your Dashboard and choose 'Account Closure' as the category. We'll process your request and delete all personal data within 30 days per our Privacy Policy." },
      { q: "What do I do if I suspect fraud?", a: "Use the flag icon on any listing or seller profile to report suspicious activity. Our Trust & Safety team reviews all reports within 24 hours. If you've been scammed, open a dispute immediately." },
      { q: "How do I enable two-factor authentication?", a: "Go to Dashboard → Security. Two-factor authentication (2FA) can be enabled via an authenticator app or SMS. We strongly recommend enabling 2FA on your account." },
      { q: "My account has been restricted — what do I do?", a: "Account restrictions are applied when our systems detect unusual activity. Open a support ticket from your Dashboard with the subject 'Account Restriction' and our team will review your case within 24 hours." },
    ],
  },
  {
    icon: MessageSquare,
    label: "Messages & Offers",
    color: "bg-sky-100 text-sky-600",
    faqs: [
      { q: "How do I message a seller?", a: "Open any listing and click 'Message Seller'. You can also message from a seller's profile page. All conversations appear in Dashboard → Messages." },
      { q: "What is Auto-Accept Offers?", a: "In Dashboard → Auto-Accept Offers, set a minimum threshold per listing. Any offer at or above that amount is automatically accepted without you needing to respond." },
      { q: "How long do offers last?", a: "Offers expire after 48 hours if the seller doesn't respond. You'll receive an email notification when an offer is accepted, declined, or expires." },
      { q: "Can a seller counter my offer?", a: "Yes. Sellers can send a counter-offer with a different price. You'll be notified and can accept or decline the counter. Counter-offers also expire after 48 hours." },
      { q: "Is there a limit on how many offers I can have open?", a: "No. You can have unlimited open offers across different listings and sellers at any time." },
      { q: "Can I report a message that breaks the rules?", a: "Yes. In any conversation, tap the three-dot menu and select 'Report'. Our moderation team reviews flagged messages and acts within 24 hours." },
    ],
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-left gap-4 hover:text-[#4A5CE8] transition-colors"
      >
        <span className="text-sm font-semibold text-gray-800">{q}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-gray-500 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SupportPage() {
  const [activeCategory, setActiveCategory] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1D2E] to-[#2d3159] py-16 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="w-14 h-14 rounded-2xl bg-[#4A5CE8]/20 flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="w-7 h-7 text-[#4A5CE8]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Support Centre</h1>
          <p className="text-white/60 text-base max-w-md mx-auto">
            Find answers to common questions about buying, selling, auctions, live shopping, and your account.
          </p>
        </motion.div>
      </section>

      <AdSlot slotKey="support_mid" />

      <div className="container mx-auto px-4 py-12 max-w-4xl flex-1">

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-8 justify-center">
          {CATEGORIES.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => setActiveCategory(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  activeCategory === i
                    ? "bg-[#4A5CE8] text-white shadow-sm"
                    : "bg-white border border-gray-200 text-gray-600 hover:border-[#4A5CE8] hover:text-[#4A5CE8]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* FAQ panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-2"
          >
            {CATEGORIES[activeCategory].faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Still need help */}
        <div className="mt-10 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#4A5CE8]/10 flex items-center justify-center mx-auto mb-4">
            <Tag className="w-6 h-6 text-[#4A5CE8]" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
            Support open 24/7. Open a ticket from your Dashboard and we'll get back to you as soon as possible.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              href="/dashboard?section=support-tickets"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#4A5CE8] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <MessageSquare className="w-4 h-4" /> Open a Support Ticket
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:border-gray-300 transition-colors"
            >
              My Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

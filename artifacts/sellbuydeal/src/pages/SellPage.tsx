import { useState } from "react";
import { useRawSettings } from "@/context/SiteSettingsContext";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  ShoppingCart,
  Layers,
  Newspaper,
  Store,
  ArrowRight,
  Globe,
  Headphones,
  ShieldCheck,
  Tag,
  CreditCard,
  TrendingUp,
  CheckCircle2,
  Calculator,
  ExternalLink,
  Banknote,
  Percent,
  Info,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const SELL_OPTIONS = [
  {
    id: "quick-sell",
    title: "Quick Sell",
    description:
      "List your item for immediate sale with Buy It Now or Make an Offer options",
    icon: ShoppingCart,
    gradient: "from-[#5B4FD9] to-[#7C3AED]",
    cta: "Get started",
    ctaColor: "text-[#4A5CE8]",
    href: "/sell/quick",
    badge: null,
  },
  {
    id: "create-bundle",
    title: "Create Bundle",
    description:
      "Group multiple items together for bundle deals and increased sales",
    icon: Layers,
    gradient: "from-[#1a9e6f] to-[#0d7a57]",
    cta: "Create bundle",
    ctaColor: "text-[#1a9e6f]",
    href: "/bundle",
    badge: null,
  },
  {
    id: "classified-ads",
    title: "Classified Ads",
    description:
      "Post classified ads for services, rentals, and local items",
    icon: Newspaper,
    gradient: "from-[#E8622A] to-[#C0392B]",
    cta: "Post an ad",
    ctaColor: "text-[#E8622A]",
    href: "/classifieds",
    badge: null,
  },
  {
    id: "open-store",
    title: "Open a Store",
    description:
      "Create your own branded storefront with a banner, profile pic, and all your listings",
    icon: Store,
    gradient: "from-[#2563EB] to-[#1E3A8A]",
    cta: "Create store",
    ctaColor: "text-[#2563EB]",
    href: "/dashboard",
    badge: "FREE",
  },
];

const WHY_FEATURES = [
  {
    icon: Tag,
    title: "Free to List",
    desc: "No upfront costs — listing is always free. You only pay a small fee when you sell.",
  },
  {
    icon: Globe,
    title: "Wide Reach",
    desc: "List your items and reach buyers across the Bazunk marketplace instantly.",
  },
  {
    icon: Headphones,
    title: "Seller Support",
    desc: "Questions? Contact our support team and we'll get back to you fast.",
  },
  {
    icon: ShieldCheck,
    title: "Dispute Handling",
    desc: "Report issues with buyers and our team will review the case fairly.",
  },
];

const STRIPE_RATE = 0.029;
const STRIPE_FIXED = 0.30;

function useMktRate(rawSettings: Record<string, string>) {
  return (parseFloat(rawSettings["fee_rate_default"] ?? "5") || 5) / 100;
}

function buildFeeRows(mktRatePct: number) {
  const sellerPct = Math.round((1 - mktRatePct / 100 - STRIPE_RATE) * 100);
  return [
    {
      label: "Listing fee",
      value: "Free",
      sub: "Always — no upfront cost",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      icon: Tag,
      iconColor: "text-emerald-500",
    },
    {
      label: "Bazunk marketplace fee",
      value: `${mktRatePct}%`,
      sub: "Deducted from sale price at payout",
      color: "text-[#F26B21]",
      bg: "bg-orange-50",
      icon: Percent,
      iconColor: "text-[#F26B21]",
    },
    {
      label: "Stripe card processing",
      value: "2.9% + £0.30",
      sub: "Secure card processing via Stripe",
      color: "text-[#4A5CE8]",
      bg: "bg-blue-50",
      icon: CreditCard,
      iconColor: "text-[#4A5CE8]",
    },
    {
      label: "Seller receives",
      value: `~${sellerPct}%`,
      sub: "Paid directly to your bank via Stripe",
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      icon: Banknote,
      iconColor: "text-emerald-600",
    },
  ];
}

function FeeCalculator() {
  const rawSettings = useRawSettings();
  const mktRate = useMktRate(rawSettings);
  const mktRatePct = Math.round(mktRate * 100);
  const [amount, setAmount] = useState("50");
  const val = parseFloat(amount) || 0;
  const mktFee = val * mktRate;
  const stripeFee = val * STRIPE_RATE + STRIPE_FIXED;
  const net = Math.max(0, val - mktFee - stripeFee);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#4A5CE8]/10 flex items-center justify-center">
          <Calculator className="w-4 h-4 text-[#4A5CE8]" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">Fee Calculator</p>
          <p className="text-xs text-gray-400">See exactly what you'll receive</p>
        </div>
      </div>

      <div className="relative mb-5">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">£</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter sale price"
          className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#4A5CE8] focus:ring-2 focus:ring-[#4A5CE8]/10"
        />
      </div>

      {val > 0 && (
        <div className="space-y-2.5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Sale price</span>
            <span className="font-bold text-gray-900">£{val.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#F26B21] inline-block" />
              Marketplace fee ({mktRatePct}%)
            </span>
            <span className="font-semibold text-[#F26B21]">−£{mktFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#4A5CE8] inline-block" />
              Stripe fee (2.9% + £0.30)
            </span>
            <span className="font-semibold text-[#4A5CE8]">−£{stripeFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold border-t border-gray-100 pt-3 mt-1">
            <span className="text-gray-900">You receive</span>
            <span className="text-emerald-600 text-base">£{net.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400 text-right">
            {val > 0 ? `${((net / val) * 100).toFixed(1)}% of sale price` : ""}
          </p>
        </div>
      )}

      {val <= 0 && (
        <div className="text-center py-4 text-sm text-gray-400">
          Enter a sale price above to see your payout
        </div>
      )}
    </div>
  );
}

export function SellPage() {
  const rawSettings = useRawSettings();
  const mktRate = useMktRate(rawSettings);
  const mktRatePct = Math.round(mktRate * 100);
  const FEE_ROWS = buildFeeRows(mktRatePct);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-white pt-16 pb-14 border-b">
        <div className="container mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-4"
          >
            Start Selling Today
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="text-gray-500 text-lg"
          >
            Choose how you want to sell your items
          </motion.p>
        </div>
      </section>

      {/* Selling option cards */}
      <section className="container mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SELL_OPTIONS.map((option, i) => {
            const Icon = option.icon;
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md hover:-translate-y-1 transition-all duration-300"
                data-testid={`card-sell-option-${option.id}`}
              >
                <div
                  className={`relative h-44 bg-gradient-to-br ${option.gradient} flex items-center justify-center`}
                >
                  {option.badge && (
                    <span className="absolute top-3 right-3 bg-white text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                      {option.badge}
                    </span>
                  )}
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                </div>

                <div className="p-5 flex flex-col flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {option.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">
                    {option.description}
                  </p>
                  <Link
                    href={option.href}
                    className={`inline-flex items-center gap-1 mt-4 text-sm font-semibold ${option.ctaColor} hover:underline`}
                    data-testid={`link-sell-option-${option.id}`}
                  >
                    {option.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── Seller Fees & Payouts ── */}
      <section className="bg-white border-t border-b py-16">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F26B21] bg-orange-50 px-3 py-1.5 rounded-full mb-4">
              <TrendingUp className="w-3.5 h-3.5" /> Transparent Pricing
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Seller Fees — No Hidden Costs</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Listing is always free. You only pay fees when an item sells, and they're
              deducted automatically — no invoices, no surprises.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-5xl mx-auto items-start">
            {/* Fee table */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="font-bold text-gray-900">Fee breakdown per sale</p>
                <p className="text-xs text-gray-400 mt-0.5">Per completed transaction</p>
              </div>
              <div className="divide-y divide-gray-50">
                {FEE_ROWS.map((row) => {
                  const Icon = row.icon;
                  return (
                    <div key={row.label} className={`flex items-center gap-4 px-6 py-4 ${row.label === "Seller receives" ? "bg-emerald-50/40" : ""}`}>
                      <div className={`w-10 h-10 rounded-xl ${row.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${row.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{row.label}</p>
                        <p className="text-xs text-gray-400">{row.sub}</p>
                      </div>
                      <span className={`text-base font-black ${row.color} flex-shrink-0`}>{row.value}</span>
                    </div>
                  );
                })}
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-gray-500">
                  Bazunk credits can be used for listing fees and boosts — but <strong>not</strong> for marketplace or Stripe processing fees. Those are always cash.
                </p>
              </div>

              {/* Per-category rates */}
              <div className="border-t border-gray-100">
                <div className="px-6 py-3 bg-gray-50/60">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Marketplace fee by category</p>
                </div>
                <div className="divide-y divide-gray-50">
                  {[
                    { name: "Electronics",               slug: "electronics" },
                    { name: "Phones & Tablets",          slug: "cell-phones" },
                    { name: "Fashion & Jewellery",       slug: "clothing-shoes-jewelry" },
                    { name: "Automotive",                slug: "automotive" },
                    { name: "Home & Garden",             slug: "home-garden" },
                    { name: "Sports & Outdoors",         slug: "sports-outdoors" },
                    { name: "Toys & Games",              slug: "toys-games" },
                    { name: "Books",                     slug: "books" },
                    { name: "CDs, Vinyl & Music",        slug: "cds-vinyl" },
                    { name: "Beauty & Personal Care",    slug: "beauty-personal-care" },
                    { name: "Baby Products",             slug: "baby-products" },
                    { name: "Health & Household",        slug: "health-household" },
                    { name: "Arts, Crafts & Sewing",     slug: "arts-crafts-sewing" },
                    { name: "Appliances",                slug: "appliances" },
                    { name: "Eco-Friendly",              slug: "eco-friendly" },
                  ].map((cat) => {
                    const rate = parseFloat(rawSettings[`fee_rate_${cat.slug}`] ?? rawSettings["fee_rate_default"] ?? "5") || 5;
                    const isDefault = !rawSettings[`fee_rate_${cat.slug}`] || rawSettings[`fee_rate_${cat.slug}`] === rawSettings["fee_rate_default"];
                    return (
                      <div key={cat.slug} className="flex items-center justify-between px-6 py-2 text-sm">
                        <span className="text-gray-600">{cat.name}</span>
                        <span className={`font-bold tabular-nums ${isDefault ? "text-gray-500" : "text-[#F26B21]"}`}>
                          {rate}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>

            {/* Fee calculator + bank connect */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-4"
            >
              <FeeCalculator />

              {/* Bank account connect CTA */}
              <div className="bg-gradient-to-br from-[#4A5CE8] to-[#3B4FD8] rounded-2xl p-6 text-white">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Banknote className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Get paid automatically</p>
                    <p className="text-white/70 text-sm mt-0.5">
                      Connect your bank account via Stripe Express. Fast, free, and secure — set up in ~5 minutes.
                    </p>
                  </div>
                </div>
                <div className="space-y-2 mb-5">
                  {[
                    "Payouts sent directly to your UK bank",
                    "Fees deducted automatically at point of sale",
                    "View payout history in your Stripe dashboard",
                  ].map((point) => (
                    <div key={point} className="flex items-center gap-2 text-sm text-white/85">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                      {point}
                    </div>
                  ))}
                </div>
                <Link
                  href="/dashboard?section=seller-payouts"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-[#4A5CE8] font-bold text-sm hover:bg-gray-50 transition-colors"
                  data-testid="button-connect-bank"
                >
                  <ExternalLink className="w-4 h-4" />
                  Connect Bank Account in Dashboard
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why sellers choose us */}
      <section className="bg-gray-50 border-b py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 mb-3"
          >
            Why Sellers Choose Us
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.07 }}
            className="text-gray-500 mb-14"
          >
            Everything you need to succeed as a seller
          </motion.p>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {WHY_FEATURES.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  className="flex flex-col items-center gap-4"
                  data-testid={`feature-seller-${i}`}
                >
                  <div className="w-16 h-16 rounded-full bg-[#F26B21] flex items-center justify-center shadow-md">
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-base">{feat.title}</h3>
                  <p className="text-sm text-gray-500 max-w-[180px]">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* CTA card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200 py-10 px-8 shadow-sm"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              Ready to Start Selling?
            </h3>
            <p className="text-sm text-gray-500 mb-7">
              Free to list. Keep ~92–93% of every sale.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/sell/quick"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#F26B21] text-white font-semibold text-sm hover:bg-[#d95f1c] transition-colors shadow-sm"
                data-testid="button-create-seller-account"
              >
                <ShoppingCart className="w-4 h-4" /> List Your First Item
              </Link>
              <Link
                href="/dashboard?section=seller-payouts"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-colors shadow-sm"
                data-testid="button-seller-dashboard"
              >
                <Banknote className="w-4 h-4" /> Connect Bank Account
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

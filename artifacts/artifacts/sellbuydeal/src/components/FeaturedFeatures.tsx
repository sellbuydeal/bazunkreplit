import { motion } from "framer-motion";
import { Zap, Gavel, Handshake, ArrowRight, Shield, Tag, Radio } from "lucide-react";
import { Link } from "wouter";

const FEATURE_BLOCKS = [
  {
    icon: Zap,
    iconBg: "bg-[#F26B21]",
    tag: "New Feature",
    title: "Flash Sales",
    description: "Sellers set time-limited discounts — you see the countdown, grab the deal before it's gone. Updated constantly.",
    cta: "Browse Flash Sales",
    href: "/flash-sales",
    bg: "bg-[#1A1D2E]",
    border: "border-[#F26B21]/20",
    tagColor: "text-[#F26B21] bg-[#F26B21]/10",
    ctaColor: "bg-[#F26B21] text-white hover:opacity-90",
    glow: "shadow-[#F26B21]/10",
  },
  {
    icon: Gavel,
    iconBg: "bg-[#4A5CE8]",
    tag: "Live Right Now",
    title: "Live Auctions",
    description: "Real items. Real bidding. Every auction has a deadline — place your bid and see if you win.",
    cta: "Browse Auctions",
    href: "/auctions",
    bg: "bg-[#4A5CE8]",
    border: "border-white/10",
    tagColor: "text-white/80 bg-white/15",
    ctaColor: "bg-white text-[#4A5CE8] hover:bg-white/90",
    glow: "shadow-[#4A5CE8]/20",
  },
  {
    icon: Handshake,
    iconBg: "bg-white/15",
    tag: "Unique to Bazunk",
    title: "Make an Offer",
    description: "See something you like? Name your price. Sellers can accept, counter, or decline — it's all negotiable.",
    cta: "Browse Listings",
    href: "/browse",
    bg: "bg-gray-900",
    border: "border-white/10",
    tagColor: "text-white/60 bg-white/10",
    ctaColor: "border border-white/20 text-white hover:bg-white/5",
    glow: "shadow-gray-900/20",
  },
];

const TRUST_ITEMS = [
  { icon: Shield,  label: "Buyer Protection",      sub: "30-day dispute window"       },
  { icon: Tag,     label: "Free to List",           sub: "No upfront fees for sellers" },
  { icon: Radio,   label: "Live Selling",           sub: "Stream and sell in real time"},
];

export function FeaturedFeatures() {
  return (
    <section className="bg-gray-50 py-16 border-t border-gray-100">
      <div className="max-w-6xl mx-auto px-4">

        {/* Section header */}
        <div className="text-center mb-10">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-[#F26B21] text-xs font-black uppercase tracking-widest mb-2"
          >
            Why Bazunk?
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-black text-gray-900 leading-tight"
          >
            Everything in one place
          </motion.h2>
        </div>

        {/* 3 feature blocks */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {FEATURE_BLOCKS.map(({ icon: Icon, iconBg, tag, title, description, cta, href, bg, border, tagColor, ctaColor, glow }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className={`${bg} ${border} border rounded-3xl p-6 flex flex-col justify-between min-h-[280px] shadow-xl ${glow} relative overflow-hidden`}
            >
              {/* Subtle glow circle */}
              <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />

              <div className="relative z-10">
                <span className={`inline-flex text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-4 ${tagColor}`}>
                  {tag}
                </span>
                <div className={`w-11 h-11 rounded-2xl ${iconBg} flex items-center justify-center mb-4`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-black text-xl mb-2">{title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{description}</p>
              </div>

              <div className="relative z-10 mt-5">
                <Link href={href}>
                  <button className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${ctaColor}`}>
                    {cta} <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Trust row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

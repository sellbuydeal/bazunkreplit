import { useState } from "react";
import { Link } from "wouter";
import {
  Package, MapPin, QrCode, Truck, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, ArrowRight, ShieldCheck, Clock, Star, Zap, Search,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const CARRIER_FINDER_URLS: Record<string, (postcode: string) => string> = {
  inpost:      (p) => `https://inpost.co.uk/lockers?query=${encodeURIComponent(p)}`,
  evri:        (p) => `https://www.evri.com/find-a-parcelshop?postcode=${encodeURIComponent(p)}`,
  "royal-mail":(p) => `https://www.royalmail.com/postoffices?postcode=${encodeURIComponent(p)}`,
};

function LockerFinder() {
  const [postcode, setPostcode] = useState("");
  const [carrier, setCarrier] = useState<"all" | "inpost" | "evri" | "royal-mail">("all");
  const [error, setError] = useState("");

  const clean = postcode.trim().toUpperCase().replace(/\s+/g, " ");
  const ukPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i.test(clean);

  function handleFind() {
    if (!clean) { setError("Please enter a postcode."); return; }
    if (!ukPostcode) { setError("Please enter a valid UK postcode (e.g. SW1A 1AA)."); return; }
    setError("");
    const carriers = carrier === "all"
      ? (["inpost", "evri", "royal-mail"] as const)
      : [carrier];
    carriers.forEach((c) => {
      window.open(CARRIER_FINDER_URLS[c](clean), "_blank", "noopener,noreferrer");
    });
  }

  const carrierOptions = [
    { value: "all",        label: "All carriers" },
    { value: "inpost",     label: "InPost" },
    { value: "evri",       label: "Evri" },
    { value: "royal-mail", label: "Royal Mail" },
  ] as const;

  return (
    <div id="find-locker" className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-2xl bg-[#F26B21] flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Find Your Nearest Locker</h2>
          <p className="text-sm text-gray-400">20,000+ InPost, Evri & Royal Mail points across the UK</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={postcode}
            onChange={(e) => { setPostcode(e.target.value); setError(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleFind()}
            placeholder="Enter postcode, e.g. SW1A 1AA"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F26B21]/40 focus:border-[#F26B21] uppercase"
            maxLength={8}
          />
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
          {carrierOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCarrier(opt.value)}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                carrier === opt.value
                  ? "bg-white shadow-sm text-[#1A1D2E]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleFind}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
        >
          <Search className="w-4 h-4" /> Find Lockers
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <p className="mt-3 text-xs text-gray-400">
        Opens the carrier's official locker finder in a new tab — use your postcode to see drop-off points on a map.
      </p>
    </div>
  );
}

const CARRIERS = [
  {
    id: "inpost",
    name: "InPost",
    tagline: "24/7 smart lockers",
    locations: "4,500+",
    color: "#FFD100",
    textColor: "text-yellow-800",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    ring: "ring-yellow-400",
    badge: "bg-[#FFD100] text-yellow-900",
    icon: "📦",
    perks: [
      "Open 24 hours, 7 days a week",
      "QR-code drop-off — no printing needed",
      "Free returns on eligible orders",
      "Automated parcel collection",
    ],
    sizes: ["Small (8×38×64 cm)", "Medium (19×38×64 cm)", "Large (41×38×64 cm)"],
    eta: "Next day delivery",
  },
  {
    id: "evri",
    name: "Evri",
    tagline: "ParcelShops & lockers",
    locations: "6,700+",
    color: "#9B1FAE",
    textColor: "text-purple-800",
    bg: "bg-purple-50",
    border: "border-purple-200",
    ring: "ring-purple-400",
    badge: "bg-[#9B1FAE] text-white",
    icon: "🟣",
    perks: [
      "Largest UK ParcelShop network",
      "Drop off at shops, garages & lockers",
      "Tracked delivery from £2.49",
      "Easy returns with pre-printed labels",
    ],
    sizes: ["Small (10×10×30 cm)", "Medium (35×30×20 cm)", "Large (60×50×40 cm)"],
    eta: "2–3 day delivery",
  },
  {
    id: "royal-mail",
    name: "Royal Mail",
    tagline: "Post Offices & lockers",
    locations: "11,500+",
    color: "#CC0000",
    textColor: "text-red-800",
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "ring-red-400",
    badge: "bg-[#CC0000] text-white",
    icon: "🔴",
    perks: [
      "UK's most trusted postal service",
      "Click & Drop label printing",
      "Tracked 24 & 48 service",
      "11,500+ Post Office drop-off points",
    ],
    sizes: ["Letter (24×16.5×5 cm)", "Large Letter (35×25×2.5 cm)", "Small Parcel (45×35×16 cm)"],
    eta: "Tracked 24h / 48h",
  },
];

const SELLER_STEPS = [
  { n: 1, icon: Package,      title: "List your item",       desc: "Add your item to Bazunk and choose 'Ship from locker' as your delivery method." },
  { n: 2, icon: MapPin,       title: "Select network",       desc: "Pick InPost, Evri, or Royal Mail — we show you the nearest drop-off point." },
  { n: 3, icon: ShieldCheck,  title: "Buyer pays",           desc: "Payment is held securely until the buyer confirms delivery." },
  { n: 4, icon: QrCode,       title: "Get your label",       desc: "A prepaid shipping label (QR code or PDF) lands in your Bazunk dashboard." },
  { n: 5, icon: Truck,        title: "Drop & done",          desc: "Drop the parcel at your chosen locker or shop — we track it automatically." },
];

const BUYER_STEPS = [
  { n: 1, icon: Star,         title: "Choose locker delivery", desc: "At checkout, select 'Locker Delivery' and pick your nearest InPost / Evri / Royal Mail point." },
  { n: 2, icon: ShieldCheck,  title: "Pay securely",           desc: "Payment is held in escrow until your parcel arrives." },
  { n: 3, icon: Clock,        title: "Track in real time",     desc: "Follow your parcel from drop-off to your locker via the Bazunk tracking page." },
  { n: 4, icon: QrCode,       title: "Collect with QR",        desc: "Open the locker door by scanning the QR code in your Bazunk notification." },
];

const RETURN_STEPS = [
  { n: 1, icon: RotateCcw,    title: "Request return",         desc: "Buyer opens a return request from their order page — seller approves within 48h." },
  { n: 2, icon: QrCode,       title: "Return label generated", desc: "A prepaid return label is issued — buyer receives it by email and in-app." },
  { n: 3, icon: Package,      title: "Buyer drops off",        desc: "Buyer drops the parcel at any compatible locker or shop." },
  { n: 4, icon: CheckCircle2, title: "Refund released",        desc: "Seller receives the parcel; refund is released to the buyer automatically." },
];

const FAQS = [
  { q: "Do I need a printer?", a: "Not for InPost — they use QR codes you scan at the locker screen. Evri and Royal Mail may require a printed label, but many ParcelShops have in-store printing." },
  { q: "Who pays for the shipping label?", a: "Labels are prepaid by the buyer at checkout and included in the total. Sellers never have to pay out of pocket for postage." },
  { q: "What sizes can I send?", a: "Each carrier supports Small, Medium, and Large parcels. Very heavy or oversized items (over 20 kg) may need home collection instead." },
  { q: "How do returns work if the buyer uses a locker?", a: "We generate a prepaid return label. The buyer drops it at any compatible point; once scanned as received, we release the refund automatically." },
  { q: "Is the payment held until delivery?", a: "Yes — all Bazunk locker shipments use escrow. Funds are only released once the carrier marks the parcel as delivered." },
  { q: "Can I use any locker, or only specific ones?", a: "You can use any drop-off point in the carrier's network — not just the one shown on the listing. We'll always suggest the nearest one but it's your choice." },
];

export function LockerShippingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"seller" | "buyer" | "returns">("seller");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1A1D2E] via-[#2a2f4a] to-[#1A1D2E] text-white py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 bg-[#F26B21]/20 border border-[#F26B21]/30 rounded-full px-4 py-1.5 text-sm font-semibold text-[#F26B21] mb-6">
            <Package className="w-4 h-4" /> UK Locker Networks
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Ship & Collect via <br className="hidden sm:block" />
            <span className="text-[#F26B21]">UK Locker Networks</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-8">
            Drop off and collect parcels at 20,000+ InPost, Evri, and Royal Mail points across the UK — no home address needed, 24/7 access, prepaid labels.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/sell/quick"
              className="px-6 py-3 rounded-2xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
              <Package className="w-4 h-4" /> List & Ship via Locker
            </Link>
            <Link href="/shipping/labels"
              className="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors flex items-center gap-2">
              <QrCode className="w-4 h-4" /> My Shipping Labels
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto max-w-4xl px-4 py-4 grid grid-cols-3 divide-x divide-gray-100 text-center">
          {[
            { stat: "20,000+", label: "Drop-off points" },
            { stat: "3 carriers", label: "InPost · Evri · Royal Mail" },
            { stat: "Free returns", label: "On eligible orders" },
          ].map((s) => (
            <div key={s.stat} className="px-4 py-1">
              <p className="text-xl font-black text-[#1A1D2E]">{s.stat}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 container mx-auto max-w-4xl px-4 py-12 space-y-16">

        {/* Locker finder */}
        <LockerFinder />

        {/* Carrier cards */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Supported Networks</h2>
          <p className="text-gray-500 text-sm mb-6">Choose when listing — we generate the label automatically after a sale.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {CARRIERS.map((c) => (
              <div key={c.id} className={`rounded-2xl border-2 ${c.border} ${c.bg} p-5`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: c.color + "33" }}>
                    {c.icon}
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 text-base">{c.name}</h3>
                    <p className={`text-xs font-semibold ${c.textColor}`}>{c.tagline}</p>
                  </div>
                </div>
                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mb-4 ${c.badge}`}>
                  <MapPin className="w-3 h-3" /> {c.locations} locations
                </div>
                <ul className="space-y-2 mb-4">
                  {c.perks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Parcel sizes</p>
                  {c.sizes.map((s) => (
                    <p key={s} className="text-xs text-gray-500">{s}</p>
                  ))}
                  <p className={`text-xs font-bold mt-2 ${c.textColor}`}>
                    <Clock className="w-3 h-3 inline mr-1" />{c.eta}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-2">How It Works</h2>
          <p className="text-gray-500 text-sm mb-5">Different flows for sellers, buyers, and returns.</p>

          <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit mb-8">
            {(["seller", "buyer", "returns"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all capitalize ${
                  activeTab === tab ? "bg-white shadow-sm text-[#1A1D2E]" : "text-gray-500 hover:text-gray-700"
                }`}>
                {tab === "returns" ? "Returns" : tab === "seller" ? "Seller" : "Buyer"}
              </button>
            ))}
          </div>

          {activeTab === "seller" && (
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              {SELLER_STEPS.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.n} className="flex sm:flex-col items-start sm:items-center gap-3 sm:gap-2 sm:text-center">
                    <div className="flex items-center gap-2 sm:flex-col sm:gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-[#F26B21] flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {i < SELLER_STEPS.length - 1 && (
                        <div className="hidden sm:block w-full h-0.5 bg-gray-200 mt-5 relative">
                          <ArrowRight className="w-4 h-4 text-gray-300 absolute -right-2 -top-2" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{step.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "buyer" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {BUYER_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.n} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="w-10 h-10 rounded-2xl bg-[#4A5CE8] flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === "returns" && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {RETURN_STEPS.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.n} className="bg-white rounded-2xl border border-gray-100 p-5">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center mb-3">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.desc}</p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Why locker shipping */}
        <section className="bg-gradient-to-br from-[#4A5CE8]/5 to-[#F26B21]/5 rounded-3xl p-8 border border-gray-100">
          <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">Why Locker Shipping?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: ShieldCheck,  color: "bg-[#4A5CE8]",  title: "Escrow protection", desc: "Funds held until delivery confirmed." },
              { icon: Clock,        color: "bg-[#F26B21]",  title: "No missed deliveries", desc: "Collect on your schedule, not the courier's." },
              { icon: MapPin,       color: "bg-emerald-500", title: "20,000+ locations", desc: "Always one nearby — shops, garages, stations." },
              { icon: Zap,          color: "bg-purple-500",  title: "Instant labels",   desc: "QR code in seconds after a sale completes." },
            ].map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.title} className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
                  <div className={`w-10 h-10 rounded-2xl ${b.color} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{b.title}</p>
                  <p className="text-xs text-gray-500">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-2xl font-black text-gray-900 mb-6">Frequently Asked Questions</h2>
          <div className="space-y-2">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-3"
                >
                  <span className="text-sm font-semibold text-gray-900">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-gray-500">{faq.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-[#1A1D2E] rounded-3xl p-10 text-center text-white">
          <h2 className="text-2xl font-black mb-3">Ready to start?</h2>
          <p className="text-gray-300 text-sm mb-6 max-w-md mx-auto">
            List your first item with locker shipping and let us handle the label, tracking, and returns automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/sell/quick"
              className="px-6 py-3 rounded-2xl bg-[#F26B21] text-white font-bold hover:opacity-90 transition-opacity">
              List an Item
            </Link>
            <Link href="/shipping/labels"
              className="px-6 py-3 rounded-2xl bg-white/10 border border-white/20 text-white font-semibold hover:bg-white/20 transition-colors">
              My Labels &amp; Shipments
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

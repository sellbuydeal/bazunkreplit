import { Link } from "wouter";
import { ArrowRight, ShieldCheck, Gift, BadgePercent } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

export default function WelcomeNewBuyers() {
  const { currency, formatPrice, country } = useCurrency();
  const credit = `${currency.symbol}5`;
  return (
    <main className="min-h-screen bg-[#071a42] text-white">
      <section className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-gradient-to-br from-[#06205a] via-[#102d7b] to-[#4a176f] p-7 md:p-12 text-center">
          <p className="text-xs md:text-sm font-black tracking-[0.22em] text-yellow-300 uppercase">Welcome new buyers · {country.flag} {country.name}</p>
          <h1 className="mt-3 text-4xl md:text-6xl font-black leading-tight">Shop with confidence on Bazunk</h1>
          <p className="mt-4 text-lg text-white/75">Extra protection and rewards for new buyers in {country.name}.</p>
          <div className="mt-7 inline-flex items-center rounded-2xl bg-white/10 border border-white/15 px-6 py-4">
            <Gift className="w-7 h-7 text-yellow-300 mr-3" />
            <span className="font-black text-xl">Get {credit} credit on your 1st or 2nd qualifying purchase</span>
          </div>
          <p className="mt-5 text-white/80">Plus, we'll cover your Buyer Protection fee on your first qualifying purchase.</p>
          <Link href="/sign-up">
            <a className="inline-flex items-center gap-2 mt-8 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-8 py-4 transition-colors shadow-xl">
              Create your free account <ArrowRight className="w-5 h-5" />
            </a>
          </Link>
        </div>

        {/* Real HTML summary keeps the offer accessible/searchable and makes the terms clear. */}
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <BadgePercent className="w-7 h-7 text-sky-300 mb-3" />
            <h2 className="font-black text-lg">First buyer protection fee: {formatPrice(0)}</h2>
            <p className="text-sm text-white/70 mt-1">Bazunk covers the buyer protection charge on your first qualifying purchase.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Gift className="w-7 h-7 text-fuchsia-300 mb-3" />
            <h2 className="font-black text-lg">{credit} new-buyer credit</h2>
            <p className="text-sm text-white/70 mt-1">Your {credit} credit is applied for your first or second qualifying purchase.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <ShieldCheck className="w-7 h-7 text-emerald-300 mb-3" />
            <h2 className="font-black text-lg">Shop with Buyer Protection</h2>
            <p className="text-sm text-white/70 mt-1">If an eligible item doesn't arrive or isn't as described, the buyer can receive a 100% refund under Bazunk Buyer Protection.</p>
          </div>
        </div>

        <div className="text-center mt-7">
          <Link href="/sign-up">
            <a className="inline-flex items-center gap-2 rounded-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black px-8 py-4 transition-colors shadow-xl">
              Create your free account <ArrowRight className="w-5 h-5" />
            </a>
          </Link>
          <p className="text-xs text-white/45 mt-3">Offer eligibility and Buyer Protection terms apply.</p>
        </div>
      </section>
    </main>
  );
}

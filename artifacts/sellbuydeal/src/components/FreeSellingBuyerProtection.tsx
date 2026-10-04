import { Camera, PackageCheck, Wallet, ShieldCheck, ArrowRight, Coins } from "lucide-react";
import { Link } from "wouter";

export function FreeSellingBuyerProtection() {
  const steps = [
    { icon: Camera, n: "1", title: "List free", text: "Add photos, set your price and publish. No listing fee." },
    { icon: PackageCheck, n: "2", title: "Sell free", text: "Make the sale and ship it. Private sellers pay 0% commission." },
    { icon: Wallet, n: "3", title: "Keep it", text: "Keep 100% of your item price — and earn free credits to promote." },
  ];
  return <section className="bg-white py-16 border-y border-gray-100">
    <div className="max-w-6xl mx-auto px-4">
      <div className="text-center mb-10"><p className="text-[#F26B21] text-xs font-black uppercase tracking-widest">Selling on Bazunk</p><h2 className="text-3xl md:text-5xl font-black text-gray-900 mt-2">List free. Sell free. Keep what you earn.</h2><p className="text-gray-500 mt-3">No listing fees. No seller commission for private sellers. Plus free credits you can earn and spend on promotions.</p></div>
      <div className="grid md:grid-cols-3 gap-5">{steps.map(({icon:Icon,n,title,text}) => <div key={n} className="rounded-3xl border border-gray-100 bg-gray-50 p-6"><div className="w-12 h-12 rounded-2xl bg-[#4A5CE8] text-white flex items-center justify-center mb-4"><Icon className="w-6 h-6"/></div><div className="text-xs font-black text-[#F26B21]">STEP {n}</div><h3 className="text-xl font-black text-gray-900 mt-1">{title}</h3><p className="text-sm text-gray-500 mt-2 leading-relaxed">{text}</p></div>)}</div>
      <div className="mt-8 rounded-3xl bg-[#10182b] text-white overflow-hidden grid lg:grid-cols-2"><img src="/assets/bazunk-buyer-protection.jpg" alt="Bazunk Trusted Buyer Protection" className="w-full h-full min-h-64 object-cover"/><div className="p-8 flex flex-col justify-center"><div className="flex items-center gap-2 text-emerald-400 font-black text-sm"><ShieldCheck className="w-5 h-5"/> BAZUNK BUYER PROTECTION</div><h3 className="text-3xl font-black mt-3">Shop protected.</h3><p className="text-white/65 mt-3">Eligible purchases are protected if an item doesn't arrive, arrives damaged, or is significantly not as described. Buyer Protection is added automatically at checkout.</p><p className="text-white font-black mt-4">UK: 6% + 70p · US: 6% + $1 · EU: 6% + €1</p><Link href="/buyer-protection" className="inline-flex items-center gap-2 mt-5 text-[#F26B21] font-black">Learn about Buyer Protection <ArrowRight className="w-4 h-4"/></Link></div></div>
      <div className="mt-5 flex justify-center items-center gap-2 text-sm text-gray-500"><Coins className="w-4 h-4 text-amber-500"/> Earn free Bazunk Credits through rewards, milestones and referrals.</div>
    </div>
  </section>;
}

import { Shield, Clock, RotateCcw, Lock, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import { Link } from 'wouter';

const GUARANTEES = [
  {
    icon: Shield,
    title: 'Item Not Received',
    desc: 'If your order never arrives, we refund you in full. No questions asked.',
    color: 'bg-emerald-500',
  },
  {
    icon: AlertCircle,
    title: 'Not As Described',
    desc: "If the item differs significantly from the listing, you're covered for a return and full refund.",
    color: 'bg-blue-500',
  },
  {
    icon: RotateCcw,
    title: '30-Day Returns',
    desc: 'Change your mind? Return any eligible item within 30 days for a full refund.',
    color: 'bg-purple-500',
  },
  {
    icon: Lock,
    title: 'Escrow Protection',
    desc: 'Your payment is held securely and only released to the seller once you confirm delivery.',
    color: 'bg-[#F26B21]',
  },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Pay Securely', desc: 'All payments go through our escrow system — never direct to the seller.' },
  { step: '2', title: 'Item Arrives', desc: 'You have 48 hours after delivery to confirm everything is as expected.' },
  { step: '3', title: 'Issue? Open a Dispute', desc: 'File a claim from your dashboard. Our team resolves disputes within 48 hours.' },
  { step: '4', title: 'Fast Resolution', desc: 'Receive your refund directly back to your original payment method.' },
];

export default function BuyerProtectionPage() {
  return (
    <div className="min-h-screen bg-[#1A1D2E] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-900/50 via-[#1A1D2E] to-[#1A1D2E] pt-20 pb-16 px-6">
        <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-5 py-2 rounded-full text-sm mb-6">
            <Shield className="w-4 h-4" />
            100% Buyer Protection
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Shop With Complete<br />
            <span className="text-emerald-400">Confidence</span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Every purchase on Bazunk is backed by our Buyer Protection guarantee.
            Your money is safe until you're happy — or we refund you in full.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold">48h dispute resolution</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3">
              <Lock className="w-4 h-4 text-[#F26B21]" />
              <span className="text-sm font-semibold">Escrow-protected payments</span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-5 py-3">
              <RotateCcw className="w-4 h-4 text-[#4A5CE8]" />
              <span className="text-sm font-semibold">30-day returns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guarantees */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center mb-3">What You're Protected Against</h2>
        <p className="text-white/50 text-center mb-10">Every order automatically qualifies — no sign-up needed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {GUARANTEES.map(g => (
            <div key={g.title} className="bg-white/5 border border-white/10 rounded-2xl p-6 flex gap-5 hover:border-white/20 transition-colors">
              <div className={`${g.color} w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0`}>
                <g.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black mb-2">{g.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white/3 border-y border-white/10 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-center mb-10">How Protection Works</h2>
          <div className="relative">
            <div className="hidden md:block absolute left-6 top-8 bottom-8 w-0.5 bg-white/10" />
            <div className="space-y-6">
              {HOW_IT_WORKS.map(s => (
                <div key={s.step} className="flex gap-5 items-start">
                  <div className="w-12 h-12 rounded-full bg-[#F26B21] flex items-center justify-center font-black text-white text-lg flex-shrink-0 z-10">
                    {s.step}
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1">
                    <h3 className="font-black text-lg mb-1">{s.title}</h3>
                    <p className="text-white/60 text-sm">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center mb-3">Better Than the Competition</h2>
        <p className="text-white/50 text-center mb-10">We don't just match eBay and Amazon — we go further.</p>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="text-left px-5 py-4 text-white/40 font-bold">Protection Feature</th>
                <th className="px-4 py-4 text-[#F26B21] font-black">Bazunk</th>
                <th className="px-4 py-4 text-white/40 font-bold">eBay</th>
                <th className="px-4 py-4 text-white/40 font-bold">Amazon</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Escrow on all transactions', true, false, false],
                ['30-day returns guarantee', true, true, true],
                ['48h dispute resolution', true, false, false],
                ['Locker return QR codes', true, false, false],
                ['Buyer cashback on disputes', true, false, false],
              ].map(([feat, sbd, ebay, amz], i) => (
                <tr key={i as number} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                  <td className="px-5 py-4 text-white/70 font-medium">{feat as string}</td>
                  <td className="px-4 py-4 text-center text-emerald-400 font-bold">{sbd ? '✓' : '–'}</td>
                  <td className="px-4 py-4 text-center text-white/30">{ebay ? '✓' : '–'}</td>
                  <td className="px-4 py-4 text-center text-white/30">{amz ? '✓' : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Support CTA */}
      <div className="bg-emerald-900/20 border-t border-emerald-500/20 py-12 px-6 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 mb-5">
          <Phone className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-2xl font-black mb-2">Need Help With an Order?</h3>
        <p className="text-white/50 mb-6">Our UK-based support team is here 7 days a week.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/dashboard?section=disputes" className="bg-[#F26B21] text-white font-black px-8 py-3 rounded-full hover:bg-[#e05a10] transition-colors">
            Open a Dispute
          </Link>
          <Link href="/support" className="bg-white/10 border border-white/20 text-white font-semibold px-8 py-3 rounded-full hover:bg-white/15 transition-colors">
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}

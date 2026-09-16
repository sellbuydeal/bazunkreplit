import { useState } from 'react';
import { Coins, TrendingUp, Gift, Star, Zap, Crown } from 'lucide-react';

const TIERS = [
  {
    id: 'bronze',
    icon: '🏅',
    name: 'Bronze',
    rate: '1%',
    spend: '£0+',
    perks: ['1% cashback on all purchases', 'Monthly payout to wallet', 'Access to Flash Sale early alerts'],
    color: 'from-amber-700 to-amber-900',
    border: 'border-amber-700/40',
    badge: 'bg-amber-700/20 text-amber-500',
  },
  {
    id: 'silver',
    icon: '🥈',
    name: 'Silver',
    rate: '1.5%',
    spend: '£250+',
    perks: ['1.5% cashback on all purchases', 'Weekly payout to wallet', 'Free listing boosts ×2/month', 'Priority buyer support'],
    color: 'from-slate-400 to-slate-600',
    border: 'border-slate-400/40',
    badge: 'bg-slate-400/20 text-slate-300',
  },
  {
    id: 'gold',
    icon: '🥇',
    name: 'Gold',
    rate: '2%',
    spend: '£750+',
    perks: ['2% cashback on all purchases', 'Instant payout on request', 'Exclusive Gold-only Flash Deals', 'Free listing boosts ×5/month', 'Dedicated account manager'],
    color: 'from-yellow-400 to-yellow-600',
    border: 'border-yellow-400/40',
    badge: 'bg-yellow-400/20 text-yellow-400',
    popular: true,
  },
  {
    id: 'platinum',
    icon: '💎',
    name: 'Platinum',
    rate: '3%',
    spend: '£2,000+',
    perks: ['3% cashback on all purchases', 'Instant automated payouts', 'First access to new features', 'Unlimited free listing boosts', 'VIP support hotline', 'Exclusive Platinum auctions'],
    color: 'from-cyan-400 to-blue-600',
    border: 'border-cyan-400/40',
    badge: 'bg-cyan-400/20 text-cyan-400',
  },
];

const HOW_IT_WORKS = [
  { icon: Zap, title: 'Buy Anything', desc: 'Purchase any item on Bazunk — all categories qualify for cashback.' },
  { icon: TrendingUp, title: 'Cashback Accrues', desc: 'Your cashback % is automatically calculated and added to your rewards wallet.' },
  { icon: Coins, title: 'Collect Your Cash', desc: 'Request a payout at any time (minimum £5). Funds hit your bank within 3 days.' },
  { icon: Crown, title: 'Climb the Tiers', desc: 'The more you spend, the higher your tier — and the more you earn back.' },
];

export default function CashbackPage() {
  const [calc, setCalc] = useState(100);
  const rate = calc >= 2000 ? 0.03 : calc >= 750 ? 0.02 : calc >= 250 ? 0.015 : 0.01;
  const earned = (calc * rate).toFixed(2);
  const tierName = calc >= 2000 ? 'Platinum' : calc >= 750 ? 'Gold' : calc >= 250 ? 'Silver' : 'Bronze';

  return (
    <div className="min-h-screen bg-[#1A1D2E] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-br from-yellow-900/30 via-[#1A1D2E] to-[#1A1D2E] pt-20 pb-16 px-6">
        <div className="absolute top-0 left-0 w-[60vw] h-[60vw] bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 font-bold px-5 py-2 rounded-full text-sm mb-6">
            <Coins className="w-4 h-4" />
            CashBack Rewards — Exclusive to Bazunk
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight">
            Get Paid to<br />
            <span className="text-yellow-400">Shop Smart</span>
          </h1>
          <p className="text-white/60 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Every purchase earns you real cash back — automatically. No vouchers, no fuss.
            Just money returned to your wallet.
          </p>
          <div className="mt-8 inline-flex items-center gap-3 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl px-6 py-4">
            <span className="text-yellow-400 font-black text-4xl">Up to 3%</span>
            <span className="text-white/60 text-left text-sm">cashback<br />on every order</span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center mb-3">How CashBack Works</h2>
        <p className="text-white/50 text-center mb-10">Simple. Automatic. No activation needed.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center hover:border-[#F26B21]/30 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-[#F26B21]/10 border border-[#F26B21]/20 flex items-center justify-center mx-auto mb-4">
                <s.icon className="w-6 h-6 text-[#F26B21]" />
              </div>
              <div className="w-6 h-6 rounded-full bg-[#F26B21] text-white text-xs font-black flex items-center justify-center mx-auto mb-3">
                {i + 1}
              </div>
              <h3 className="font-black mb-2">{s.title}</h3>
              <p className="text-white/50 text-sm">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calculator */}
      <div className="bg-white/3 border-y border-white/10 py-16 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Gift className="w-5 h-5 text-yellow-400" />
            <h2 className="text-2xl font-black">CashBack Calculator</h2>
          </div>
          <p className="text-white/50 text-sm mb-8">See how much you'd earn</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <label className="block text-white/50 text-sm mb-2">Monthly spend on Bazunk</label>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-white/50 font-bold">£</span>
              <input
                type="range" min={10} max={3000} value={calc}
                onChange={e => setCalc(+e.target.value)}
                className="flex-1 accent-[#F26B21]"
              />
              <span className="text-white font-black w-20 text-right text-lg">£{calc}</span>
            </div>

            <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-5 mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white/60 text-sm">Your tier</span>
                <span className="text-yellow-400 font-black">{tierName} ({(rate * 100).toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/60 text-sm">Monthly cashback</span>
                <span className="text-yellow-400 font-black text-2xl">£{earned}</span>
              </div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/10">
                <span className="text-white/60 text-sm">Annual cashback</span>
                <span className="text-yellow-400 font-black text-xl">£{(+earned * 12).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-center mb-3">Reward Tiers</h2>
        <p className="text-white/50 text-center mb-10">Progress automatically as you shop more.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {TIERS.map(tier => (
            <div key={tier.id}
              className={`relative bg-white/5 border rounded-2xl overflow-hidden flex flex-col hover:border-opacity-80 transition-colors ${tier.border} ${tier.popular ? 'ring-2 ring-yellow-400/50' : ''}`}>
              {tier.popular && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-black text-center py-1 tracking-widest uppercase">
                  Most Popular
                </div>
              )}
              <div className={`bg-gradient-to-br ${tier.color} p-6 ${tier.popular ? 'pt-8' : ''}`}>
                <div className="text-4xl mb-2">{tier.icon}</div>
                <h3 className="text-white font-black text-2xl">{tier.name}</h3>
                <div className="text-white font-black text-4xl mt-1">{tier.rate}</div>
                <p className="text-white/70 text-sm">cashback · {tier.spend} spent</p>
              </div>
              <div className="p-5 flex-1">
                <ul className="space-y-2.5">
                  {tier.perks.map(p => (
                    <li key={p} className="flex items-start gap-2 text-sm text-white/70">
                      <Star className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Compare vs OnBuy */}
      <div className="bg-white/3 border-t border-white/10 py-12 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-black mb-2">Better Than OnBuy's CashBack</h3>
          <p className="text-white/50 text-sm mb-6">OnBuy offers cashback — but only as vouchers. Ours is real money.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="bg-[#F26B21]/10 border border-[#F26B21]/30 rounded-2xl px-6 py-4 text-center min-w-[160px]">
              <p className="text-[#F26B21] font-black text-xl mb-1">Bazunk</p>
              <p className="text-white/70 text-sm">Up to 3% · Real cash · Instant payout</p>
            </div>
            <span className="text-white/30 font-bold text-sm">vs</span>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[160px]">
              <p className="text-white/40 font-black text-xl mb-1">OnBuy</p>
              <p className="text-white/30 text-sm">Up to 1% · Site vouchers only</p>
            </div>
            <span className="text-white/30 font-bold text-sm">vs</span>
            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-center min-w-[160px]">
              <p className="text-white/40 font-black text-xl mb-1">eBay / Amazon</p>
              <p className="text-white/30 text-sm">No buyer cashback</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

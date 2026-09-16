import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const BID_STEPS = [50, 75, 98, 127, 155, 178];

export function Scene3() {
  const [phase, setPhase] = useState(0);
  const [bidIdx, setBidIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ h: 2, m: 14, s: 37 });

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500),
    ];

    const bidTimer = setInterval(() => {
      setBidIdx(i => (i < BID_STEPS.length - 1 ? i + 1 : i));
    }, 900);

    const clockTimer = setInterval(() => {
      setTimeLeft(prev => {
        let { h, m, s } = prev;
        s--; if (s < 0) { s = 59; m--; } if (m < 0) { m = 59; h--; }
        return { h: Math.max(0, h), m: Math.max(0, m), s: Math.max(0, s) };
      });
    }, 1000);

    return () => { t.forEach(clearTimeout); clearInterval(bidTimer); clearInterval(clockTimer); };
  }, []);

  const fmt = (n: number) => String(n).padStart(2, '0');

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[8vw] overflow-hidden"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: '-5vw', filter: 'blur(8px)' }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

      {/* Left: auction card */}
      <motion.div className="w-[42vw] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-[3.5vw] shadow-2xl"
        initial={{ x: -60, opacity: 0 }}
        animate={phase >= 1 ? { x: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 20 }}>

        {/* Live badge */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 font-black tracking-widest text-[1.4vw] uppercase">Live Auction</span>
        </div>

        {/* Item */}
        <div className="w-full aspect-video bg-gradient-to-br from-[#4A5CE8]/20 to-[#F26B21]/20 rounded-2xl mb-6 flex items-center justify-center">
          <span className="text-[6vw]">📷</span>
        </div>

        <h3 className="text-white font-black text-[2vw] mb-1">Vintage Leica M6 Film Camera</h3>
        <p className="text-white/50 text-[1.3vw]">Condition: Like New · Ships via Royal Mail</p>

        {/* Bid counter */}
        <motion.div className="mt-6 bg-[#F26B21] rounded-2xl p-4 text-center"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}>
          <p className="text-white/80 text-[1.2vw] font-semibold mb-1">Current Bid</p>
          <motion.p className="text-white font-black"
            style={{ fontSize: 'clamp(24px, 4.5vw, 60px)' }}
            key={bidIdx}
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}>
            £{BID_STEPS[bidIdx]}.00
          </motion.p>
        </motion.div>
      </motion.div>

      {/* Right: info */}
      <div className="w-[42vw] space-y-6">
        <motion.h2 className="text-white font-black leading-tight"
          style={{ fontSize: 'clamp(24px, 5.5vw, 72px)' }}
          initial={{ opacity: 0, x: 40 }}
          animate={phase >= 2 ? { opacity: 1, x: 0 } : {}}
          transition={{ type: 'spring' }}>
          Real-Time<br /><span className="text-[#4A5CE8]">Auctions</span>
        </motion.h2>

        {/* Countdown */}
        <motion.div className="flex gap-3"
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}>
          {[[fmt(timeLeft.h), 'H'], [fmt(timeLeft.m), 'M'], [fmt(timeLeft.s), 'S']].map(([v, l]) => (
            <div key={l} className="bg-[#4A5CE8]/20 border border-[#4A5CE8]/30 rounded-xl px-4 py-3 text-center min-w-[5vw]">
              <p className="text-[#4A5CE8] font-black text-[2.8vw]">{v}</p>
              <p className="text-white/40 text-[1vw] font-bold">{l}</p>
            </div>
          ))}
          <div className="flex flex-col justify-center ml-2">
            <p className="text-white font-bold text-[1.4vw]">remaining</p>
          </div>
        </motion.div>

        <motion.div className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : {}}>
          {[
            ['🏆', '3 active bidders'],
            ['🛡️', 'Escrow-protected bids'],
            ['🔔', 'Auto-bid & outbid alerts'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
              <span className="text-[2vw]">{icon}</span>
              <span className="text-white font-semibold text-[1.5vw]">{text}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const CARRIERS = [
  {
    name: 'InPost',
    tagline: '4,500+ smart lockers',
    emoji: '🟡',
    color: '#FFD100',
    textColor: '#7a5a00',
    bg: 'bg-yellow-50',
    locs: '4,500+',
    eta: 'Next day',
  },
  {
    name: 'Evri',
    tagline: '6,700+ ParcelShops',
    emoji: '🟣',
    color: '#9B1FAE',
    textColor: '#ffffff',
    bg: 'bg-purple-600',
    locs: '6,700+',
    eta: '2–3 days',
  },
  {
    name: 'Royal Mail',
    tagline: '11,500+ Post Offices',
    emoji: '🔴',
    color: '#CC0000',
    textColor: '#ffffff',
    bg: 'bg-red-600',
    locs: '11,500+',
    eta: 'Tracked 24h',
  },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [qrTick, setQrTick] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => setPhase(5), 5000),
    ];
    const qr = setInterval(() => setQrTick(q => q + 1), 120);
    return () => { t.forEach(clearTimeout); clearInterval(qr); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#f0fdf4]"
      initial={{ opacity: 0, y: 60 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}>

      {/* Light grid */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ backgroundImage: 'linear-gradient(#d1fae5 1px, transparent 1px), linear-gradient(90deg, #d1fae5 1px, transparent 1px)', backgroundSize: '3vw 3vw' }} />

      {/* Header */}
      <motion.div className="text-center mb-8 z-10"
        initial={{ y: -40, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 18 }}>
        <div className="inline-flex items-center gap-2 bg-emerald-500 text-white font-black px-5 py-2 rounded-full text-[1.5vw] mb-3">
          📦 Locker Shipping Network
        </div>
        <h2 className="text-[#1A1D2E] font-black leading-tight"
          style={{ fontSize: 'clamp(18px, 4.5vw, 56px)' }}>
          Drop Off. Collect. <span className="text-emerald-600">Done.</span>
        </h2>
        <p className="text-gray-500 font-semibold mt-2" style={{ fontSize: 'clamp(10px, 1.5vw, 18px)' }}>
          20,000+ UK locations · No printer needed · Escrow-protected
        </p>
      </motion.div>

      {/* Carrier cards */}
      <div className="flex gap-4 z-10 flex-wrap justify-center px-4">
        {CARRIERS.map((c, i) => (
          <motion.div key={c.name}
            className="rounded-2xl overflow-hidden shadow-xl w-[16vw] min-w-[120px]"
            initial={{ y: 60, opacity: 0, rotate: (i - 1) * 4 }}
            animate={phase >= 2 + i ? { y: 0, opacity: 1, rotate: 0 } : {}}
            transition={{ type: 'spring', damping: 16 }}>
            <div className="py-4 px-4 flex items-center justify-between" style={{ backgroundColor: c.color }}>
              <span className="font-black text-[1.8vw]" style={{ color: c.textColor }}>{c.name}</span>
              <span className="text-[2vw]">{c.emoji}</span>
            </div>
            <div className="bg-white p-4">
              <p className="text-gray-600 font-semibold text-[1.1vw] mb-3">{c.tagline}</p>
              <div className="flex items-center justify-between">
                <span className="text-emerald-600 font-black text-[1.3vw]">{c.locs}</span>
                <span className="text-gray-400 text-[1vw]">locations</span>
              </div>
              <div className="mt-2 bg-emerald-50 rounded-lg px-2 py-1 text-center">
                <span className="text-emerald-700 font-bold text-[1vw]">{c.eta}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* QR code animation */}
      <motion.div className="flex items-center gap-6 mt-8 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <div className="w-[6vw] h-[6vw] min-w-[48px] min-h-[48px] border-2 border-gray-900 rounded-lg p-1 grid grid-cols-5 gap-px bg-white">
          {Array.from({ length: 25 }).map((_, j) => (
            <div key={j} className={`rounded-sm ${(j + qrTick) % 3 === 0 ? 'bg-gray-900' : 'bg-white'}`} />
          ))}
        </div>
        <div>
          <p className="text-gray-800 font-black text-[1.8vw]">Scan & Drop</p>
          <p className="text-gray-400 text-[1.2vw]">Label auto-generated after every sale</p>
        </div>
      </motion.div>
    </motion.div>
  );
}

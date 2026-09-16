import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const DEALS = [
  { label: 'Sony WH-1000XM5', was: '£349', now: '£139', pct: '-60%', cat: 'Electronics' },
  { label: 'Nike Air Max 90',  was: '£120', now: '£54',  pct: '-55%', cat: 'Fashion' },
  { label: 'Lego Technic 42143', was: '£220', now: '£77', pct: '-65%', cat: 'Collectibles' },
];

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [secs, setSecs] = useState(47 * 60 + 12);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 5200),
    ];
    const tick = setInterval(() => setSecs(s => Math.max(0, s - 1)), 1000);
    return () => { t.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  const hh = String(Math.floor(secs / 3600)).padStart(2, '0');
  const mm = String(Math.floor((secs % 3600) / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <motion.div className="absolute inset-0 overflow-hidden bg-[#F26B21] flex flex-col items-center justify-center"
      initial={{ clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      exit={{ clipPath: 'inset(0 0 0 100%)', opacity: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>

      {/* Diagonal stripe texture */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)', backgroundSize: '12px 12px' }} />

      {/* Badge */}
      <motion.div className="flex items-center gap-3 mb-6"
        initial={{ y: -60, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 16 }}>
        <span className="text-[4vw]">⚡</span>
        <span className="bg-white text-[#F26B21] font-black px-5 py-2 rounded-xl tracking-widest uppercase"
          style={{ fontSize: 'clamp(12px, 2vw, 22px)' }}>Flash Sales</span>
        <span className="bg-[#1A1D2E] text-white font-bold px-4 py-2 rounded-xl animate-pulse"
          style={{ fontSize: 'clamp(10px, 1.6vw, 18px)' }}>24 LIVE NOW</span>
      </motion.div>

      {/* Countdown */}
      <motion.div className="flex gap-3 mb-10"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={phase >= 2 ? { scale: 1, opacity: 1 } : {}}
        transition={{ type: 'spring', bounce: 0.4 }}>
        {[[hh, 'HRS'], [mm, 'MIN'], [ss, 'SEC']].map(([val, lbl]) => (
          <div key={lbl} className="flex flex-col items-center bg-[#1A1D2E] rounded-2xl px-5 py-3 min-w-[7vw]">
            <span className="text-white font-black font-mono" style={{ fontSize: 'clamp(20px, 4.5vw, 60px)' }}>{val}</span>
            <span className="text-white/50 font-bold tracking-widest" style={{ fontSize: 'clamp(8px, 1vw, 12px)' }}>{lbl}</span>
          </div>
        ))}
      </motion.div>

      {/* Deal cards */}
      <div className="flex gap-4 flex-wrap justify-center px-4">
        {DEALS.map((d, i) => (
          <motion.div key={d.label}
            className="bg-white rounded-2xl p-4 shadow-2xl w-[18vw] min-w-[130px]"
            initial={{ y: 80, opacity: 0, rotate: (i - 1) * 3 }}
            animate={phase >= 3 + i ? { y: 0, opacity: 1, rotate: 0 } : {}}
            transition={{ type: 'spring', damping: 18, delay: 0.05 }}>
            <div className="bg-[#F26B21] text-white font-black text-center rounded-xl py-1 mb-3 text-[1.4vw]">{d.pct}</div>
            <div className="h-[8vw] min-h-[60px] bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
              <span className="text-[3vw]">{i === 0 ? '🎧' : i === 1 ? '👟' : '🧩'}</span>
            </div>
            <p className="text-gray-800 font-bold text-[1.2vw] leading-tight mb-2 truncate">{d.label}</p>
            <div className="flex items-center gap-2">
              <span className="text-[#F26B21] font-black text-[1.6vw]">{d.now}</span>
              <span className="text-gray-400 line-through text-[1.1vw]">{d.was}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Label */}
      <motion.p className="mt-8 text-white/90 font-black tracking-widest uppercase"
        style={{ fontSize: 'clamp(10px, 1.4vw, 16px)' }}
        animate={phase >= 5 ? { opacity: [0.6, 1, 0.6] } : { opacity: 0 }}
        transition={{ duration: 1.2, repeat: Infinity }}>
        bazunk.com — Deals Updated Every Hour
      </motion.p>
    </motion.div>
  );
}

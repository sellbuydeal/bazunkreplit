import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const ITEMS = [
  { emoji: '💻', label: 'MacBook Air M2', price: '£749' },
  { emoji: '🎧', label: 'AirPods Pro', price: '£149' },
  { emoji: '⌚', label: 'Apple Watch S8', price: '£199' },
];

export function Scene6() {
  const [phase, setPhase] = useState(0);
  const [disc, setDisc] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 5000),
    ];
    let d = 0;
    const tick = setInterval(() => {
      d = Math.min(d + 1, 20);
      setDisc(d);
    }, 100);
    return () => { t.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #4A5CE8 0%, #7c3aed 100%)' }}
      initial={{ clipPath: 'circle(0% at 80% 20%)' }}
      animate={{ clipPath: 'circle(150% at 80% 20%)' }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}>

      {/* Dot grid */}
      <div className="absolute inset-0 opacity-15 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '3vw 3vw' }} />

      {/* Badge */}
      <motion.div className="mb-6 flex items-center gap-2"
        initial={{ y: -30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
        transition={{ type: 'spring' }}>
        <span className="bg-white/20 text-white font-black px-5 py-2 rounded-full text-[1.6vw] border border-white/30 uppercase tracking-widest">
          Bundle Deals
        </span>
      </motion.div>

      {/* Headline */}
      <motion.h2 className="text-white font-black text-center leading-tight mb-8"
        style={{ fontSize: 'clamp(20px, 5vw, 64px)' }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 2 ? { opacity: 1, scale: 1 } : {}}
        transition={{ type: 'spring', bounce: 0.3 }}>
        Buy More. <span className="text-[#FFD100]">Save More.</span>
      </motion.h2>

      {/* Item cards coming together */}
      <div className="relative flex items-center justify-center gap-4 mb-8">
        {ITEMS.map((item, i) => {
          const bundled = phase >= 3;
          const offsets = [-12, 0, 12];
          return (
            <motion.div key={item.label}
              className="bg-white rounded-2xl p-4 shadow-2xl text-center"
              style={{ width: 'clamp(100px, 14vw, 180px)' }}
              initial={{ x: (i - 1) * 60, opacity: 0, rotate: (i - 1) * 8 }}
              animate={phase >= 2 ? {
                x: bundled ? 0 : (i - 1) * 10,
                opacity: 1,
                rotate: bundled ? offsets[i] : (i - 1) * 3,
                y: bundled ? [0, -8, 0] : 0,
              } : {}}
              transition={{ type: 'spring', damping: 15, delay: i * 0.1 }}>
              <div className="text-[3.5vw] mb-2">{item.emoji}</div>
              <p className="text-gray-800 font-bold text-[1.1vw] leading-tight mb-1">{item.label}</p>
              <p className="text-[#4A5CE8] font-black text-[1.4vw]">{item.price}</p>
            </motion.div>
          );
        })}

        {/* Bundle savings badge */}
        {phase >= 4 && (
          <motion.div
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#F26B21] text-white font-black rounded-full px-6 py-2 shadow-xl"
            style={{ fontSize: 'clamp(12px, 2vw, 24px)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0.6 }}>
            -{disc}% Bundle Discount!
          </motion.div>
        )}
      </div>

      {/* Steps */}
      <motion.div className="flex gap-6 flex-wrap justify-center"
        initial={{ opacity: 0 }}
        animate={phase >= 5 ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}>
        {[
          ['2 items', '-5%'],
          ['3 items', '-10%'],
          ['5+ items', '-20%'],
        ].map(([qty, save]) => (
          <div key={qty} className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 text-center">
            <p className="text-white font-black text-[1.6vw]">{save}</p>
            <p className="text-white/70 text-[1.1vw]">{qty}</p>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const CONFETTI = Array.from({ length: 50 }, (_, i) => ({
  x: Math.random() * 100,
  color: ['#F26B21', '#4A5CE8', '#FFD100', '#10b981', '#ffffff', '#e879f9'][i % 6],
  delay: Math.random() * 1.5,
  size: 0.6 + Math.random() * 0.8,
  dur: 2.5 + Math.random() * 2,
  rotate: Math.random() * 360,
}));

export function Scene10() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3600),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-[#F26B21]"
      initial={{ y: '100%' }}
      animate={{ y: '0%' }}
      exit={{ opacity: 0, filter: 'blur(20px)' }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}>

      {/* Radial pulse rings */}
      {[0, 0.6, 1.2].map((delay, i) => (
        <motion.div key={i}
          className="absolute rounded-full border-[6px] border-white/15 pointer-events-none"
          initial={{ width: 0, height: 0, opacity: 0.6 }}
          animate={{ width: '200vw', height: '200vw', opacity: 0 }}
          transition={{ duration: 3, delay, repeat: Infinity, ease: 'easeOut' }}
        />
      ))}

      {/* Confetti */}
      {phase >= 3 && CONFETTI.map((c, i) => (
        <motion.div key={i}
          className="absolute rounded-sm pointer-events-none"
          style={{
            width: `${c.size}vw`, height: `${c.size * 0.5}vw`,
            backgroundColor: c.color,
            left: `${c.x}%`, top: '-2vh',
            rotate: c.rotate,
          }}
          animate={{ y: '110vh', rotate: c.rotate + 720, opacity: [1, 1, 0] }}
          transition={{ duration: c.dur, delay: c.delay, ease: 'easeIn' }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', bounce: 0.55 }}>
          <h1 className="text-white font-black leading-none tracking-tighter"
            style={{ fontSize: 'clamp(42px, 11vw, 140px)' }}>
            Baz<span className="text-[#1A1D2E]">unk</span>
          </h1>
        </motion.div>

        {/* Domain */}
        <motion.div
          className="mt-3 mb-4 bg-[#1A1D2E] text-white rounded-2xl px-8 py-3 shadow-2xl"
          style={{ fontSize: 'clamp(14px, 2.5vw, 34px)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', bounce: 0.4 }}>
          <span className="font-black">bazunk</span>
          <span className="text-[#F26B21] font-black">.com</span>
        </motion.div>

        {/* Tagline */}
        <motion.p className="text-white font-black uppercase tracking-[0.2em] mb-4"
          style={{ fontSize: 'clamp(12px, 2.2vw, 28px)' }}
          initial={{ opacity: 0 }}
          animate={phase >= 3 ? { opacity: 1 } : {}}
          transition={{ duration: 0.6 }}>
          Buy. Sell. Deal.
        </motion.p>

        {/* CTA button */}
        <motion.div
          className="bg-white text-[#F26B21] font-black rounded-full px-10 py-5 shadow-2xl"
          style={{ fontSize: 'clamp(14px, 2.3vw, 30px)' }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={phase >= 4 ? { opacity: 1, scale: 1 } : {}}
          transition={{ type: 'spring', bounce: 0.5 }}>
          Join Free Today →
        </motion.div>

        {/* Feature pills */}
        <motion.div className="flex flex-wrap justify-center gap-2 mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}>
          {['Flash Sales', 'Auctions', 'Live Shopping', 'Locker Shipping', 'CashBack', 'Treasure Hunt'].map(f => (
            <span key={f} className="bg-white/20 backdrop-blur-sm text-white font-bold rounded-full px-4 py-2"
              style={{ fontSize: 'clamp(9px, 1.2vw, 15px)' }}>
              {f}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

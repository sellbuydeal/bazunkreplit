import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  angle: (i / 28) * 360,
  dist: 20 + Math.random() * 45,
  size: 3 + Math.random() * 8,
  color: i % 3 === 0 ? '#F26B21' : i % 3 === 1 ? '#4A5CE8' : '#ffffff',
  delay: Math.random() * 0.4,
}));

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => setPhase(4), 3400),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05, filter: 'blur(12px)' }}
      transition={{ duration: 0.7 }}>

      {/* Burst particles */}
      {phase >= 1 && PARTICLES.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.dist;
        const ty = Math.sin(rad) * p.dist;
        return (
          <motion.div key={i}
            className="absolute rounded-full"
            style={{ width: p.size, height: p.size, backgroundColor: p.color, left: '50%', top: '50%' }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
            animate={{ x: `${tx}vw`, y: `${ty}vh`, opacity: 0, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: p.delay }}
          />
        );
      })}

      {/* Glow ring */}
      <motion.div
        className="absolute rounded-full border-2 border-[#F26B21]/30"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={phase >= 1 ? { width: '60vw', height: '60vw', opacity: [0, 0.4, 0] } : {}}
        transition={{ duration: 1.6, ease: 'easeOut', delay: 0.1 }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-4">
        {/* Tagline */}
        <motion.div className="flex gap-[2.5vw] mb-6 text-[#4A5CE8] font-black text-[2.5vw] tracking-[0.3em] uppercase">
          {['BUY.', 'SELL.', 'DEAL.'].map((word, i) => (
            <motion.span key={word}
              initial={{ opacity: 0, y: 40, filter: 'blur(6px)' }}
              animate={phase >= 2 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
              transition={{ type: 'spring', damping: 18, delay: i * 0.15 }}>
              {word}
            </motion.span>
          ))}
        </motion.div>

        {/* Main logo */}
        <div className="overflow-hidden mb-4">
          <motion.h1
            className="font-black text-white leading-none tracking-tighter"
            style={{ fontSize: 'clamp(48px, 13vw, 160px)' }}
            initial={{ y: '110%' }}
            animate={phase >= 3 ? { y: '0%' } : {}}
            transition={{ type: 'spring', damping: 22, stiffness: 90 }}>
            Baz<span className="text-[#F26B21]">unk</span>
          </motion.h1>
        </div>

        {/* .com badge */}
        <motion.div
          className="px-5 py-2 rounded-full bg-[#F26B21] text-white font-black text-[2vw] mb-8"
          initial={{ scale: 0, opacity: 0 }}
          animate={phase >= 3 ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', bounce: 0.5, delay: 0.2 }}>
          bazunk.com
        </motion.div>

        {/* Subline */}
        <motion.p
          className="text-white/70 max-w-[50vw] leading-snug"
          style={{ fontSize: 'clamp(12px, 2vw, 22px)' }}
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          animate={phase >= 4 ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
          transition={{ duration: 0.8 }}>
          The UK's most complete peer-to-peer marketplace.
          Auctions · Flash Sales · Live Shopping · Locker Shipping.
        </motion.p>

      </div>
    </motion.div>
  );
}

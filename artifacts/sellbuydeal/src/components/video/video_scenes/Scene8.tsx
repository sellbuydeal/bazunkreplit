import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const STARS = Array.from({ length: 60 }, (_, i) => ({
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 1 + Math.random() * 3,
  delay: Math.random() * 3,
  dur: 2 + Math.random() * 3,
}));

const TOKENS = ['💎', '🟠', '⭐', '🔵', '💛', '🟢'];

export function Scene8() {
  const [phase, setPhase] = useState(0);
  const [found, setFound] = useState(0);
  const [credits, setCredits] = useState(0);
  const [chestOpen, setChestOpen] = useState(false);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => { setPhase(3); setChestOpen(true); }, 2800),
      setTimeout(() => setPhase(4), 4200),
    ];
    let f = 0;
    const tokenTick = setInterval(() => {
      if (f < 6) { f++; setFound(f); setCredits(c => c + 50); }
    }, 600);
    return () => { t.forEach(clearTimeout); clearInterval(tokenTick); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[8vw] overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0f0a2e 0%, #1a0a2e 50%, #0a1a2e 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -40 }}
      transition={{ duration: 0.8 }}>

      {/* Stars */}
      {STARS.map((s, i) => (
        <motion.div key={i}
          className="absolute rounded-full bg-white pointer-events-none"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{ duration: s.dur, delay: s.delay, repeat: Infinity, ease: 'easeInOut' }} />
      ))}

      {/* Left content */}
      <div className="w-[44vw] z-10">
        <motion.div className="flex items-center gap-3 mb-5"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring' }}>
          <div className="px-4 py-2 bg-yellow-400/20 border border-yellow-400/30 rounded-full flex items-center gap-2">
            <span className="text-yellow-400 font-black text-[1.3vw] uppercase tracking-widest">🎮 Gamification</span>
          </div>
        </motion.div>

        <motion.h2 className="text-white font-black leading-tight mb-4"
          style={{ fontSize: 'clamp(20px, 5vw, 64px)' }}
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : {}}
          transition={{ type: 'spring', damping: 18 }}>
          Treasure<br /><span className="text-yellow-400">Hunt</span>
        </motion.h2>

        <motion.p className="text-white/60 mb-6" style={{ fontSize: 'clamp(10px, 1.6vw, 20px)' }}
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : {}}>
          Hidden tokens are scattered across bazunk.com every day.
          Find them all to earn free credits and unlock exclusive rewards.
        </motion.p>

        {/* Token grid */}
        <div className="grid grid-cols-3 gap-3">
          {TOKENS.map((tok, i) => (
            <motion.div key={i}
              className="rounded-2xl border-2 flex items-center justify-center aspect-square shadow-lg"
              style={{
                fontSize: 'clamp(16px, 2.5vw, 36px)',
                borderColor: found > i ? '#FFD100' : 'rgba(255,255,255,0.1)',
                backgroundColor: found > i ? 'rgba(255,213,0,0.15)' : 'rgba(255,255,255,0.03)',
                boxShadow: found > i ? '0 0 20px rgba(255,213,0,0.3)' : 'none',
              }}
              animate={found > i ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}>
              {found > i ? tok : '❓'}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right: chest + credits */}
      <div className="w-[40vw] z-10 flex flex-col items-center">
        {/* Chest */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={phase >= 2 ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', bounce: 0.5 }}>
          <motion.div className="text-[12vw] select-none"
            animate={chestOpen ? { scale: [1, 1.3, 1.1], rotate: [-5, 5, 0] } : {}}
            transition={{ type: 'spring' }}>
            {chestOpen ? '🎉' : '🎁'}
          </motion.div>
        </motion.div>

        {/* Credits counter */}
        <motion.div className="mt-6 bg-yellow-400/10 border border-yellow-400/30 rounded-3xl px-8 py-6 text-center w-full"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : {}}
          transition={{ type: 'spring', damping: 18 }}>
          <p className="text-yellow-400/80 font-semibold text-[1.2vw] uppercase tracking-widest mb-2">Credits Earned</p>
          <motion.p className="text-yellow-400 font-black"
            style={{ fontSize: 'clamp(28px, 6vw, 80px)' }}
            key={credits}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}>
            {credits}
          </motion.p>
          <p className="text-white/40 text-[1.1vw] mt-1">= £{(credits / 100).toFixed(2)} in rewards</p>
        </motion.div>

        <motion.div className="mt-4 text-center"
          initial={{ opacity: 0 }}
          animate={phase >= 4 ? { opacity: 1 } : {}}>
          <p className="text-white/50 text-[1.2vw]">Use credits on listings, promotions, or cashback</p>
          <p className="text-[#F26B21] font-bold mt-1 text-[1.1vw]">Unique to bazunk.com</p>
        </motion.div>
      </div>
    </motion.div>
  );
}

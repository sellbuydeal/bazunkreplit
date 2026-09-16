import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const COINS = Array.from({ length: 14 }, (_, i) => ({
  x: -30 + (i % 7) * 12,
  delay: i * 0.12,
  size: 2.5 + Math.random() * 2,
}));

export function Scene7() {
  const [phase, setPhase] = useState(0);
  const [cashback, setCashback] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3000),
      setTimeout(() => setPhase(4), 4500),
    ];
    let cb = 0;
    const tick = setInterval(() => {
      cb = Math.min(+(cb + 0.04).toFixed(2), 2.00);
      setCashback(cb);
    }, 40);
    return () => { t.forEach(clearTimeout); clearInterval(tick); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-between px-[8vw] overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #064e3b 0%, #1A1D2E 60%)' }}
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -60 }}
      transition={{ duration: 0.7 }}>

      {/* Floating coins */}
      {phase >= 3 && COINS.map((coin, i) => (
        <motion.div key={i}
          className="absolute rounded-full bg-yellow-400 border-2 border-yellow-300 shadow-lg flex items-center justify-center font-black text-yellow-800"
          style={{
            width: `${coin.size}vw`, height: `${coin.size}vw`,
            fontSize: `${coin.size * 0.45}vw`,
            left: `${coin.x + 50}%`, bottom: '-5vh',
          }}
          animate={{ y: '-110vh', rotate: [0, 360], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3 + Math.random(), delay: coin.delay, repeat: Infinity, ease: 'easeOut' }}>
          £
        </motion.div>
      ))}

      {/* Left: Protection */}
      <div className="w-[44vw] z-10 space-y-8">
        {/* Shield */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
          transition={{ type: 'spring', bounce: 0.5 }}>
          <div className="w-[10vw] h-[10vw] min-w-[70px] min-h-[70px] rounded-3xl bg-emerald-500 flex items-center justify-center shadow-2xl mb-5"
            style={{ boxShadow: '0 0 40px rgba(16,185,129,0.4)' }}>
            <span className="text-[5vw]">🛡️</span>
          </div>
          <h2 className="text-white font-black leading-tight"
            style={{ fontSize: 'clamp(18px, 4.5vw, 58px)' }}>
            100% Buyer<br /><span className="text-emerald-400">Protection</span>
          </h2>
          <p className="text-white/60 mt-3" style={{ fontSize: 'clamp(10px, 1.5vw, 18px)' }}>
            Money-back guarantee on every order. 30-day dispute window. Escrow on all transactions.
          </p>
        </motion.div>

        <motion.div className="space-y-3"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}>
          {[
            ['🔒', 'Escrow-protected payments'],
            ['↩️', '30-day returns on all orders'],
            ['⚡', 'Disputes resolved in 48h'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <span className="text-[1.8vw]">{icon}</span>
              <span className="text-white font-semibold" style={{ fontSize: 'clamp(10px, 1.3vw, 16px)' }}>{text}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Right: Cashback */}
      <motion.div className="w-[40vw] z-10"
        initial={{ x: 60, opacity: 0 }}
        animate={phase >= 2 ? { x: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 18 }}>
        <div className="bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/30 rounded-3xl p-[3vw] shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-[4vw] h-[4vw] min-w-[36px] min-h-[36px] rounded-2xl bg-yellow-400 flex items-center justify-center">
              <span className="text-[2vw]">💰</span>
            </div>
            <div>
              <p className="text-yellow-300 font-black text-[1.4vw] uppercase tracking-widest">NEW</p>
              <h3 className="text-white font-black" style={{ fontSize: 'clamp(14px, 2.5vw, 32px)' }}>CashBack Rewards</h3>
            </div>
          </div>

          <div className="text-center py-4">
            <motion.p className="text-yellow-400 font-black"
              style={{ fontSize: 'clamp(28px, 6vw, 80px)' }}
              key={Math.floor(cashback * 10)}>
              {cashback.toFixed(2)}%
            </motion.p>
            <p className="text-white/70 font-semibold text-[1.3vw]">earned on every purchase</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            {[
              ['🏅', 'Bronze', '1% back'],
              ['🥈', 'Silver', '1.5% back'],
              ['🥇', 'Gold', '2% back'],
              ['💎', 'Platinum', '3% back'],
            ].map(([ico, tier, reward]) => (
              <div key={tier}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 flex items-center gap-2">
                <span className="text-[1.6vw]">{ico}</span>
                <div>
                  <p className="text-white font-bold text-[1vw]">{tier}</p>
                  <p className="text-yellow-400 font-black text-[1.1vw]">{reward}</p>
                </div>
              </div>
            ))}
          </div>

          <motion.p className="mt-4 text-center text-yellow-300/70 text-[1vw] font-semibold"
            animate={phase >= 4 ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity }}>
            Exclusive to Bazunk · Not available on eBay or Amazon
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );
}

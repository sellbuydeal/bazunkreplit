import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const FEATURES = [
  { label: 'Auctions',            sbd: true,  ebay: true,  amz: false, onbuy: false },
  { label: 'Flash Sales',         sbd: true,  ebay: false, amz: false, onbuy: true  },
  { label: 'Live Shopping',       sbd: true,  ebay: false, amz: true,  onbuy: false },
  { label: 'Locker Network',      sbd: true,  ebay: false, amz: false, onbuy: false },
  { label: 'Buyer CashBack',      sbd: true,  ebay: false, amz: false, onbuy: true  },
  { label: 'Bundle Deals',        sbd: true,  ebay: false, amz: true,  onbuy: false },
  { label: 'Gamification',        sbd: true,  ebay: false, amz: false, onbuy: false },
  { label: 'Classifieds',         sbd: true,  ebay: true,  amz: false, onbuy: false },
];

const COLS = [
  { key: 'sbd',   label: 'Bazunk', color: '#F26B21', textColor: '#fff' },
  { key: 'ebay',  label: 'eBay',   color: '#e43137', textColor: '#fff' },
  { key: 'amz',   label: 'Amazon', color: '#ff9900', textColor: '#fff' },
  { key: 'onbuy', label: 'OnBuy',  color: '#1c6ef3', textColor: '#fff' },
];

type FeatureKey = 'sbd' | 'ebay' | 'amz' | 'onbuy';

export function Scene9() {
  const [phase, setPhase] = useState(0);
  const [rows, setRows] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1000),
    ];
    let r = 0;
    const rowTick = setInterval(() => {
      r++;
      if (r > FEATURES.length) { clearInterval(rowTick); return; }
      setRows(r);
    }, 450);
    return () => { t.forEach(clearTimeout); clearInterval(rowTick); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw] py-[4vh] overflow-hidden"
      initial={{ opacity: 0, rotateY: 10 }}
      animate={{ opacity: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.8 }}
      style={{ perspective: '1200px' }}>

      {/* Header */}
      <motion.div className="text-center mb-6"
        initial={{ y: -30, opacity: 0 }}
        animate={phase >= 1 ? { y: 0, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 18 }}>
        <h2 className="text-white font-black leading-tight"
          style={{ fontSize: 'clamp(18px, 4vw, 52px)' }}>
          Bazunk vs the Rest
        </h2>
        <p className="text-white/50 mt-1" style={{ fontSize: 'clamp(10px, 1.4vw, 18px)' }}>
          No other platform has everything in one place.
        </p>
      </motion.div>

      {/* Table */}
      <motion.div className="w-full max-w-[80vw] bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden"
        initial={{ opacity: 0, y: 30 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ type: 'spring', damping: 22 }}>

        {/* Header row */}
        <div className="grid grid-cols-5 border-b border-white/10">
          <div className="px-4 py-3 text-white/40 font-bold text-[1.1vw]">Feature</div>
          {COLS.map(c => (
            <motion.div key={c.key}
              className="px-4 py-3 text-center font-black text-[1.3vw] rounded-t-none"
              style={{ backgroundColor: c.key === 'sbd' ? c.color + '33' : 'transparent', color: c.key === 'sbd' ? c.color : '#ffffff99' }}>
              {c.key === 'sbd' ? (
                <span className="flex flex-col items-center gap-1">
                  <span className="text-[#F26B21] text-[1.4vw]">🏆</span>
                  {c.label}
                </span>
              ) : c.label}
            </motion.div>
          ))}
        </div>

        {/* Data rows */}
        {FEATURES.map((f, ri) => ri < rows && (
          <motion.div key={f.label}
            className="grid grid-cols-5 border-b border-white/5 last:border-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', damping: 20 }}>
            <div className="px-4 py-3 text-white/70 font-semibold text-[1.1vw] flex items-center">{f.label}</div>
            {COLS.map(c => {
              const has = f[c.key as FeatureKey];
              return (
                <div key={c.key}
                  className={`px-4 py-3 flex items-center justify-center text-[1.4vw]
                    ${c.key === 'sbd' ? 'bg-[#F26B21]/5' : ''}`}>
                  {has
                    ? <span className="text-emerald-400">✓</span>
                    : <span className="text-white/20">✗</span>}
                </div>
              );
            })}
          </motion.div>
        ))}
      </motion.div>

      {/* Score callout */}
      <motion.div className="mt-5 flex items-center gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={rows >= FEATURES.length ? { opacity: 1, y: 0 } : { opacity: 0 }}
        transition={{ type: 'spring', delay: 0.3 }}>
        <div className="bg-[#F26B21] text-white font-black rounded-2xl px-6 py-3"
          style={{ fontSize: 'clamp(12px, 1.8vw, 22px)' }}>
          Bazunk: 8/8 ✓
        </div>
        <div className="text-white/50 font-semibold text-[1.3vw]">eBay: 4/8 · Amazon: 4/8 · OnBuy: 3/8</div>
      </motion.div>
    </motion.div>
  );
}

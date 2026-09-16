import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const CHAT = [
  { name: 'Jake_M', msg: '🔥 want this!!', color: '#F26B21' },
  { name: 'sophie_uk', msg: 'how much posted?', color: '#4A5CE8' },
  { name: 'TechDeals99', msg: '💸 BID NOW', color: '#10b981' },
  { name: 'LondonBuyer', msg: 'is it unlocked?', color: '#8b5cf6' },
  { name: 'bargain_brit', msg: '⚡ flash price pls!', color: '#F26B21' },
  { name: 'CoolCollector', msg: 'amazing condition 👀', color: '#4A5CE8' },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);
  const [visibleChat, setVisibleChat] = useState(0);
  const [viewers, setViewers] = useState(2143);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 4200),
    ];
    const chatTimer = setInterval(() => setVisibleChat(c => Math.min(c + 1, CHAT.length)), 700);
    const viewerTimer = setInterval(() => setViewers(v => v + Math.floor(Math.random() * 15 + 3)), 600);
    return () => { t.forEach(clearTimeout); clearInterval(chatTimer); clearInterval(viewerTimer); };
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, y: '5vh' }}
      transition={{ duration: 0.8 }}>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-[#0d0f1a]" />

      {/* Stream frame */}
      <motion.div className="relative w-[55vw] aspect-video rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
        transition={{ type: 'spring', damping: 20 }}>

        {/* Mock stream content */}
        <div className="w-full h-full bg-gradient-to-br from-[#1a1d2e] to-[#2a1a1a] flex items-center justify-center">
          <span className="text-[10vw] select-none">📱</span>
        </div>

        {/* LIVE badge */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-1.5 rounded-full">
          <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          <span className="text-white font-black text-[1.2vw] tracking-widest">LIVE</span>
        </div>

        {/* Viewer count */}
        <motion.div className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full"
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity }}>
          <span className="text-white font-bold text-[1.2vw]">👁 {viewers.toLocaleString()}</span>
        </motion.div>

        {/* Product spotlight */}
        <motion.div
          className="absolute bottom-4 left-4 bg-[#F26B21] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl"
          initial={{ x: -80, opacity: 0 }}
          animate={phase >= 3 ? { x: 0, opacity: 1 } : {}}
          transition={{ type: 'spring', damping: 16 }}>
          <span className="text-[2.5vw]">📱</span>
          <div>
            <p className="text-white font-black text-[1.3vw]">iPhone 14 Pro — 256GB</p>
            <p className="text-white/90 font-bold text-[1.1vw]">£549 · <span className="line-through opacity-70">£999</span></p>
          </div>
          <div className="bg-white text-[#F26B21] font-black rounded-xl px-3 py-1 text-[1.1vw] ml-2 whitespace-nowrap">
            BUY NOW
          </div>
        </motion.div>
      </motion.div>

      {/* Chat sidebar */}
      <div className="absolute right-[5vw] top-[15vh] w-[18vw] h-[70vh] flex flex-col justify-end gap-2 overflow-hidden">
        {phase >= 2 && CHAT.slice(0, visibleChat).map((msg, i) => (
          <motion.div key={i}
            className="bg-white/8 backdrop-blur-sm border border-white/10 rounded-xl px-3 py-2"
            initial={{ x: 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}>
            <span className="font-black text-[1.1vw]" style={{ color: msg.color }}>{msg.name}: </span>
            <span className="text-white/80 text-[1.1vw]">{msg.msg}</span>
          </motion.div>
        ))}
      </div>

      {/* Title */}
      <motion.div className="absolute top-[8vh] left-[5vw]"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}>
        <p className="text-white/50 font-bold uppercase tracking-widest text-[1.2vw]">Bazunk Live</p>
        <h2 className="text-white font-black leading-tight"
          style={{ fontSize: 'clamp(20px, 4vw, 52px)' }}>
          Shop Live.<br /><span className="text-[#F26B21]">Buy Instantly.</span>
        </h2>
      </motion.div>

      {/* Footer label */}
      <motion.p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/40 font-bold tracking-widest text-[1.1vw] uppercase"
        animate={phase >= 4 ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0 }}
        transition={{ duration: 2, repeat: Infinity }}>
        bazunk.com/live
      </motion.p>
    </motion.div>
  );
}

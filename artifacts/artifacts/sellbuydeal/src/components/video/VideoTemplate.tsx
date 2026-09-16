import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video/hooks';
import { useEffect, useRef, MutableRefObject } from 'react';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';
import { Scene7 } from './video_scenes/Scene7';
import { Scene8 } from './video_scenes/Scene8';
import { Scene9 } from './video_scenes/Scene9';
import { Scene10 } from './video_scenes/Scene10';

const SCENE_DURATIONS = {
  intro:          7000,
  flashSales:     7000,
  auctions:       7000,
  liveShopping:   7000,
  lockerShipping: 7000,
  bundleDeals:    7000,
  buyerCashback:  7000,
  treasureHunt:   7000,
  vsCompetitors:  7000,
  cta:            8000,
};

const bgPos = [
  { x: '-10vw', y: '20vh', scale: 1,   rotate: 0   },
  { x: '50vw',  y: '-10vh', scale: 1.5, rotate: 45  },
  { x: '-20vw', y: '50vh', scale: 1.2, rotate: 90  },
  { x: '40vw',  y: '10vh', scale: 1.8, rotate: 135 },
  { x: '5vw',   y: '30vh', scale: 1,   rotate: 180 },
  { x: '-30vw', y: '60vh', scale: 1.3, rotate: 225 },
  { x: '60vw',  y: '40vh', scale: 1.1, rotate: 270 },
  { x: '20vw',  y: '-20vh', scale: 0.9, rotate: 315 },
  { x: '-15vw', y: '5vh',  scale: 1.4, rotate: 30  },
  { x: '35vw',  y: '55vh', scale: 1.6, rotate: 75  },
];

interface VideoTemplateProps {
  volume?: number;
  muted?: boolean;
  /** Parent stores the resume-and-start function here so any button click triggers audio */
  resumeAudioRef?: MutableRefObject<(() => void) | null>;
}

export default function VideoTemplate({ volume = 0.6, muted = false, resumeAudioRef }: VideoTemplateProps) {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });
  const ctxRef  = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    const ctx = new AudioContext();
    ctxRef.current = ctx;

    const gainNode = ctx.createGain();
    gainNode.gain.value = muted ? 0 : volume;
    gainNode.connect(ctx.destination);
    gainRef.current = gainNode;

    let started = false;
    let decodedBuffer: AudioBuffer | null = null;

    const startPlayback = (buf: AudioBuffer) => {
      if (started || ctx.state === 'closed') return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gainNode);
      src.start(0);
      started = true;
    };

    const resumeAndStart = () => {
      ctx.resume().then(() => {
        if (decodedBuffer && !started) startPlayback(decodedBuffer);
      }).catch(() => {});
    };

    if (resumeAudioRef) resumeAudioRef.current = resumeAndStart;

    fetch(`${import.meta.env.BASE_URL}infomercial_bg.mp3`)
      .then(r => r.arrayBuffer())
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        decodedBuffer = decoded;
        if (ctx.state === 'running') startPlayback(decoded);
      })
      .catch(() => {});

    const handlePointer = () => resumeAndStart();
    document.addEventListener('pointerdown', handlePointer, { once: true });

    return () => {
      if (resumeAudioRef) resumeAudioRef.current = null;
      ctx.close();
      document.removeEventListener('pointerdown', handlePointer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const now = ctxRef.current?.currentTime ?? 0;
    gainRef.current?.gain.setTargetAtTime(muted ? 0 : volume, now, 0.05);
  }, [volume, muted]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#1A1D2E] font-sans select-none"
      style={{ fontFamily: '"Outfit", "Inter", sans-serif' }}>

      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div className="absolute w-[70vw] h-[70vw] rounded-full opacity-20 blur-[120px]"
          style={{ background: 'radial-gradient(circle, #F26B21, transparent)' }}
          animate={{ x: ['-15%', '55%', '5%'], y: ['0%', '45%', '15%'], scale: [1, 1.3, 0.8] }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[55vw] h-[55vw] rounded-full opacity-20 blur-[120px] right-0 bottom-0"
          style={{ background: 'radial-gradient(circle, #4A5CE8, transparent)' }}
          animate={{ x: ['5%', '-35%', '8%'], y: ['-5%', '-55%', '-10%'] }}
          transition={{ duration: 17, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute w-[30vw] h-[30vw] rounded-full opacity-10 blur-[80px] left-1/2 top-1/2"
          style={{ background: 'radial-gradient(circle, #ffffff, transparent)' }}
          animate={{ scale: [1, 1.8, 1], opacity: [0.1, 0.18, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

      {/* Drifting ring */}
      <motion.div
        className="absolute w-[45vw] h-[45vw] rounded-full border border-[#F26B21]/15 border-dashed pointer-events-none"
        animate={bgPos[currentScene % bgPos.length]}
        transition={{ duration: 2.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="s1" />}
        {currentScene === 1 && <Scene2 key="s2" />}
        {currentScene === 2 && <Scene3 key="s3" />}
        {currentScene === 3 && <Scene4 key="s4" />}
        {currentScene === 4 && <Scene5 key="s5" />}
        {currentScene === 5 && <Scene6 key="s6" />}
        {currentScene === 6 && <Scene7 key="s7" />}
        {currentScene === 7 && <Scene8 key="s8" />}
        {currentScene === 8 && <Scene9 key="s9" />}
        {currentScene === 9 && <Scene10 key="s10" />}
      </AnimatePresence>
    </div>
  );
}

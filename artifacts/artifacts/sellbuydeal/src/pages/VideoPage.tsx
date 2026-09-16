import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import VideoTemplate from "@/components/video/VideoTemplate";
import { RotateCcw, Home, Volume2, VolumeX, Maximize, Minimize, Music } from "lucide-react";

export default function VideoPage() {
  const [, setLocation] = useLocation();
  const [videoKey, setVideoKey] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);

  const containerRef   = useRef<HTMLDivElement>(null);
  const resumeAudioRef = useRef<(() => void) | null>(null);

  const triggerAudio = useCallback(() => {
    resumeAudioRef.current?.();
    setAudioStarted(true);
  }, []);

  const handleReplay = useCallback(() => {
    triggerAudio();
    setVideoKey(k => k + 1);
    setAudioStarted(false);
  }, [triggerAudio]);

  const handleMuteToggle = useCallback(() => {
    triggerAudio();
    setMuted(m => !m);
  }, [triggerAudio]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    triggerAudio();
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (v > 0) setMuted(false);
  }, [triggerAudio]);

  const handleFullscreen = useCallback(async () => {
    triggerAudio();
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) await el.requestFullscreen();
    else await document.exitFullscreen();
  }, [triggerAudio]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div className="min-h-screen bg-[#0D0F1C] flex flex-col items-center justify-center gap-3 p-2 sm:p-4">

      {/* Video frame */}
      <div
        ref={containerRef}
        className="relative w-full max-w-5xl aspect-video rounded-2xl overflow-hidden border border-[#F26B21]/25 shadow-[0_0_60px_rgba(242,107,33,0.15)] cursor-pointer"
        style={{ background: "#1A1D2E" }}
        onClick={triggerAudio}
      >
        <VideoTemplate
          key={videoKey}
          volume={volume}
          muted={muted}
          resumeAudioRef={resumeAudioRef}
        />

        {!audioStarted && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/70 text-xs font-medium pointer-events-none select-none">
            <Music className="w-3.5 h-3.5 text-[#F26B21]" />
            Click anywhere to enable audio
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center gap-2 sm:gap-3 px-5 py-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl">

        <button
          onClick={() => { triggerAudio(); setLocation("/"); }}
          title="Return to homepage"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-all"
        >
          <Home className="w-4 h-4" />
        </button>

        <button
          onClick={handleReplay}
          title="Replay video"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-white/10" />

        <button
          onClick={handleMuteToggle}
          title={muted ? "Unmute" : "Mute"}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-all"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        <input
          type="range" min={0} max={1} step={0.05}
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          onMouseDown={triggerAudio}
          className="w-24 sm:w-32 accent-[#F26B21] cursor-pointer"
          title="Volume"
        />

        <span className="text-white/40 text-xs w-6 text-right tabular-nums">
          {muted ? "0" : Math.round(volume * 100)}
        </span>

        <div className="w-px h-6 bg-white/10" />

        <button
          onClick={handleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10 transition-all"
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

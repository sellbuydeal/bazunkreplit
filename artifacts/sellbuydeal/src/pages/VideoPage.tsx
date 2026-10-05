import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { Home, RotateCcw, Maximize, Minimize } from "lucide-react";

export default function VideoPage() {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const replay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    void video.play();
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070d1c] flex flex-col items-center justify-center gap-4 p-2 sm:p-5">
      <div
        ref={containerRef}
        className="relative w-full max-w-7xl aspect-video overflow-hidden rounded-xl sm:rounded-2xl bg-black border border-white/10 shadow-[0_0_70px_rgba(55,80,255,0.18)]"
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain bg-black"
          src={`${import.meta.env.BASE_URL}bazunk-promo.mp4`}
          controls
          playsInline
          preload="metadata"
          autoPlay
        >
          Your browser does not support HTML5 video.
        </video>
      </div>

      <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => setLocation("/")}
          title="Return to homepage"
          aria-label="Return to homepage"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <Home className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={replay}
          title="Replay video"
          aria-label="Replay video"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <RotateCcw className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

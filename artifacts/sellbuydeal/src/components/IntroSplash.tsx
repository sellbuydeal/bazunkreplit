import { useState, useEffect, useRef } from "react";

// To change the intro: just replace public/bazunkintro2.gif (same file name).
// The display time is read from the GIF itself, so any length works.
const GIF_SRC = `${import.meta.env.BASE_URL}bazunkintro2.gif`;
const FALLBACK_MS = 5000; // used only if the GIF's length can't be read
const MAX_MS = 15000;     // never show longer than this
const FADE_MS = 400;
const SEEN_KEY = "bazunk_intro_seen";

/** Total play time of ONE pass of a GIF, in ms (sums every frame's delay). */
export function gifDurationMs(buf: ArrayBuffer): number | null {
  const d = new Uint8Array(buf);
  if (d.length < 14 || d[0] !== 0x47 || d[1] !== 0x49 || d[2] !== 0x46) return null;
  let p = 13;
  if (d[10] & 0x80) p += 3 * (1 << ((d[10] & 7) + 1)); // global colour table
  let total = 0;
  let frames = 0;
  const skipSubBlocks = () => {
    while (p < d.length && d[p] !== 0) p += d[p] + 1;
    p++;
  };
  while (p < d.length) {
    const b = d[p++];
    if (b === 0x3b) break; // trailer
    if (b === 0x21) {
      const label = d[p++];
      if (label === 0xf9) {
        // graphic control extension: size(4) flags delay(2) transparent(1) end(0)
        const delay = d[p + 2] | (d[p + 3] << 8); // 1/100 s
        total += (delay <= 1 ? 10 : delay) * 10; // browsers treat 0/1 as 100ms
        frames++;
      }
      skipSubBlocks();
    } else if (b === 0x2c) {
      p += 8;
      const flags = d[p++];
      if (flags & 0x80) p += 3 * (1 << ((flags & 7) + 1)); // local colour table
      p++; // LZW min code size
      skipSubBlocks();
    } else {
      return null;
    }
  }
  return frames > 0 ? total : null;
}

export default function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const closing = useRef(false);
  const timers = useRef<number[]>([]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    try {
      sessionStorage.setItem(SEEN_KEY, "true");
    } catch {}
    setFading(true);
    timers.current.push(window.setTimeout(() => setVisible(false), FADE_MS));
  };

  useEffect(() => {
    // Once per browser session
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
    } catch {}

    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(GIF_SRC, { cache: "force-cache" });
        if (!res.ok) throw new Error("gif not found");
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        const ms = Math.min(gifDurationMs(buf) ?? FALLBACK_MS, MAX_MS);
        objectUrl = URL.createObjectURL(new Blob([buf], { type: "image/gif" }));
        setSrc(objectUrl); // GIF starts at frame 1 the moment it's shown
        setVisible(true);
        // close right as the GIF finishes one play-through (before it loops)
        timers.current.push(window.setTimeout(close, ms));
      } catch {
        // GIF missing/blocked: skip the intro rather than show a broken box
      }
    })();

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!visible || !src) return null;

  return (
    <div
      onClick={close}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          background: "#ffffff",
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
          padding: 12,
          width: "min(92vw, 520px)",
          maxHeight: "85vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img
          src={src}
          alt="Bazunk"
          style={{ width: "100%", maxHeight: "calc(85vh - 24px)", objectFit: "contain", display: "block" }}
        />
        <button
          onClick={close}
          aria-label="Skip intro"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            padding: "4px 12px",
            background: "rgba(0,0,0,0.12)",
            border: "none",
            borderRadius: 16,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

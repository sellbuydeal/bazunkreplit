import { useState, useEffect, useRef } from "react";

const GIF_SRC = `${import.meta.env.BASE_URL}bazunkintro2.gif`;
const SHOW_MS = 5000; // intro closes after 5 seconds (GIF loops, so don't go longer)
const FADE_MS = 500;

export default function IntroSplash() {
  const [visible, setVisible] = useState(true); // plays on EVERY homepage load
  const [fading, setFading] = useState(false);
  const closing = useRef(false);
  const timers = useRef<number[]>([]);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setFading(true);
    timers.current.push(window.setTimeout(() => setVisible(false), FADE_MS));
  };

  // Start the 5s countdown once the GIF has actually loaded and begun playing
  const startCountdown = () => {
    timers.current.push(window.setTimeout(close, SHOW_MS));
  };

  // Safety net: close even if the GIF is slow or fails to load
  useEffect(() => {
    timers.current.push(window.setTimeout(close, SHOW_MS + 4000));
    return () => timers.current.forEach(clearTimeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-in-out`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <img
        src={GIF_SRC}
        alt="Bazunk"
        onLoad={startCountdown}
        onError={close}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
      <button
        onClick={close}
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          padding: "8px 16px",
          background: "rgba(0,0,0,0.1)",
          border: "none",
          borderRadius: 20,
          cursor: "pointer",
          fontSize: 14,
          fontWeight: "bold",
        }}
      >
        Skip
      </button>
    </div>
  );
}

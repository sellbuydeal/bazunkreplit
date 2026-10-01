import { useState, useEffect, useRef } from "react";

const GIF_SRC = `${import.meta.env.BASE_URL}bazunkintro2.gif`;
const GIF_DURATION_MS = 5400; // bazunkintro2.gif runs ~5.3s — change if you swap the GIF
const FADE_MS = 500;
const SEEN_KEY = "bazunk_intro_seen";

export default function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);
  const closing = useRef(false);

  // Decide once, on first load of the session, whether to show the intro
  useEffect(() => {
    try {
      if (!sessionStorage.getItem(SEEN_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    try {
      sessionStorage.setItem(SEEN_KEY, "true");
    } catch {}
    setFading(true);
    setTimeout(() => setVisible(false), FADE_MS);
  };

  // Safety net: close even if the GIF fails to load
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(close, GIF_DURATION_MS + 3000);
    return () => clearTimeout(t);
  }, [visible]);

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
        // start the countdown only once the GIF has actually loaded and begun
        onLoad={() => setTimeout(close, GIF_DURATION_MS)}
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

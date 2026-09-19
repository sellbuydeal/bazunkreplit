import React, { useState, useEffect } from 'react';

export default function IntroSplash() {
  const [showIntro, setShowIntro] = useState(false);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Check if user has already seen the intro in this browser session
    const hasSeenIntro = sessionStorage.getItem('bazunk_intro_seen');
    if (!hasSeenIntro) {
      setShowIntro(true);
    }
  }, []);

  const handleEnded = () => {
    setIsFading(true);
    sessionStorage.setItem('bazunk_intro_seen', 'true');
    setTimeout(() => setShowIntro(false), 500); // Wait for fade transition
  };

  if (!showIntro) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: isFading ? 0 : 1,
        transition: 'opacity 0.5s ease-in-out',
        pointerEvents: isFading ? 'none' : 'auto',
      }}
    >
      <video
        src="/attached_assets/bazunkintro2.mp4"
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
      <button
        onClick={handleEnded}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '8px 16px',
          background: 'rgba(0, 0, 0, 0.1)',
          border: 'none',
          borderRadius: '20px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
        }}
      >
        Skip
      </button>
    </div>
  );
}

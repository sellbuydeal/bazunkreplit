import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { MOCK_LIVE_SESSIONS, type LiveSession, type FeaturedItem, FEATURED_KEY } from "@/data/livestreams";

interface LiveStreamContextValue {
  sessions: LiveSession[];
  liveSessions: LiveSession[];
  mySession: LiveSession | null;
  goLive: (session: Omit<LiveSession, "id" | "startedAt" | "viewerCount">) => LiveSession;
  endSession: (id: string) => void;
  featureProduct: (sessionId: string, productId: number, opts?: { discount?: number; stockAlert?: number; flashDeal?: boolean }) => void;
  clearFeatured: (sessionId: string) => void;
  getFeatured: (sessionId: string) => FeaturedItem | null;
}

const LiveStreamContext = createContext<LiveStreamContextValue | null>(null);

const STORAGE_KEY = "sbd_live_sessions_v1";
const MY_SESSION_KEY = "sbd_my_live_session_v1";

function loadSessions(): LiveSession[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

function loadMySession(): LiveSession | null {
  try { const s = localStorage.getItem(MY_SESSION_KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

function loadFeaturedMap(): Record<string, FeaturedItem> {
  try { const s = localStorage.getItem(FEATURED_KEY); return s ? JSON.parse(s) : {}; } catch { return {}; }
}

export function LiveStreamProvider({ children }: { children: ReactNode }) {
  const [userSessions, setUserSessions] = useState<LiveSession[]>(loadSessions);
  const [mySession, setMySession] = useState<LiveSession | null>(loadMySession);
  const [featuredMap, setFeaturedMap] = useState<Record<string, FeaturedItem>>(loadFeaturedMap);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userSessions));
  }, [userSessions]);

  useEffect(() => {
    if (mySession) {
      localStorage.setItem(MY_SESSION_KEY, JSON.stringify(mySession));
    } else {
      localStorage.removeItem(MY_SESSION_KEY);
    }
  }, [mySession]);

  useEffect(() => {
    localStorage.setItem(FEATURED_KEY, JSON.stringify(featuredMap));
  }, [featuredMap]);

  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === FEATURED_KEY && e.newValue) {
        try { setFeaturedMap(JSON.parse(e.newValue)); } catch {}
      }
      if (e.key === STORAGE_KEY && e.newValue) {
        try { setUserSessions(JSON.parse(e.newValue)); } catch {}
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const sessions: LiveSession[] = [
    ...MOCK_LIVE_SESSIONS,
    ...userSessions.filter((u) => !MOCK_LIVE_SESSIONS.find((m) => m.id === u.id)),
  ];

  const liveSessions = sessions.filter((s) => s.isLive);

  function goLive(data: Omit<LiveSession, "id" | "startedAt" | "viewerCount">): LiveSession {
    const session: LiveSession = {
      ...data,
      id: `live_user_${Date.now()}`,
      startedAt: new Date().toISOString(),
      viewerCount: 0,
    };
    setUserSessions((prev) => [session, ...prev.filter((s) => s.sellerId !== data.sellerId)]);
    setMySession(session);
    return session;
  }

  function endSession(id: string) {
    setUserSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isLive: false } : s))
    );
    setMySession(null);
    setFeaturedMap((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function featureProduct(
    sessionId: string,
    productId: number,
    opts?: { discount?: number; stockAlert?: number; flashDeal?: boolean }
  ) {
    setFeaturedMap((prev) => ({
      ...prev,
      [sessionId]: { productId, ...opts, featuredAt: Date.now() },
    }));
  }

  function clearFeatured(sessionId: string) {
    setFeaturedMap((prev) => { const n = { ...prev }; delete n[sessionId]; return n; });
  }

  function getFeatured(sessionId: string): FeaturedItem | null {
    return featuredMap[sessionId] ?? null;
  }

  return (
    <LiveStreamContext.Provider value={{
      sessions, liveSessions, mySession,
      goLive, endSession,
      featureProduct, clearFeatured, getFeatured,
    }}>
      {children}
    </LiveStreamContext.Provider>
  );
}

export function useLiveStream() {
  const ctx = useContext(LiveStreamContext);
  if (!ctx) throw new Error("useLiveStream must be used inside LiveStreamProvider");
  return ctx;
}

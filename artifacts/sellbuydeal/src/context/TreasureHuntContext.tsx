import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";

type TokenStatus = {
  positionId: string;
  page: string;
  hint: string;
  creditValue: number;
  claimed: boolean;
  label: string;
};

type TreasureHuntContextValue = {
  tokens: TokenStatus[];
  myCredits: number;
  loading: boolean;
  claimToken: (code: string) => Promise<{ ok: boolean; creditsEarned?: number; alreadyClaimed?: boolean; error?: string }>;
  refresh: () => void;
  todayFound: number;
  totalTokens: number;
};

const TreasureHuntContext = createContext<TreasureHuntContextValue>({
  tokens: [], myCredits: 0, loading: false,
  claimToken: async () => ({ ok: false }),
  refresh: () => {},
  todayFound: 0, totalTokens: 6,
});

export function TreasureHuntProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tokens, setTokens] = useState<TokenStatus[]>([]);
  const [myCredits, setMyCredits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [totalTokens, setTotalTokens] = useState(6);

  const fetchToday = useCallback(async () => {
    if (!user) { setTokens([]); setMyCredits(0); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/treasure-hunt/today?email=${encodeURIComponent(user.email)}`);
      if (!res.ok) return;
      const data = await res.json();
      setTokens(data.tokens ?? []);
      setMyCredits(data.myCredits ?? 0);
      setTotalTokens(data.totalTokens ?? 6);
    } catch {}
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { fetchToday(); }, [fetchToday]);

  async function claimToken(code: string) {
    if (!user) return { ok: false, error: "Not logged in" };
    try {
      const res = await fetch("/api/treasure-hunt/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email: user.email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyCredits(c => c + (data.creditsEarned ?? 0));
        setTokens(prev => prev.map(t => {
          const matched = tokens.find(tok => tok.positionId === t.positionId);
          return matched ? { ...t, claimed: true } : t;
        }));
        await fetchToday();
        return { ok: true, creditsEarned: data.creditsEarned };
      }
      return { ok: false, alreadyClaimed: data.alreadyClaimed, error: data.error };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  const todayFound = tokens.filter(t => t.claimed).length;

  return (
    <TreasureHuntContext.Provider value={{ tokens, myCredits, loading, claimToken, refresh: fetchToday, todayFound, totalTokens }}>
      {children}
    </TreasureHuntContext.Provider>
  );
}

export function useTreasureHunt() {
  return useContext(TreasureHuntContext);
}

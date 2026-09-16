import { useState, useEffect, useRef } from "react";
import { Gem } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTreasureHunt } from "@/context/TreasureHuntContext";

type Props = {
  positionId: string;
  className?: string;
};

export function TreasureToken({ positionId, className = "" }: Props) {
  const { user } = useAuth();
  const { claimToken } = useTreasureHunt();
  const [code, setCode] = useState<string | null>(null);
  const [claimed, setClaimed] = useState(false);
  const [state, setState] = useState<"idle" | "claiming" | "found" | "gone">("idle");
  const [creditsEarned, setCreditsEarned] = useState(0);
  const popupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/treasure-hunt/position/${positionId}?email=${encodeURIComponent(user.email)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setCode(data.code);
          setClaimed(data.claimed);
        }
      })
      .catch(() => {});
    return () => { if (popupTimer.current) clearTimeout(popupTimer.current); };
  }, [positionId, user]);

  if (!user || !code || claimed) return null;

  async function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (state !== "idle" || !code) return;
    setState("claiming");
    const result = await claimToken(code);
    if (result.ok) {
      setCreditsEarned(result.creditsEarned ?? 0);
      setState("found");
      setClaimed(true);
      popupTimer.current = setTimeout(() => setState("gone"), 3500);
    } else if (result.alreadyClaimed) {
      setClaimed(true);
      setState("gone");
    } else {
      setState("idle");
    }
  }

  return (
    <>
      {state !== "gone" && state !== "found" && (
        <button
          onClick={handleClick}
          title="👀"
          aria-label="hidden treasure"
          className={`group opacity-[0.12] hover:opacity-70 transition-opacity duration-300 cursor-pointer focus:outline-none ${className}`}
        >
          <Gem className={`text-amber-400 ${state === "claiming" ? "animate-spin" : "group-hover:scale-110 transition-transform"}`} style={{ width: 14, height: 14 }} />
        </button>
      )}

      {state === "found" && (
        <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 text-white font-black text-center px-10 py-7 rounded-3xl shadow-2xl animate-[bounceIn_0.5s_ease-out]"
            style={{ animation: "bounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
            <div className="text-5xl mb-2">💎</div>
            <p className="text-2xl mb-1">Treasure Found!</p>
            <p className="text-lg opacity-90">+{creditsEarned} credits</p>
          </div>
        </div>
      )}
    </>
  );
}

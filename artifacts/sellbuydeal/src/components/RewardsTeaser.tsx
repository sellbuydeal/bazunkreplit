import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Gift, ChevronRight, CalendarCheck, RotateCcw, Brain, Ticket, PackageOpen, Dices } from "lucide-react";

const GAME_ICONS: Record<string, React.ElementType> = {
  "daily-checkin": CalendarCheck,
  "spin-wheel": RotateCcw,
  "daily-quiz": Brain,
  "scratch-card": Ticket,
  "mystery-box": PackageOpen,
  "lucky-number": Dices,
};

interface TeaserGame {
  id: string;
  name: string;
  description: string;
  icon: string;
  enabled: boolean;
  creditsMin: number;
  creditsMax: number;
}

/** Homepage strip showing the daily reward games that are switched on in Admin → Rewards. */
export function RewardsTeaser() {
  const [games, setGames] = useState<TeaserGame[]>([]);

  useEffect(() => {
    fetch("/api/rewards/games")
      .then(r => (r.ok ? r.json() : []))
      .then((rows: TeaserGame[]) => setGames(rows.filter(g => g.enabled)))
      .catch(() => {});
  }, []);

  if (games.length === 0) return null;

  return (
    <section className="py-8">
      <div className="container mx-auto px-4">
        <div className="rounded-3xl bg-[#1A1D2E] p-6 md:p-8 relative overflow-hidden">
          <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full bg-[#F26B21]/15 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-4 h-4 text-[#F26B21]" />
                <span className="text-[#F26B21] font-black text-xs uppercase tracking-widest">Daily Rewards</span>
              </div>
              <h2 className="text-2xl font-black text-white">Bazunk Rewards Arcade</h2>
              <p className="text-white/50 text-sm mt-1">Play daily games, win free Bazunk credits and use them on promotions and perks.</p>
            </div>
            <Link href="/rewards" className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#F26B21] text-white text-sm font-bold hover:opacity-90 transition-opacity self-start md:self-auto">
              Play now <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative grid grid-cols-2 md:grid-cols-5 gap-3">
            {games.map(g => {
              const Icon = GAME_ICONS[g.id] ?? Gift;
              return (
              <Link key={g.id} href="/rewards" className="rounded-2xl bg-white/10 border border-white/10 hover:bg-white/15 transition-colors p-4 text-center group">
                <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 border border-white/10 group-hover:scale-105 transition-transform">
                  <Icon className="h-6 w-6 text-[#F26B21]" />
                </div>
                <p className="text-white font-bold text-sm leading-tight">{g.name}</p>
                <p className="text-amber-400 text-xs font-semibold mt-1">
                  {g.creditsMin === g.creditsMax ? `+${g.creditsMax}` : `+${g.creditsMin}–${g.creditsMax}`} credits
                </p>
              </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

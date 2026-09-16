import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Gem, Trophy, MapPin, Star, CheckCircle2, Lock, Loader2,
  ChevronRight, Flame, Crown,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/context/AuthContext";
import { useTreasureHunt } from "@/context/TreasureHuntContext";
import { TreasureToken } from "@/components/TreasureToken";

type LeaderboardEntry = { user_email: string; total_credits: number };

export function TreasureHuntPage() {
  const { user } = useAuth();
  const { tokens, myCredits, loading, todayFound, totalTokens, refresh } = useTreasureHunt();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);

  useEffect(() => {
    fetch("/api/treasure-hunt/leaderboard")
      .then(r => r.ok ? r.json() : [])
      .then(setLeaderboard)
      .catch(() => {})
      .finally(() => setLbLoading(false));
  }, []);

  useEffect(() => { refresh(); }, []);

  const progress = totalTokens > 0 ? (todayFound / totalTokens) * 100 : 0;

  const PAGE_ICONS: Record<string, string> = {
    "home-hero":     "🏠",
    "footer":        "📋",
    "browse":        "🔍",
    "flash-sales":   "⚡",
    "auctions":      "🔨",
    "treasure-page": "💎",
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="relative bg-[#1A1D2E] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -left-16 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[#4A5CE8]/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 w-48 h-48 rounded-full bg-[#F26B21]/10 blur-3xl" />
        </div>
        <div className="relative container mx-auto max-w-5xl px-4 py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <Gem className="w-5 h-5 text-white" />
                </div>
                <span className="text-amber-400 font-black text-sm uppercase tracking-widest">Daily Treasure Hunt</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-white leading-tight mb-3">
                Hidden gems. Real credits.
              </h1>
              <p className="text-white/50 text-sm max-w-md leading-relaxed">
                Six credit tokens are hidden across the site each day. Explore the pages, spot the glimmer, and click to claim your reward. Tokens reset at midnight.
              </p>
            </div>

            {user && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 min-w-[180px] text-center border border-white/10 shrink-0">
                <Gem className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                <p className="text-3xl font-black text-white">{myCredits}</p>
                <p className="text-white/50 text-xs">Total credits earned</p>
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-sm font-bold text-amber-400">{todayFound}/{totalTokens} today</p>
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {user && (
            <div className="mt-8">
              <div className="flex items-center justify-between text-xs text-white/40 mb-2">
                <span>Today's progress</span>
                <span>{todayFound} of {totalTokens} tokens found</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {todayFound === totalTokens && (
                <p className="text-amber-400 font-bold text-sm mt-2 text-center animate-pulse">🏆 Complete! You found all today's tokens!</p>
              )}
            </div>
          )}

          {/* The treasure-page token — hidden subtly in the corner */}
          <TreasureToken positionId="treasure-page" className="absolute top-4 right-4" />
        </div>
      </div>

      <main className="flex-1 container mx-auto max-w-5xl px-4 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-5">
              <Gem className="w-10 h-10 text-amber-400" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Sign in to join the hunt</h2>
            <p className="text-gray-500 text-sm mb-6 max-w-sm">Create an account or sign in to find hidden tokens and earn credits every day.</p>
            <div className="flex gap-3">
              <Link href="/login" className="px-6 py-3 rounded-xl bg-[#1A1D2E] text-white font-bold hover:opacity-90 transition-opacity">Sign In</Link>
              <Link href="/register" className="px-6 py-3 rounded-xl bg-amber-500 text-white font-bold hover:opacity-90 transition-opacity">Join Free</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Clues column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-black text-gray-900">Today's Clues</h2>
                <span className="text-xs text-gray-400 ml-auto">Resets midnight UTC</span>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-amber-500" /></div>
              ) : tokens.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center text-gray-400">
                  <Gem className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                  <p>No tokens available yet — check back soon!</p>
                </div>
              ) : (
                tokens.map((t, i) => (
                  <div key={t.positionId}
                    className={`bg-white rounded-2xl border p-5 flex items-start gap-4 transition-all ${
                      t.claimed ? "border-amber-200 bg-amber-50/50" : "border-gray-100 hover:border-amber-200"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      t.claimed ? "bg-amber-100" : "bg-gray-100"
                    }`}>
                      {PAGE_ICONS[t.positionId] ?? "🗺️"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 text-sm">{t.label}</p>
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">+{t.creditValue} credits</span>
                        {t.claimed && <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Found!</span>}
                      </div>
                      <p className="text-sm text-gray-500 italic">"{t.hint}"</p>
                    </div>
                    <div className="shrink-0">
                      {t.claimed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Lock className="w-4 h-4 text-gray-300" />
                      )}
                    </div>
                  </div>
                ))
              )}

              <div className="bg-[#1A1D2E] rounded-2xl p-5 mt-2">
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <p className="font-bold text-white text-sm">How to hunt</p>
                </div>
                <ol className="space-y-2 text-sm text-white/60">
                  <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">1.</span> Read the clue above for each token's hiding spot.</li>
                  <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">2.</span> Navigate to the hinted page and explore — tokens are small and subtle.</li>
                  <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">3.</span> Click the hidden gem icon 💎 to instantly claim your credits.</li>
                  <li className="flex items-start gap-2"><span className="text-amber-400 font-bold shrink-0">4.</span> Six new tokens hide each day at midnight. Come back tomorrow!</li>
                </ol>
              </div>
            </div>

            {/* Right column: My Credits + Leaderboard */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-amber-500" />
                  <h3 className="font-black text-gray-900 text-sm">My Credits</h3>
                </div>
                <p className="text-4xl font-black text-amber-500 mb-1">{myCredits}</p>
                <p className="text-xs text-gray-400">credits earned lifetime</p>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-400 mb-1">Today's haul</p>
                  <p className="text-lg font-black text-gray-900">
                    {tokens.filter(t => t.claimed).reduce((sum, t) => sum + t.creditValue, 0)} credits
                    <span className="text-sm font-normal text-gray-400 ml-1">({todayFound}/{totalTokens} tokens)</span>
                  </p>
                </div>
                <Link href="/credits" className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-[#4A5CE8] hover:underline">
                  Spend credits <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  <h3 className="font-black text-gray-900 text-sm">Leaderboard</h3>
                </div>
                {lbLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div>
                ) : leaderboard.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No hunters yet — be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => {
                      const isMe = entry.user_email === user.email;
                      const medals = ["🥇", "🥈", "🥉"];
                      const emailDisplay = entry.user_email.split("@")[0].slice(0, 12) + "…";
                      return (
                        <div key={entry.user_email}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${isMe ? "bg-amber-50 border border-amber-200" : "bg-gray-50"}`}>
                          <span className="text-base w-6 text-center">{medals[i] ?? `${i + 1}`}</span>
                          {i === 0 && <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          <span className={`text-sm flex-1 truncate font-${isMe ? "bold" : "medium"} text-gray-${isMe ? "900" : "700"}`}>
                            {isMe ? "You" : emailDisplay}
                          </span>
                          <span className="text-xs font-black text-amber-600">{entry.total_credits} pts</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { AdminLayout } from "./AdminLayout";
import { Gift, Loader2, Save, ToggleLeft, ToggleRight } from "lucide-react";
import { useAdmin } from "@/context/AdminContext";

interface Game {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  credits_min: number;
  credits_max: number;
  daily_plays_per_user: number;
}

const GAME_ICONS: Record<string, string> = {
  "daily-checkin":  "📅",
  "spin-wheel":     "🎡",
  "daily-quiz":     "❓",
  "scratch-card":   "🎁",
  "word-scramble":  "🔤",
};

export function AdminRewardsPage() {
  const { authFetch } = useAdmin();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<Game>>>({});

  useEffect(() => {
    authFetch(`/api/admin/rewards/games?_t=${Date.now()}`)
      .then(async r => {
        if (!r.ok) { setError(`API error ${r.status}: ${await r.text()}`); return []; }
        return r.json();
      })
      .then((rows: Game[]) => {
        if (!rows) return;
        setGames(rows);
        const initial: Record<string, Partial<Game>> = {};
        rows.forEach(g => { initial[g.id] = { enabled: g.enabled, credits_min: g.credits_min, credits_max: g.credits_max, daily_plays_per_user: g.daily_plays_per_user }; });
        setEdits(initial);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [authFetch]);

  function update(id: string, field: string, value: unknown) {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function save(id: string) {
    setSaving(id);
    try {
      const body = edits[id] ?? {};
      await authFetch(`/api/admin/rewards/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: body.enabled,
          creditsMin: body.credits_min,
          creditsMax: body.credits_max,
          dailyPlaysPerUser: body.daily_plays_per_user,
        }),
      });
      setGames(prev => prev.map(g => g.id === id ? { ...g, ...(body as Partial<Game>) } : g));
      setSaved(id);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-[#F26B21]/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-[#F26B21]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900">Rewards Games</h1>
            <p className="text-sm text-gray-500">Toggle games on/off and control credit rewards per game.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-gray-300" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            <strong>Failed to load games:</strong> {error}
            <br /><span className="text-xs text-red-500">Try logging out and back in to the admin panel.</span>
          </div>
        ) : (
          <div className="space-y-4">
            {games.map(game => {
              const edit = edits[game.id] ?? {};
              const isEnabled = edit.enabled ?? game.enabled;
              const isSaving = saving === game.id;
              const isSaved = saved === game.id;

              return (
                <div key={game.id} className={`bg-white rounded-2xl border p-5 transition-all ${isEnabled ? "border-gray-200" : "border-gray-100 opacity-70"}`}>
                  <div className="flex items-start gap-4">
                    {/* Icon + name */}
                    <div className="text-2xl w-10 text-center pt-0.5 flex-shrink-0">{GAME_ICONS[game.id] ?? "🎮"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <h3 className="font-black text-gray-900">{game.name}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isEnabled ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                          {isEnabled ? "ENABLED" : "DISABLED"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">{game.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Min credits */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Min Credits</label>
                          <input
                            type="number"
                            min={0}
                            value={edit.credits_min ?? game.credits_min}
                            onChange={e => update(game.id, "credits_min", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                          />
                        </div>
                        {/* Max credits */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Max Credits</label>
                          <input
                            type="number"
                            min={0}
                            value={edit.credits_max ?? game.credits_max}
                            onChange={e => update(game.id, "credits_max", parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                          />
                        </div>
                        {/* Daily plays */}
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Daily Plays / User</label>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={edit.daily_plays_per_user ?? game.daily_plays_per_user}
                            onChange={e => update(game.id, "daily_plays_per_user", parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4A5CE8]/30 focus:border-[#4A5CE8]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Toggle + Save */}
                    <div className="flex flex-col items-end gap-3 flex-shrink-0">
                      <button
                        onClick={() => update(game.id, "enabled", !isEnabled)}
                        className={`transition-colors ${isEnabled ? "text-emerald-500 hover:text-emerald-600" : "text-gray-300 hover:text-gray-400"}`}
                        title={isEnabled ? "Disable game" : "Enable game"}
                      >
                        {isEnabled
                          ? <ToggleRight className="w-9 h-9" />
                          : <ToggleLeft className="w-9 h-9" />
                        }
                      </button>

                      <button
                        onClick={() => save(game.id)}
                        disabled={isSaving}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                          isSaved
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                            : "bg-[#1A1D2E] text-white hover:opacity-90"
                        }`}
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        {isSaved ? "Saved!" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-700 font-semibold mb-1">💡 Credit notes</p>
          <ul className="text-xs text-blue-600 space-y-1">
            <li>• For flat games (Check-In, Quiz, Word Scramble) only <strong>Max Credits</strong> is used.</li>
            <li>• For random games (Spin, Scratch Card) a value between Min and Max is awarded.</li>
            <li>• Credits awarded here add directly to the user's main credit balance.</li>
            <li>• 100 credits = £1.00 in account balance.</li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
}

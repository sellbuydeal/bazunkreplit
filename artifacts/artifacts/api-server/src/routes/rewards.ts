import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";
import { requireAdmin } from "../middlewares/adminAuth.js";

const router = Router();

// ── Rotating content ────────────────────────────────────────────────────────

const QUIZ_QUESTIONS = [
  { q: "What does P2P stand for?",                       options: ["Pay to Play", "Peer to Peer", "Product to Product", "Price to Pay"], answer: 1 },
  { q: "What does 'BIN' mean in online auctions?",       options: ["Buy It Now", "Bid in Now", "Best in Network", "Buyer Interest Notice"], answer: 0 },
  { q: "How many credits equal £1 on Bazunk?",           options: ["10", "50", "100", "200"], answer: 2 },
  { q: "What is a 'flash sale'?",                        options: ["A sale with flashing lights", "A very short time-limited sale", "A discount on electronics", "A hidden sale"], answer: 1 },
  { q: "What does 'VGC' mean in listings?",              options: ["Very Good Condition", "Value Guaranteed Cost", "Verified Grade C", "Very Good Choice"], answer: 0 },
  { q: "Which UK city is known as the 'Second City'?",   options: ["Manchester", "Birmingham", "Leeds", "Liverpool"], answer: 1 },
  { q: "What protects buyers if an item doesn't arrive?",options: ["Seller rating", "Buyer Protection", "Cashback", "Credits"], answer: 1 },
  { q: "What is an auction reserve price?",              options: ["The highest bid", "The starting price", "The minimum price the seller will accept", "The buyer's max bid"], answer: 2 },
];

const SCRAMBLE_WORDS = [
  { word: "AUCTION",   category: "marketplace" },
  { word: "LISTING",   category: "marketplace" },
  { word: "CREDITS",   category: "rewards"     },
  { word: "BIDDING",   category: "marketplace" },
  { word: "SELLERS",   category: "users"       },
  { word: "PAYMENT",   category: "finance"     },
  { word: "REVIEWS",   category: "feedback"    },
  { word: "DELIVER",   category: "shipping"    },
  { word: "BARGAIN",   category: "deals"       },
  { word: "MARKETS",   category: "marketplace" },
  { word: "PROTECT",   category: "safety"      },
  { word: "VINTAGE",   category: "categories"  },
];

function getDayIndex() {
  return Math.floor(Date.now() / 86400000);
}

function getTodayQuiz() {
  return QUIZ_QUESTIONS[getDayIndex() % QUIZ_QUESTIONS.length];
}

function getTodayScramble() {
  const entry = SCRAMBLE_WORDS[getDayIndex() % SCRAMBLE_WORDS.length];
  const arr = entry.word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join("") === entry.word
    ? arr.reverse().join("")
    : arr.join("");
  return { word: entry.word, scrambled, category: entry.category };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WEEKLY_CAP_CREDITS = 150;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getWeekEarned(email: string): Promise<number> {
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const r = await db.execute(sql`
    SELECT COALESCE(SUM(credits_earned), 0)::int AS total
    FROM reward_plays
    WHERE user_email = ${email} AND played_at >= ${weekStart.toISOString()}
  `);
  return (r.rows[0] as Record<string, unknown>)?.total as number ?? 0;
}

async function getTodayPlays(gameId: string, email: string): Promise<number> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM reward_plays
    WHERE game_id = ${gameId} AND user_email = ${email} AND played_at >= ${todayStart.toISOString()}
  `);
  return (r.rows[0] as Record<string, unknown>)?.cnt as number ?? 0;
}

// ── Public routes ─────────────────────────────────────────────────────────────

router.get("/rewards/games", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  const games = await db.execute(sql`SELECT * FROM reward_games ORDER BY created_at ASC`);

  const result = await Promise.all(games.rows.map(async (g: Record<string, unknown>) => {
    const todayPlays = email ? await getTodayPlays(g.id as string, email) : 0;
    const dailyLimit = g.daily_plays_per_user as number;
    return {
      id: g.id,
      name: g.name,
      description: g.description,
      icon: g.icon,
      enabled: g.enabled,
      creditsMin: g.credits_min,
      creditsMax: g.credits_max,
      dailyPlaysPerUser: dailyLimit,
      todayPlays,
      playsRemaining: Math.max(0, dailyLimit - todayPlays),
    };
  }));
  res.json(result);
});

router.get("/rewards/quiz-today", (_req, res) => {
  const q = getTodayQuiz();
  res.json({ question: q.q, options: q.options });
});

router.get("/rewards/scramble-today", (_req, res) => {
  const s = getTodayScramble();
  res.json({ scrambled: s.scrambled, category: s.category });
});

router.get("/rewards/leaderboard", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT user_email, SUM(credits_earned)::int AS total_credits
    FROM reward_plays
    GROUP BY user_email
    ORDER BY total_credits DESC LIMIT 10
  `);
  res.json(rows.rows);
});

router.get("/rewards/my-stats", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const now = new Date();
  const daysSinceMonday = (now.getDay() + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const [tot, tod, wk] = await Promise.all([
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS total FROM reward_plays WHERE user_email = ${email}`),
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS today FROM reward_plays WHERE user_email = ${email} AND played_at >= ${todayStart.toISOString()}`),
    db.execute(sql`SELECT COALESCE(SUM(credits_earned),0)::int AS week FROM reward_plays WHERE user_email = ${email} AND played_at >= ${weekStart.toISOString()}`),
  ]);
  const weeklyEarned = (wk.rows[0] as Record<string, unknown>)?.week as number ?? 0;
  res.json({
    totalCredits: (tot.rows[0] as Record<string, unknown>)?.total ?? 0,
    todayCredits: (tod.rows[0] as Record<string, unknown>)?.today ?? 0,
    weeklyEarned,
    weeklyCapRemaining: Math.max(0, WEEKLY_CAP_CREDITS - weeklyEarned),
    weeklyCap: WEEKLY_CAP_CREDITS,
  });
});

router.post("/rewards/play", async (req, res) => {
  const { email, gameId, answer } = req.body as { email?: string; gameId?: string; answer?: unknown };
  if (!email || !gameId) { res.status(400).json({ error: "email and gameId required" }); return; }

  const games = await db.execute(sql`SELECT * FROM reward_games WHERE id = ${gameId}`);
  if (games.rows.length === 0) { res.status(404).json({ error: "Game not found" }); return; }
  const game = games.rows[0] as Record<string, unknown>;

  if (!game.enabled) { res.status(403).json({ error: "This game is currently disabled" }); return; }

  const playsToday = await getTodayPlays(gameId, email);
  const dailyLimit = game.daily_plays_per_user as number;
  if (playsToday >= dailyLimit) {
    res.status(429).json({ error: "Daily limit reached for this game. Come back tomorrow!", limitReached: true });
    return;
  }

  const creditsMin = game.credits_min as number;
  const creditsMax = game.credits_max as number;
  let creditsEarned = 0;
  let won = true;
  let message = "";

  switch (gameId) {
    case "daily-checkin": {
      creditsEarned = creditsMax;
      message = `Check-in complete! You earned ${creditsEarned} credits.`;
      break;
    }
    case "spin-wheel": {
      const segments = [creditsMin];
      let cur = creditsMin;
      while (cur + 5 <= creditsMax) { cur += 5; segments.push(cur); }
      creditsEarned = segments[Math.floor(Math.random() * segments.length)];
      message = `You landed on ${creditsEarned} credits!`;
      break;
    }
    case "daily-quiz": {
      const q = getTodayQuiz();
      won = answer === q.answer;
      creditsEarned = won ? creditsMax : 0;
      message = won
        ? `Correct! You earned ${creditsEarned} credits.`
        : `Wrong answer. The correct answer was "${q.options[q.answer]}".`;
      break;
    }
    case "scratch-card": {
      won = Math.random() < 0.7;
      creditsEarned = won ? creditsMin + Math.floor(Math.random() * (creditsMax - creditsMin + 1)) : 0;
      message = won ? `You scratched ${creditsEarned} credits!` : "Better luck next card!";
      break;
    }
    case "word-scramble": {
      const scramble = getTodayScramble();
      const userAnswer = typeof answer === "string" ? answer.toUpperCase().trim() : "";
      won = userAnswer === scramble.word;
      creditsEarned = won ? creditsMax : 0;
      message = won
        ? `Correct! "${scramble.word}" it is! You earned ${creditsEarned} credits.`
        : `Wrong! The word was "${scramble.word}". No credits this time.`;
      break;
    }
    default:
      creditsEarned = creditsMin;
      message = `You earned ${creditsEarned} credits!`;
  }

  const playId = `RP-${randomUUID().slice(0, 8).toUpperCase()}`;
  await db.execute(sql`
    INSERT INTO reward_plays (id, game_id, user_email, credits_earned, played_at)
    VALUES (${playId}, ${gameId}, ${email}, ${creditsEarned}, NOW())
  `);

  if (creditsEarned > 0) {
    const weekEarned = await getWeekEarned(email);
    const weekRemaining = Math.max(0, WEEKLY_CAP_CREDITS - weekEarned);
    if (weekRemaining === 0) {
      res.status(429).json({ error: "Weekly credit cap (150) reached. Resets next Monday!", limitReached: true, weeklyCapReached: true });
      return;
    }
    creditsEarned = Math.min(creditsEarned, weekRemaining);
    await storage.addCredits(email, creditsEarned / 100);
  }

  logger.info({ email, gameId, creditsEarned, won }, "Reward game played");
  const newBalance = await storage.getCredits(email);

  res.json({
    ok: true,
    won,
    creditsEarned,
    message,
    newBalance,
    newBalanceCredits: Math.round(newBalance * 100),
    playsRemaining: Math.max(0, dailyLimit - playsToday - 1),
  });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

router.get("/admin/rewards/games", requireAdmin, async (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const games = await db.execute(sql`SELECT * FROM reward_games ORDER BY created_at ASC`);
  res.json(games.rows);
});

router.patch("/admin/rewards/games/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { enabled, creditsMin, creditsMax, dailyPlaysPerUser } = req.body as {
    enabled?: boolean; creditsMin?: number; creditsMax?: number; dailyPlaysPerUser?: number;
  };
  await db.execute(sql`
    UPDATE reward_games SET
      enabled = COALESCE(${enabled ?? null}, enabled),
      credits_min = COALESCE(${creditsMin ?? null}, credits_min),
      credits_max = COALESCE(${creditsMax ?? null}, credits_max),
      daily_plays_per_user = COALESCE(${dailyPlaysPerUser ?? null}, daily_plays_per_user),
      updated_at = NOW()
    WHERE id = ${id}
  `);
  const updated = await db.execute(sql`SELECT * FROM reward_games WHERE id = ${id}`);
  res.json(updated.rows[0] ?? { error: "not found" });
});

export default router;

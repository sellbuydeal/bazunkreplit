import { Router } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

const TOKEN_POSITIONS = [
  { id: "home-hero",     page: "/",             hint: "The homepage has a hero that hides more than it shows.",      creditValue: 15 },
  { id: "footer",        page: "any",            hint: "Every page shares the same ending — search the very bottom.", creditValue: 10 },
  { id: "browse",        page: "/browse",        hint: "Hunters who browse carefully find more than listings.",        creditValue: 20 },
  { id: "flash-sales",   page: "/flash-sales",   hint: "Lightning deals hide lightning tokens in their hero.",        creditValue: 25 },
  { id: "auctions",      page: "/auctions",      hint: "Sharp eyes on the Auctions page may spot a treasure.",        creditValue: 20 },
  { id: "treasure-page", page: "/treasure-hunt", hint: "The map itself holds the rarest secret of all.",              creditValue: 30 },
];

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

async function seedTodayTokens() {
  const today = todayDateString();
  const existing = await db.execute(sql`SELECT id FROM treasure_tokens WHERE hunt_date = ${today}::date`);
  if (existing.rows.length >= TOKEN_POSITIONS.length) return;
  for (const pos of TOKEN_POSITIONS) {
    const alreadyHasPos = await db.execute(sql`SELECT id FROM treasure_tokens WHERE hunt_date = ${today}::date AND position_id = ${pos.id}`);
    if (alreadyHasPos.rows.length > 0) continue;
    const id = `TT-${randomUUID().slice(0, 8).toUpperCase()}`;
    const code = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
    await db.execute(sql`
      INSERT INTO treasure_tokens (id, hunt_date, position_id, code, page_path, hint, credit_value, created_at)
      VALUES (${id}, ${today}::date, ${pos.id}, ${code}, ${pos.page}, ${pos.hint}, ${pos.creditValue}, NOW())
    `);
  }
}

router.get("/treasure-hunt/today", async (req, res) => {
  await seedTodayTokens();
  const { email } = req.query as Record<string, string>;
  const today = todayDateString();
  const tokens = await db.execute(sql`SELECT * FROM treasure_tokens WHERE hunt_date = ${today}::date ORDER BY credit_value ASC`);

  const rows = await Promise.all(tokens.rows.map(async (t: Record<string, unknown>) => {
    let claimed = false;
    if (email) {
      const c = await db.execute(sql`SELECT id FROM treasure_claims WHERE token_code = ${t["code"] as string} AND user_email = ${email}`);
      claimed = c.rows.length > 0;
    }
    const pos = TOKEN_POSITIONS.find(p => p.id === t["position_id"]);
    return {
      positionId: t["position_id"],
      page: t["page_path"],
      hint: t["hint"],
      creditValue: t["credit_value"],
      claimed,
      label: pos ? getLabelForPosition(pos.id) : "Token",
    };
  }));

  const myCredits = email ? await getUserCredits(email) : 0;
  res.json({ tokens: rows, myCredits, totalTokens: TOKEN_POSITIONS.length });
});

router.get("/treasure-hunt/position/:positionId", async (req, res) => {
  await seedTodayTokens();
  const { positionId } = req.params;
  const { email } = req.query as Record<string, string>;
  const today = todayDateString();
  const result = await db.execute(sql`SELECT * FROM treasure_tokens WHERE hunt_date = ${today}::date AND position_id = ${positionId}`);
  if (result.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const t = result.rows[0] as Record<string, unknown>;
  let claimed = false;
  if (email) {
    const c = await db.execute(sql`SELECT id FROM treasure_claims WHERE token_code = ${t["code"] as string} AND user_email = ${email}`);
    claimed = c.rows.length > 0;
  }
  res.json({ code: t["code"], creditValue: t["credit_value"], claimed });
});

router.post("/treasure-hunt/claim", async (req, res) => {
  const { code, email } = req.body as Record<string, string>;
  if (!code || !email) { res.status(400).json({ error: "code and email required" }); return; }

  const token = await db.execute(sql`SELECT * FROM treasure_tokens WHERE code = ${code}`);
  if (token.rows.length === 0) { res.status(404).json({ error: "Invalid token" }); return; }
  const t = token.rows[0] as Record<string, unknown>;

  const today = todayDateString();
  const tokenDate = (t["hunt_date"] as string).slice(0, 10);
  if (tokenDate !== today) { res.status(410).json({ error: "This token has expired — hunt resets daily!" }); return; }

  const existing = await db.execute(sql`SELECT id FROM treasure_claims WHERE token_code = ${code} AND user_email = ${email}`);
  if (existing.rows.length > 0) { res.status(409).json({ error: "Already claimed", alreadyClaimed: true }); return; }

  const claimId = `TC-${randomUUID().slice(0, 8).toUpperCase()}`;
  const creditValue = t["credit_value"] as number;
  await db.execute(sql`
    INSERT INTO treasure_claims (id, token_code, user_email, credit_value, claimed_at)
    VALUES (${claimId}, ${code}, ${email}, ${creditValue}, NOW())
  `);
  await db.execute(sql`
    INSERT INTO user_hunt_credits (user_email, total_credits, updated_at)
    VALUES (${email}, ${creditValue}, NOW())
    ON CONFLICT (user_email) DO UPDATE SET total_credits = user_hunt_credits.total_credits + ${creditValue}, updated_at = NOW()
  `);
  res.json({ ok: true, creditsEarned: creditValue });
});

router.get("/treasure-hunt/my-credits", async (req, res) => {
  const { email } = req.query as Record<string, string>;
  if (!email) { res.status(400).json({ error: "email required" }); return; }
  const credits = await getUserCredits(email);
  const today = todayDateString();
  const claims = await db.execute(sql`
    SELECT tc.token_code, tc.credit_value, tc.claimed_at, tt.position_id, tt.hint
    FROM treasure_claims tc
    JOIN treasure_tokens tt ON tt.code = tc.token_code
    WHERE tc.user_email = ${email} AND tt.hunt_date = ${today}::date
    ORDER BY tc.claimed_at DESC
  `);
  res.json({ credits, todayClaims: claims.rows });
});

router.get("/treasure-hunt/leaderboard", async (_req, res) => {
  const rows = await db.execute(sql`
    SELECT user_email, total_credits FROM user_hunt_credits
    ORDER BY total_credits DESC LIMIT 10
  `);
  res.json(rows.rows);
});

async function getUserCredits(email: string): Promise<number> {
  const result = await db.execute(sql`SELECT total_credits FROM user_hunt_credits WHERE user_email = ${email}`);
  return result.rows.length > 0 ? (result.rows[0] as Record<string, unknown>)["total_credits"] as number : 0;
}

function getLabelForPosition(id: string): string {
  const labels: Record<string, string> = {
    "home-hero":     "Homepage Hero",
    "footer":        "Site Footer",
    "browse":        "Browse Page",
    "flash-sales":   "Flash Sales",
    "auctions":      "Auctions Page",
    "treasure-page": "Treasure Hunt Page",
  };
  return labels[id] ?? id;
}

export default router;

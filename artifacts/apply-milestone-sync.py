API = "artifacts/api-server/src/"

def edit(path, old, new):
    s = open(path).read()
    if new in s:
        print("already applied:", path); return
    if old not in s:
        raise SystemExit("COULD NOT FIND text to replace in " + path + ":\n" + old[:150])
    open(path, "w").write(s.replace(old, new, 1))
    print("edited:", path)

# 1. New function: work out milestone progress from the data that already exists
M = API + "lib/milestones.ts"
s = open(M).read()
if "syncMilestonesFor" in s:
    print("already applied:", M)
else:
    s += '''
/**
 * Brings a user's milestones up to date from data that already exists, so
 * listings/sales/accounts created BEFORE the triggers were added still count.
 * Called every time the Rewards page loads. Safe to call repeatedly.
 */
export async function syncMilestonesFor(email: string): Promise<void> {
  if (!email) return;
  await refreshSellerMilestones(email);
  const oneTime: Array<[string, ReturnType<typeof sql>]> = [
    ["welcome-bonus", sql`SELECT 1 FROM users WHERE email = ${email}`],
    ["first-listing", sql`SELECT 1 FROM listings WHERE seller_email = ${email}`],
    ["first-flash-sale", sql`SELECT 1 FROM flash_sales WHERE seller_email = ${email}`],
  ];
  for (const [id, exists] of oneTime) {
    try {
      await db.execute(sql`
        INSERT INTO user_milestones (email, milestone_id, progress, completed, claimed, updated_at)
        SELECT ${email}::text, ${id}::text, 1, TRUE, FALSE, NOW()
        WHERE EXISTS (${exists})
        ON CONFLICT (email, milestone_id) DO UPDATE SET
          progress = GREATEST(user_milestones.progress, 1),
          completed = TRUE,
          updated_at = NOW()
      `);
    } catch (err) {
      logger.error({ err, email, id }, "Failed to sync one-time milestone");
    }
  }
}
'''
    open(M, "w").write(s)
    print("edited:", M)

# 2. Rewards page load now syncs first
A = API + "routes/admin.ts"
edit(A,
'import { logger } from "../lib/logger.js";',
'import { logger } from "../lib/logger.js";\nimport { syncMilestonesFor } from "../lib/milestones.js";')
edit(A,
'''router.get("/user/milestones", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
''',
'''router.get("/user/milestones", async (req, res) => {
  try {
    const email = req.query.email as string;
    if (!email) { res.status(400).json({ error: "email required" }); return; }
    await syncMilestonesFor(email);
''')

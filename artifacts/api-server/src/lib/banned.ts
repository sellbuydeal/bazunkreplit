import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

/** True when an admin has suspended this account (users.banned). Fails open on errors. */
export async function isBanned(email: string | null | undefined): Promise<boolean> {
  if (!email) return false;
  try {
    const r = await db.execute(sql`SELECT banned FROM users WHERE email = ${email} LIMIT 1`);
    return (r.rows[0] as { banned?: boolean } | undefined)?.banned === true;
  } catch {
    return false;
  }
}

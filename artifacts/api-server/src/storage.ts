import { eq, sql } from "drizzle-orm";
import { db, usersTable, creditTransactionsTable } from "@workspace/db";

export class Storage {
  async getUser(email: string) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    return user ?? null;
  }

  async upsertUser(email: string, name?: string) {
    // Try inserting as a brand-new user (with 50 welcome credits = £0.50)
    const [inserted] = await db
      .insert(usersTable)
      .values({ id: email, email, name: name ?? null, credits: "0.50" })
      .onConflictDoNothing()
      .returning();
    if (inserted) {
      // Genuinely new user — mark the "Welcome to Bazunk!" milestone complete.
      await this.completeMilestone(email, "welcome-bonus").catch(() => {});
      return inserted;
    }

    // Existing user — just refresh name if supplied
    const [updated] = await db
      .update(usersTable)
      .set({ name: name ?? sql`${usersTable.name}` })
      .where(eq(usersTable.email, email))
      .returning();
    return updated;
  }

  async setStripeCustomerId(email: string, stripeCustomerId: string) {
    await db
      .update(usersTable)
      .set({ stripeCustomerId })
      .where(eq(usersTable.email, email));
  }

  async setStripeAccountId(email: string, stripeAccountId: string) {
    await db
      .update(usersTable)
      .set({ stripeAccountId })
      .where(eq(usersTable.email, email));
  }

  async getStripeAccountId(email: string): Promise<string | null> {
    const [user] = await db
      .select({ stripeAccountId: usersTable.stripeAccountId })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    return user?.stripeAccountId ?? null;
  }

  async getCredits(email: string): Promise<number> {
    const [user] = await db
      .select({ credits: usersTable.credits })
      .from(usersTable)
      .where(eq(usersTable.email, email));
    return user ? parseFloat(user.credits as string) : 0;
  }

  async addCredits(email: string, amount: number): Promise<number> {
    const [updated] = await db
      .update(usersTable)
      .set({ credits: sql`${usersTable.credits} + ${amount}` })
      .where(eq(usersTable.email, email))
      .returning({ credits: usersTable.credits });
    return updated ? parseFloat(updated.credits as string) : 0;
  }

  async hasCreditTransaction(sessionId: string): Promise<boolean> {
    const [tx] = await db
      .select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.id, sessionId));
    return !!tx;
  }

  async recordCreditTransaction(sessionId: string, email: string, creditsAdded: number) {
    await db
      .insert(creditTransactionsTable)
      .values({ id: sessionId, email, creditsAdded: creditsAdded.toString() })
      .onConflictDoNothing();
  }

  /**
   * Marks a milestone as completed (progress = 1, completed = true) for a
   * user. Safe to call repeatedly — it never un-completes a milestone or
   * resets progress once it's done. "claimed" (whether the user has
   * collected the credit reward) is left untouched here; that's only ever
   * set by the existing /api/user/milestones/:id/claim route.
   */
  async completeMilestone(email: string, milestoneId: string) {
    await db.execute(sql`
      INSERT INTO user_milestones (email, milestone_id, progress, completed, claimed, updated_at)
      VALUES (${email}, ${milestoneId}, 1, TRUE, FALSE, NOW())
      ON CONFLICT (email, milestone_id) DO UPDATE
        SET progress = GREATEST(user_milestones.progress, 1),
            completed = TRUE,
            updated_at = NOW()
    `);
  }
}

export const storage = new Storage();

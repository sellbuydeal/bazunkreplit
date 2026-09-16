import { pgTable, text, numeric, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeAccountId: text("stripe_account_id"),
  credits: numeric("credits", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  verificationDate: timestamp("verification_date", { withTimezone: true }),
  diditVerificationId: text("didit_verification_id"),
});

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  creditsAdded: numeric("credits_added", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
export type CreditTransaction = typeof creditTransactionsTable.$inferSelect;

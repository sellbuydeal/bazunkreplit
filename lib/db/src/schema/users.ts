import { pgTable, text, numeric, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  username: text("username"),
  phone: text("phone"),
  addressLine1: text("address_line1"),
  addressLine2: text("address_line2"),
  city: text("city"),
  postcode: text("postcode"),
  country: text("country"),
  notificationPreferences: jsonb("notification_preferences"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
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

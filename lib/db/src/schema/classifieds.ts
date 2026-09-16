import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";

export const classifiedAdsTable = pgTable("classified_ads", {
  id:           serial("id").primaryKey(),
  title:        text("title").notNull(),
  description:  text("description").notNull(),
  category:     text("category").notNull(),
  subcategory:  text("subcategory"),
  type:         text("type").notNull().default("offer"),
  price:        numeric("price", { precision: 10, scale: 2 }),
  priceLabel:   text("price_label"),
  negotiable:   boolean("negotiable").notNull().default(false),
  condition:    text("condition"),
  location:     text("location").notNull(),
  contactName:  text("contact_name").notNull(),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  urgency:      text("urgency"),
  photos:       text("photos"),
  externalLink: text("external_link"),
  status:       text("status").notNull().default("active"),
  expiresAt:    timestamp("expires_at", { withTimezone: true }),
  postedAt:     timestamp("posted_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClassifiedAdRow = typeof classifiedAdsTable.$inferSelect;
export type InsertClassifiedAd = typeof classifiedAdsTable.$inferInsert;

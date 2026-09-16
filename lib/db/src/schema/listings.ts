import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const listingsTable = pgTable("listings", {
  id: serial("id").primaryKey(),
  publicId: text("public_id").unique(),
  title: text("title").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  description: text("description").notNull(),
  condition: text("condition").notNull().default("good"),
  image: text("image"),
  views: integer("views").notNull().default(0),
  watchers: integer("watchers").notNull().default(0),
  status: text("status").notNull().default("active"),
  sellerEmail: text("seller_email").notNull(),
  sellerName: text("seller_name"),
  sellerUsername: text("seller_username"),
  tags: text("tags"),
  extraCategories: text("extra_categories"),
  specifications: text("specifications"),
  currency: text("currency").notNull().default("GBP"),
  priceGbp: numeric("price_gbp", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const listingPromotionsTable = pgTable("listing_promotions", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull(),
  type: text("type").notNull(), // "featured" | "spotlight" | "flash"
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertListingSchema = createInsertSchema(listingsTable).omit({
  id: true,
  views: true,
  watchers: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertListing = z.infer<typeof insertListingSchema>;
export type Listing = typeof listingsTable.$inferSelect;

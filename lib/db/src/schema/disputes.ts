import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const disputes = pgTable("disputes", {
  id:               text("id").primaryKey(),
  orderId:          text("order_id"),
  buyerEmail:       text("buyer_email").notNull(),
  sellerEmail:      text("seller_email"),
  itemTitle:        text("item_title").notNull(),
  reason:           text("reason").notNull(),
  description:      text("description").notNull(),
  status:           text("status").notNull().default("open"),
  resolutionNotes:  text("resolution_notes"),
  refundAmount:     text("refund_amount"),
  adminEmail:       text("admin_email"),
  sellerResponse:   text("seller_response"),
  evidenceUrls:     text("evidence_urls"),
  createdAt:        timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).defaultNow(),
  resolvedAt:       timestamp("resolved_at", { withTimezone: true }),
});

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;

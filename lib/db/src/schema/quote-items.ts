import { pgTable, text, numeric, integer, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const quoteItemsTable = pgTable("quote_items", {
  id: serial("id").primaryKey(),
  quoteId: text("quote_id").notNull(),
  seqNo: integer("seq_no").notNull().default(1),
  description: text("description").notNull().default(""),
  unitPrice: numeric("unit_price", { precision: 15, scale: 2 }).notNull().default("0"),
  qty: numeric("qty", { precision: 10, scale: 2 }).notNull().default("1"),
  notes: text("notes"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuoteItemSchema = createInsertSchema(quoteItemsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertQuoteItem = z.infer<typeof insertQuoteItemSchema>;
export type QuoteItem = typeof quoteItemsTable.$inferSelect;

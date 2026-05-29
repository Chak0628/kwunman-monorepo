import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const expenseMerchantsTable = pgTable("expense_merchants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertExpenseMerchantSchema = createInsertSchema(expenseMerchantsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertExpenseMerchant = z.infer<typeof insertExpenseMerchantSchema>;
export type ExpenseMerchant = typeof expenseMerchantsTable.$inferSelect;

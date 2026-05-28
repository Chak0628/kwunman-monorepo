import { pgTable, text, integer, numeric, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  quoteId: text("quote_id").notNull().unique(),
  date: text("date"),
  location: text("location").notNull().default(""),
  projectItem: text("project_item").notNull().default(""),
  quoteAmount: numeric("quote_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  client: text("client").notNull().default(""),
  clientId: text("client_id").notNull().default(""),
  status: text("status").notNull().default("報價中"),
  depositStatus: text("deposit_status").notNull().default("無訂金"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  invoiceStatus: text("invoice_status").notNull().default("待開單"),
  finalReceived: numeric("final_received", { precision: 15, scale: 2 }).notNull().default("0"),
  balanceStatus: text("balance_status").notNull().default("無"),
  taxQuarterKwunman: text("tax_quarter_kwunman").notNull().default(""),
  taxQuarterGov: text("tax_quarter_gov").notNull().default(""),
  projectType: text("project_type"),
  paymentTerms: text("payment_terms"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;

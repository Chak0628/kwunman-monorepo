import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chemFormsTable = pgTable("chem_forms", {
  id: serial("id").primaryKey(),
  formNo: text("form_no").unique(),
  claimMonth: text("claim_month").notNull().default(""),
  department: text("department").default("鋼結構部"),
  submitterId: integer("submitter_id").notNull(),
  submitterName: text("submitter_name").notNull(),
  totalAmount: numeric("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  bankUsed: text("bank_used"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

export const insertChemFormSchema = createInsertSchema(chemFormsTable).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
  status: true,
  bankUsed: true,
  formNo: true,
});

export type InsertChemForm = z.infer<typeof insertChemFormSchema>;
export type ChemForm = typeof chemFormsTable.$inferSelect;

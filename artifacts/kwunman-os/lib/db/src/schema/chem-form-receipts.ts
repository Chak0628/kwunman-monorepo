import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const chemFormReceiptsTable = pgTable("chem_form_receipts", {
  id: serial("id").primaryKey(),
  chemFormId: integer("chem_form_id").notNull(),
  fileUrl: text("file_url").notNull(),
  fileName: text("file_name").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ChemFormReceipt = typeof chemFormReceiptsTable.$inferSelect;

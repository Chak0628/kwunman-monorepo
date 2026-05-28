import { pgTable, text, serial, numeric, integer } from "drizzle-orm/pg-core";

export const chemFormItemsTable = pgTable("chem_form_items", {
  id: serial("id").primaryKey(),
  chemFormId: integer("chem_form_id").notNull(),
  category: text("category"),
  merchant: text("merchant"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  projectId: text("project_id"),
  itemDate: text("item_date"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type ChemFormItem = typeof chemFormItemsTable.$inferSelect;

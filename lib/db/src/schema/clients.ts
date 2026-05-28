import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  clientId: text("client_id").notNull().unique(),
  company: text("company").notNull(),
  contactPerson: text("contact_person").notNull().default(""),
  department: text("department").notNull().default(""),
  companyPhone: text("company_phone").notNull().default(""),
  mobilePhone: text("mobile_phone").notNull().default(""),
  privatePhone: text("private_phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  contactInfo: text("contact_info").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;

import { pgTable, text, serial, integer, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const payslipsTable = pgTable("payslips", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  year: integer("year").notNull(),
  month: integer("month").notNull(),
  basicSalary: numeric("basic_salary", { precision: 10, scale: 2 }).notNull().default("0"),
  allowances: numeric("allowances", { precision: 10, scale: 2 }).notNull().default("0"),
  overtime: numeric("overtime", { precision: 10, scale: 2 }).notNull().default("0"),
  deductions: numeric("deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  netPay: numeric("net_pay", { precision: 10, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
});

export const insertPayslipSchema = createInsertSchema(payslipsTable).omit({
  id: true,
  issuedAt: true,
});
export type InsertPayslip = z.infer<typeof insertPayslipSchema>;
export type Payslip = typeof payslipsTable.$inferSelect;

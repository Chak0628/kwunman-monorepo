import { pgTable, text, serial, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("員工"),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  isActive: boolean("is_active").notNull().default(true),
  defaultDailyRate: numeric("default_daily_rate", { precision: 10, scale: 2 }),
  defaultMonthlyRate: numeric("default_monthly_rate", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

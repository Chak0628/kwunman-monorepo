import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const schedulesTable = pgTable("schedules", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull(),
  workDate: text("work_date").notNull(),
  location: text("location"),
  projectId: text("project_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleSchema = createInsertSchema(schedulesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSchedule = z.infer<typeof insertScheduleSchema>;
export type Schedule = typeof schedulesTable.$inferSelect;

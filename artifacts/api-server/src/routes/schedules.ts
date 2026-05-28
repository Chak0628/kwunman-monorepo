import { Router } from "express";
import { db } from "@workspace/db";
import { schedulesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth, requireRole, getSession } from "../lib/auth";

const router = Router();

function serializeSchedule(s: typeof schedulesTable.$inferSelect) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/schedules", requireAuth, async (req, res) => {
  const session = getSession(req)!;
  const { employeeId, month } = req.query as { employeeId?: string; month?: string };

  let query = db.select().from(schedulesTable).$dynamic();

  if (session.role === "員工") {
    query = query.where(eq(schedulesTable.employeeId, session.userId));
  } else if (employeeId) {
    query = query.where(eq(schedulesTable.employeeId, Number(employeeId)));
  }

  if (month) {
    query = query.where(sql`${schedulesTable.workDate} LIKE ${month + "-%"}`);
  }

  const rows = await query.orderBy(schedulesTable.workDate);
  res.json(rows.map(serializeSchedule));
});

router.post("/schedules", requireRole("管理者", "參與者"), async (req, res) => {
  const { employeeId, workDate, location, projectId, notes } = req.body as {
    employeeId: number;
    workDate: string;
    location?: string;
    projectId?: string;
    notes?: string;
  };

  const [inserted] = await db
    .insert(schedulesTable)
    .values({ employeeId, workDate, location: location ?? null, projectId: projectId ?? null, notes: notes ?? null })
    .returning();

  res.status(201).json(serializeSchedule(inserted!));
});

router.patch("/schedules/:scheduleId", requireRole("管理者", "參與者"), async (req, res) => {
  const scheduleId = Number(req.params["scheduleId"]);
  const { workDate, location, projectId, notes } = req.body as {
    workDate?: string;
    location?: string;
    projectId?: string;
    notes?: string;
  };

  const updates: Partial<typeof schedulesTable.$inferInsert> = {};
  if (workDate !== undefined) updates.workDate = workDate;
  if (location !== undefined) updates.location = location;
  if (projectId !== undefined) updates.projectId = projectId;
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db
    .update(schedulesTable)
    .set(updates)
    .where(eq(schedulesTable.id, scheduleId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "排班記錄不存在" });
    return;
  }
  res.json(serializeSchedule(updated));
});

router.delete("/schedules/:scheduleId", requireRole("管理者"), async (req, res) => {
  const scheduleId = Number(req.params["scheduleId"]);
  await db.delete(schedulesTable).where(eq(schedulesTable.id, scheduleId));
  res.status(204).send();
});

export default router;

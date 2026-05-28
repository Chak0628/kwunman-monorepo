import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole, getSession } from "../lib/auth";

const router = Router();

function serializeUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...rest } = u;
  return {
    ...rest,
    defaultDailyRate: rest.defaultDailyRate !== null ? Number(rest.defaultDailyRate) : null,
    defaultMonthlyRate: rest.defaultMonthlyRate !== null ? Number(rest.defaultMonthlyRate) : null,
    createdAt: rest.createdAt.toISOString(),
  };
}

router.get("/users", requireRole("管理者", "參與者"), async (req, res) => {
  const rows = await db.select().from(usersTable).orderBy(usersTable.id);
  res.json(rows.map(serializeUser));
});

router.post("/users", requireRole("管理者"), async (req, res) => {
  const { username, password, role, fullName, phone } = req.body as {
    username: string;
    password: string;
    role: string;
    fullName: string;
    phone?: string;
  };

  if (!username || !password || !role || !fullName) {
    res.status(400).json({ error: "缺少必填欄位" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [inserted] = await db
    .insert(usersTable)
    .values({ username, passwordHash, role, fullName, phone: phone ?? null })
    .returning();

  res.status(201).json(serializeUser(inserted!));
});

router.patch("/users/:userId", requireRole("管理者"), async (req, res) => {
  const userId = Number(req.params["userId"]);
  const { username, role, fullName, phone, isActive, password, defaultDailyRate, defaultMonthlyRate } = req.body as {
    username?: string;
    role?: string;
    fullName?: string;
    phone?: string;
    isActive?: boolean;
    password?: string;
    defaultDailyRate?: number | null;
    defaultMonthlyRate?: number | null;
  };

  const session = getSession(req);
  if (session && session.userId === userId && isActive === false) {
    res.status(400).json({ error: "不能停用自己的帳戶" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (username !== undefined) updates.username = username;
  if (role !== undefined) updates.role = role;
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (isActive !== undefined) updates.isActive = isActive;
  if (password) updates.passwordHash = await bcrypt.hash(password, 10);
  if (defaultDailyRate !== undefined) updates.defaultDailyRate = defaultDailyRate !== null ? String(defaultDailyRate) : null;
  if (defaultMonthlyRate !== undefined) updates.defaultMonthlyRate = defaultMonthlyRate !== null ? String(defaultMonthlyRate) : null;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "用戶不存在" });
    return;
  }
  res.json(serializeUser(updated));
});

router.delete("/users/:userId", requireRole("管理者"), async (req, res) => {
  const userId = Number(req.params["userId"]);
  const session = getSession(req);
  if (session && session.userId === userId) {
    res.status(400).json({ error: "不能刪除自己的帳戶" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, userId));
  res.status(204).send();
});

export default router;

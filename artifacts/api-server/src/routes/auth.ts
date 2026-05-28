import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSession, setSession, clearSession } from "../lib/auth";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    res.status(400).json({ error: "請輸入用戶名和密碼" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "用戶名或密碼錯誤" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "用戶名或密碼錯誤" });
    return;
  }

  setSession(res, {
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    username: user.username,
  });

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
  });
});

router.post("/auth/logout", (req, res) => {
  clearSession(res);
  res.status(204).send();
});

router.get("/auth/me", async (req, res) => {
  const session = getSession(req);
  if (!session) {
    res.status(401).json({ error: "未登入" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, session.userId))
    .limit(1);

  if (!user || !user.isActive) {
    clearSession(res);
    res.status(401).json({ error: "未登入" });
    return;
  }

  res.json({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
  });
});

export default router;

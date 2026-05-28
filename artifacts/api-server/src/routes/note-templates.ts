import { Router } from "express";
import { db } from "@workspace/db";
import { noteTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../lib/auth";

const router = Router();

router.get("/note-templates", requireAuth, async (_req, res) => {
  const rows = await db.select().from(noteTemplatesTable).orderBy(noteTemplatesTable.sortOrder, noteTemplatesTable.id);
  res.json(rows);
});

router.post("/note-templates", requireRole("管理者"), async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const [inserted] = await db.insert(noteTemplatesTable).values({
    code: body.code as string,
    title: body.title as string,
    content: body.content as string,
    sortOrder: Number(body.sortOrder ?? 0),
  }).returning();
  res.status(201).json(inserted);
});

router.put("/note-templates/:templateId", requireRole("管理者"), async (req, res) => {
  const templateId = parseInt(String(req.params.templateId), 10);
  const body = req.body as Record<string, unknown>;
  const updates: Record<string, unknown> = {};
  if ("code" in body) updates.code = body.code;
  if ("title" in body) updates.title = body.title;
  if ("content" in body) updates.content = body.content;
  if ("sortOrder" in body) updates.sortOrder = Number(body.sortOrder);
  const [updated] = await db.update(noteTemplatesTable).set(updates as any).where(eq(noteTemplatesTable.id, templateId)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/note-templates/:templateId", requireRole("管理者"), async (req, res) => {
  const templateId = parseInt(String(req.params.templateId), 10);
  await db.delete(noteTemplatesTable).where(eq(noteTemplatesTable.id, templateId));
  res.status(204).send();
});

export default router;

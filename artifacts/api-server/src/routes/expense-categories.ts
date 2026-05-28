import { Router } from "express";
import { db } from "@workspace/db";
import { expenseCategoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/expense-categories", async (_req, res) => {
  const rows = await db.select().from(expenseCategoriesTable).orderBy(expenseCategoriesTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/expense-categories", async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [inserted] = await db.insert(expenseCategoriesTable).values({ name: name.trim() }).returning();
  res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
});

router.patch("/expense-categories/:categoryId", async (req, res) => {
  const id = parseInt(req.params.categoryId, 10);
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [updated] = await db.update(expenseCategoriesTable)
    .set({ name: name.trim() })
    .where(eq(expenseCategoriesTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/expense-categories/:categoryId", async (req, res) => {
  const id = parseInt(req.params.categoryId, 10);
  await db.delete(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, id));
  res.status(204).send();
});

export default router;

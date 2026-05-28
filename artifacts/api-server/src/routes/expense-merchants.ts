import { Router } from "express";
import { db } from "@workspace/db";
import { expenseMerchantsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/expense-merchants", async (_req, res) => {
  const rows = await db.select().from(expenseMerchantsTable).orderBy(expenseMerchantsTable.name);
  res.json(rows.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

router.post("/expense-merchants", async (req, res) => {
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [inserted] = await db.insert(expenseMerchantsTable).values({ name: name.trim() }).returning();
  res.status(201).json({ ...inserted, createdAt: inserted.createdAt.toISOString() });
});

router.patch("/expense-merchants/:merchantId", async (req, res) => {
  const id = parseInt(req.params.merchantId, 10);
  const { name } = req.body as { name: string };
  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [updated] = await db.update(expenseMerchantsTable)
    .set({ name: name.trim() })
    .where(eq(expenseMerchantsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.delete("/expense-merchants/:merchantId", async (req, res) => {
  const id = parseInt(req.params.merchantId, 10);
  await db.delete(expenseMerchantsTable).where(eq(expenseMerchantsTable.id, id));
  res.status(204).send();
});

export default router;

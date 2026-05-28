import { Router } from "express";
import { db } from "@workspace/db";
import { expensesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

function serializeExpense(e: typeof expensesTable.$inferSelect) {
  return {
    ...e,
    amount: Number(e.amount),
    submittedAt: e.submittedAt.toISOString(),
    updatedAt: e.updatedAt ? e.updatedAt.toISOString() : null,
  };
}

router.get("/expenses", async (req, res) => {
  const { status, projectId } = req.query as Record<string, string>;
  const conditions = [];
  if (status) conditions.push(eq(expensesTable.status, status));
  if (projectId) conditions.push(eq(expensesTable.projectId, projectId));

  const rows = conditions.length > 0
    ? await db.select().from(expensesTable).where(and(...conditions)).orderBy(expensesTable.submittedAt)
    : await db.select().from(expensesTable).orderBy(expensesTable.submittedAt);

  res.json(rows.map(serializeExpense));
});

router.post("/expenses", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const [inserted] = await db.insert(expensesTable).values({
    projectId: (body.projectId as string) || null,
    description: body.description as string,
    amount: String(body.amount ?? 0),
    category: (body.category as string) || null,
    bank: (body.bank as string) || null,
    merchant: (body.merchant as string) || null,
    receiptUrl: (body.receiptUrl as string) || null,
    status: "pending",
    receiptDate: (body.receiptDate as string) || null,
    notes: (body.notes as string) || null,
  }).returning();
  res.status(201).json(serializeExpense(inserted));
});

router.patch("/expenses/:expenseId", async (req, res) => {
  const expenseId = parseInt(req.params.expenseId, 10);
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of ["status", "description", "category", "bank", "merchant", "receiptUrl", "receiptDate", "notes"]) {
    if (f in body) updates[f] = body[f] ?? null;
  }
  if ("amount" in body && body.amount !== null) {
    updates.amount = String(body.amount);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(expensesTable).set(updates as any).where(eq(expensesTable.id, expenseId)).returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeExpense(updated));
});

router.delete("/expenses/:expenseId", async (req, res) => {
  const expenseId = parseInt(req.params.expenseId, 10);
  await db.delete(expensesTable).where(eq(expensesTable.id, expenseId));
  res.status(204).send();
});

export default router;

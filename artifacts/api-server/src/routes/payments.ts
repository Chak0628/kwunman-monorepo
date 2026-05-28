import { Router } from "express";
import { db } from "@workspace/db";
import { paymentsTable, projectsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

function serializePayment(p: typeof paymentsTable.$inferSelect) {
  return {
    ...p,
    amount: Number(p.amount),
    createdAt: p.createdAt.toISOString(),
  };
}

async function recalcFinalReceived(quoteId: string) {
  const result = await db
    .select({ total: sql<string>`COALESCE(SUM(CAST(${paymentsTable.amount} AS NUMERIC)), 0)` })
    .from(paymentsTable)
    .where(eq(paymentsTable.quoteId, quoteId));

  const total = Number(result[0]?.total ?? 0);
  const hasDeposit = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(eq(paymentsTable.quoteId, quoteId))
    .limit(1);

  const [project] = await db
    .select({ quoteAmount: projectsTable.quoteAmount })
    .from(projectsTable)
    .where(eq(projectsTable.quoteId, quoteId));

  const quoteAmount = Number(project?.quoteAmount ?? 0);

  let balanceStatus = "無";
  if (total > 0 && total >= quoteAmount) balanceStatus = "已收齊";
  else if (total > 0) balanceStatus = "待收尾數";

  const depositPayments = await db
    .select({ id: paymentsTable.id })
    .from(paymentsTable)
    .where(eq(paymentsTable.quoteId, quoteId))
    .limit(1);

  const depositRecord = await db
    .select({ id: paymentsTable.id, paymentDate: paymentsTable.paymentDate })
    .from(paymentsTable)
    .where(eq(paymentsTable.quoteId, quoteId))
    .limit(1);

  const firstPaymentDate = depositRecord[0]?.paymentDate ?? null;
  const depositStatus =
    depositPayments.length > 0 && firstPaymentDate
      ? `已收訂金(${firstPaymentDate})`
      : depositPayments.length > 0
      ? "已收訂金"
      : "無訂金";

  await db
    .update(projectsTable)
    .set({
      finalReceived: String(total),
      balanceStatus: balanceStatus as "待收尾數" | "已收齊" | "無",
      depositStatus: hasDeposit.length > 0 ? depositStatus : "無訂金",
      updatedAt: new Date(),
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .where(eq(projectsTable.quoteId, quoteId)) as any;
}

router.get("/payments", async (req, res) => {
  const { quoteId } = req.query as { quoteId?: string };
  if (!quoteId) {
    res.status(400).json({ error: "quoteId required" });
    return;
  }
  const rows = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.quoteId, quoteId))
    .orderBy(paymentsTable.createdAt);
  res.json(rows.map(serializePayment));
});

router.post("/payments", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { quoteId, amount, paymentType, paymentDate, notes } = body as {
    quoteId: string;
    amount: number;
    paymentType: string;
    paymentDate?: string;
    notes?: string;
  };

  const [project] = await db
    .select()
    .from(projectsTable)
    .where(eq(projectsTable.quoteId, quoteId));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const [inserted] = await db
    .insert(paymentsTable)
    .values({
      quoteId,
      amount: String(amount),
      paymentType: paymentType || "其他",
      paymentDate: paymentDate || null,
      notes: notes || null,
    })
    .returning();

  await recalcFinalReceived(quoteId);

  res.status(201).json(serializePayment(inserted!));
});

router.delete("/payments/:paymentId", async (req, res) => {
  const { paymentId } = req.params;
  const id = parseInt(paymentId!, 10);

  const [payment] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.id, id));
  if (!payment) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  await db.delete(paymentsTable).where(eq(paymentsTable.id, id));
  await recalcFinalReceived(payment.quoteId);

  res.status(204).send();
});

export default router;

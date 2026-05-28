import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable, expensesTable } from "@workspace/db";
import { eq, and, or, sum, count, sql } from "drizzle-orm";

const router = Router();

router.get("/dashboard/summary", async (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const q = Math.ceil(month / 3);
  const currentKwunmanQ = `${year} Q${q}`;

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;

  const [activeThisMonth] = await db
    .select({ c: count() })
    .from(projectsTable)
    .where(
      sql`${projectsTable.status} NOT IN ('已完成', '不成功', '報價中')`
    );

  const [pendingExpenses] = await db
    .select({ total: sum(expensesTable.amount) })
    .from(expensesTable)
    .where(eq(expensesTable.status, "pending"));

  const [completedThisQ] = await db
    .select({ c: count() })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.status, "已完成"),
        eq(projectsTable.taxQuarterKwunman, currentKwunmanQ)
      )
    );

  const [activeQuotes] = await db
    .select({ c: count(), total: sum(projectsTable.quoteAmount) })
    .from(projectsTable)
    .where(eq(projectsTable.status, "報價中"));

  const [pendingBalance] = await db
    .select({ c: count() })
    .from(projectsTable)
    .where(
      or(
        eq(projectsTable.status, "待收尾期"),
        and(
          eq(projectsTable.status, "已完成"),
          eq(projectsTable.balanceStatus, "待收尾數")
        )
      )
    );

  res.json({
    activeProjectsThisMonth: Number(activeThisMonth?.c ?? 0),
    pendingExpensesTotal: Number(pendingExpenses?.total ?? 0),
    completedThisQuarter: Number(completedThisQ?.c ?? 0),
    activeQuotesCount: Number(activeQuotes?.c ?? 0),
    activeQuotesTotal: Number(activeQuotes?.total ?? 0),
    pendingBalanceCount: Number(pendingBalance?.c ?? 0),
  });
});

router.get("/dashboard/pending-balance", async (req, res) => {
  const rows = await db
    .select()
    .from(projectsTable)
    .where(
      or(
        eq(projectsTable.status, "待收尾期"),
        and(
          eq(projectsTable.status, "已完成"),
          eq(projectsTable.balanceStatus, "待收尾數")
        )
      )
    )
    .orderBy(projectsTable.date);

  res.json(rows.map(serializeProject));
});

function serializeProject(p: typeof projectsTable.$inferSelect) {
  return {
    ...p,
    quoteAmount: Number(p.quoteAmount),
    finalReceived: Number(p.finalReceived),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export default router;

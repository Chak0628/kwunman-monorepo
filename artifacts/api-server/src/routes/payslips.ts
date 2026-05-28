import { Router } from "express";
import { db } from "@workspace/db";
import { payslipsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, getSession } from "../lib/auth";

const router = Router();

function serializePayslip(p: typeof payslipsTable.$inferSelect) {
  return {
    ...p,
    basicSalary: Number(p.basicSalary),
    allowances: Number(p.allowances),
    overtime: Number(p.overtime),
    deductions: Number(p.deductions),
    netPay: Number(p.netPay),
    issuedAt: p.issuedAt.toISOString(),
  };
}

router.get("/payslips", requireAuth, async (req, res) => {
  const session = getSession(req)!;
  const { employeeId, year } = req.query as { employeeId?: string; year?: string };

  let query = db.select().from(payslipsTable).$dynamic();

  if (session.role === "員工") {
    query = query.where(eq(payslipsTable.employeeId, session.userId));
  } else if (employeeId) {
    query = query.where(eq(payslipsTable.employeeId, Number(employeeId)));
  }

  if (year) {
    query = query.where(eq(payslipsTable.year, Number(year)));
  }

  const rows = await query.orderBy(payslipsTable.year, payslipsTable.month);
  res.json(rows.map(serializePayslip));
});

router.post("/payslips", requireRole("管理者", "參與者"), async (req, res) => {
  const { employeeId, year, month, basicSalary, allowances, overtime, deductions, netPay, notes } =
    req.body as {
      employeeId: number;
      year: number;
      month: number;
      basicSalary: number;
      allowances?: number;
      overtime?: number;
      deductions?: number;
      netPay: number;
      notes?: string;
    };

  const [inserted] = await db
    .insert(payslipsTable)
    .values({
      employeeId,
      year,
      month,
      basicSalary: String(basicSalary),
      allowances: String(allowances ?? 0),
      overtime: String(overtime ?? 0),
      deductions: String(deductions ?? 0),
      netPay: String(netPay),
      notes: notes ?? null,
    })
    .returning();

  res.status(201).json(serializePayslip(inserted!));
});

router.get("/payslips/:payslipId", requireAuth, async (req, res) => {
  const session = getSession(req)!;
  const payslipId = Number(req.params["payslipId"]);

  const [row] = await db
    .select()
    .from(payslipsTable)
    .where(eq(payslipsTable.id, payslipId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "糧單不存在" });
    return;
  }

  if (session.role === "員工" && row.employeeId !== session.userId) {
    res.status(403).json({ error: "權限不足" });
    return;
  }

  res.json(serializePayslip(row));
});

router.delete("/payslips/:payslipId", requireRole("管理者"), async (req, res) => {
  const payslipId = Number(req.params["payslipId"]);
  await db.delete(payslipsTable).where(eq(payslipsTable.id, payslipId));
  res.status(204).send();
});

export default router;

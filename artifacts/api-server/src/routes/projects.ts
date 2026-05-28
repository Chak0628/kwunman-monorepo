import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, and, sql, getTableColumns } from "drizzle-orm";
import { getTaxQuarterKwunman, getTaxQuarterGov } from "../lib/quarter";

const router = Router();

function serializeProject(p: typeof projectsTable.$inferSelect & { totalPaid?: string | null }) {
  return {
    ...p,
    quoteAmount: Number(p.quoteAmount),
    finalReceived: Number(p.finalReceived),
    totalPaid: Number(p.totalPaid ?? 0),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function parseFirstInstallmentPct(paymentTerms: string | null | undefined): number | null {
  if (!paymentTerms) return null;
  const firstLine = paymentTerms.split("\n").find(l => l.trim());
  if (!firstLine) return null;
  const m = firstLine.match(/(\d+)%/);
  return m ? parseInt(m[1], 10) : null;
}

function applyChainClear(data: Record<string, unknown>, existing?: typeof projectsTable.$inferSelect) {
  if (data["status"] === "不成功") {
    data["finalReceived"] = "0";
    data["depositStatus"] = "無";
    data["startDate"] = null;
    data["endDate"] = null;
    data["invoiceStatus"] = "待開單";
    data["balanceStatus"] = "無";
  }
  // 報價中: no money received yet — zero out financials
  if (data["status"] === "報價中") {
    data["finalReceived"] = "0";
    data["depositStatus"] = "無訂金";
    data["balanceStatus"] = "無";
  }
  // Auto-compute deposit amount when depositStatus changes to 有訂金 and finalReceived is not explicitly set
  if (
    data["depositStatus"] === "有訂金" &&
    (data["finalReceived"] === undefined || data["finalReceived"] === "0" || data["finalReceived"] === 0) &&
    existing
  ) {
    const pct = parseFirstInstallmentPct(
      (data["paymentTerms"] as string | undefined) ?? existing.paymentTerms
    );
    if (pct !== null) {
      const quoteAmt = Number((data["quoteAmount"] as string | undefined) ?? existing.quoteAmount);
      const depositAmt = quoteAmt * pct / 100;
      data["finalReceived"] = String(depositAmt);
    }
  }
  return data;
}

router.get("/projects", async (req, res) => {
  const { status, taxView, quarter, client, search } = req.query as Record<string, string>;

  const cols = getTableColumns(projectsTable);
  let query = db
    .select({
      ...cols,
      totalPaid: sql<string>`COALESCE((SELECT SUM(p.amount) FROM payments p WHERE REPLACE(p.quote_id, '#', '') = ${projectsTable.quoteId}), 0)`,
    })
    .from(projectsTable)
    .$dynamic();
  const conditions = [];

  if (status) conditions.push(eq(projectsTable.status, status));

  if (quarter) {
    if (taxView === "gov") {
      conditions.push(eq(projectsTable.taxQuarterGov, quarter));
    } else {
      conditions.push(eq(projectsTable.taxQuarterKwunman, quarter));
    }
  }
  if (client) conditions.push(eq(projectsTable.client, client));
  if (search) {
    const s = `%${search}%`;
    conditions.push(
      sql`(${projectsTable.quoteId} ILIKE ${s} OR ${projectsTable.location} ILIKE ${s} OR ${projectsTable.projectItem} ILIKE ${s} OR ${projectsTable.client} ILIKE ${s})`
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  const rows = await query.orderBy(projectsTable.id);
  res.json(rows.map(serializeProject));
});

router.get("/projects/next-id", async (req, res) => {
  const rows = await db.select({ quoteId: projectsTable.quoteId }).from(projectsTable);
  let maxNum = 0;
  for (const row of rows) {
    const match = row.quoteId.match(/^#?Q?(\d+)/i);
    if (match) {
      const n = parseInt(match[1]!, 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const next = maxNum + 1;
  res.json({ nextId: `Q${String(next).padStart(3, "0")}` });
});

router.get("/projects/quarterly-stats", async (req, res) => {
  const { taxView } = req.query as { taxView: string };
  const quarterField = taxView === "gov" ? projectsTable.taxQuarterGov : projectsTable.taxQuarterKwunman;

  const rows = await db
    .select({
      quarter: quarterField,
      totalReceived: sql<string>`COALESCE(SUM(CAST(${projectsTable.finalReceived} AS NUMERIC)), 0)`,
      totalQuoted: sql<string>`COALESCE(SUM(CAST(${projectsTable.quoteAmount} AS NUMERIC)), 0)`,
      projectCount: sql<string>`COUNT(*)`,
      completedCount: sql<string>`SUM(CASE WHEN ${projectsTable.status} = '已完成' THEN 1 ELSE 0 END)`,
    })
    .from(projectsTable)
    .where(sql`${quarterField} != ''`)
    .groupBy(quarterField)
    .orderBy(quarterField);

  res.json(rows.map((r) => ({
    quarter: r.quarter,
    totalReceived: Number(r.totalReceived),
    totalQuoted: Number(r.totalQuoted),
    projectCount: Number(r.projectCount),
    completedCount: Number(r.completedCount),
  })));
});

router.get("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const [row] = await db.select().from(projectsTable).where(eq(projectsTable.quoteId, projectId!));
  if (!row) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeProject(row));
});

router.post("/projects", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const now = new Date();

  let quoteId = body["quoteId"] as string | undefined;
  if (!quoteId) {
    const rows = await db.select({ quoteId: projectsTable.quoteId }).from(projectsTable);
    let maxNum = 100;
    for (const row of rows) {
      const match = row.quoteId.match(/^#?(\d+)/);
      if (match) {
        const n = parseInt(match[1]!, 10);
        if (n > maxNum) maxNum = n;
      }
    }
    quoteId = `#${maxNum + 1}`;
  }

  const date = (body["date"] as string) || now.toISOString().split("T")[0]!;

  const data: Record<string, unknown> = {
    quoteId,
    date,
    location: (body["location"] as string) || "",
    projectItem: (body["projectItem"] as string) || "",
    quoteAmount: String(body["quoteAmount"] ?? 0),
    client: (body["client"] as string) || "",
    clientId: (body["clientId"] as string) || "",
    status: (body["status"] as string) || "報價中",
    depositStatus: (body["depositStatus"] as string) || "無訂金",
    startDate: (body["startDate"] as string) || null,
    endDate: (body["endDate"] as string) || null,
    invoiceStatus: (body["invoiceStatus"] as string) || "待開單",
    finalReceived: String(body["finalReceived"] ?? 0),
    balanceStatus: (body["balanceStatus"] as string) || "無",
    taxQuarterKwunman: getTaxQuarterKwunman(date),
    taxQuarterGov: getTaxQuarterGov(date),
    paymentTerms: (body["paymentTerms"] as string) || null,
    notes: (body["notes"] as string) || null,
    createdAt: now,
    updatedAt: now,
  };

  applyChainClear(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [inserted] = await db.insert(projectsTable).values(data as any).returning();
  res.status(201).json(serializeProject(inserted!));
});

router.patch("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  const body = req.body as Record<string, unknown>;

  const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.quoteId, projectId!));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() };

  const fields = ["date", "location", "projectItem", "quoteAmount", "client", "clientId",
    "status", "depositStatus", "startDate", "endDate", "invoiceStatus",
    "finalReceived", "balanceStatus", "paymentTerms", "notes"];

  for (const f of fields) {
    if (f in body) {
      if (f === "quoteAmount" || f === "finalReceived") {
        updates[f] = String(body[f] ?? 0);
      } else {
        updates[f] = body[f];
      }
    }
  }

  if (updates["date"] && typeof updates["date"] === "string") {
    updates["taxQuarterKwunman"] = getTaxQuarterKwunman(updates["date"]);
    updates["taxQuarterGov"] = getTaxQuarterGov(updates["date"]);
  }

  applyChainClear(updates, existing);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(projectsTable).set(updates as any).where(eq(projectsTable.quoteId, projectId!)).returning();
  res.json(serializeProject(updated!));
});

router.delete("/projects/:projectId", async (req, res) => {
  const { projectId } = req.params;
  await db.delete(projectsTable).where(eq(projectsTable.quoteId, projectId!));
  res.status(204).send();
});

router.post("/projects/:projectId/mark-received", async (req, res) => {
  const { projectId } = req.params;
  const body = req.body as { receivedDate?: string; finalReceived?: number };

  const [existing] = await db.select().from(projectsTable).where(eq(projectsTable.quoteId, projectId!));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(projectsTable).set({
    status: "已完成",
    balanceStatus: "已收齊",
    finalReceived: String(body.finalReceived ?? existing.quoteAmount),
    endDate: body.receivedDate || existing.endDate || null,
    updatedAt: new Date(),
  } as any).where(eq(projectsTable.quoteId, projectId!)).returning();

  res.json(serializeProject(updated!));
});

export default router;

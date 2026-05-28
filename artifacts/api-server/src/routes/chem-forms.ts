import { Router } from "express";
import { db } from "@workspace/db";
import { chemFormsTable, chemFormItemsTable, chemFormReceiptsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router = Router();

function serializeForm(f: typeof chemFormsTable.$inferSelect) {
  return {
    ...f,
    totalAmount: Number(f.totalAmount),
    createdAt: f.createdAt.toISOString(),
    approvedAt: f.approvedAt ? f.approvedAt.toISOString() : null,
  };
}

function serializeItem(i: typeof chemFormItemsTable.$inferSelect) {
  return { ...i, amount: Number(i.amount) };
}

function serializeReceipt(r: typeof chemFormReceiptsTable.$inferSelect) {
  return { ...r, createdAt: r.createdAt.toISOString() };
}

async function getNextFormNo(): Promise<string> {
  const last = await db
    .select({ formNo: chemFormsTable.formNo })
    .from(chemFormsTable)
    .orderBy(desc(chemFormsTable.id))
    .limit(1);
  if (last.length === 0 || !last[0].formNo) return "W001";
  const num = parseInt(last[0].formNo.replace(/\D/g, ""), 10) || 0;
  return `W${String(num + 1).padStart(3, "0")}`;
}

router.get("/chem-forms", requireAuth, async (req, res) => {
  const { status, submitterId } = req.query as Record<string, string>;
  const conditions = [];
  if (status) conditions.push(eq(chemFormsTable.status, status));
  if (submitterId) conditions.push(eq(chemFormsTable.submitterId, parseInt(submitterId, 10)));

  const rows = conditions.length > 0
    ? await db.select().from(chemFormsTable).where(and(...conditions)).orderBy(desc(chemFormsTable.id))
    : await db.select().from(chemFormsTable).orderBy(desc(chemFormsTable.id));

  res.json(rows.map(serializeForm));
});

router.get("/chem-forms/:chemFormId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.chemFormId), 10);
  const [form] = await db.select().from(chemFormsTable).where(eq(chemFormsTable.id, id));
  if (!form) { res.status(404).json({ error: "Not found" }); return; }

  const items = await db.select().from(chemFormItemsTable)
    .where(eq(chemFormItemsTable.chemFormId, id))
    .orderBy(chemFormItemsTable.sortOrder, chemFormItemsTable.id);

  const receipts = await db.select().from(chemFormReceiptsTable)
    .where(eq(chemFormReceiptsTable.chemFormId, id))
    .orderBy(chemFormReceiptsTable.createdAt);

  res.json({
    ...serializeForm(form),
    items: items.map(serializeItem),
    receipts: receipts.map(serializeReceipt),
  });
});

router.post("/chem-forms", requireAuth, async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const formNo = await getNextFormNo();

  const itemsInput = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
  const totalAmount = itemsInput.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const [inserted] = await db.insert(chemFormsTable).values({
    formNo,
    claimMonth: (body.claimMonth as string) || "",
    department: (body.department as string) || "鋼結構部",
    submitterId: Number(body.submitterId),
    submitterName: body.submitterName as string,
    totalAmount: String(totalAmount),
    status: "pending",
  }).returning();

  if (itemsInput.length > 0) {
    await db.insert(chemFormItemsTable).values(
      itemsInput.map((item, idx) => ({
        chemFormId: inserted.id,
        category: (item.category as string) || null,
        merchant: (item.merchant as string) || null,
        amount: String(Number(item.amount) || 0),
        projectId: (item.projectId as string) || null,
        itemDate: (item.itemDate as string) || null,
        sortOrder: idx,
      }))
    );
  }

  res.status(201).json(serializeForm(inserted));
});

router.patch("/chem-forms/:chemFormId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.chemFormId), 10);
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  if ("status" in body && body.status) {
    updates.status = body.status;
    if (body.status === "approved") updates.approvedAt = new Date();
  }
  if ("bankUsed" in body) updates.bankUsed = body.bankUsed || null;
  if ("claimMonth" in body && body.claimMonth) updates.claimMonth = body.claimMonth;
  if ("department" in body && body.department) updates.department = body.department;

  const [updated] = await db.update(chemFormsTable)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(chemFormsTable.id, id))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serializeForm(updated));
});

router.delete("/chem-forms/:chemFormId", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.chemFormId), 10);
  await db.delete(chemFormReceiptsTable).where(eq(chemFormReceiptsTable.chemFormId, id));
  await db.delete(chemFormItemsTable).where(eq(chemFormItemsTable.chemFormId, id));
  await db.delete(chemFormsTable).where(eq(chemFormsTable.id, id));
  res.status(204).send();
});

router.get("/chem-forms/:chemFormId/receipts", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.chemFormId), 10);
  const rows = await db.select().from(chemFormReceiptsTable)
    .where(eq(chemFormReceiptsTable.chemFormId, id))
    .orderBy(chemFormReceiptsTable.createdAt);
  res.json(rows.map(serializeReceipt));
});

router.post("/chem-forms/:chemFormId/receipts", requireAuth, async (req, res) => {
  const id = parseInt(String(req.params.chemFormId), 10);
  const { fileUrl, fileName } = req.body as { fileUrl: string; fileName: string };
  const [inserted] = await db.insert(chemFormReceiptsTable).values({
    chemFormId: id,
    fileUrl,
    fileName: fileName || "",
  }).returning();
  res.status(201).json(serializeReceipt(inserted));
});

export default router;

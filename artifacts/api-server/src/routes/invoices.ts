import { Router } from "express";
import { db } from "@workspace/db";
import { invoicesTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

function serialize(inv: typeof invoicesTable.$inferSelect) {
  return {
    ...inv,
    amount: Number(inv.amount),
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

router.get("/invoices/next-no", async (req, res) => {
  const rows = await db.select({ invoiceNo: invoicesTable.invoiceNo }).from(invoicesTable);
  let maxNum = 0;
  for (const row of rows) {
    const match = row.invoiceNo.match(/(\d+)$/);
    if (match) {
      const n = parseInt(match[1]!, 10);
      if (n > maxNum) maxNum = n;
    }
  }
  const year = new Date().getFullYear();
  res.json({ nextNo: `INV-${year}-${String(maxNum + 1).padStart(3, "0")}` });
});

router.get("/invoices", async (req, res) => {
  const { quoteId } = req.query as Record<string, string>;
  const conditions = quoteId ? [eq(invoicesTable.quoteId, quoteId)] : [];
  const rows = conditions.length
    ? await db.select().from(invoicesTable).where(and(...conditions)).orderBy(sql`${invoicesTable.issueDate} DESC`)
    : await db.select().from(invoicesTable).orderBy(sql`${invoicesTable.issueDate} DESC`);
  res.json(rows.map(serialize));
});

router.post("/invoices", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const now = new Date();

  let invoiceNo = body["invoiceNo"] as string | undefined;
  if (!invoiceNo) {
    const rows = await db.select({ invoiceNo: invoicesTable.invoiceNo }).from(invoicesTable);
    let maxNum = 0;
    for (const row of rows) {
      const match = row.invoiceNo.match(/(\d+)$/);
      if (match) {
        const n = parseInt(match[1]!, 10);
        if (n > maxNum) maxNum = n;
      }
    }
    invoiceNo = `INV-${now.getFullYear()}-${String(maxNum + 1).padStart(3, "0")}`;
  }

  const [inserted] = await db.insert(invoicesTable).values({
    invoiceNo,
    quoteId: body["quoteId"] as string,
    issueDate: (body["issueDate"] as string) || now.toISOString().split("T")[0]!,
    dueDate: (body["dueDate"] as string) || null,
    amount: String(body["amount"] ?? 0),
    description: (body["description"] as string) || "",
    status: (body["status"] as string) || "未收",
    notes: (body["notes"] as string) || null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  res.status(201).json(serialize(inserted!));
});

router.patch("/invoices/:invoiceId", async (req, res) => {
  const invoiceId = parseInt(req.params.invoiceId!, 10);
  const body = req.body as Record<string, unknown>;
  const [existing] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const fields = ["issueDate", "dueDate", "amount", "description", "status", "notes"];
  for (const f of fields) {
    if (f in body) {
      updates[f] = f === "amount" ? String(body[f] ?? 0) : body[f];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(invoicesTable).set(updates as any).where(eq(invoicesTable.id, invoiceId)).returning();
  res.json(serialize(updated!));
});

router.delete("/invoices/:invoiceId", async (req, res) => {
  const invoiceId = parseInt(req.params.invoiceId!, 10);
  await db.delete(invoicesTable).where(eq(invoicesTable.id, invoiceId));
  res.status(204).send();
});

export default router;

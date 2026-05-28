import { Router } from "express";
import { db } from "@workspace/db";
import { quoteItemsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function serialize(item: typeof quoteItemsTable.$inferSelect) {
  return {
    ...item,
    unitPrice: Number(item.unitPrice),
    qty: Number(item.qty),
    createdAt: item.createdAt.toISOString(),
  };
}

router.get("/quote-items", async (req, res) => {
  const { quoteId } = req.query as { quoteId?: string };
  if (!quoteId) { res.status(400).json({ error: "quoteId required" }); return; }
  const rows = await db.select().from(quoteItemsTable)
    .where(eq(quoteItemsTable.quoteId, quoteId))
    .orderBy(quoteItemsTable.seqNo);
  res.json(rows.map(serialize));
});

router.post("/quote-items", async (req, res) => {
  const body = req.body as { quoteId: string; seqNo?: number; description: string; unitPrice: number; qty: number; notes?: string; imageUrl?: string };
  const [inserted] = await db.insert(quoteItemsTable).values({
    quoteId: body.quoteId,
    seqNo: body.seqNo ?? 1,
    description: body.description ?? "",
    unitPrice: String(body.unitPrice ?? 0),
    qty: String(body.qty ?? 1),
    notes: body.notes ?? null,
    imageUrl: body.imageUrl ?? null,
  }).returning();
  res.status(201).json(serialize(inserted!));
});

router.patch("/quote-items/:itemId", async (req, res) => {
  const id = parseInt(req.params.itemId!, 10);
  const body = req.body as { description?: string; unitPrice?: number; qty?: number; notes?: string; imageUrl?: string; seqNo?: number };
  const updates: Record<string, unknown> = {};
  if (body.description !== undefined) updates["description"] = body.description;
  if (body.unitPrice !== undefined) updates["unitPrice"] = String(body.unitPrice);
  if (body.qty !== undefined) updates["qty"] = String(body.qty);
  if (body.notes !== undefined) updates["notes"] = body.notes;
  if (body.imageUrl !== undefined) updates["imageUrl"] = body.imageUrl;
  if (body.seqNo !== undefined) updates["seqNo"] = body.seqNo;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(quoteItemsTable).set(updates as any).where(eq(quoteItemsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(serialize(updated));
});

router.delete("/quote-items/:itemId", async (req, res) => {
  const id = parseInt(req.params.itemId!, 10);
  await db.delete(quoteItemsTable).where(eq(quoteItemsTable.id, id));
  res.status(204).send();
});

router.delete("/quote-items", async (req, res) => {
  const { quoteId } = req.query as { quoteId?: string };
  if (!quoteId) { res.status(400).json({ error: "quoteId required" }); return; }
  await db.delete(quoteItemsTable).where(eq(quoteItemsTable.quoteId, quoteId));
  res.status(204).send();
});

export default router;

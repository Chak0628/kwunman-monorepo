import { Router } from "express";
import { db } from "@workspace/db";
import { clientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function serializeClient(c: typeof clientsTable.$inferSelect) {
  return {
    ...c,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/clients", async (req, res) => {
  const rows = await db.select().from(clientsTable).orderBy(clientsTable.clientId);
  res.json(rows.map(serializeClient));
});

router.post("/clients", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const [inserted] = await db.insert(clientsTable).values({
    clientId: body.clientId as string,
    company: body.company as string,
    contactPerson: (body.contactPerson as string) || "",
    department: (body.department as string) || "",
    companyPhone: (body.companyPhone as string) || "",
    mobilePhone: (body.mobilePhone as string) || "",
    privatePhone: (body.privatePhone as string) || "",
    email: (body.email as string) || "",
    address: (body.address as string) || "",
    contactInfo: (body.contactInfo as string) || "",
    notes: (body.notes as string) || "",
  }).returning();
  res.status(201).json(serializeClient(inserted));
});

router.patch("/clients/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const body = req.body as Record<string, unknown>;

  const updates: Record<string, unknown> = {};
  for (const f of [
    "company", "contactPerson", "department",
    "companyPhone", "mobilePhone", "privatePhone",
    "email", "address", "contactInfo", "notes",
  ]) {
    if (f in body && body[f] !== null) updates[f] = body[f];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [updated] = await db.update(clientsTable).set(updates as any).where(eq(clientsTable.clientId, clientId)).returning();

  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeClient(updated));
});

router.delete("/clients/:clientId", async (req, res) => {
  const { clientId } = req.params;
  await db.delete(clientsTable).where(eq(clientsTable.clientId, clientId));
  res.status(204).send();
});

export default router;

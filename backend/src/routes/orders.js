import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyLevel } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const include = {
  supplier: { select: { id: true, name: true } },
  project: { select: { id: true, name: true } },
  items: { include: { material: { select: { id: true, designation: true, unit: true } } } },
};

router.get(
  "/",
  requireCompanyLevel("orders", "VIEW"),
  asyncHandler(async (req, res) => {
    const { supplierId, projectId, status } = req.query;
    const where = { companyId: req.company.id };
    if (supplierId) where.supplierId = supplierId;
    if (projectId) where.projectId = projectId;
    if (status) where.status = status;
    const orders = await prisma.purchaseOrder.findMany({ where, orderBy: { date: "desc" }, include });
    res.json(orders);
  })
);

router.get(
  "/:id",
  requireCompanyLevel("orders", "VIEW"),
  asyncHandler(async (req, res) => {
    const order = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, companyId: req.company.id }, include });
    if (!order) return res.status(404).json({ message: "Bon de commande introuvable" });
    res.json(order);
  })
);

router.post(
  "/",
  requireCompanyLevel("orders", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const items = b.items || [];
    const total = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unitPrice), 0);
    const count = await prisma.purchaseOrder.count({ where: { companyId: req.company.id } });
    const reference = b.reference || `BC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: req.company.id,
        reference,
        supplierId: b.supplierId,
        projectId: b.projectId || null,
        status: b.status || "EN_ATTENTE",
        total,
        date: b.date ? new Date(b.date) : new Date(),
        items: { create: items.map((it) => ({ materialId: it.materialId, quantity: Number(it.quantity), unitPrice: Number(it.unitPrice) })) },
      },
      include,
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "PurchaseOrder", entityId: order.id, ip: req.ip });
    res.status(201).json(order);
  })
);

// Réception => statut LIVREE + entrée en stock
router.patch(
  "/:id/status",
  requireCompanyLevel("orders", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const target = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!target) return res.status(404).json({ message: "Bon de commande introuvable" });
    const { status } = req.body;
    const order = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
      include,
    });
    if (status === "LIVREE") {
      for (const item of order.items) {
        await prisma.material.update({
          where: { id: item.materialId },
          data: { stockAvailable: { increment: item.quantity } },
        });
        await prisma.stockMovement.create({
          data: {
            companyId: req.company.id,
            materialId: item.materialId,
            projectId: order.projectId,
            type: "ENTREE",
            quantity: item.quantity,
            reference: order.reference,
            note: "Réception bon de commande",
          },
        });
      }
    }
    await logActivity({ userId: req.user.id, action: "STATUS", entity: "PurchaseOrder", entityId: order.id, details: status, ip: req.ip });
    res.json(order);
  })
);

router.delete(
  "/:id",
  requireCompanyLevel("orders", "MANAGE"),
  asyncHandler(async (req, res) => {
    const target = await prisma.purchaseOrder.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!target) return res.status(404).json({ message: "Bon de commande introuvable" });
    await prisma.purchaseOrder.delete({ where: { id: req.params.id } });
    res.json({ message: "Bon de commande supprimé" });
  })
);

export default router;

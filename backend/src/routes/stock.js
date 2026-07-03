import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity, notify } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyLevel } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const include = {
  material: { select: { id: true, designation: true, unit: true, reference: true } },
  project: { select: { id: true, name: true } },
};

// Mouvements de stock (entrées / sorties)
router.get(
  "/movements",
  requireCompanyLevel("stock", "VIEW"),
  asyncHandler(async (req, res) => {
    const { materialId, projectId, type } = req.query;
    const where = { companyId: req.company.id };
    if (materialId) where.materialId = materialId;
    if (projectId) where.projectId = projectId;
    if (type) where.type = type;
    const movements = await prisma.stockMovement.findMany({
      where, orderBy: { date: "desc" }, take: 200, include,
    });
    res.json(movements);
  })
);

router.post(
  "/movements",
  requireCompanyLevel("stock", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const qty = Number(b.quantity);
    const material = await prisma.material.findFirst({ where: { id: b.materialId, companyId: req.company.id } });
    if (!material) return res.status(404).json({ message: "Matériau introuvable" });

    if (b.type === "SORTIE" && material.stockAvailable < qty) {
      return res.status(400).json({ message: "Stock insuffisant pour cette sortie" });
    }

    const movement = await prisma.stockMovement.create({
      data: {
        companyId: req.company.id,
        materialId: b.materialId,
        projectId: b.projectId || null,
        type: b.type,
        quantity: qty,
        reference: b.reference,
        note: b.note,
        date: b.date ? new Date(b.date) : new Date(),
      },
      include,
    });

    const updated = await prisma.material.update({
      where: { id: b.materialId },
      data: { stockAvailable: b.type === "ENTREE" ? { increment: qty } : { decrement: qty } },
    });

    if (updated.stockAvailable <= updated.stockMin) {
      await notify({
        userId: req.user.id, type: "STOCK",
        title: "Alerte stock bas",
        message: `${updated.designation}: ${updated.stockAvailable} ${updated.unit} (seuil ${updated.stockMin})`,
      });
    }
    await logActivity({ userId: req.user.id, action: b.type, entity: "Stock", entityId: movement.id, ip: req.ip });
    res.status(201).json(movement);
  })
);

// Valorisation du stock + KPIs
router.get(
  "/valuation",
  requireCompanyLevel("stock", "VIEW"),
  asyncHandler(async (req, res) => {
    const materials = await prisma.material.findMany({ where: { companyId: req.company.id } });
    const totalValue = materials.reduce((s, m) => s + m.stockAvailable * m.unitPrice, 0);
    const lowStock = materials.filter((m) => m.stockAvailable <= m.stockMin);
    const byCategory = {};
    for (const m of materials) {
      byCategory[m.category] = (byCategory[m.category] || 0) + m.stockAvailable * m.unitPrice;
    }
    res.json({
      totalValue,
      itemCount: materials.length,
      lowStockCount: lowStock.length,
      lowStock: lowStock.map((m) => ({ id: m.id, designation: m.designation, stockAvailable: m.stockAvailable, stockMin: m.stockMin, unit: m.unit })),
      byCategory,
    });
  })
);

export default router;

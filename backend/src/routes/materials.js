import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyLevel } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

router.get(
  "/",
  requireCompanyLevel("materials", "VIEW"),
  asyncHandler(async (req, res) => {
    const { category, q, lowStock } = req.query;
    const where = { companyId: req.company.id };
    if (category) where.category = category;
    if (q) where.OR = [
      { designation: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
    ];
    let materials = await prisma.material.findMany({
      where,
      orderBy: { designation: "asc" },
      include: { supplier: { select: { id: true, name: true } } },
    });
    if (lowStock === "true") materials = materials.filter((m) => m.stockAvailable <= m.stockMin);
    res.json(materials);
  })
);

router.get(
  "/:id",
  requireCompanyLevel("materials", "VIEW"),
  asyncHandler(async (req, res) => {
    const material = await prisma.material.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: {
        supplier: true,
        movements: { orderBy: { date: "desc" }, take: 20, include: { project: { select: { name: true } } } },
      },
    });
    if (!material) return res.status(404).json({ message: "Matériau introuvable" });
    res.json(material);
  })
);

router.post(
  "/",
  requireCompanyLevel("materials", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const material = await prisma.material.create({
      data: {
        companyId: req.company.id,
        designation: b.designation,
        reference: b.reference,
        category: b.category,
        unit: b.unit || "u",
        unitPrice: b.unitPrice != null ? Number(b.unitPrice) : 0,
        stockMin: b.stockMin != null ? Number(b.stockMin) : 0,
        stockAvailable: b.stockAvailable != null ? Number(b.stockAvailable) : 0,
        storageZone: b.storageZone,
        photo: b.photo,
        supplierId: b.supplierId || null,
      },
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Material", entityId: material.id, ip: req.ip });
    res.status(201).json(material);
  })
);

router.put(
  "/:id",
  requireCompanyLevel("materials", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.material.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Matériau introuvable" });
    const b = req.body;
    const data = {
      designation: b.designation, reference: b.reference, category: b.category,
      unit: b.unit, storageZone: b.storageZone, photo: b.photo, supplierId: b.supplierId,
    };
    if (b.unitPrice != null) data.unitPrice = Number(b.unitPrice);
    if (b.stockMin != null) data.stockMin = Number(b.stockMin);
    if (b.stockAvailable != null) data.stockAvailable = Number(b.stockAvailable);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const material = await prisma.material.update({ where: { id: req.params.id }, data });
    res.json(material);
  })
);

router.delete(
  "/:id",
  requireCompanyLevel("materials", "MANAGE"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.material.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Matériau introuvable" });
    await prisma.material.delete({ where: { id: req.params.id } });
    res.json({ message: "Matériau supprimé" });
  })
);

export default router;

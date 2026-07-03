import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyLevel } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

router.get(
  "/",
  requireCompanyLevel("suppliers", "VIEW"),
  asyncHandler(async (req, res) => {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.company.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { materials: true, orders: true } } },
    });
    res.json(suppliers);
  })
);

router.get(
  "/:id",
  requireCompanyLevel("suppliers", "VIEW"),
  asyncHandler(async (req, res) => {
    const supplier = await prisma.supplier.findFirst({
      where: { id: req.params.id, companyId: req.company.id },
      include: { materials: true, orders: { orderBy: { date: "desc" }, take: 10 } },
    });
    if (!supplier) return res.status(404).json({ message: "Fournisseur introuvable" });
    res.json(supplier);
  })
);

router.post(
  "/",
  requireCompanyLevel("suppliers", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const supplier = await prisma.supplier.create({
      data: {
        companyId: req.company.id,
        name: b.name, contactName: b.contactName, email: b.email, phone: b.phone, address: b.address,
        ratingDelay: Number(b.ratingDelay) || 0,
        ratingQuality: Number(b.ratingQuality) || 0,
        ratingPrice: Number(b.ratingPrice) || 0,
      },
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Supplier", entityId: supplier.id, ip: req.ip });
    res.status(201).json(supplier);
  })
);

router.put(
  "/:id",
  requireCompanyLevel("suppliers", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Fournisseur introuvable" });
    const b = req.body;
    const data = { name: b.name, contactName: b.contactName, email: b.email, phone: b.phone, address: b.address };
    if (b.ratingDelay != null) data.ratingDelay = Number(b.ratingDelay);
    if (b.ratingQuality != null) data.ratingQuality = Number(b.ratingQuality);
    if (b.ratingPrice != null) data.ratingPrice = Number(b.ratingPrice);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data });
    res.json(supplier);
  })
);

router.delete(
  "/:id",
  requireCompanyLevel("suppliers", "MANAGE"),
  asyncHandler(async (req, res) => {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Fournisseur introuvable" });
    await prisma.supplier.delete({ where: { id: req.params.id } });
    res.json({ message: "Fournisseur supprimé" });
  })
);

export default router;

import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, requireSuperAdmin } from "../middleware/auth.js";
import { companyManageAll } from "../lib/access.js";

const router = Router();
router.use(authenticate, requireSuperAdmin);

const memberInclude = { user: { select: { id: true, accountId: true, firstName: true, lastName: true, email: true } } };

// Recherche d'un compte par Account ID (pour désigner un admin d'entreprise).
router.get(
  "/lookup",
  asyncHandler(async (req, res) => {
    const accountId = (req.query.accountId || "").trim();
    if (!accountId) return res.status(400).json({ message: "Account ID requis" });
    const user = await prisma.user.findUnique({
      where: { accountId },
      select: { id: true, accountId: true, firstName: true, lastName: true, email: true },
    });
    if (!user) return res.status(404).json({ message: "Aucun compte avec cet identifiant" });
    res.json(user);
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const companies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { memberships: true, projects: true } },
        memberships: { where: { isCompanyAdmin: true }, include: memberInclude },
      },
    });
    res.json(companies);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { name, reference } = req.body;
    if (!name || !reference) return res.status(400).json({ message: "Nom et référence requis" });
    const exists = await prisma.company.findUnique({ where: { reference } });
    if (exists) return res.status(409).json({ message: "Cette référence d'entreprise existe déjà" });
    const company = await prisma.company.create({ data: { name, reference, logo: req.body.logo || null } });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Company", entityId: company.id, ip: req.ip });
    res.status(201).json(company);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = { name: b.name, reference: b.reference, logo: b.logo, isActive: b.isActive };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const company = await prisma.company.update({ where: { id: req.params.id }, data });
    res.json(company);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.company.delete({ where: { id: req.params.id } });
    await logActivity({ userId: req.user.id, action: "DELETE", entity: "Company", entityId: req.params.id, ip: req.ip });
    res.json({ message: "Entreprise supprimée" });
  })
);

router.get(
  "/:id/members",
  asyncHandler(async (req, res) => {
    const members = await prisma.companyMembership.findMany({
      where: { companyId: req.params.id },
      include: memberInclude,
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  })
);

// Désigne (ou promeut) un compte comme administrateur de l'entreprise, via son Account ID.
router.post(
  "/:id/admin",
  asyncHandler(async (req, res) => {
    const accountId = (req.body.accountId || "").trim();
    const company = await prisma.company.findUnique({ where: { id: req.params.id } });
    if (!company) return res.status(404).json({ message: "Entreprise introuvable" });
    const user = await prisma.user.findUnique({ where: { accountId } });
    if (!user) return res.status(404).json({ message: "Aucun compte avec cet identifiant" });

    const membership = await prisma.companyMembership.upsert({
      where: { companyId_userId: { companyId: company.id, userId: user.id } },
      create: {
        companyId: company.id, userId: user.id, type: "MAITRE_OUVRAGE",
        isCompanyAdmin: true, companyLevels: companyManageAll(),
      },
      update: { isCompanyAdmin: true, companyLevels: companyManageAll() },
      include: memberInclude,
    });
    await logActivity({ userId: req.user.id, action: "ASSIGN_ADMIN", entity: "Company", entityId: company.id, ip: req.ip });
    res.status(201).json(membership);
  })
);

router.delete(
  "/:id/members/:userId",
  asyncHandler(async (req, res) => {
    await prisma.companyMembership.deleteMany({ where: { companyId: req.params.id, userId: req.params.userId } });
    res.json({ message: "Membre retiré de l'entreprise" });
  })
);

export default router;

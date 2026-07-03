import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyAdmin } from "../middleware/auth.js";
import { companyPreset, projectPreset, companyManageAll, projectManageAll } from "../lib/access.js";

const router = Router();
router.use(authenticate, tenantContext, requireCompanyAdmin);

const userSel = { select: { id: true, accountId: true, firstName: true, lastName: true, email: true, avatar: true } };

// ── Membres de l'entreprise ──
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const members = await prisma.companyMembership.findMany({
      where: { companyId: req.company.id },
      include: { user: userSel },
      orderBy: { createdAt: "asc" },
    });
    res.json(members);
  })
);

// Ajoute un compte existant à l'entreprise via son Account ID.
router.post(
  "/",
  asyncHandler(async (req, res) => {
    const accountId = (req.body.accountId || "").trim();
    const type = req.body.type || "VISITEUR";
    const user = await prisma.user.findUnique({ where: { accountId } });
    if (!user) return res.status(404).json({ message: "Aucun compte avec cet identifiant" });

    const already = await prisma.companyMembership.findUnique({
      where: { companyId_userId: { companyId: req.company.id, userId: user.id } },
    });
    if (already) return res.status(409).json({ message: "Ce compte fait déjà partie de l'entreprise" });

    const membership = await prisma.companyMembership.create({
      data: {
        companyId: req.company.id, userId: user.id, type,
        isCompanyAdmin: !!req.body.isCompanyAdmin,
        companyLevels: req.body.isCompanyAdmin ? companyManageAll() : companyPreset(type),
      },
      include: { user: userSel },
    });
    await logActivity({ userId: req.user.id, action: "ADD_MEMBER", entity: "Company", entityId: req.company.id, ip: req.ip });
    res.status(201).json(membership);
  })
);

// ── Accès par projet (niveaux par module) ──
// NB : ces routes littérales doivent précéder les routes paramétriques "/:userId".
async function assertProjectInCompany(req, projectId) {
  return prisma.project.findFirst({ where: { id: projectId, companyId: req.company.id }, select: { id: true } });
}

router.get(
  "/project-access",
  asyncHandler(async (req, res) => {
    const projectId = req.query.projectId;
    if (!projectId || !(await assertProjectInCompany(req, projectId))) {
      return res.status(404).json({ message: "Projet introuvable" });
    }
    const rows = await prisma.projectAccess.findMany({ where: { projectId }, include: { user: userSel } });
    res.json(rows);
  })
);

router.put(
  "/project-access",
  asyncHandler(async (req, res) => {
    const { userId, projectId, type } = req.body;
    if (!projectId || !(await assertProjectInCompany(req, projectId))) {
      return res.status(404).json({ message: "Projet introuvable" });
    }
    const member = await prisma.companyMembership.findUnique({
      where: { companyId_userId: { companyId: req.company.id, userId } },
      select: { id: true },
    });
    if (!member) return res.status(400).json({ message: "Ce compte n'est pas membre de l'entreprise" });

    const levels = req.body.levels || projectPreset(type);
    const access = await prisma.projectAccess.upsert({
      where: { projectId_userId: { projectId, userId } },
      create: { projectId, userId, type: type || null, levels },
      update: { levels, ...(type !== undefined ? { type } : {}) },
      include: { user: userSel },
    });
    res.json(access);
  })
);

router.delete(
  "/project-access",
  asyncHandler(async (req, res) => {
    const { userId, projectId } = req.query;
    if (!projectId || !(await assertProjectInCompany(req, projectId))) {
      return res.status(404).json({ message: "Projet introuvable" });
    }
    await prisma.projectAccess.deleteMany({ where: { projectId, userId } });
    res.json({ message: "Accès retiré" });
  })
);

// ── Modification / retrait d'un membre (routes paramétriques, en dernier) ──
router.put(
  "/:userId",
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = {};
    if (b.type !== undefined) data.type = b.type;
    if (b.isCompanyAdmin !== undefined) data.isCompanyAdmin = !!b.isCompanyAdmin;
    if (b.companyLevels !== undefined) data.companyLevels = b.companyLevels;
    // Si on change le type sans fournir de niveaux, on applique le préréglage.
    else if (b.type !== undefined) data.companyLevels = companyPreset(b.type);
    if (b.isCompanyAdmin === true) data.companyLevels = companyManageAll();

    const membership = await prisma.companyMembership.update({
      where: { companyId_userId: { companyId: req.company.id, userId: req.params.userId } },
      data,
      include: { user: userSel },
    });
    res.json(membership);
  })
);

router.delete(
  "/:userId",
  asyncHandler(async (req, res) => {
    // Retire les accès aux projets de cette entreprise, puis l'adhésion.
    await prisma.projectAccess.deleteMany({
      where: { userId: req.params.userId, project: { companyId: req.company.id } },
    });
    await prisma.companyMembership.deleteMany({
      where: { companyId: req.company.id, userId: req.params.userId },
    });
    res.json({ message: "Membre retiré de l'entreprise" });
  })
);

export default router;

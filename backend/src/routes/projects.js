import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import {
  authenticate, tenantContext, requireProjectLevel, requireCompanyLevel, requireCompanyAdmin,
  accessibleProjectIds, isCompanyManager,
} from "../middleware/auth.js";
import { projectManageAll } from "../lib/access.js";

const router = Router();
router.use(authenticate, tenantContext);

// Accès (intervenants) d'un projet, avec l'utilisateur.
const accessInclude = {
  access: { include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } } } },
};

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const ids = await accessibleProjectIds(req);
    const { status, q } = req.query;
    const where = { id: { in: ids } };
    if (status) where.status = status;
    if (q) where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { reference: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
    ];
    const projects = await prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        ...accessInclude,
        _count: { select: { reserves: true, documents: true, photos: true, tasks: true, lots: true } },
      },
    });
    res.json(projects);
  })
);

router.get(
  "/:id",
  requireProjectLevel("overview", "VIEW", (req) => req.params.id),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        ...accessInclude,
        lots: { orderBy: { createdAt: "asc" } },
        _count: { select: { reserves: true, documents: true, photos: true, tasks: true, meetings: true, finances: true } },
      },
    });
    if (!project) return res.status(404).json({ message: "Projet introuvable" });
    // Niveaux du demandeur sur ce projet (pour piloter l'UI).
    let myLevels = null;
    if (isCompanyManager(req)) myLevels = projectManageAll();
    else {
      const a = await prisma.projectAccess.findUnique({ where: { projectId_userId: { projectId: project.id, userId: req.user.id } }, select: { levels: true } });
      myLevels = a?.levels || {};
    }
    res.json({ ...project, myLevels });
  })
);

router.post(
  "/",
  requireCompanyLevel("projects", "CONTRIBUTE"),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const project = await prisma.project.create({
      data: {
        companyId: req.company.id,
        name: b.name,
        reference: b.reference,
        description: b.description,
        address: b.address,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        surface: b.surface != null ? Number(b.surface) : null,
        budget: b.budget != null ? Number(b.budget) : null,
        marketAmount: b.marketAmount != null ? Number(b.marketAmount) : null,
        clientName: b.clientName,
        status: b.status || "PLANIFIE",
        startDate: b.startDate ? new Date(b.startDate) : null,
        expectedEndDate: b.expectedEndDate ? new Date(b.expectedEndDate) : null,
      },
    });
    // Le créateur obtient un accès complet au projet.
    await prisma.projectAccess.create({
      data: { projectId: project.id, userId: req.user.id, type: req.membership?.type || "MAITRE_OUVRAGE", roleLabel: "Créateur", levels: projectManageAll() },
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Project", entityId: project.id, ip: req.ip });
    res.status(201).json(project);
  })
);

router.put(
  "/:id",
  requireProjectLevel("overview", "MANAGE", (req) => req.params.id),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = {
      name: b.name, reference: b.reference, description: b.description, address: b.address,
      clientName: b.clientName, status: b.status,
      latitude: b.latitude != null ? Number(b.latitude) : undefined,
      longitude: b.longitude != null ? Number(b.longitude) : undefined,
      surface: b.surface != null ? Number(b.surface) : undefined,
      budget: b.budget != null ? Number(b.budget) : undefined,
      marketAmount: b.marketAmount != null ? Number(b.marketAmount) : undefined,
      startDate: b.startDate ? new Date(b.startDate) : undefined,
      expectedEndDate: b.expectedEndDate ? new Date(b.expectedEndDate) : undefined,
    };
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const project = await prisma.project.update({ where: { id: req.params.id }, data });
    await logActivity({ userId: req.user.id, action: "UPDATE", entity: "Project", entityId: project.id, ip: req.ip });
    res.json(project);
  })
);

// Suppression d'un projet : réservée à l'admin de l'entreprise.
router.delete(
  "/:id",
  requireCompanyAdmin,
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findFirst({ where: { id: req.params.id, companyId: req.company.id }, select: { id: true } });
    if (!project) return res.status(404).json({ message: "Projet introuvable" });
    await prisma.project.delete({ where: { id: req.params.id } });
    await logActivity({ userId: req.user.id, action: "DELETE", entity: "Project", entityId: req.params.id, ip: req.ip });
    res.json({ message: "Projet supprimé" });
  })
);

export default router;

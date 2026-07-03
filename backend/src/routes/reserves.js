import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity, notify } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel, scopeProjectQuery } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const userSel = { select: { id: true, firstName: true, lastName: true } };
const reserveProject = async (id) => (await prisma.reserve.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;

router.get(
  "/",
  scopeProjectQuery,
  asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    const where = { ...req.projectScope };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    const reserves = await prisma.reserve.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { photos: true, createdBy: userSel, assignedTo: userSel, project: { select: { id: true, name: true } } },
    });
    res.json(reserves);
  })
);

router.get(
  "/:id",
  requireProjectLevel("reserves", "VIEW", (req) => reserveProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const reserve = await prisma.reserve.findUnique({
      where: { id: req.params.id },
      include: { photos: true, createdBy: userSel, assignedTo: userSel, project: { select: { id: true, name: true } } },
    });
    if (!reserve) return res.status(404).json({ message: "Réserve introuvable" });
    res.json(reserve);
  })
);

router.post(
  "/",
  requireProjectLevel("reserves", "CONTRIBUTE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const reserve = await prisma.reserve.create({
      data: {
        projectId: b.projectId,
        title: b.title,
        description: b.description,
        location: b.location,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        priority: b.priority || "MOYENNE",
        status: b.status || "OUVERTE",
        createdById: req.user.id,
        assignedToId: b.assignedToId || null,
        photos: b.photos?.length ? { create: b.photos.map((url) => ({ url })) } : undefined,
      },
      include: { photos: true, createdBy: userSel, assignedTo: userSel },
    });
    if (reserve.assignedToId) {
      await notify({ userId: reserve.assignedToId, type: "RESERVE", title: "Nouvelle réserve assignée", message: reserve.title, link: `/reserves/${reserve.id}` });
    }
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Reserve", entityId: reserve.id, ip: req.ip });
    res.status(201).json(reserve);
  })
);

router.put(
  "/:id",
  requireProjectLevel("reserves", "CONTRIBUTE", (req) => reserveProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = {
      title: b.title, description: b.description, location: b.location,
      priority: b.priority, status: b.status, assignedToId: b.assignedToId,
    };
    if (b.status === "VALIDEE" || b.status === "TRAITEE") data.resolvedAt = new Date();
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const reserve = await prisma.reserve.update({ where: { id: req.params.id }, data });
    await logActivity({ userId: req.user.id, action: "UPDATE", entity: "Reserve", entityId: reserve.id, details: b.status, ip: req.ip });
    res.json(reserve);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("reserves", "MANAGE", (req) => reserveProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.reserve.delete({ where: { id: req.params.id } });
    res.json({ message: "Réserve supprimée" });
  })
);

export default router;

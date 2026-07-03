import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const userSel = { select: { id: true, firstName: true, lastName: true } };
const taskProject = async (id) => (await prisma.task.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;

router.get(
  "/project/:projectId",
  requireProjectLevel("planning", "VIEW", (req) => req.params.projectId),
  asyncHandler(async (req, res) => {
    const tasks = await prisma.task.findMany({
      where: { projectId: req.params.projectId },
      orderBy: { startDate: "asc" },
      include: { assignedTo: userSel, lot: { select: { id: true, name: true, category: true } } },
    });
    res.json(tasks);
  })
);

router.post(
  "/",
  requireProjectLevel("planning", "CONTRIBUTE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const task = await prisma.task.create({
      data: {
        projectId: b.projectId,
        lotId: b.lotId || null,
        name: b.name,
        description: b.description,
        startDate: new Date(b.startDate),
        endDate: new Date(b.endDate),
        progress: b.progress != null ? Number(b.progress) : 0,
        status: b.status || "A_FAIRE",
        dependsOnId: b.dependsOnId || null,
        assignedToId: b.assignedToId || null,
      },
      include: { assignedTo: userSel },
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Task", entityId: task.id, ip: req.ip });
    res.status(201).json(task);
  })
);

router.put(
  "/:id",
  requireProjectLevel("planning", "CONTRIBUTE", (req) => taskProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = {
      name: b.name, description: b.description, status: b.status,
      lotId: b.lotId, assignedToId: b.assignedToId, dependsOnId: b.dependsOnId,
    };
    if (b.startDate) data.startDate = new Date(b.startDate);
    if (b.endDate) data.endDate = new Date(b.endDate);
    if (b.progress != null) data.progress = Number(b.progress);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const task = await prisma.task.update({ where: { id: req.params.id }, data });
    res.json(task);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("planning", "MANAGE", (req) => taskProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ message: "Tâche supprimée" });
  })
);

export default router;

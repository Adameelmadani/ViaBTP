import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel, scopeProjectQuery } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const financeProject = async (id) => (await prisma.financeRecord.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;

router.get(
  "/",
  scopeProjectQuery,
  asyncHandler(async (req, res) => {
    const { type, status } = req.query;
    const where = { ...req.projectScope };
    if (type) where.type = type;
    if (status) where.status = status;
    const records = await prisma.financeRecord.findMany({
      where,
      orderBy: { date: "desc" },
      include: { project: { select: { id: true, name: true, marketAmount: true, budget: true } } },
    });
    res.json(records);
  })
);

// Synthèse budgétaire d'un projet
router.get(
  "/summary/:projectId",
  requireProjectLevel("finance", "VIEW", (req) => req.params.projectId),
  asyncHandler(async (req, res) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.projectId } });
    const records = await prisma.financeRecord.findMany({ where: { projectId: req.params.projectId } });
    const validated = records.filter((r) => r.status === "VALIDEE" || r.status === "PAYEE");
    const billed = validated.reduce((s, r) => s + r.amount, 0);
    const paid = records.filter((r) => r.status === "PAYEE").reduce((s, r) => s + r.amount, 0);
    res.json({
      marketAmount: project?.marketAmount || 0,
      budget: project?.budget || 0,
      billed,
      paid,
      remaining: (project?.marketAmount || 0) - billed,
      count: records.length,
    });
  })
);

router.post(
  "/",
  requireProjectLevel("finance", "CONTRIBUTE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const record = await prisma.financeRecord.create({
      data: {
        projectId: b.projectId,
        number: b.number,
        type: b.type || "SITUATION",
        amount: Number(b.amount),
        cumulativeAmount: b.cumulativeAmount != null ? Number(b.cumulativeAmount) : null,
        status: b.status || "BROUILLON",
        note: b.note,
        date: b.date ? new Date(b.date) : new Date(),
      },
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Finance", entityId: record.id, ip: req.ip });
    res.status(201).json(record);
  })
);

router.put(
  "/:id",
  requireProjectLevel("finance", "CONTRIBUTE", (req) => financeProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = { number: b.number, type: b.type, status: b.status, note: b.note };
    if (b.amount != null) data.amount = Number(b.amount);
    if (b.cumulativeAmount != null) data.cumulativeAmount = Number(b.cumulativeAmount);
    if (b.date) data.date = new Date(b.date);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const record = await prisma.financeRecord.update({ where: { id: req.params.id }, data });
    await logActivity({ userId: req.user.id, action: "UPDATE", entity: "Finance", entityId: record.id, details: b.status, ip: req.ip });
    res.json(record);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("finance", "MANAGE", (req) => financeProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.financeRecord.delete({ where: { id: req.params.id } });
    res.json({ message: "Situation supprimée" });
  })
);

export default router;

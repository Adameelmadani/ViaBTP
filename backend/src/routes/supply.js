import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity, notify } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel, scopeProjectQuery } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const include = {
  requester: { select: { id: true, firstName: true, lastName: true } },
  material: { select: { id: true, designation: true, reference: true, unit: true, unitPrice: true } },
  project: { select: { id: true, name: true } },
};
const supplyProject = async (id) => (await prisma.supplyRequest.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;

router.get(
  "/",
  scopeProjectQuery,
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const where = { ...req.projectScope };
    if (status) where.status = status;
    const requests = await prisma.supplyRequest.findMany({ where, orderBy: { createdAt: "desc" }, include });
    res.json(requests);
  })
);

router.post(
  "/",
  requireProjectLevel("supply", "CONTRIBUTE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const request = await prisma.supplyRequest.create({
      data: {
        projectId: b.projectId,
        requesterId: req.user.id,
        materialId: b.materialId,
        quantity: Number(b.quantity),
        desiredDate: b.desiredDate ? new Date(b.desiredDate) : null,
        urgency: b.urgency || "MOYENNE",
        observations: b.observations,
        status: b.status || "EN_ATTENTE",
      },
      include,
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "SupplyRequest", entityId: request.id, ip: req.ip });
    res.status(201).json(request);
  })
);

// Changement de statut (validation, commande, livraison, rejet...)
router.patch(
  "/:id/status",
  requireProjectLevel("supply", "MANAGE", (req) => supplyProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const { status } = req.body;
    const request = await prisma.supplyRequest.update({
      where: { id: req.params.id },
      data: { status },
      include,
    });
    await notify({
      userId: request.requesterId, type: "VALIDATION",
      title: `Demande ${status.toLowerCase()}`,
      message: `${request.material.designation} (${request.quantity} ${request.material.unit})`,
    });
    await logActivity({ userId: req.user.id, action: "STATUS", entity: "SupplyRequest", entityId: request.id, details: status, ip: req.ip });
    res.json(request);
  })
);

router.put(
  "/:id",
  requireProjectLevel("supply", "CONTRIBUTE", (req) => supplyProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = { observations: b.observations, urgency: b.urgency, status: b.status };
    if (b.quantity != null) data.quantity = Number(b.quantity);
    if (b.desiredDate) data.desiredDate = new Date(b.desiredDate);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const request = await prisma.supplyRequest.update({ where: { id: req.params.id }, data, include });
    res.json(request);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("supply", "MANAGE", (req) => supplyProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.supplyRequest.delete({ where: { id: req.params.id } });
    res.json({ message: "Demande supprimée" });
  })
);

export default router;

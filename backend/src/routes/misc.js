import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../lib/helpers.js";
import { authenticate, tenantContext, requireCompanyAdmin } from "../middleware/auth.js";

const router = Router();
router.use(authenticate);

// ── Notifications ──
router.get(
  "/notifications",
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  })
);

router.patch(
  "/notifications/:id/read",
  asyncHandler(async (req, res) => {
    // On ne peut marquer comme lue qu'une notification qui nous appartient.
    const { count } = await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { read: true },
    });
    if (count === 0) return res.status(404).json({ message: "Notification introuvable" });
    res.json({ message: "Notification lue" });
  })
);

router.patch(
  "/notifications/read-all",
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    res.json({ message: "Toutes les notifications sont lues" });
  })
);

// ── Journal d'activité (5.1 journalisation) ──
// Audit réservé à l'admin de l'entreprise active, limité aux actions de ses membres.
router.get(
  "/activity",
  tenantContext,
  requireCompanyAdmin,
  asyncHandler(async (req, res) => {
    const { entity, userId } = req.query;

    // Périmètre : uniquement les membres de l'entreprise active.
    const members = await prisma.companyMembership.findMany({
      where: { companyId: req.company.id },
      select: { userId: true },
    });
    const memberIds = members.map((m) => m.userId);

    const where = { userId: { in: memberIds } };
    if (entity) where.entity = entity;
    if (userId) {
      if (!memberIds.includes(userId)) return res.json({ logs: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }); // hors périmètre
      where.userId = userId;
    }

    // Pagination : ?page=1&pageSize=20
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
    const total = await prisma.activityLog.count({ where });
    const totalPages = Math.max(Math.ceil(total / pageSize), 1);
    const page = Math.min(Math.max(parseInt(req.query.page, 10) || 1, 1), totalPages);

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    res.json({ logs, total, page, pageSize, totalPages });
  })
);

export default router;

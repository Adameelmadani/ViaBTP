import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler } from "../lib/helpers.js";
import { authenticate, tenantContext } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

// Annuaire de l'entreprise active : membres (pour les sélecteurs intervenants / présences / affectations).
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const members = await prisma.companyMembership.findMany({
      where: { companyId: req.company.id },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(members.map((m) => ({ ...m.user, role: m.type, isCompanyAdmin: m.isCompanyAdmin })));
  })
);

export default router;

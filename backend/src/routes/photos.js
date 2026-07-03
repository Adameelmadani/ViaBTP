import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel, scopeProjectQuery } from "../middleware/auth.js";
import { upload } from "../middleware/upload.js";

const router = Router();
router.use(authenticate, tenantContext);

const photoProject = async (id) => (await prisma.photo.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;

router.get(
  "/",
  scopeProjectQuery,
  asyncHandler(async (req, res) => {
    const { zone } = req.query;
    const where = { ...req.projectScope };
    if (zone) where.zone = zone;
    const photos = await prisma.photo.findMany({
      where,
      orderBy: { takenAt: "desc" },
      include: { uploadedBy: { select: { firstName: true, lastName: true } }, project: { select: { id: true, name: true } } },
    });
    res.json(photos);
  })
);

router.post(
  "/",
  upload.single("file"),
  requireProjectLevel("photos", "CONTRIBUTE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    let url = b.url;
    if (req.file) url = `/uploads/${req.file.filename}`;
    const photo = await prisma.photo.create({
      data: {
        projectId: b.projectId,
        url,
        caption: b.caption,
        zone: b.zone,
        latitude: b.latitude != null ? Number(b.latitude) : null,
        longitude: b.longitude != null ? Number(b.longitude) : null,
        takenAt: b.takenAt ? new Date(b.takenAt) : new Date(),
        uploadedById: req.user.id,
      },
      include: { uploadedBy: { select: { firstName: true, lastName: true } } },
    });
    await logActivity({ userId: req.user.id, action: "PHOTO", entity: "Photo", entityId: photo.id, ip: req.ip });
    res.status(201).json(photo);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("photos", "MANAGE", (req) => photoProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.photo.delete({ where: { id: req.params.id } });
    res.json({ message: "Photo supprimée" });
  })
);

export default router;

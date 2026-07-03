import { Router } from "express";
import prisma from "../lib/prisma.js";
import { asyncHandler, logActivity, notify } from "../lib/helpers.js";
import { authenticate, tenantContext, requireProjectLevel, scopeProjectQuery } from "../middleware/auth.js";

const router = Router();
router.use(authenticate, tenantContext);

const userSel = { select: { id: true, firstName: true, lastName: true } };
const include = {
  createdBy: userSel,
  attendees: { include: { user: userSel } },
  actions: { include: { assignedTo: userSel } },
  project: { select: { id: true, name: true } },
};
const meetingProject = async (id) => (await prisma.meeting.findUnique({ where: { id }, select: { projectId: true } }))?.projectId;
const actionProject = async (actionId) =>
  (await prisma.meetingAction.findUnique({ where: { id: actionId }, select: { meeting: { select: { projectId: true } } } }))?.meeting?.projectId;

router.get(
  "/",
  scopeProjectQuery,
  asyncHandler(async (req, res) => {
    const meetings = await prisma.meeting.findMany({ where: { ...req.projectScope }, orderBy: { date: "desc" }, include });
    res.json(meetings);
  })
);

router.get(
  "/:id",
  requireProjectLevel("meetings", "VIEW", (req) => meetingProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const meeting = await prisma.meeting.findUnique({ where: { id: req.params.id }, include });
    if (!meeting) return res.status(404).json({ message: "Réunion introuvable" });
    res.json(meeting);
  })
);

router.post(
  "/",
  requireProjectLevel("meetings", "MANAGE", (req) => req.body.projectId),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const meeting = await prisma.meeting.create({
      data: {
        projectId: b.projectId,
        title: b.title,
        date: new Date(b.date),
        location: b.location,
        agenda: b.agenda,
        minutes: b.minutes,
        createdById: req.user.id,
        attendees: b.attendeeIds?.length
          ? { create: b.attendeeIds.map((userId) => ({ userId, present: false })) }
          : undefined,
        actions: b.actions?.length
          ? { create: b.actions.map((a) => ({ description: a.description, assignedToId: a.assignedToId || null, dueDate: a.dueDate ? new Date(a.dueDate) : null })) }
          : undefined,
      },
      include,
    });
    await logActivity({ userId: req.user.id, action: "CREATE", entity: "Meeting", entityId: meeting.id, ip: req.ip });

    // Notifie les participants conviés (hors organisateur)
    const dateStr = new Date(meeting.date).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" });
    await Promise.all(
      (b.attendeeIds || [])
        .filter((userId) => userId && userId !== req.user.id)
        .map((userId) =>
          notify({
            userId,
            type: "INFO",
            title: `Réunion : ${meeting.title}`,
            message: `Vous êtes convié(e) le ${dateStr}${meeting.location ? ` · ${meeting.location}` : ""}`,
            link: "/meetings",
          })
        )
    );

    res.status(201).json(meeting);
  })
);

router.put(
  "/:id",
  requireProjectLevel("meetings", "MANAGE", (req) => meetingProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const data = { title: b.title, location: b.location, agenda: b.agenda, minutes: b.minutes };
    if (b.date) data.date = new Date(b.date);
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);
    const meeting = await prisma.meeting.update({ where: { id: req.params.id }, data, include });
    res.json(meeting);
  })
);

router.patch(
  "/:id/attendance",
  requireProjectLevel("meetings", "CONTRIBUTE", (req) => meetingProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const { attendeeId, present } = req.body;
    const att = await prisma.meetingAttendee.update({ where: { id: attendeeId }, data: { present } });
    res.json(att);
  })
);

router.post(
  "/:id/actions",
  requireProjectLevel("meetings", "CONTRIBUTE", (req) => meetingProject(req.params.id)),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const action = await prisma.meetingAction.create({
      data: {
        meetingId: req.params.id,
        description: b.description,
        assignedToId: b.assignedToId || null,
        dueDate: b.dueDate ? new Date(b.dueDate) : null,
      },
      include: { assignedTo: userSel },
    });
    res.status(201).json(action);
  })
);

router.patch(
  "/actions/:actionId",
  requireProjectLevel("meetings", "CONTRIBUTE", (req) => actionProject(req.params.actionId)),
  asyncHandler(async (req, res) => {
    const action = await prisma.meetingAction.update({
      where: { id: req.params.actionId },
      data: { status: req.body.status },
    });
    res.json(action);
  })
);

router.delete(
  "/:id",
  requireProjectLevel("meetings", "MANAGE", (req) => meetingProject(req.params.id)),
  asyncHandler(async (req, res) => {
    await prisma.meeting.delete({ where: { id: req.params.id } });
    res.json({ message: "Réunion supprimée" });
  })
);

export default router;

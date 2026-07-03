import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma.js";
import { hashPassword, comparePassword, signToken, publicUser, generateAccountId } from "../lib/auth.js";
import { asyncHandler, logActivity } from "../lib/helpers.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// Adhésions de l'utilisateur (entreprises + droits), pour construire le sélecteur d'entreprise.
async function membershipsOf(userId) {
  const rows = await prisma.companyMembership.findMany({
    where: { userId },
    include: { company: { select: { id: true, name: true, reference: true, logo: true, isActive: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows
    .filter((m) => m.company.isActive)
    .map((m) => ({
      id: m.id,
      companyId: m.companyId,
      company: m.company,
      type: m.type,
      isCompanyAdmin: m.isCompanyAdmin,
      companyLevels: m.companyLevels,
    }));
}

async function uniqueAccountId() {
  for (let i = 0; i < 6; i++) {
    const id = generateAccountId();
    const clash = await prisma.user.findUnique({ where: { accountId: id }, select: { id: true } });
    if (!clash) return id;
  }
  return generateAccountId() + Date.now().toString(36).slice(-3).toUpperCase();
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) return res.status(409).json({ message: "Cet email est déjà utilisé" });

    const user = await prisma.user.create({
      data: {
        ...data,
        accountId: await uniqueAccountId(),
        platformRole: "MEMBER",
        password: await hashPassword(data.password),
      },
    });
    const token = signToken({ sub: user.id });
    await logActivity({ userId: user.id, action: "REGISTER", entity: "User", entityId: user.id, ip: req.ip });
    res.status(201).json({ token, user: publicUser(user), memberships: [] });
  })
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
    if (!user.isActive) return res.status(403).json({ message: "Compte désactivé" });

    await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
    const token = signToken({ sub: user.id });
    await logActivity({ userId: user.id, action: "LOGIN", entity: "User", entityId: user.id, ip: req.ip });
    res.json({ token, user: publicUser(user), memberships: await membershipsOf(user.id) });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user), memberships: await membershipsOf(req.user.id) });
  })
);

// ─────────────── Modifier ses informations personnelles ───────────────
const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
});

router.put(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const data = profileSchema.parse(req.body);

    if (data.email !== req.user.email) {
      const clash = await prisma.user.findUnique({ where: { email: data.email } });
      if (clash) return res.status(409).json({ message: "Cet email est déjà utilisé" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || null,
      },
    });
    await logActivity({ userId: user.id, action: "PROFILE_UPDATE", entity: "User", entityId: user.id, ip: req.ip });
    res.json({ user: publicUser(user) });
  })
);

// ─────────────── Changer son mot de passe ───────────────
const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.put(
  "/me/password",
  authenticate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = passwordSchema.parse(req.body);
    if (!(await comparePassword(currentPassword, req.user.password))) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: await hashPassword(newPassword) },
    });
    await logActivity({ userId: req.user.id, action: "PASSWORD_CHANGE", entity: "User", entityId: req.user.id, ip: req.ip });
    res.json({ message: "Mot de passe mis à jour" });
  })
);

export default router;

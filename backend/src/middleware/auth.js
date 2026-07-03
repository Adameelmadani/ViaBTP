import { verifyToken } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { hasLevel } from "../lib/access.js";

// Charge l'utilisateur authentifié dans req.user.
export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Authentification requise" });

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Compte invalide ou désactivé" });
    }
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: "Jeton invalide ou expiré" });
  }
}

export const isSuperAdmin = (req) => req.user?.platformRole === "SUPERADMIN";
// Gestionnaire de l'entreprise active : super-admin OU admin d'entreprise.
export const isCompanyManager = (req) => isSuperAdmin(req) || !!req.membership?.isCompanyAdmin;

// Réservé au super-admin de la plateforme.
export function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req)) return res.status(403).json({ message: "Réservé au super-administrateur" });
  next();
}

// Réservé à l'admin de l'entreprise active (ou super-admin). Requiert tenantContext avant.
export function requireCompanyAdmin(req, res, next) {
  if (!isCompanyManager(req)) return res.status(403).json({ message: "Réservé à l'administrateur de l'entreprise" });
  next();
}

// ── Contexte multi-tenant ──
// Lit l'entreprise active dans l'en-tête X-Company-Id, vérifie l'adhésion,
// pose req.company + req.membership. Le super-admin peut agir sur toute entreprise.
export async function tenantContext(req, res, next) {
  try {
    const companyId = req.headers["x-company-id"];
    if (!companyId) return res.status(400).json({ message: "Entreprise non spécifiée" });
    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company || !company.isActive) return res.status(404).json({ message: "Entreprise introuvable" });

    const membership = await prisma.companyMembership.findUnique({
      where: { companyId_userId: { companyId, userId: req.user.id } },
    });
    if (!membership && !isSuperAdmin(req)) {
      return res.status(403).json({ message: "Vous n'appartenez pas à cette entreprise" });
    }
    req.company = company;
    req.membership = membership || null;
    next();
  } catch (e) {
    next(e);
  }
}

// Exige un niveau minimal sur un module « entreprise » (projects, materials, suppliers, stock, orders).
export function requireCompanyLevel(module, minLevel) {
  return (req, res, next) => {
    if (isCompanyManager(req)) return next();
    const level = req.membership?.companyLevels?.[module] || "NONE";
    if (!hasLevel(level, minLevel)) {
      return res.status(403).json({ message: "Droits insuffisants pour cette action" });
    }
    next();
  };
}

// Liste des IDs de projets accessibles dans l'entreprise active.
export async function accessibleProjectIds(req) {
  if (isCompanyManager(req)) {
    const ps = await prisma.project.findMany({ where: { companyId: req.company.id }, select: { id: true } });
    return ps.map((p) => p.id);
  }
  const rows = await prisma.projectAccess.findMany({
    where: { userId: req.user.id, project: { companyId: req.company.id } },
    select: { projectId: true },
  });
  return rows.map((r) => r.projectId);
}

// Exige un niveau minimal sur un module de PROJET. `resolve(req)` renvoie l'ID du projet.
export function requireProjectLevel(module, minLevel, resolve) {
  return async (req, res, next) => {
    try {
      const projectId = await resolve(req);
      if (!projectId) return res.status(400).json({ message: "Projet non spécifié" });
      // Le projet doit appartenir à l'entreprise active.
      const project = await prisma.project.findFirst({
        where: { id: projectId, companyId: req.company.id },
        select: { id: true },
      });
      if (!project) return res.status(404).json({ message: "Projet introuvable dans cette entreprise" });
      req.projectId = projectId;

      if (isCompanyManager(req)) return next();
      const access = await prisma.projectAccess.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.id } },
        select: { levels: true },
      });
      const level = access?.levels?.[module] || "NONE";
      if (!hasLevel(level, minLevel)) {
        return res.status(403).json({ message: "Droits insuffisants sur ce projet" });
      }
      next();
    } catch (e) {
      next(e);
    }
  };
}

// Middleware pour les listes filtrables par `?projectId=` : pose req.projectScope
// (fragment where Prisma), limité aux projets accessibles de l'entreprise active.
export async function scopeProjectQuery(req, res, next) {
  try {
    const ids = await accessibleProjectIds(req);
    const requested = req.query.projectId;
    if (requested) {
      if (!ids.includes(requested)) {
        return res.status(403).json({ message: "Accès refusé : projet hors de votre périmètre" });
      }
      req.projectScope = { projectId: requested };
    } else {
      req.projectScope = { projectId: { in: ids } };
    }
    next();
  } catch (e) {
    next(e);
  }
}

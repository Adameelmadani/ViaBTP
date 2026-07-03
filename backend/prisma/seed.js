import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { companyManageAll } from "../src/lib/access.js";

const prisma = new PrismaClient();

// ── Identifiants initiaux : lus depuis .env (jamais codés en dur) ──
const {
  SEED_COMPANY_NAME = "company",
  SEED_SUPERADMIN_EMAIL = "adam.elmadani@company.ma",
  SEED_SUPERADMIN_FIRSTNAME = "Adam",
  SEED_SUPERADMIN_LASTNAME = "El Madani",
  SEED_SUPERADMIN_PASSWORD,
  SEED_ADMIN_EMAIL = "mouad.elmadani@company.ma",
  SEED_ADMIN_FIRSTNAME = "Mouad",
  SEED_ADMIN_LASTNAME = "El Madani",
  SEED_ADMIN_PASSWORD,
} = process.env;

// Chaque compte a son propre mot de passe (obligatoire).
if (!SEED_SUPERADMIN_PASSWORD || !SEED_ADMIN_PASSWORD) {
  console.error("\n❌ Mot de passe de seed manquant. Définissez SEED_SUPERADMIN_PASSWORD et SEED_ADMIN_PASSWORD dans backend/.env.\n");
  process.exit(1);
}

const usedIds = new Set();
function genAccountId() {
  let id;
  do { id = "VBT-" + Math.random().toString(36).slice(2, 8).toUpperCase(); } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "company";

async function createUser({ email, firstName, lastName, password, platformRole = "MEMBER" }) {
  return prisma.user.create({
    data: { accountId: genAccountId(), email, firstName, lastName, platformRole, password: bcrypt.hashSync(password, 10) },
  });
}

async function main() {
  console.log("Nettoyage de la base...");
  await prisma.$transaction([
    prisma.stockMovement.deleteMany(),
    prisma.purchaseOrderItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.supplyRequest.deleteMany(),
    prisma.meetingAction.deleteMany(),
    prisma.meetingAttendee.deleteMany(),
    prisma.meeting.deleteMany(),
    prisma.financeRecord.deleteMany(),
    prisma.task.deleteMany(),
    prisma.progressUpdate.deleteMany(),
    prisma.lot.deleteMany(),
    prisma.reservePhoto.deleteMany(),
    prisma.reserve.deleteMany(),
    prisma.document.deleteMany(),
    prisma.photo.deleteMany(),
    prisma.material.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.projectAccess.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.activityLog.deleteMany(),
    prisma.project.deleteMany(),
    prisma.companyMembership.deleteMany(),
    prisma.user.deleteMany(),
    prisma.company.deleteMany(),
  ]);

  // ── Super-admin de la plateforme (sans entreprise) ──
  console.log("Création du super-admin...");
  const superadmin = await createUser({
    email: SEED_SUPERADMIN_EMAIL,
    firstName: SEED_SUPERADMIN_FIRSTNAME,
    lastName: SEED_SUPERADMIN_LASTNAME,
    password: SEED_SUPERADMIN_PASSWORD,
    platformRole: "SUPERADMIN",
  });

  // ── Entreprise + son administrateur ──
  console.log(`Création de l'entreprise « ${SEED_COMPANY_NAME} »...`);
  const company = await prisma.company.create({
    data: { name: SEED_COMPANY_NAME, reference: slugify(SEED_COMPANY_NAME) },
  });

  const admin = await createUser({
    email: SEED_ADMIN_EMAIL,
    firstName: SEED_ADMIN_FIRSTNAME,
    lastName: SEED_ADMIN_LASTNAME,
    password: SEED_ADMIN_PASSWORD,
  });
  await prisma.companyMembership.create({
    data: {
      companyId: company.id, userId: admin.id, type: "MAITRE_OUVRAGE",
      isCompanyAdmin: true, companyLevels: companyManageAll(),
    },
  });

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("  Seed terminé !");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  SUPER-ADMIN   ${superadmin.firstName} ${superadmin.lastName}   ${superadmin.email}   [${superadmin.accountId}]`);
  console.log(`  ADMIN « ${company.name} »   ${admin.firstName} ${admin.lastName}   ${admin.email}   [${admin.accountId}]`);
  console.log("  (mots de passe : voir SEED_*_PASSWORD dans backend/.env)");
}

main()
  .catch((e) => { console.error("Erreur de seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

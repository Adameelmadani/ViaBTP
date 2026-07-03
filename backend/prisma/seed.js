import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { projectPreset, companyPreset, projectManageAll, companyManageAll } from "../src/lib/access.js";

const prisma = new PrismaClient();

const hash = (p) => bcrypt.hashSync(p, 10);
const daysFromNow = (d) => new Date(Date.now() + d * 86400000);

const usedIds = new Set();
function genAccountId() {
  let id;
  do { id = "VBT-" + Math.random().toString(36).slice(2, 8).toUpperCase(); } while (usedIds.has(id));
  usedIds.add(id);
  return id;
}

async function createUser({ email, firstName, lastName, phone, platformRole = "MEMBER" }) {
  return prisma.user.create({
    data: { accountId: genAccountId(), email, firstName, lastName, phone, platformRole, password: hash("password123") },
  });
}
async function addMember(company, user, type, { admin = false } = {}) {
  return prisma.companyMembership.create({
    data: {
      companyId: company.id, userId: user.id, type, isCompanyAdmin: admin,
      companyLevels: admin ? companyManageAll() : companyPreset(type),
    },
  });
}
async function grantProject(project, user, type, { admin = false } = {}) {
  return prisma.projectAccess.create({
    data: { projectId: project.id, userId: user.id, type, levels: admin ? projectManageAll() : projectPreset(type) },
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

  // ── Super-admin plateforme (sans entreprise) ──
  console.log("Création du super-admin...");
  const superadmin = await createUser({ email: "admin@viabtp.ma", firstName: "Adam", lastName: "Elmadani", phone: "+212 600-000000", platformRole: "SUPERADMIN" });

  // ── Compte visiteur sans entreprise (démo onboarding) ──
  const loneVisitor = await createUser({ email: "visiteur@viabtp.ma", firstName: "Leila", lastName: "Saidi", phone: "+212 668-505050" });

  // ── Architecte partagé entre plusieurs entreprises ──
  const archi = await createUser({ email: "archi@viabtp.ma", firstName: "Salma", lastName: "El Fassi", phone: "+212 662-445566" });

  // ═══════════════════════ ENTREPRISE A - STGM Construction ═══════════════════════
  console.log("Création de l'entreprise A (STGM Construction)...");
  const stgm = await prisma.company.create({ data: { name: "STGM Construction", reference: "stgm" } });

  const aAdmin = await createUser({ email: "admin@stgm.ma", firstName: "Yassine", lastName: "Bennani", phone: "+212 661-112233" });
  const aConducteur = await createUser({ email: "conducteur@stgm.ma", firstName: "Omar", lastName: "Idrissi", phone: "+212 666-303030" });
  const aChef = await createUser({ email: "chef@stgm.ma", firstName: "Rachid", lastName: "Mansouri", phone: "+212 667-404040" });
  const aEntreprise = await createUser({ email: "entreprise@stgm.ma", firstName: "Hicham", lastName: "Alaoui", phone: "+212 664-101010" });
  const aBet = await createUser({ email: "bet@stgm.ma", firstName: "Karim", lastName: "Tazi", phone: "+212 663-778899" });
  const aControle = await createUser({ email: "controle@stgm.ma", firstName: "Nadia", lastName: "Cherkaoui", phone: "+212 665-202020" });
  const aVisiteur = await createUser({ email: "visiteur@stgm.ma", firstName: "Sanae", lastName: "Berrada", phone: "+212 669-606060" });

  const aMembers = [
    { user: aAdmin, type: "MAITRE_OUVRAGE", admin: true },
    { user: aConducteur, type: "CONDUCTEUR_TRAVAUX" },
    { user: aChef, type: "CHEF_CHANTIER" },
    { user: aEntreprise, type: "ENTREPRISE" },
    { user: aBet, type: "BUREAU_ETUDES" },
    { user: aControle, type: "CONTROLE_TECHNIQUE" },
    { user: aVisiteur, type: "VISITEUR" },
    { user: archi, type: "ARCHITECTE" },
  ];
  for (const m of aMembers) await addMember(stgm, m.user, m.type, { admin: m.admin });

  console.log("  Projets de STGM...");
  const p1 = await prisma.project.create({ data: {
    companyId: stgm.id, name: "Résidence Al Manar", reference: "PRJ-2026-001",
    description: "Construction d'une résidence de standing R+6 avec 48 appartements et parking souterrain.",
    address: "Avenue Mohammed VI, Casablanca", latitude: 33.5731, longitude: -7.5898,
    surface: 4800, budget: 42000000, marketAmount: 38500000, clientName: "Al Omrane Casablanca",
    status: "EN_COURS", progress: 0, startDate: daysFromNow(-180), expectedEndDate: daysFromNow(210),
  } });
  const p2 = await prisma.project.create({ data: {
    companyId: stgm.id, name: "Centre Commercial Atlas", reference: "PRJ-2026-002",
    description: "Centre commercial de 2 niveaux, 80 boutiques, hypermarché et food court.",
    address: "Route de Rabat, Kénitra", latitude: 34.261, longitude: -6.5802,
    surface: 12000, budget: 95000000, marketAmount: 89000000, clientName: "Atlas Mall SA",
    status: "EN_COURS", progress: 0, startDate: daysFromNow(-90), expectedEndDate: daysFromNow(450),
  } });
  const p3 = await prisma.project.create({ data: {
    companyId: stgm.id, name: "École Primaire Ennakhil", reference: "PRJ-2026-003",
    description: "Groupe scolaire de 18 salles de classe, préau et terrain de sport.",
    address: "Quartier Ennakhil, Marrakech", latitude: 31.6295, longitude: -7.9811,
    surface: 3200, budget: 18000000, marketAmount: 16500000, clientName: "Commune de Marrakech",
    status: "PLANIFIE", progress: 0, startDate: daysFromNow(30), expectedEndDate: daysFromNow(400),
  } });

  // Accès projets pour les membres de STGM
  for (const p of [p1, p2, p3]) {
    for (const m of aMembers) await grantProject(p, m.user, m.type, { admin: m.admin });
  }

  console.log("  Lots & avancement...");
  const lotDefs = [
    { name: "Gros œuvre", category: "GROS_OEUVRE", weight: 35, planned: 80, actual: 72, amount: 13475000 },
    { name: "VRD", category: "VRD", weight: 10, planned: 60, actual: 55, amount: 3850000 },
    { name: "Électricité", category: "ELECTRICITE", weight: 12, planned: 40, actual: 35, amount: 4620000 },
    { name: "Fluides (plomberie/CVC)", category: "FLUIDES", weight: 13, planned: 45, actual: 38, amount: 5005000 },
    { name: "Finitions", category: "FINITIONS", weight: 18, planned: 20, actual: 15, amount: 6930000 },
    { name: "Menuiserie", category: "MENUISERIE", weight: 8, planned: 25, actual: 18, amount: 3080000 },
    { name: "Aménagement extérieur", category: "AMENAGEMENT_EXTERIEUR", weight: 4, planned: 10, actual: 5, amount: 1540000 },
  ];
  for (const ld of lotDefs) {
    const lot = await prisma.lot.create({ data: {
      projectId: p1.id, name: ld.name, category: ld.category, weight: ld.weight,
      plannedProgress: ld.planned, actualProgress: ld.actual, amount: ld.amount,
    } });
    await prisma.progressUpdate.create({ data: {
      lotId: lot.id, userId: aChef.id, percentage: ld.actual, note: "Relevé hebdomadaire",
      validated: true, validatedBy: aConducteur.id,
    } });
  }
  for (const ld of [
    { name: "Gros œuvre", category: "GROS_OEUVRE", weight: 40, planned: 50, actual: 42, amount: 35600000 },
    { name: "VRD", category: "VRD", weight: 15, planned: 30, actual: 25, amount: 13350000 },
    { name: "Électricité", category: "ELECTRICITE", weight: 20, planned: 20, actual: 12, amount: 17800000 },
    { name: "Finitions", category: "FINITIONS", weight: 25, planned: 5, actual: 2, amount: 22250000 },
  ]) {
    await prisma.lot.create({ data: {
      projectId: p2.id, name: ld.name, category: ld.category, weight: ld.weight,
      plannedProgress: ld.planned, actualProgress: ld.actual, amount: ld.amount,
    } });
  }
  for (const p of [p1, p2]) {
    const lots = await prisma.lot.findMany({ where: { projectId: p.id } });
    const tw = lots.reduce((s, l) => s + l.weight, 0);
    const prog = tw ? lots.reduce((s, l) => s + l.actualProgress * l.weight, 0) / tw : 0;
    await prisma.project.update({ where: { id: p.id }, data: { progress: Math.round(prog * 10) / 10 } });
  }

  console.log("  Réserves...");
  for (const r of [
    { title: "Fissure mur porteur niveau 2", desc: "Fissure verticale de 80cm observée sur le mur porteur axe B3.", location: "Bloc A - Étage 2", status: "OUVERTE", priority: "CRITIQUE", assigned: aEntreprise },
    { title: "Défaut d'étanchéité terrasse", desc: "Infiltration constatée après pluie au niveau de l'acrotère.", location: "Terrasse Bloc A", status: "EN_COURS", priority: "HAUTE", assigned: aEntreprise },
    { title: "Carrelage non conforme", desc: "Teinte du carrelage livré différente de l'échantillon validé.", location: "Hall RDC", status: "TRAITEE", priority: "MOYENNE", assigned: aEntreprise },
    { title: "Câblage électrique non protégé", desc: "Gaines électriques apparentes non protégées dans la cage d'escalier.", location: "Cage escalier", status: "VALIDEE", priority: "HAUTE", assigned: aChef },
    { title: "Manque garde-corps provisoire", desc: "Absence de garde-corps de sécurité sur la trémie ascenseur.", location: "Trémie ascenseur", status: "OUVERTE", priority: "CRITIQUE", assigned: aChef },
  ]) {
    await prisma.reserve.create({ data: {
      projectId: p1.id, title: r.title, description: r.desc, location: r.location,
      latitude: 33.5731 + Math.random() * 0.001, longitude: -7.5898 + Math.random() * 0.001,
      status: r.status, priority: r.priority, createdById: aControle.id, assignedToId: r.assigned.id,
      resolvedAt: ["TRAITEE", "VALIDEE"].includes(r.status) ? daysFromNow(-3) : null,
    } });
  }

  console.log("  Documents...");
  for (const d of [
    { name: "Plan de masse R+6.pdf", category: "PLAN" },
    { name: "PV réunion chantier S12.pdf", category: "PV_REUNION" },
    { name: "Rapport mensuel mars 2026.pdf", category: "RAPPORT" },
    { name: "Situation n°4 - Gros œuvre.pdf", category: "SITUATION" },
    { name: "Marché travaux - lot principal.pdf", category: "CONTRAT" },
    { name: "Note de calcul structure.pdf", category: "NOTE_TECHNIQUE" },
  ]) {
    await prisma.document.create({ data: {
      projectId: p1.id, name: d.name, category: d.category, url: "/uploads/demo-document.pdf",
      mimeType: "application/pdf", size: 245000, uploadedById: archi.id,
    } });
  }

  console.log("  Photos géolocalisées...");
  const photoUrls = [
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800",
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800",
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800",
    "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    "https://images.unsplash.com/photo-1590725140246-20acdee442be?w=800",
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800",
  ];
  const zones = ["Bloc A", "Bloc B", "Sous-sol", "Terrasse", "Façade", "VRD"];
  for (let i = 0; i < photoUrls.length; i++) {
    await prisma.photo.create({ data: {
      projectId: p1.id, url: photoUrls[i], caption: `Avancement ${zones[i]}`, zone: zones[i],
      latitude: 33.5731 + Math.random() * 0.001, longitude: -7.5898 + Math.random() * 0.001,
      takenAt: daysFromNow(-i * 2), uploadedById: aChef.id,
    } });
  }

  console.log("  Planning (Gantt)...");
  let prevTask = null;
  for (const t of [
    { name: "Terrassement et fondations", start: -180, end: -120, progress: 100, status: "TERMINE" },
    { name: "Élévation gros œuvre R+6", start: -120, end: -10, progress: 85, status: "EN_COURS" },
    { name: "Étanchéité et toiture", start: -20, end: 30, progress: 40, status: "EN_COURS" },
    { name: "Cloisons et plâtrerie", start: 10, end: 80, progress: 10, status: "A_FAIRE" },
    { name: "Électricité et plomberie", start: 20, end: 110, progress: 5, status: "A_FAIRE" },
    { name: "Revêtements et finitions", start: 90, end: 180, progress: 0, status: "A_FAIRE" },
    { name: "Aménagements extérieurs", start: 150, end: 210, progress: 0, status: "A_FAIRE" },
  ]) {
    prevTask = await prisma.task.create({ data: {
      projectId: p1.id, name: t.name, startDate: daysFromNow(t.start), endDate: daysFromNow(t.end),
      progress: t.progress, status: t.status, assignedToId: aConducteur.id, dependsOnId: prevTask?.id || null,
    } });
  }
  await prisma.task.create({ data: {
    projectId: p1.id, name: "Livraison menuiserie aluminium", startDate: daysFromNow(-15), endDate: daysFromNow(-3),
    progress: 30, status: "EN_RETARD", assignedToId: aEntreprise.id,
  } });

  console.log("  Réunions...");
  await prisma.meeting.create({ data: {
    projectId: p1.id, title: "Réunion de chantier hebdomadaire S15", date: daysFromNow(-2),
    location: "Bureau de chantier - Résidence Al Manar",
    agenda: "1. Avancement gros œuvre\n2. Levée des réserves\n3. Approvisionnement acier\n4. Planning prévisionnel",
    minutes: "Avancement conforme au planning. 2 réserves critiques à traiter en urgence. Commande acier validée.",
    createdById: aConducteur.id,
    attendees: { create: [aAdmin, archi, aEntreprise, aControle, aChef].map((u) => ({ userId: u.id, present: true })) },
    actions: { create: [
      { description: "Traiter la fissure du mur porteur axe B3", assignedToId: aEntreprise.id, dueDate: daysFromNow(5), status: "EN_COURS" },
      { description: "Fournir le PV de réception béton", assignedToId: aBet.id, dueDate: daysFromNow(3), status: "A_FAIRE" },
    ] },
  } });

  console.log("  Situations financières...");
  let cumul = 0;
  for (let i = 1; i <= 4; i++) {
    const amount = 3500000 + i * 250000;
    cumul += amount;
    await prisma.financeRecord.create({ data: {
      projectId: p1.id, number: `SIT-${String(i).padStart(3, "0")}`, type: "SITUATION",
      amount, cumulativeAmount: cumul, status: i <= 3 ? "PAYEE" : "SOUMISE",
      date: daysFromNow(-120 + i * 25), note: `Situation de travaux n°${i}`,
    } });
  }

  console.log("  Fournisseurs & matériaux...");
  const suppliers = {};
  for (const s of [
    { name: "LafargeHolcim Maroc", contactName: "M. Berrada", email: "contact@lafarge.ma", phone: "+212 522-667788", address: "Casablanca", rd: 4.5, rq: 4.8, rp: 3.9 },
    { name: "Sonasid (Acier)", contactName: "Mme Ouazzani", email: "sales@sonasid.ma", phone: "+212 539-334455", address: "Nador", rd: 4.0, rq: 4.5, rp: 4.2 },
    { name: "Briqueterie du Sud", contactName: "M. Hassani", email: "info@brique-sud.ma", phone: "+212 528-112233", address: "Agadir", rd: 3.8, rq: 4.0, rp: 4.6 },
    { name: "Sanitaire & Plomberie Maroc", contactName: "M. Filali", email: "vente@spm.ma", phone: "+212 537-998877", address: "Rabat", rd: 4.2, rq: 4.3, rp: 4.0 },
  ]) {
    suppliers[s.name] = await prisma.supplier.create({ data: {
      companyId: stgm.id, name: s.name, contactName: s.contactName, email: s.email, phone: s.phone,
      address: s.address, ratingDelay: s.rd, ratingQuality: s.rq, ratingPrice: s.rp,
    } });
  }
  const materials = {};
  for (const m of [
    { designation: "Ciment CPJ 45", reference: "CIM-CPJ45", category: "CIMENT", unit: "sac 50kg", price: 75, min: 200, stock: 145, zone: "Dépôt A", supplier: "LafargeHolcim Maroc" },
    { designation: "Acier HA Fe500 Ø12", reference: "ACR-HA12", category: "ACIER", unit: "tonne", price: 9500, min: 10, stock: 6, zone: "Aire ferraillage", supplier: "Sonasid (Acier)" },
    { designation: "Acier HA Fe500 Ø8", reference: "ACR-HA8", category: "ACIER", unit: "tonne", price: 9300, min: 8, stock: 12, zone: "Aire ferraillage", supplier: "Sonasid (Acier)" },
    { designation: "Béton prêt à l'emploi C25/30", reference: "BET-C2530", category: "BETON", unit: "m³", price: 850, min: 50, stock: 80, zone: "Centrale", supplier: "LafargeHolcim Maroc" },
    { designation: "Gravette 15/25", reference: "AGR-1525", category: "AGREGATS", unit: "m³", price: 180, min: 100, stock: 220, zone: "Dépôt B", supplier: "LafargeHolcim Maroc" },
    { designation: "Brique creuse 8 trous", reference: "BRQ-8T", category: "BRIQUES", unit: "millier", price: 1200, min: 20, stock: 8, zone: "Dépôt C", supplier: "Briqueterie du Sud" },
    { designation: "Carrelage grès 60x60", reference: "CAR-6060", category: "CARRELAGE", unit: "m²", price: 95, min: 500, stock: 1200, zone: "Magasin finitions", supplier: "Briqueterie du Sud" },
    { designation: "Tube PVC Ø100 évacuation", reference: "PLB-PVC100", category: "PLOMBERIE", unit: "barre 4m", price: 85, min: 100, stock: 60, zone: "Magasin fluides", supplier: "Sanitaire & Plomberie Maroc" },
    { designation: "Câble U1000 R2V 3G2.5", reference: "ELC-3G25", category: "ELECTRICITE", unit: "couronne 100m", price: 650, min: 30, stock: 45, zone: "Magasin élec", supplier: "Sanitaire & Plomberie Maroc" },
    { designation: "Peinture façade acrylique", reference: "PEI-FACADE", category: "PEINTURE", unit: "pot 25L", price: 480, min: 40, stock: 25, zone: "Magasin finitions", supplier: "Briqueterie du Sud" },
  ]) {
    materials[m.reference] = await prisma.material.create({ data: {
      companyId: stgm.id, designation: m.designation, reference: m.reference, category: m.category, unit: m.unit,
      unitPrice: m.price, stockMin: m.min, stockAvailable: m.stock, storageZone: m.zone, supplierId: suppliers[m.supplier].id,
    } });
  }

  console.log("  Demandes d'appro, commandes & stock...");
  for (const s of [
    { ref: "ACR-HA12", qty: 8, urgency: "CRITIQUE", status: "EN_ATTENTE", obs: "Rupture imminente pour le ferraillage R+5" },
    { ref: "BRQ-8T", qty: 15, urgency: "HAUTE", status: "VALIDEE", obs: "Maçonnerie étages courants" },
    { ref: "CIM-CPJ45", qty: 100, urgency: "MOYENNE", status: "COMMANDEE", obs: "Réappro mensuel" },
    { ref: "PEI-FACADE", qty: 30, urgency: "BASSE", status: "BROUILLON", obs: "Prévision finitions façade" },
  ]) {
    await prisma.supplyRequest.create({ data: {
      projectId: p1.id, requesterId: aChef.id, materialId: materials[s.ref].id,
      quantity: s.qty, urgency: s.urgency, status: s.status, observations: s.obs, desiredDate: daysFromNow(7),
    } });
  }
  await prisma.purchaseOrder.create({ data: {
    companyId: stgm.id, reference: "BC-2026-0001", supplierId: suppliers["Sonasid (Acier)"].id, projectId: p1.id,
    status: "CONFIRMEE", total: 8 * 9500,
    items: { create: [{ materialId: materials["ACR-HA12"].id, quantity: 8, unitPrice: 9500 }] },
  } });
  await prisma.purchaseOrder.create({ data: {
    companyId: stgm.id, reference: "BC-2026-0002", supplierId: suppliers["LafargeHolcim Maroc"].id, projectId: p1.id,
    status: "EN_ATTENTE", total: 100 * 75,
    items: { create: [{ materialId: materials["CIM-CPJ45"].id, quantity: 100, unitPrice: 75 }] },
  } });
  for (const [ref, type, qty] of [["CIM-CPJ45", "ENTREE", 200], ["CIM-CPJ45", "SORTIE", 55], ["ACR-HA12", "SORTIE", 4], ["BET-C2530", "ENTREE", 120], ["BET-C2530", "SORTIE", 40]]) {
    await prisma.stockMovement.create({ data: {
      companyId: stgm.id, materialId: materials[ref].id, projectId: p1.id, type, quantity: qty,
      reference: "MVT-" + ref, note: type === "ENTREE" ? "Réception" : "Consommation chantier",
    } });
  }

  await prisma.notification.createMany({ data: [
    { userId: aConducteur.id, type: "STOCK", title: "Stock bas: Acier HA Ø12", message: "6 t restantes (seuil 10 t)" },
    { userId: aConducteur.id, type: "RESERVE", title: "Réserve critique ouverte", message: "Fissure mur porteur niveau 2" },
    { userId: aConducteur.id, type: "RETARD", title: "Tâche en retard", message: "Livraison menuiserie aluminium" },
    { userId: aEntreprise.id, type: "RESERVE", title: "Réserve assignée", message: "Défaut d'étanchéité terrasse" },
  ] });

  // ═══════════════════════ ENTREPRISE B - Atlas Bâtiment ═══════════════════════
  console.log("Création de l'entreprise B (Atlas Bâtiment)...");
  const atlas = await prisma.company.create({ data: { name: "Atlas Bâtiment", reference: "atlas" } });
  const bAdmin = await createUser({ email: "admin@atlas.ma", firstName: "Fatima", lastName: "Zahra", phone: "+212 670-707070" });
  const bChef = await createUser({ email: "chef@atlas.ma", firstName: "Youssef", lastName: "Amrani", phone: "+212 671-808080" });

  const bMembers = [
    { user: bAdmin, type: "MAITRE_OUVRAGE", admin: true },
    { user: bChef, type: "CHEF_CHANTIER" },
    { user: archi, type: "ARCHITECTE" }, // architecte partagé avec STGM
  ];
  for (const m of bMembers) await addMember(atlas, m.user, m.type, { admin: m.admin });

  const pB = await prisma.project.create({ data: {
    companyId: atlas.id, name: "Résidence Yasmine", reference: "ATL-2026-001",
    description: "Immeuble R+4 de 24 logements sociaux avec commerces en rez-de-chaussée.",
    address: "Hay Riad, Rabat", latitude: 33.9716, longitude: -6.8498,
    surface: 2600, budget: 14000000, marketAmount: 12800000, clientName: "Atlas Bâtiment SARL",
    status: "EN_COURS", progress: 0, startDate: daysFromNow(-60), expectedEndDate: daysFromNow(300),
  } });
  for (const m of bMembers) await grantProject(pB, m.user, m.type, { admin: m.admin });

  for (const ld of [
    { name: "Gros œuvre", category: "GROS_OEUVRE", weight: 45, planned: 60, actual: 50, amount: 5760000 },
    { name: "Électricité", category: "ELECTRICITE", weight: 25, planned: 25, actual: 15, amount: 3200000 },
    { name: "Finitions", category: "FINITIONS", weight: 30, planned: 10, actual: 4, amount: 3840000 },
  ]) {
    await prisma.lot.create({ data: {
      projectId: pB.id, name: ld.name, category: ld.category, weight: ld.weight,
      plannedProgress: ld.planned, actualProgress: ld.actual, amount: ld.amount,
    } });
  }
  {
    const lots = await prisma.lot.findMany({ where: { projectId: pB.id } });
    const tw = lots.reduce((s, l) => s + l.weight, 0);
    const prog = tw ? lots.reduce((s, l) => s + l.actualProgress * l.weight, 0) / tw : 0;
    await prisma.project.update({ where: { id: pB.id }, data: { progress: Math.round(prog * 10) / 10 } });
  }
  const bSupplier = await prisma.supplier.create({ data: {
    companyId: atlas.id, name: "Ciments de l'Atlas", contactName: "M. Saidi", email: "contact@cimatlas.ma",
    phone: "+212 537-445566", address: "Rabat", ratingDelay: 4.1, ratingQuality: 4.2, ratingPrice: 4.4,
  } });
  await prisma.material.create({ data: {
    companyId: atlas.id, designation: "Ciment CPJ 45", reference: "CIM-CPJ45", category: "CIMENT",
    unit: "sac 50kg", unitPrice: 74, stockMin: 150, stockAvailable: 90, storageZone: "Dépôt", supplierId: bSupplier.id,
  } });
  await prisma.reserve.create({ data: {
    projectId: pB.id, title: "Enrobage insuffisant poteaux RDC", description: "Enrobage béton < 3cm relevé sur poteaux P4-P7.",
    location: "RDC", status: "OUVERTE", priority: "HAUTE", createdById: archi.id, assignedToId: bChef.id,
  } });

  console.log("\n─────────────────────────────────────────────────────────────");
  console.log("  Seed multi-tenant terminé !  (mot de passe : password123)");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(`  SUPER-ADMIN     ${superadmin.email}   [${superadmin.accountId}]`);
  console.log(`  Visiteur libre  ${loneVisitor.email}   [${loneVisitor.accountId}]  (aucune entreprise)`);
  console.log(`  Architecte      ${archi.email}   [${archi.accountId}]  (STGM + Atlas)`);
  console.log("  ── STGM Construction ──");
  for (const m of aMembers.filter((x) => x.user !== archi)) console.log(`     ${m.type.padEnd(20)} ${m.user.email}${m.admin ? "  (admin entreprise)" : ""}`);
  console.log("  ── Atlas Bâtiment ──");
  for (const m of bMembers.filter((x) => x.user !== archi)) console.log(`     ${m.type.padEnd(20)} ${m.user.email}${m.admin ? "  (admin entreprise)" : ""}`);
}

main()
  .catch((e) => { console.error("Erreur de seed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

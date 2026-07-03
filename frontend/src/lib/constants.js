// Libellés et couleurs des énumérations (français)

// Taille maximale d'un document uploadé (alignée sur la limite serveur Multer).
export const MAX_DOC_MB = 25;

export const ROLE_LABELS = {
  ADMIN: "Administrateur",
  MAITRE_OUVRAGE: "Maître d'ouvrage",
  ARCHITECTE: "Architecte",
  BUREAU_ETUDES: "Bureau d'études",
  ENTREPRISE: "Entreprise",
  CONTROLE_TECHNIQUE: "Contrôle technique",
  CONDUCTEUR_TRAVAUX: "Conducteur de travaux",
  CHEF_CHANTIER: "Chef de chantier",
  VISITEUR: "Visiteur",
};

export const PROJECT_STATUS = {
  PLANIFIE: { label: "Planifié", color: "bg-sky-100 text-sky-700" },
  EN_COURS: { label: "En cours", color: "bg-brand-100 text-brand-700" },
  EN_PAUSE: { label: "En pause", color: "bg-amber-100 text-amber-700" },
  TERMINE: { label: "Terminé", color: "bg-emerald-100 text-emerald-700" },
  ANNULE: { label: "Annulé", color: "bg-red-100 text-red-700" },
};

export const LOT_CATEGORIES = {
  GROS_OEUVRE: "Gros œuvre",
  VRD: "VRD",
  ELECTRICITE: "Électricité",
  FLUIDES: "Fluides",
  FINITIONS: "Finitions",
  MENUISERIE: "Menuiserie",
  AMENAGEMENT_EXTERIEUR: "Aménagement extérieur",
};

export const RESERVE_STATUS = {
  OUVERTE: { label: "Ouverte", color: "bg-red-100 text-red-700" },
  EN_COURS: { label: "En cours", color: "bg-amber-100 text-amber-700" },
  TRAITEE: { label: "Traitée", color: "bg-sky-100 text-sky-700" },
  VALIDEE: { label: "Validée", color: "bg-brand-100 text-brand-700" },
  REJETEE: { label: "Rejetée", color: "bg-gray-100 text-gray-600" },
};

export const PRIORITY = {
  BASSE: { label: "Basse", color: "bg-gray-100 text-gray-600" },
  MOYENNE: { label: "Moyenne", color: "bg-sky-100 text-sky-700" },
  HAUTE: { label: "Haute", color: "bg-amber-100 text-amber-700" },
  CRITIQUE: { label: "Critique", color: "bg-red-100 text-red-700" },
};

export const DOC_CATEGORIES = {
  PLAN: "Plan",
  PV_REUNION: "PV de réunion",
  RAPPORT: "Rapport",
  ATTACHEMENT: "Attachement",
  SITUATION: "Situation",
  CONTRAT: "Contrat",
  NOTE_TECHNIQUE: "Note technique",
  PHOTO: "Photo",
};

export const TASK_STATUS = {
  A_FAIRE: { label: "À faire", color: "bg-gray-100 text-gray-600" },
  EN_COURS: { label: "En cours", color: "bg-sky-100 text-sky-700" },
  TERMINE: { label: "Terminé", color: "bg-brand-100 text-brand-700" },
  EN_RETARD: { label: "En retard", color: "bg-red-100 text-red-700" },
};

export const FINANCE_TYPE = {
  SITUATION: "Situation de travaux",
  DECOMPTE: "Décompte",
  ATTACHEMENT: "Attachement",
};

export const FINANCE_STATUS = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  SOUMISE: { label: "Soumise", color: "bg-sky-100 text-sky-700" },
  VALIDEE: { label: "Validée", color: "bg-brand-100 text-brand-700" },
  PAYEE: { label: "Payée", color: "bg-emerald-100 text-emerald-700" },
  REJETEE: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

export const MATERIAL_CATEGORIES = {
  CIMENT: "Ciment",
  ACIER: "Acier",
  BETON: "Béton",
  AGREGATS: "Agrégats",
  BRIQUES: "Briques",
  CARRELAGE: "Carrelage",
  MENUISERIE: "Menuiserie",
  ELECTRICITE: "Électricité",
  PLOMBERIE: "Plomberie",
  PEINTURE: "Peinture",
  QUINCAILLERIE: "Quincaillerie",
  VRD: "Matériaux VRD",
};

export const SUPPLY_STATUS = {
  BROUILLON: { label: "Brouillon", color: "bg-gray-100 text-gray-600" },
  EN_ATTENTE: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  VALIDEE: { label: "Validée", color: "bg-sky-100 text-sky-700" },
  COMMANDEE: { label: "Commandée", color: "bg-indigo-100 text-indigo-700" },
  LIVREE: { label: "Livrée", color: "bg-brand-100 text-brand-700" },
  CLOTUREE: { label: "Clôturée", color: "bg-emerald-100 text-emerald-700" },
  REJETEE: { label: "Rejetée", color: "bg-red-100 text-red-700" },
};

export const ORDER_STATUS = {
  EN_ATTENTE: { label: "En attente", color: "bg-amber-100 text-amber-700" },
  CONFIRMEE: { label: "Confirmée", color: "bg-sky-100 text-sky-700" },
  LIVREE_PARTIELLE: { label: "Livrée partielle", color: "bg-indigo-100 text-indigo-700" },
  LIVREE: { label: "Livrée", color: "bg-brand-100 text-brand-700" },
  ANNULEE: { label: "Annulée", color: "bg-red-100 text-red-700" },
};

// Formatage monétaire (Dirham marocain)
export const fmtMAD = (n) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 0 }).format(n || 0);

// Format compact pour les grands montants (KPIs) : 144 M MAD, 457 K MAD
export const fmtMADc = (n) => {
  const v = n || 0;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)} M MAD`;
  if (Math.abs(v) >= 1e3) return `${Math.round(v / 1e3)} K MAD`;
  return `${Math.round(v)} MAD`;
};

export const fmtNum = (n) => new Intl.NumberFormat("fr-FR").format(n || 0);

export const enumToOptions = (obj) =>
  Object.entries(obj).map(([value, v]) => ({ value, label: typeof v === "string" ? v : v.label }));

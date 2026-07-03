// Permissions côté UI, basées sur les NIVEAUX d'accès (multi-tenant).
// Le backend reste la source de vérité ; ceci ne sert qu'à masquer les actions.
//
//   NONE < VIEW < CONTRIBUTE < MANAGE
//
// - Niveaux « entreprise » : sur l'adhésion active (companyLevels).
// - Niveaux « projet » : sur la ligne ProjectAccess de l'utilisateur pour ce projet.
// - Super-admin plateforme et admin d'entreprise : tout autorisé (MANAGE).

import { useAuth } from "../context/AuthContext.jsx";
import { useCompany } from "../context/CompanyContext.jsx";

export const LEVELS = { NONE: 0, VIEW: 1, CONTRIBUTE: 2, MANAGE: 3 };
export const LEVEL_ORDER = ["NONE", "VIEW", "CONTRIBUTE", "MANAGE"];
export const LEVEL_LABELS = { NONE: "Aucun", VIEW: "Lecture", CONTRIBUTE: "Contribution", MANAGE: "Gestion" };

export const PROJECT_MODULES = [
  { key: "overview", label: "Aperçu" },
  { key: "lots", label: "Lots & avancement" },
  { key: "documents", label: "Documents" },
  { key: "photos", label: "Photos" },
  { key: "meetings", label: "Réunions" },
  { key: "reserves", label: "Réserves" },
  { key: "planning", label: "Planning" },
  { key: "finance", label: "Finance" },
  { key: "supply", label: "Approvisionnement" },
];
export const COMPANY_MODULES = [
  { key: "projects", label: "Projets" },
  { key: "materials", label: "Matériaux" },
  { key: "suppliers", label: "Fournisseurs" },
  { key: "stock", label: "Stock" },
  { key: "orders", label: "Commandes" },
];

// Préréglages des niveaux « entreprise » par type de profil (miroir du backend, lib/access.js).
const N = "NONE", V = "VIEW", C = "CONTRIBUTE", M = "MANAGE";
const TYPE_COMPANY_PRESET = {
  ADMIN:              { projects: M, materials: M, suppliers: M, stock: M, orders: M },
  MAITRE_OUVRAGE:     { projects: M, materials: V, suppliers: V, stock: V, orders: M },
  ARCHITECTE:         { projects: V, materials: V, suppliers: V, stock: N, orders: N },
  BUREAU_ETUDES:      { projects: C, materials: C, suppliers: C, stock: V, orders: V },
  ENTREPRISE:         { projects: C, materials: M, suppliers: M, stock: M, orders: M },
  CONTROLE_TECHNIQUE: { projects: N, materials: V, suppliers: V, stock: V, orders: N },
  CONDUCTEUR_TRAVAUX: { projects: C, materials: M, suppliers: M, stock: M, orders: M },
  CHEF_CHANTIER:      { projects: N, materials: V, suppliers: V, stock: C, orders: V },
  VISITEUR:           { projects: N, materials: V, suppliers: V, stock: V, orders: V },
};
export const companyPreset = (type) => ({ ...(TYPE_COMPANY_PRESET[type] || TYPE_COMPANY_PRESET.VISITEUR) });

export const hasLevel = (current, required) => (LEVELS[current] || 0) >= (LEVELS[required] || 0);

// Hook central : renvoie des aides à la décision liées à l'utilisateur + l'entreprise active.
export function useAccess() {
  const { user, isSuperAdmin } = useAuth();
  const { activeMembership } = useCompany();
  const isCompanyAdmin = !!activeMembership?.isCompanyAdmin;
  const manager = isSuperAdmin || isCompanyAdmin;

  const canCompany = (module, level = "VIEW") =>
    manager || hasLevel(activeMembership?.companyLevels?.[module], level);

  // Niveaux de l'utilisateur courant sur un projet (objet levels).
  const projectLevels = (project) => {
    if (manager) return { overview: "MANAGE", lots: "MANAGE", documents: "MANAGE", photos: "MANAGE", meetings: "MANAGE", reserves: "MANAGE", planning: "MANAGE", finance: "MANAGE", supply: "MANAGE" };
    if (project?.myLevels) return project.myLevels;
    const row = project?.access?.find((a) => a.userId === user?.id);
    return row?.levels || {};
  };

  const projectCan = (project, module, level = "VIEW") => hasLevel(projectLevels(project)[module], level);

  return { isSuperAdmin, isCompanyAdmin, manager, activeMembership, canCompany, projectLevels, projectCan };
}

// ─────────────────────────────────────────────────────────────────────────
// Modèle de permissions par NIVEAU (multi-tenant).
//
//   NONE < VIEW < CONTRIBUTE < MANAGE
//
// - Chaque module d'un PROJET a un niveau, stocké dans ProjectAccess.levels.
// - Chaque module « entreprise » a un niveau, stocké dans CompanyMembership.companyLevels.
// - Le TYPE de l'utilisateur (Role) sert de PRÉRÉGLAGE : il remplit les niveaux
//   par défaut, que l'admin de l'entreprise peut ensuite ajuster librement.
// - SUPERADMIN (plateforme) et l'admin d'entreprise contournent ces niveaux.
// ─────────────────────────────────────────────────────────────────────────

export const LEVELS = { NONE: 0, VIEW: 1, CONTRIBUTE: 2, MANAGE: 3 };
export const LEVEL_ORDER = ["NONE", "VIEW", "CONTRIBUTE", "MANAGE"];

export const PROJECT_MODULES = [
  "overview", "lots", "documents", "photos", "meetings", "reserves", "planning", "finance", "supply",
];
export const COMPANY_MODULES = ["projects", "materials", "suppliers", "stock", "orders"];

// current >= required ?
export function hasLevel(current, required) {
  return (LEVELS[current] || 0) >= (LEVELS[required] || 0);
}

const N = "NONE", V = "VIEW", C = "CONTRIBUTE", M = "MANAGE";

// Préréglages des niveaux de PROJET par type de profil métier.
const TYPE_PROJECT_PRESET = {
  ADMIN:              { overview: M, lots: M, documents: M, photos: M, meetings: M, reserves: M, planning: M, finance: M, supply: M },
  MAITRE_OUVRAGE:     { overview: M, lots: V, documents: M, photos: V, meetings: M, reserves: M, planning: V, finance: M, supply: V },
  ARCHITECTE:         { overview: M, lots: V, documents: M, photos: C, meetings: M, reserves: M, planning: V, finance: V, supply: V },
  BUREAU_ETUDES:      { overview: M, lots: M, documents: M, photos: C, meetings: M, reserves: M, planning: M, finance: C, supply: V },
  ENTREPRISE:         { overview: C, lots: M, documents: C, photos: C, meetings: C, reserves: C, planning: M, finance: C, supply: C },
  CONTROLE_TECHNIQUE: { overview: V, lots: V, documents: C, photos: C, meetings: C, reserves: C, planning: V, finance: N, supply: N },
  CONDUCTEUR_TRAVAUX: { overview: M, lots: M, documents: M, photos: C, meetings: M, reserves: M, planning: M, finance: C, supply: M },
  CHEF_CHANTIER:      { overview: V, lots: C, documents: V, photos: C, meetings: C, reserves: C, planning: C, finance: N, supply: C },
  VISITEUR:           { overview: V, lots: V, documents: V, photos: V, meetings: V, reserves: V, planning: V, finance: N, supply: V },
};

// Préréglages des niveaux « entreprise » (procurement + gestion de projets) par type.
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

const fill = (modules, level) => Object.fromEntries(modules.map((m) => [m, level]));

export function projectPreset(type) {
  return { ...(TYPE_PROJECT_PRESET[type] || TYPE_PROJECT_PRESET.VISITEUR) };
}
export function companyPreset(type) {
  return { ...(TYPE_COMPANY_PRESET[type] || TYPE_COMPANY_PRESET.VISITEUR) };
}
// Admin d'entreprise / superadmin : tout en MANAGE.
export const projectManageAll = () => fill(PROJECT_MODULES, M);
export const companyManageAll = () => fill(COMPANY_MODULES, M);

// Lecture d'un niveau dans un objet levels (défaut NONE).
export const levelOf = (levels, module) => (levels && levels[module]) || "NONE";

# ViaBTP: Plateforme de suivi de chantier de construction

Application web complète de pilotage de chantiers (BTP): suivi d'avancement, réserves, gestion
documentaire, planning, réunions, finance et **gestion complète de l'approvisionnement
en matériaux**.

**Multi-entreprise** (multi-tenant) et **multi-projets** : un même compte peut appartenir à
plusieurs entreprises, chacune avec ses propres projets, membres et droits.

Interface **glassmorphism** thème **blanc, vert & orange**, multi-rôles.

---

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 · Vite · TailwindCSS · Recharts · React Router · Axios |
| Backend | Node.js · Express · JWT · Multer · Zod |
| ORM / BDD | Prisma · **PostgreSQL 16** (Docker) |
| Auth | JWT + bcrypt, contrôle d'accès **par niveaux** (multi-tenant) |

---

## Modèle d'accès (multi-tenant)

Les droits ne sont plus binaires : chaque module dispose d'un **niveau** d'accès.

```
NONE < VIEW < CONTRIBUTE < MANAGE
```

- **Entreprise** : un utilisateur devient membre d'une entreprise via une `CompanyMembership`
  qui porte son **type de profil** (préréglage métier) et ses **niveaux « entreprise »**
  (projets, matériaux, fournisseurs, stock, commandes).
- **Projet** : l'accès à chaque projet est porté par une ligne `ProjectAccess` avec ses
  **niveaux par module** (aperçu, lots, documents, photos, réunions, réserves, planning, finance, appro).
- **Type de profil** : sert de **préréglage** — il pré-remplit les niveaux par défaut, que
  l'admin d'entreprise peut ensuite ajuster librement (page **Équipe & accès**).
- **Admin d'entreprise** : accès complet à son entreprise + gestion des membres et des droits.
- **Super-admin plateforme** : gère les entreprises, contourne tous les niveaux.

Les 9 types de profil : Administrateur, Maître d'ouvrage, Architecte, Bureau d'études,
Entreprise, Contrôle technique, Conducteur de travaux, Chef de chantier, Visiteur.

---

## Démarrage rapide

### Prérequis
- **Node.js ≥ 18** (testé sur Node 24)
- **Docker Desktop** (pour PostgreSQL) *ou* un PostgreSQL local

### 1. Lancer la base de données (PostgreSQL via Docker)
```bash
docker compose up -d db
```
> Adminer (explorateur de BDD) est aussi disponible sur http://localhost:8080
> (système `PostgreSQL`, serveur `db`, user/mot de passe/base = `viabtp`).

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env          # déjà fourni
npx prisma db push            # crée le schéma dans PostgreSQL
npm run seed                  # crée le super-admin + l'entreprise (voir SEED_* dans .env)
npm run dev                   # API sur http://localhost:4000
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev                   # interface sur http://localhost:5173
```

### Tout-en-un (depuis la racine)
```bash
npm run setup     # installe tout, lance la BDD, pousse le schéma et seed
npm run backend   # terminal 1
npm run frontend  # terminal 2
```

---

## Comptes initiaux

`npm run seed` crée exactement deux comptes, à partir des variables `SEED_*` de `backend/.env` :

| Rôle | Nom | Email (`.env`) |
|---|---|---|
| Super-administrateur plateforme | Adam El Madani | `SEED_SUPERADMIN_EMAIL` |
| Administrateur de l'entreprise `company` | Mounir El Madani | `SEED_ADMIN_EMAIL` |

Le mot de passe des deux comptes est défini par **`SEED_PASSWORD`** dans `backend/.env`
(obligatoire — le seed échoue s'il est absent). Modifiez les valeurs `SEED_*` avant de
lancer le seed pour personnaliser noms, emails, mot de passe et nom d'entreprise.

---

## Modules fonctionnels (conformes au CPT)

| # | Module | Statut |
|---|---|---|
| 4.1 | Gestion des accès : multi-entreprise, 9 profils, droits par niveaux, journalisation | |
| 4.2 | Gestion des projets (GPS, budget, intervenants, marché) | |
| 4.3 | Tableau de bord dynamique (KPIs, graphiques, alertes) | |
| 4.4 | Suivi d'avancement par lot (saisie, historique, validation) | |
| 4.5 | Gestion documentaire (catégories, versions, signature) | |
| 4.6 | Réserves & non-conformités (Kanban, statuts, affectation) | |
| 4.7 | Planning chantier (diagramme de Gantt, dépendances) | |
| 4.8 | Gestion des réunions (PV, présence, actions à suivre) | |
| 4.9 | Gestion financière (situations, décomptes, suivi budgétaire) | |
| 4.10 | Module photo & géolocalisation (zones, GPS, horodatage) | |
| 4.11 | **Approvisionnement** : matériaux, demandes, fournisseurs, bons de commande, stock, mouvements, valorisation, alertes seuil | |
| 5.1 | Sécurité : JWT, bcrypt, contrôle d'accès par niveaux, journal d'activité | |

---

## Structure du projet

```
ViaBTP/
├── docker-compose.yml        # PostgreSQL + Adminer
├── package.json              # scripts racine (setup, db:up, ...)
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # modèle de données complet (multi-tenant)
│   │   └── seed.js           # données de démo (2 entreprises, chantiers marocains)
│   └── src/
│       ├── server.js / app.js
│       ├── lib/              # prisma, auth (JWT), access (niveaux), helpers
│       ├── middleware/       # auth + contexte multi-tenant, upload, erreurs
│       └── routes/           # 19 routeurs REST
└── frontend/
    └── src/
        ├── components/       # UI kit glassmorphism, Layout, AuthShell
        ├── context/          # Auth · Company · Toast · Confirm
        ├── lib/              # constantes, permissions (niveaux)
        └── pages/            # 23 pages (dont onboarding, profil, équipe & accès, admin)
```

---

## Aperçu de l'API REST

| Méthode | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` · `/register` | Authentification |
| GET/PUT | `/api/auth/me` · `/me/password` | Profil courant : infos & mot de passe |
| GET/POST/PUT/DELETE | `/api/companies` | Entreprises (super-admin) & onboarding |
| GET/POST/PUT/DELETE | `/api/members` · `/project-access` | Membres d'entreprise & droits par projet |
| GET/POST/PUT/DELETE | `/api/projects` | Projets |
| GET/POST/PUT | `/api/lots` · `/api/lots/:id/progress` | Lots & avancement |
| GET/POST/PUT/DELETE | `/api/reserves` | Réserves / NC |
| GET/POST | `/api/documents` · `/api/photos` | GED & photos (upload) |
| GET/POST/PUT | `/api/tasks` | Planning (Gantt) |
| GET/POST | `/api/meetings` | Réunions |
| GET/POST/PUT | `/api/finance` · `/summary/:id` | Finance |
| CRUD | `/api/materials` · `/suppliers` · `/supply` · `/orders` | Approvisionnement |
| GET/POST | `/api/stock/movements` · `/valuation` | Stock |
| GET | `/api/dashboard` | KPIs agrégés |
| GET/PATCH | `/api/notifications` | Notifications personnelles |
| GET | `/api/activity` | Journal d'audit (admin, paginé, périmètre entreprise) |

> Toutes les routes (hors `/auth/login` et `/auth/register`) exigent un header
> `Authorization: Bearer <token>`. Les routes liées à une entreprise exigent aussi
> l'en-tête `X-Company-Id` (entreprise active).

---

## Design

- **Glassmorphism** : cartes translucides (`backdrop-blur`), bordures claires, halos verts & orange.
- **Palette** : blanc cassé + vert `brand` (`#16b563` → `#0a7543`) + orange `accent` (`#ff6a1a`).
- **Responsive** : sidebar repliable, grilles fluides, optimisé terrain.
- Typographie : **Quantify** pour les titres & sous-titres, **Inter** pour le corps de texte.
- Animations douces, toasts, modales.

---

## Notes

- Les uploads sont stockés dans `backend/uploads/` et servis sur `/uploads`.
- Pour basculer sur un PostgreSQL non-Docker, ajustez `DATABASE_URL` dans `backend/.env`.
- `npx prisma studio` ouvre un explorateur visuel de la base.

## Licence

Ce projet est sous licence **MIT** - voir le fichier [LICENSE](LICENSE) pour plus de détails.

© 2026 ViaBTP

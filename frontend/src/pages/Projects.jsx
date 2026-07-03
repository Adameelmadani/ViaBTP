import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, Plus, Search, MapPin, Calendar, Users2, AlertTriangle, FolderOpen, Camera, Trash2 } from "lucide-react";
import api from "../api/client.js";
import { Card, PageHeader, Spinner, Badge, ProgressBar, EmptyState } from "../components/ui.jsx";
import ProjectFormModal from "../components/ProjectFormModal.jsx";
import { PROJECT_STATUS, fmtMAD } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Projects() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canCompany, isCompanyAdmin } = useAccess();
  const [projects, setProjects] = useState(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // valeur debouncée
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  // Debounce de la recherche : on n'interroge l'API qu'après une pause de saisie
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = () => {
    const params = {};
    if (query) params.q = query;
    if (status) params.status = status;
    api.get("/projects", { params }).then((r) => setProjects(r.data)).catch(() => setProjects([]));
  };
  useEffect(() => { load(); }, [query, status]);

  const canCreate = canCompany("projects", "CONTRIBUTE");
  const canDelete = isCompanyAdmin;

  const deleteProject = async (e, p) => {
    e.preventDefault();
    e.stopPropagation();
    if (!(await confirm({
      title: "Supprimer le projet",
      message: `Supprimer définitivement le projet « ${p.name} » ?\nTous les lots, réserves, documents, photos et données associés seront également supprimés. Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
    }))) return;
    try {
      await api.delete(`/projects/${p.id}`);
      setProjects((prev) => prev.filter((x) => x.id !== p.id));
      toast("Projet supprimé");
    } catch (err) {
      toast(err.response?.data?.message || "Suppression impossible", "error");
    }
  };

  return (
    <div>
      <PageHeader
        title="Projets" subtitle="Vos chantiers de construction" icon={Building2}
        actions={canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouveau projet</button>}
      />

      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Rechercher un projet..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select max-w-[200px]" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tous les statuts</option>
          {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {!projects ? <Spinner /> : projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={Building2}
            title={query || status ? "Aucun projet ne correspond" : "Aucun projet"}
            subtitle={query || status ? "Essayez d'ajuster votre recherche ou le filtre de statut." : "Créez votre premier chantier pour commencer le suivi."}
            action={canCreate && !query && !status ? <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouveau projet</button> : null}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card hover className="h-full flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-brand-900 truncate">{p.name}</h3>
                    <p className="text-xs text-brand-700/60">{p.reference}</p>
                  </div>
                  <Badge className={PROJECT_STATUS[p.status]?.color}>{PROJECT_STATUS[p.status]?.label}</Badge>
                </div>
                {p.address && (
                  <p className="flex items-center gap-1.5 text-xs text-brand-700/70 mb-1"><MapPin size={13} /> {p.address}</p>
                )}
                {p.expectedEndDate && (
                  <p className="flex items-center gap-1.5 text-xs text-brand-700/70 mb-3">
                    <Calendar size={13} /> Livraison {new Date(p.expectedEndDate).toLocaleDateString("fr-FR")}
                  </p>
                )}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-brand-700/70 mb-1">
                    <span>Avancement</span><span className="font-semibold text-brand-800">{Math.round(p.progress)}%</span>
                  </div>
                  <ProgressBar value={p.progress} />
                </div>
                <p className="text-sm font-bold text-brand-900 mb-3">{fmtMAD(p.marketAmount)}</p>
                <div className="mt-auto flex items-center gap-3 text-xs text-brand-700/60 pt-3 border-t border-brand-100/60">
                  <span className="flex items-center gap-1"><Users2 size={13} /> {p.access?.length || 0}</span>
                  <span className="flex items-center gap-1"><AlertTriangle size={13} /> {p._count?.reserves || 0}</span>
                  <span className="flex items-center gap-1"><FolderOpen size={13} /> {p._count?.documents || 0}</span>
                  <span className="flex items-center gap-1"><Camera size={13} /> {p._count?.photos || 0}</span>
                  {canDelete && (
                    <button
                      onClick={(e) => deleteProject(e, p)}
                      className="ml-auto -my-1 p-1.5 rounded-lg text-brand-400 hover:text-red-500 hover:bg-red-50 transition"
                      title="Supprimer le projet"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <ProjectFormModal open={open} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); toast("Projet créé"); }} />
    </div>
  );
}

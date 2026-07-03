import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft, MapPin, Calendar, Wallet, Ruler, Building2, Plus, TrendingUp,
  Users2, Layers, Trash2, Pencil, X, AlertTriangle, FolderOpen, Camera, Banknote,
} from "lucide-react";
import api from "../api/client.js";
import {
  Card, Spinner, Badge, ProgressBar, Tabs, Modal, Field, Input, Select, EmptyState, Avatar,
} from "../components/ui.jsx";
import ProjectFormModal from "../components/ProjectFormModal.jsx";
import { PROJECT_STATUS, LOT_CATEGORIES, ROLE_LABELS, fmtMAD, fmtNum, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();
  const { projectCan, isCompanyAdmin } = useAccess();
  const [project, setProject] = useState(null);
  const [lots, setLots] = useState([]);
  const [tab, setTab] = useState("apercu");
  const [lotModal, setLotModal] = useState(false);
  const [progressModal, setProgressModal] = useState(null);
  const [editModal, setEditModal] = useState(false);

  const load = () => {
    api.get(`/projects/${id}`).then((r) => setProject(r.data)).catch(() => navigate("/projects"));
    api.get(`/lots/project/${id}`).then((r) => setLots(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [id]);

  if (!project) return <Spinner />;

  const canEdit = projectCan(project, "overview", "MANAGE");
  const canDelete = isCompanyAdmin;
  const canManageLots = projectCan(project, "lots", "MANAGE");
  const canProgress = projectCan(project, "lots", "CONTRIBUTE");

  const tabs = [
    { value: "apercu", label: "Aperçu", icon: Building2 },
    { value: "lots", label: "Lots & avancement", icon: Layers, count: lots.length },
    { value: "intervenants", label: "Intervenants", icon: Users2, count: project.access?.length },
  ];

  const deleteLot = async (lotId) => {
    if (!(await confirm("Supprimer ce lot ?"))) return;
    await api.delete(`/lots/${lotId}`);
    load(); toast("Lot supprimé");
  };

  const deleteProject = async () => {
    if (!(await confirm({
      title: "Supprimer le projet",
      message: `Supprimer définitivement le projet « ${project.name} » ?\nTous les lots, réserves, documents, photos et données associés seront également supprimés. Cette action est irréversible.`,
      confirmLabel: "Supprimer définitivement",
    }))) return;
    try {
      await api.delete(`/projects/${id}`);
      toast("Projet supprimé");
      navigate("/projects");
    } catch (err) {
      toast(err.response?.data?.message || "Suppression impossible", "error");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft size={16} /> Retour aux projets
        </Link>
        <div className="flex items-center gap-2">
          {canEdit && <button className="btn-ghost btn-sm" onClick={() => setEditModal(true)}><Pencil size={15} /> Modifier</button>}
          {canDelete && <button className="btn-danger btn-sm" onClick={deleteProject}><Trash2 size={15} /> Supprimer</button>}
        </div>
      </div>

      {/* Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-brand-200/30 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-brand-900">{project.name}</h1>
              <Badge className={PROJECT_STATUS[project.status]?.color}>{PROJECT_STATUS[project.status]?.label}</Badge>
            </div>
            <p className="text-sm text-brand-700/60 mb-3">{project.reference} · {project.clientName}</p>
            <div className="flex flex-wrap gap-4 text-sm text-brand-800">
              {project.address && <span className="flex items-center gap-1.5"><MapPin size={15} className="text-brand-500" /> {project.address}</span>}
              {project.surface && <span className="flex items-center gap-1.5"><Ruler size={15} className="text-brand-500" /> {fmtNum(project.surface)} m²</span>}
              {project.expectedEndDate && <span className="flex items-center gap-1.5"><Calendar size={15} className="text-brand-500" /> {new Date(project.expectedEndDate).toLocaleDateString("fr-FR")}</span>}
              <span className="flex items-center gap-1.5"><Wallet size={15} className="text-brand-500" /> {fmtMAD(project.marketAmount)}</span>
            </div>
          </div>
          <div className="text-center bg-white/50 rounded-2xl px-6 py-4 border border-white/60">
            <p className="text-3xl font-extrabold text-brand-700">{Math.round(project.progress)}%</p>
            <p className="text-xs text-brand-700/60 mb-2">avancement global</p>
            <div className="w-32"><ProgressBar value={project.progress} /></div>
          </div>
        </div>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: "/reserves", icon: AlertTriangle, label: "Réserves", count: project._count?.reserves },
          { to: "/documents", icon: FolderOpen, label: "Documents", count: project._count?.documents },
          { to: "/photos", icon: Camera, label: "Photos", count: project._count?.photos },
          { to: "/finance", icon: Banknote, label: "Finance", count: project._count?.finances },
        ].map((l) => (
          <Link key={l.to} to={l.to} state={{ projectId: id }}>
            <Card hover className="flex items-center gap-3 py-3">
              <div className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 text-brand-600"><l.icon size={18} /></div>
              <div><p className="text-lg font-bold text-brand-900 leading-none">{l.count ?? 0}</p><p className="text-xs text-brand-700/60">{l.label}</p></div>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs tabs={tabs} active={tab} onChange={setTab} />

      {tab === "apercu" && (
        <Card>
          <h3 className="font-bold text-brand-900 mb-3">Description</h3>
          <p className="text-sm text-brand-800/80 leading-relaxed">{project.description || "Aucune description."}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {[
              ["Budget", fmtMAD(project.budget)],
              ["Montant du marché", fmtMAD(project.marketAmount)],
              ["Surface", project.surface ? `${fmtNum(project.surface)} m²` : "-"],
              ["Date de début", project.startDate ? new Date(project.startDate).toLocaleDateString("fr-FR") : "-"],
              ["Fin prévisionnelle", project.expectedEndDate ? new Date(project.expectedEndDate).toLocaleDateString("fr-FR") : "-"],
              ["Coordonnées GPS", project.latitude ? `${project.latitude.toFixed(4)}, ${project.longitude.toFixed(4)}` : "-"],
            ].map(([k, v]) => (
              <div key={k} className="bg-white/50 rounded-xl p-3.5 border border-white/60">
                <p className="text-xs text-brand-700/60">{k}</p>
                <p className="font-semibold text-brand-900 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === "lots" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-900">Lots de travaux</h3>
            {canManageLots && <button className="btn-soft btn-sm" onClick={() => setLotModal(true)}><Plus size={15} /> Ajouter un lot</button>}
          </div>
          {lots.length === 0 ? (
            <EmptyState icon={Layers} title="Aucun lot" subtitle="Ajoutez les lots (gros œuvre, VRD, etc.) pour suivre l'avancement." />
          ) : (
            <div className="space-y-3">
              {lots.map((lot) => (
                <div key={lot.id} className="p-4 rounded-2xl bg-white/50 border border-white/60">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-brand-900">{lot.name}</p>
                      <p className="text-xs text-brand-700/60">{LOT_CATEGORIES[lot.category]} · Poids {lot.weight}% · {fmtMAD(lot.amount)}</p>
                    </div>
                    {(canProgress || canManageLots) && (
                      <div className="flex items-center gap-2">
                        {canProgress && <button className="btn-soft btn-sm" onClick={() => setProgressModal(lot)}><TrendingUp size={14} /> Avancement</button>}
                        {canManageLots && <button className="btn-danger btn-sm" onClick={() => deleteLot(lot.id)}><Trash2 size={14} /></button>}
                      </div>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3 mt-2">
                    <div>
                      <p className="text-xs text-brand-700/60 mb-1">Prévu : {lot.plannedProgress}%</p>
                      <ProgressBar value={lot.plannedProgress} />
                    </div>
                    <div>
                      <p className="text-xs text-brand-700/60 mb-1">Réalisé : {lot.actualProgress}%</p>
                      <ProgressBar value={lot.actualProgress} showLabel />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === "intervenants" && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-brand-900">Intervenants du projet</h3>
            {isCompanyAdmin && <Link to="/members" className="btn-soft btn-sm"><Pencil size={14} /> Gérer les accès</Link>}
          </div>
          {(!project.access || project.access.length === 0) ? (
            <EmptyState icon={Users2} title="Aucun intervenant" subtitle="Ajoutez des membres depuis « Équipe & accès »." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {project.access.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white/50 border border-white/60">
                  <Avatar name={`${a.user.firstName} ${a.user.lastName}`} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-brand-900 truncate">{a.user.firstName} {a.user.lastName}</p>
                    <p className="text-xs text-brand-700/60">{a.roleLabel || ROLE_LABELS[a.type] || a.type || "Intervenant"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <LotModal open={lotModal} onClose={() => setLotModal(false)} projectId={id} onSaved={() => { setLotModal(false); load(); toast("Lot ajouté"); }} />
      <ProgressModal lot={progressModal} onClose={() => setProgressModal(null)} onSaved={() => { setProgressModal(null); load(); toast("Avancement enregistré"); }} />
      <ProjectFormModal open={editModal} project={project} onClose={() => setEditModal(false)} onSaved={() => { setEditModal(false); load(); toast("Projet mis à jour"); }} />
    </div>
  );
}

function LotModal({ open, onClose, projectId, onSaved }) {
  const [form, setForm] = useState({ category: "GROS_OEUVRE" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/lots", { ...form, projectId });
    setForm({ category: "GROS_OEUVRE" }); onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un lot">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom du lot *"><Input value={form.name || ""} onChange={set("name")} required /></Field>
        <Field label="Catégorie">
          <Select value={form.category} onChange={set("category")}>
            {enumToOptions(LOT_CATEGORIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Poids (%)"><Input type="number" value={form.weight || ""} onChange={set("weight")} /></Field>
          <Field label="Avancement prévu (%)"><Input type="number" value={form.plannedProgress || ""} onChange={set("plannedProgress")} /></Field>
        </div>
        <Field label="Montant (MAD)"><Input type="number" value={form.amount || ""} onChange={set("amount")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Ajouter</button></div>
      </form>
    </Modal>
  );
}

function ProgressModal({ lot, onClose, onSaved }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (lot) setForm({ percentage: lot.actualProgress }); }, [lot]);
  if (!lot) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    await api.post(`/lots/${lot.id}/progress`, form);
    onSaved();
  };
  return (
    <Modal open={!!lot} onClose={onClose} title={`Avancement · ${lot.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Pourcentage réalisé (%)"><Input type="number" min="0" max="100" value={form.percentage ?? ""} onChange={set("percentage")} required /></Field>
        <Field label="Quantité exécutée"><Input type="number" value={form.quantityExecuted || ""} onChange={set("quantityExecuted")} /></Field>
        <Field label="Note / observation"><Input value={form.note || ""} onChange={set("note")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><TrendingUp size={16} /> Enregistrer</button></div>
      </form>
    </Modal>
  );
}


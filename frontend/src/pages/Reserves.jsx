import { useEffect, useState } from "react";
import { AlertTriangle, Plus, MapPin, User, ChevronRight } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Badge, Modal, Field, Input, Textarea, Select, EmptyState } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { RESERVE_STATUS, PRIORITY, ROLE_LABELS, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAccess } from "../lib/permissions.js";

const COLUMNS = ["OUVERTE", "EN_COURS", "TRAITEE", "VALIDEE"];

export default function Reserves() {
  const { toast } = useToast();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canCreate = projectCan(project, "reserves", "CONTRIBUTE");
  const [reserves, setReserves] = useState(null);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => {
    const params = projectId ? { projectId } : {};
    api.get("/reserves", { params }).then((r) => setReserves(r.data)).catch(() => setReserves([]));
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => { api.get("/users").then((r) => setUsers(r.data)); }, []);

  const changeStatus = async (reserve, status) => {
    await api.put(`/reserves/${reserve.id}`, { status });
    load(); toast(`Réserve · ${RESERVE_STATUS[status].label}`);
  };

  return (
    <div>
      <PageHeader
        title="Réserves & non-conformités" subtitle="Suivi et levée des réserves" icon={AlertTriangle}
        actions={<div className="flex gap-2">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouvelle réserve</button>}
        </div>}
      />

      {!reserves ? <Spinner /> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const items = reserves.filter((r) => r.status === col);
            return (
              <div key={col} className="glass-sm p-3">
                <div className="flex items-center justify-between mb-3 px-1">
                  <Badge className={RESERVE_STATUS[col].color}>{RESERVE_STATUS[col].label}</Badge>
                  <span className="text-xs font-bold text-brand-700/60">{items.length}</span>
                </div>
                <div className="space-y-2.5 min-h-[60px]">
                  {items.map((r) => (
                    <div key={r.id} className="bg-white/70 rounded-xl p-3 border border-white/70 cursor-pointer hover:shadow-glass-sm transition" onClick={() => setDetail(r)}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-sm text-brand-900 leading-tight">{r.title}</p>
                        <Badge className={PRIORITY[r.priority].color + " shrink-0 text-[10px]"}>{PRIORITY[r.priority].label}</Badge>
                      </div>
                      {r.location && <p className="flex items-center gap-1 text-xs text-brand-700/60 mb-1"><MapPin size={11} /> {r.location}</p>}
                      {r.assignedTo && <p className="flex items-center gap-1 text-xs text-brand-700/60"><User size={11} /> {r.assignedTo.firstName} {r.assignedTo.lastName}</p>}
                    </div>
                  ))}
                  {items.length === 0 && <p className="text-center text-xs text-brand-700/40 py-4">-</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ReserveModal open={open} onClose={() => setOpen(false)} projectId={projectId} users={users} onSaved={() => { setOpen(false); load(); toast("Réserve créée"); }} />
      <ReserveDetail reserve={detail} canEdit={canCreate} onClose={() => setDetail(null)} onChangeStatus={changeStatus} />
    </div>
  );
}

function ReserveModal({ open, onClose, projectId, users, onSaved }) {
  const [form, setForm] = useState({ priority: "MOYENNE" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/reserves", { ...form, projectId });
    setForm({ priority: "MOYENNE" }); onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle réserve">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Intitulé *"><Input value={form.title || ""} onChange={set("title")} required /></Field>
        <Field label="Description"><Textarea value={form.description || ""} onChange={set("description")} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Localisation"><Input value={form.location || ""} onChange={set("location")} placeholder="Bloc A - Étage 2" /></Field>
          <Field label="Priorité">
            <Select value={form.priority} onChange={set("priority")}>
              {enumToOptions(PRIORITY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Affecter à">
          <Select value={form.assignedToId || ""} onChange={set("assignedToId")}>
            <option value="">- Non affectée -</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName} - {ROLE_LABELS[u.role]}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer</button></div>
      </form>
    </Modal>
  );
}

function ReserveDetail({ reserve, canEdit, onClose, onChangeStatus }) {
  if (!reserve) return null;
  return (
    <Modal open={!!reserve} onClose={onClose} title={reserve.title}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Badge className={RESERVE_STATUS[reserve.status].color}>{RESERVE_STATUS[reserve.status].label}</Badge>
          <Badge className={PRIORITY[reserve.priority].color}>{PRIORITY[reserve.priority].label}</Badge>
        </div>
        {reserve.description && <p className="text-sm text-brand-800/80">{reserve.description}</p>}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {reserve.location && <div className="bg-white/50 rounded-xl p-3 border border-white/60"><p className="text-xs text-brand-700/60">Localisation</p><p className="font-medium">{reserve.location}</p></div>}
          {reserve.assignedTo && <div className="bg-white/50 rounded-xl p-3 border border-white/60"><p className="text-xs text-brand-700/60">Responsable</p><p className="font-medium">{reserve.assignedTo.firstName} {reserve.assignedTo.lastName}</p></div>}
          <div className="bg-white/50 rounded-xl p-3 border border-white/60"><p className="text-xs text-brand-700/60">Créée par</p><p className="font-medium">{reserve.createdBy?.firstName} {reserve.createdBy?.lastName}</p></div>
          <div className="bg-white/50 rounded-xl p-3 border border-white/60"><p className="text-xs text-brand-700/60">Date</p><p className="font-medium">{new Date(reserve.createdAt).toLocaleDateString("fr-FR")}</p></div>
        </div>
        {canEdit && (
          <div>
            <p className="label">Faire évoluer le statut</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(RESERVE_STATUS).map(([k, v]) => (
                <button key={k} onClick={() => onChangeStatus(reserve, k)} disabled={k === reserve.status}
                  className={`badge ${v.color} ${k === reserve.status ? "ring-2 ring-brand-400" : "hover:opacity-80"} disabled:opacity-100`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

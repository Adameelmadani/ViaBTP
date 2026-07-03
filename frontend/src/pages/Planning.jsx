import { useEffect, useState, useMemo } from "react";
import { CalendarRange, Plus, Trash2, User } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, Textarea, EmptyState, Badge } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { TASK_STATUS, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

// Barres de Gantt : palette verte/orange (neutre pour « à faire »)
const STATUS_BAR = { A_FAIRE: "#9fb3a8", EN_COURS: "#ff8a4c", TERMINE: "#16b563", EN_RETARD: "#f15206" };
const DAY = 86400000;

export default function Planning() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canCreate = projectCan(project, "planning", "CONTRIBUTE");
  const canDeleteTask = projectCan(project, "planning", "MANAGE");
  const [tasks, setTasks] = useState(null);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);

  const load = () => api.get(`/tasks/project/${projectId}`).then((r) => setTasks(r.data)).catch(() => setTasks([]));
  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => { api.get("/users").then((r) => setUsers(r.data)); }, []);

  const { range, months } = useMemo(() => {
    if (!tasks || tasks.length === 0) return { range: null, months: [] };
    const starts = tasks.map((t) => new Date(t.startDate).getTime());
    const ends = tasks.map((t) => new Date(t.endDate).getTime());
    const min = Math.min(...starts), max = Math.max(...ends);
    const total = max - min || DAY;
    // génère les libellés de mois
    const m = [];
    let d = new Date(min); d.setDate(1);
    while (d.getTime() <= max) {
      m.push({ label: d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" }), offset: ((d.getTime() - min) / total) * 100 });
      d.setMonth(d.getMonth() + 1);
    }
    return { range: { min, max, total }, months: m };
  }, [tasks]);

  const remove = async (t) => { if (!(await confirm("Supprimer cette tâche ?"))) return; await api.delete(`/tasks/${t.id}`); load(); toast("Tâche supprimée"); };

  return (
    <div>
      <PageHeader
        title="Planning chantier" subtitle="Diagramme de Gantt & jalons" icon={CalendarRange}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouvelle tâche</button>}
        </div>}
      />

      {!tasks ? <Spinner /> : tasks.length === 0 ? (
        <Card><EmptyState icon={CalendarRange} title="Aucune tâche planifiée" /></Card>
      ) : (
        <Card className="overflow-x-auto">
          <div className="min-w-[760px]">
            {/* En-tête des mois */}
            <div className="flex">
              <div className="w-56 shrink-0" />
              <div className="relative flex-1 h-6 border-b border-brand-100">
                {months.map((m, i) => (
                  <span key={i} className="absolute text-[11px] font-semibold text-brand-700/60" style={{ left: `${m.offset}%` }}>{m.label}</span>
                ))}
              </div>
            </div>
            {/* Lignes */}
            <div className="divide-y divide-brand-50">
              {tasks.map((t) => {
                const s = new Date(t.startDate).getTime(), e = new Date(t.endDate).getTime();
                const left = ((s - range.min) / range.total) * 100;
                const width = Math.max(((e - s) / range.total) * 100, 1.5);
                return (
                  <div key={t.id} className="flex items-center group">
                    <div className="w-56 shrink-0 py-2.5 pr-3">
                      <p className="text-sm font-semibold text-brand-900 truncate">{t.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={TASK_STATUS[t.status].color + " text-[10px]"}>{TASK_STATUS[t.status].label}</Badge>
                        {t.assignedTo && <span className="text-[10px] text-brand-700/50 truncate">{t.assignedTo.firstName}</span>}
                      </div>
                    </div>
                    <div className="relative flex-1 h-12">
                      <div className="absolute top-1/2 -translate-y-1/2 h-6 rounded-lg shadow-sm flex items-center px-2 overflow-hidden"
                        style={{ left: `${left}%`, width: `${width}%`, background: STATUS_BAR[t.status] }}>
                        <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${t.progress}%` }} />
                        <span className="relative text-[10px] font-bold text-white whitespace-nowrap">{Math.round(t.progress)}%</span>
                      </div>
                      {canDeleteTask && (
                        <button onClick={() => remove(t)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      <TaskModal open={open} onClose={() => setOpen(false)} projectId={projectId} users={users} onSaved={() => { setOpen(false); load(); toast("Tâche créée"); }} />
    </div>
  );
}

function TaskModal({ open, onClose, projectId, users, onSaved }) {
  const [form, setForm] = useState({ status: "A_FAIRE", progress: 0 });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); await api.post("/tasks", { ...form, projectId }); setForm({ status: "A_FAIRE", progress: 0 }); onSaved(); };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle tâche">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom de la tâche *"><Input value={form.name || ""} onChange={set("name")} required /></Field>
        <Field label="Description"><Textarea value={form.description || ""} onChange={set("description")} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date de début *"><Input type="date" value={form.startDate || ""} onChange={set("startDate")} required /></Field>
          <Field label="Date de fin *"><Input type="date" value={form.endDate || ""} onChange={set("endDate")} required /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Avancement (%)"><Input type="number" min="0" max="100" value={form.progress} onChange={set("progress")} /></Field>
          <Field label="Statut">
            <Select value={form.status} onChange={set("status")}>
              {enumToOptions(TASK_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Responsable">
          <Select value={form.assignedToId || ""} onChange={set("assignedToId")}>
            <option value="">- Aucun -</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
          </Select>
        </Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer</button></div>
      </form>
    </Modal>
  );
}

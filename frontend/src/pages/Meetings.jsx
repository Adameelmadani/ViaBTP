import { useEffect, useState } from "react";
import { Users2, Plus, Calendar, MapPin, CheckSquare, Square, ListChecks, Pencil } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, Textarea, EmptyState, Badge, Avatar } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { TASK_STATUS, ROLE_LABELS } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Meetings() {
  const { toast } = useToast();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canManage = projectCan(project, "meetings", "MANAGE");
  const canContribute = projectCan(project, "meetings", "CONTRIBUTE");
  const [meetings, setMeetings] = useState(null);
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => api.get("/meetings", { params: { projectId } }).then((r) => setMeetings(r.data)).catch(() => setMeetings([]));
  useEffect(() => { if (projectId) load(); }, [projectId]);
  useEffect(() => { api.get("/users").then((r) => setUsers(r.data)); }, []);

  const openDetail = async (m) => { const r = await api.get(`/meetings/${m.id}`); setDetail(r.data); };
  const refreshDetail = async () => {
    if (!detail) return;
    const r = await api.get(`/meetings/${detail.id}`);
    setDetail(r.data);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Réunions de chantier" subtitle="Comptes rendus, présences & actions à suivre" icon={Users2}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canManage && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Planifier</button>}
        </div>}
      />

      {!meetings ? <Spinner /> : meetings.length === 0 ? (
        <Card><EmptyState icon={Users2} title="Aucune réunion" /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {meetings.map((m) => {
            const done = m.actions?.filter((a) => a.status === "TERMINE").length || 0;
            return (
              <Card key={m.id} hover className="cursor-pointer" onClick={() => openDetail(m)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-brand-900">{m.title}</h3>
                  <Badge className="bg-brand-50 text-brand-700">{done}/{m.actions?.length || 0} actions</Badge>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-brand-700/70 mb-3">
                  <span className="flex items-center gap-1"><Calendar size={13} /> {new Date(m.date).toLocaleDateString("fr-FR", { dateStyle: "long" })}</span>
                  {m.location && <span className="flex items-center gap-1"><MapPin size={13} /> {m.location}</span>}
                </div>
                <div className="flex -space-x-2">
                  {m.attendees?.slice(0, 6).map((a) => <Avatar key={a.id} name={`${a.user.firstName} ${a.user.lastName}`} size={28} />)}
                  {m.attendees?.length > 6 && <span className="grid place-items-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">+{m.attendees.length - 6}</span>}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <MeetingModal open={open} onClose={() => setOpen(false)} projectId={projectId} users={users} onSaved={() => { setOpen(false); load(); toast("Réunion planifiée"); }} />
      <MeetingDetail meeting={detail} users={users} canManage={canManage} canContribute={canContribute} onClose={() => setDetail(null)} onRefresh={refreshDetail} />
    </div>
  );
}

function MeetingDetail({ meeting, users, canManage, canContribute, onClose, onRefresh }) {
  const { toast } = useToast();
  const [minutes, setMinutes] = useState("");
  const [editingMin, setEditingMin] = useState(false);
  const [newAction, setNewAction] = useState({ description: "", assignedToId: "", dueDate: "" });

  useEffect(() => {
    if (meeting) { setMinutes(meeting.minutes || ""); setEditingMin(false); setNewAction({ description: "", assignedToId: "", dueDate: "" }); }
  }, [meeting?.id]);

  if (!meeting) return null;

  const toggleAttendance = async (a) => {
    await api.patch(`/meetings/${meeting.id}/attendance`, { attendeeId: a.id, present: !a.present });
    onRefresh();
  };
  const setActionStatus = async (ac, status) => {
    await api.patch(`/meetings/actions/${ac.id}`, { status });
    onRefresh();
  };
  const addAction = async (e) => {
    e.preventDefault();
    if (!newAction.description.trim()) return;
    await api.post(`/meetings/${meeting.id}/actions`, newAction);
    setNewAction({ description: "", assignedToId: "", dueDate: "" });
    onRefresh(); toast("Action ajoutée");
  };
  const saveMinutes = async () => {
    await api.put(`/meetings/${meeting.id}`, { minutes });
    setEditingMin(false); onRefresh(); toast("Compte rendu enregistré");
  };

  const presentCount = meeting.attendees.filter((a) => a.present).length;

  return (
    <Modal open={!!meeting} onClose={onClose} title={meeting.title} size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3 text-sm text-brand-700/70">
          <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(meeting.date).toLocaleDateString("fr-FR", { dateStyle: "full" })}</span>
          {meeting.location && <span className="flex items-center gap-1"><MapPin size={14} /> {meeting.location}</span>}
        </div>
        {meeting.agenda && <div><p className="label">Ordre du jour</p><p className="text-sm text-brand-800/80 whitespace-pre-line bg-white/50 rounded-xl p-3 border border-white/60">{meeting.agenda}</p></div>}

        {/* Compte rendu éditable */}
        <div>
          <div className="flex items-center justify-between">
            <p className="label">Compte rendu</p>
            {!editingMin && canManage && <button className="text-xs font-semibold text-brand-600 hover:underline flex items-center gap-1" onClick={() => setEditingMin(true)}><Pencil size={12} /> {meeting.minutes ? "Modifier" : "Ajouter"}</button>}
          </div>
          {editingMin ? (
            <div className="space-y-2">
              <Textarea rows={4} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="Rédigez le compte rendu de la réunion..." />
              <div className="flex justify-end gap-2">
                <button className="btn-ghost btn-sm" onClick={() => { setMinutes(meeting.minutes || ""); setEditingMin(false); }}>Annuler</button>
                <button className="btn-primary btn-sm" onClick={saveMinutes}>Enregistrer</button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-brand-800/80 whitespace-pre-line bg-white/50 rounded-xl p-3 border border-white/60">{meeting.minutes || <span className="text-brand-700/40">Aucun compte rendu.</span>}</p>
          )}
        </div>

        {/* Présence */}
        <div>
          <p className="label">Liste de présence <span className="text-brand-700/50 font-normal">· {presentCount}/{meeting.attendees.length} présents</span></p>
          <div className="grid sm:grid-cols-2 gap-2">
            {meeting.attendees.map((a) => (
              <button key={a.id} onClick={canContribute ? () => toggleAttendance(a) : undefined} disabled={!canContribute} className={`flex items-center gap-2 p-2 rounded-xl bg-white/50 border border-white/60 text-left ${canContribute ? "hover:bg-white/80 transition" : "cursor-default"}`}>
                {a.present ? <CheckSquare size={18} className="text-brand-600" /> : <Square size={18} className="text-brand-300" />}
                <Avatar name={`${a.user.firstName} ${a.user.lastName}`} size={28} />
                <div className="min-w-0"><p className="text-sm font-medium text-brand-900 truncate">{a.user.firstName} {a.user.lastName}</p><p className="text-[10px] text-brand-700/60">{ROLE_LABELS[a.user.role]}</p></div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions à suivre */}
        <div>
          <p className="label flex items-center gap-1"><ListChecks size={14} /> Actions à suivre</p>
          <div className="space-y-2">
            {meeting.actions.length === 0 && <p className="text-sm text-brand-700/50">Aucune action pour le moment.</p>}
            {meeting.actions.map((ac) => (
              <div key={ac.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/50 border border-white/60">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-brand-900">{ac.description}</p>
                  {ac.assignedTo && <p className="text-xs text-brand-700/60">Resp. : {ac.assignedTo.firstName} {ac.assignedTo.lastName}{ac.dueDate ? ` · échéance ${new Date(ac.dueDate).toLocaleDateString("fr-FR")}` : ""}</p>}
                </div>
                <select value={ac.status} onChange={(e) => setActionStatus(ac, e.target.value)} disabled={!canContribute} className={`badge border-0 shrink-0 ${canContribute ? "cursor-pointer" : ""} ${TASK_STATUS[ac.status].color}`}>
                  {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Ajout d'une action */}
          {canContribute && (
          <form onSubmit={addAction} className="mt-3 grid sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end bg-white/40 rounded-xl p-3 border border-white/60">
            <Field label="Nouvelle action" className="min-w-0">
              <Input value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} placeholder="Décrire l'action..." />
            </Field>
            <Field label="Responsable">
              <Select value={newAction.assignedToId} onChange={(e) => setNewAction({ ...newAction, assignedToId: e.target.value })}>
                <option value="">- Aucun -</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
              </Select>
            </Field>
            <Field label="Échéance">
              <Input type="date" value={newAction.dueDate} onChange={(e) => setNewAction({ ...newAction, dueDate: e.target.value })} />
            </Field>
            <button type="submit" className="btn-soft"><Plus size={16} /> Ajouter</button>
          </form>
          )}
        </div>
      </div>
    </Modal>
  );
}

function MeetingModal({ open, onClose, projectId, users, onSaved }) {
  const [form, setForm] = useState({});
  const [attendeeIds, setAttendeeIds] = useState([]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggle = (id) => setAttendeeIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const submit = async (e) => {
    e.preventDefault();
    await api.post("/meetings", { ...form, projectId, attendeeIds });
    setForm({}); setAttendeeIds([]); onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title="Planifier une réunion" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Titre *"><Input value={form.title || ""} onChange={set("title")} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *"><Input type="datetime-local" value={form.date || ""} onChange={set("date")} required /></Field>
          <Field label="Lieu"><Input value={form.location || ""} onChange={set("location")} /></Field>
        </div>
        <Field label="Ordre du jour"><Textarea value={form.agenda || ""} onChange={set("agenda")} /></Field>
        <Field label="Compte rendu (optionnel)"><Textarea value={form.minutes || ""} onChange={set("minutes")} /></Field>
        <Field label="Participants">
          <div className="grid sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto p-1">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-brand-50 cursor-pointer text-sm">
                <input type="checkbox" checked={attendeeIds.includes(u.id)} onChange={() => toggle(u.id)} className="accent-brand-600" />
                {u.firstName} {u.lastName}
              </label>
            ))}
          </div>
        </Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Planifier</button></div>
      </form>
    </Modal>
  );
}

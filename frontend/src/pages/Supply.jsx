import { useEffect, useState } from "react";
import { Warehouse, Plus, ArrowRight, Calendar, Ban } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, Textarea, EmptyState, Badge } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { SUPPLY_STATUS, PRIORITY, fmtNum, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

const FLOW = ["BROUILLON", "EN_ATTENTE", "VALIDEE", "COMMANDEE", "LIVREE", "CLOTUREE"];
// Une demande ne peut être rejetée que tant qu'elle n'est pas encore commandée.
const REJECTABLE = ["BROUILLON", "EN_ATTENTE", "VALIDEE"];

export default function Supply() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canCreate = projectCan(project, "supply", "CONTRIBUTE");
  const [requests, setRequests] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);

  const load = () => {
    const params = { projectId };
    if (status) params.status = status;
    api.get("/supply", { params }).then((r) => setRequests(r.data)).catch(() => setRequests([]));
  };
  useEffect(() => { if (projectId) load(); }, [projectId, status]);
  useEffect(() => { api.get("/materials").then((r) => setMaterials(r.data)); }, []);

  const canValidate = projectCan(project, "supply", "MANAGE");
  const advance = async (req) => {
    const idx = FLOW.indexOf(req.status);
    const next = FLOW[idx + 1];
    if (!next) return;
    await api.patch(`/supply/${req.id}/status`, { status: next });
    load(); toast(`Demande : ${SUPPLY_STATUS[next].label}`);
  };
  const reject = async (req) => {
    if (!(await confirm({
      title: "Rejeter la demande",
      message: `Rejeter la demande de « ${req.material?.designation} » ?`,
      confirmLabel: "Rejeter",
    }))) return;
    await api.patch(`/supply/${req.id}/status`, { status: "REJETEE" });
    load(); toast("Demande rejetée");
  };

  return (
    <div>
      <PageHeader
        title="Demandes d'approvisionnement" subtitle="Workflow de validation des besoins chantier" icon={Warehouse}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canCreate && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouvelle demande</button>}
        </div>}
      />

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setStatus("")} className={`badge ${!status ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}>Toutes</button>
        {Object.entries(SUPPLY_STATUS).map(([k, v]) => (
          <button key={k} onClick={() => setStatus(k)} className={`badge ${status === k ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-700"}`}>{v.label}</button>
        ))}
      </div>

      {!requests ? <Spinner /> : requests.length === 0 ? (
        <Card><EmptyState icon={Warehouse} title="Aucune demande" /></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center gap-4">
              <div className="grid place-items-center w-11 h-11 rounded-xl bg-brand-50 text-brand-600 shrink-0"><Warehouse size={20} /></div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-brand-900">{r.material?.designation}</p>
                <p className="text-xs text-brand-700/60">{fmtNum(r.quantity)} {r.material?.unit} · demandé par {r.requester?.firstName} {r.requester?.lastName}</p>
                {r.observations && <p className="text-xs text-brand-700/50 mt-0.5 italic">{r.observations}</p>}
              </div>
              <Badge className={PRIORITY[r.urgency].color}>{PRIORITY[r.urgency].label}</Badge>
              {r.desiredDate && <span className="flex items-center gap-1 text-xs text-brand-700/60"><Calendar size={13} /> {new Date(r.desiredDate).toLocaleDateString("fr-FR")}</span>}
              <Badge className={SUPPLY_STATUS[r.status].color}>{SUPPLY_STATUS[r.status].label}</Badge>
              {canValidate && FLOW.indexOf(r.status) >= 0 && FLOW.indexOf(r.status) < FLOW.length - 1 && (
                <button className="btn-soft btn-sm" onClick={() => advance(r)}>{SUPPLY_STATUS[FLOW[FLOW.indexOf(r.status) + 1]].label} <ArrowRight size={13} /></button>
              )}
              {canValidate && REJECTABLE.includes(r.status) && (
                <button className="btn-danger btn-sm" onClick={() => reject(r)}><Ban size={13} /> Rejeter</button>
              )}
            </Card>
          ))}
        </div>
      )}

      <SupplyModal open={open} onClose={() => setOpen(false)} projectId={projectId} materials={materials} onSaved={() => { setOpen(false); load(); toast("Demande créée"); }} />
    </div>
  );
}

function SupplyModal({ open, onClose, projectId, materials, onSaved }) {
  const [form, setForm] = useState({ urgency: "MOYENNE", status: "EN_ATTENTE" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); await api.post("/supply", { ...form, projectId }); setForm({ urgency: "MOYENNE", status: "EN_ATTENTE" }); onSaved(); };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle demande d'approvisionnement">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Matériau *">
          <Select value={form.materialId || ""} onChange={set("materialId")} required>
            <option value="">Sélectionner...</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.designation}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantité *"><Input type="number" step="any" value={form.quantity || ""} onChange={set("quantity")} required /></Field>
          <Field label="Urgence"><Select value={form.urgency} onChange={set("urgency")}>{enumToOptions(PRIORITY).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date souhaitée"><Input type="date" value={form.desiredDate || ""} onChange={set("desiredDate")} /></Field>
          <Field label="Statut initial"><Select value={form.status} onChange={set("status")}><option value="BROUILLON">Brouillon</option><option value="EN_ATTENTE">En attente</option></Select></Field>
        </div>
        <Field label="Observations"><Textarea value={form.observations || ""} onChange={set("observations")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer</button></div>
      </form>
    </Modal>
  );
}

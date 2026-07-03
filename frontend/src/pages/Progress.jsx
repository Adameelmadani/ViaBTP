import { useEffect, useState } from "react";
import { ClipboardList, TrendingUp, Plus, History } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, ProgressBar, Modal, Field, Input, EmptyState, Badge } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { LOT_CATEGORIES } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Progress() {
  const { toast } = useToast();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const [lots, setLots] = useState(null);
  const [progressModal, setProgressModal] = useState(null);
  const [history, setHistory] = useState(null);

  const load = () => api.get(`/lots/project/${projectId}`).then((r) => setLots(r.data)).catch(() => setLots([]));
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const project = projects.find((p) => p.id === projectId);
  const chartData = (lots || []).map((l) => ({ name: LOT_CATEGORIES[l.category]?.slice(0, 10) || l.name, Prévu: l.plannedProgress, Réalisé: l.actualProgress }));

  const openHistory = async (lot) => {
    const r = await api.get(`/lots/${lot.id}/history`);
    setHistory({ lot, updates: r.data });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Suivi d'avancement" subtitle="Avancement physique par lot" icon={ClipboardList}
        actions={<ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />}
      />

      {!lots ? <Spinner /> : (
        <>
          {project && (
            <Card className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-brand-700/60">Avancement global · {project.name}</p>
                <p className="font-display text-3xl font-extrabold text-brand-700">{Math.round(project.progress)}%</p>
              </div>
              <div className="flex-1 min-w-[200px] max-w-md"><ProgressBar value={project.progress} /></div>
            </Card>
          )}

          {lots.length === 0 ? (
            <Card><EmptyState icon={ClipboardList} title="Aucun lot" subtitle="Ajoutez des lots depuis la fiche projet." /></Card>
          ) : (
            <>
              <Card>
                <h3 className="font-bold text-brand-900 mb-4">Prévu vs Réalisé par lot</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#d6f9e2" vertical={false} />
                    <XAxis dataKey="name" stroke="#0a7543" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#0a7543" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #aff2c8" }} />
                    <Legend />
                    <Bar dataKey="Prévu" fill="#aff2c8" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Réalisé" fill="#16b563" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="space-y-3">
                {lots.map((lot) => (
                  <Card key={lot.id}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-900">{lot.name}</p>
                        <p className="text-xs text-brand-700/60">{LOT_CATEGORIES[lot.category]} · Poids {lot.weight}%</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn-ghost btn-sm" onClick={() => openHistory(lot)}><History size={14} /> Historique</button>
                        {projectCan(project, "lots", "CONTRIBUTE") && <button className="btn-primary btn-sm" onClick={() => setProgressModal(lot)}><TrendingUp size={14} /> Mettre à jour</button>}
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4 mt-3">
                      <div><p className="text-xs text-brand-700/60 mb-1">Prévu {lot.plannedProgress}%</p><ProgressBar value={lot.plannedProgress} /></div>
                      <div><p className="text-xs text-brand-700/60 mb-1">Réalisé {lot.actualProgress}%</p><ProgressBar value={lot.actualProgress} showLabel /></div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <ProgressModal lot={progressModal} onClose={() => setProgressModal(null)} onSaved={() => { setProgressModal(null); load(); toast("Avancement enregistré"); }} />
      <Modal open={!!history} onClose={() => setHistory(null)} title={`Historique · ${history?.lot.name || ""}`}>
        {history?.updates.length === 0 ? <EmptyState icon={History} title="Aucune mise à jour" /> : (
          <div className="space-y-2">
            {history?.updates.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-white/50 border border-white/60">
                <div>
                  <p className="font-semibold text-brand-900">{u.percentage}% {u.validated && <Badge className="bg-brand-100 text-brand-700 ml-1">Validé</Badge>}</p>
                  <p className="text-xs text-brand-700/60">{u.user?.firstName} {u.user?.lastName} · {new Date(u.date).toLocaleDateString("fr-FR")}</p>
                  {u.note && <p className="text-xs text-brand-700/70 mt-0.5">{u.note}</p>}
                </div>
                {u.quantityExecuted != null && <span className="text-sm font-medium text-brand-700">{u.quantityExecuted} u</span>}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProgressModal({ lot, onClose, onSaved }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (lot) setForm({ percentage: lot.actualProgress }); }, [lot]);
  if (!lot) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); await api.post(`/lots/${lot.id}/progress`, form); onSaved(); };
  return (
    <Modal open={!!lot} onClose={onClose} title={`Avancement · ${lot.name}`}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Pourcentage réalisé (%)"><Input type="number" min="0" max="100" value={form.percentage ?? ""} onChange={set("percentage")} required /></Field>
        <Field label="Quantité exécutée"><Input type="number" value={form.quantityExecuted || ""} onChange={set("quantityExecuted")} /></Field>
        <Field label="Note"><Input value={form.note || ""} onChange={set("note")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><TrendingUp size={16} /> Enregistrer</button></div>
      </form>
    </Modal>
  );
}

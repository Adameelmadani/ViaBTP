import { useEffect, useState } from "react";
import { Wallet, Plus, TrendingUp, Banknote, Receipt, Trash2 } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import api from "../api/client.js";
import { PageHeader, Card, StatCard, Spinner, Modal, Field, Input, Select, Textarea, EmptyState, Badge, ProgressBar } from "../components/ui.jsx";
import ProjectPicker from "../components/ProjectPicker.jsx";
import { useProjects } from "../lib/hooks.js";
import { FINANCE_TYPE, FINANCE_STATUS, fmtMAD, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Finance() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { projectCan } = useAccess();
  const { projects, projectId, setProjectId } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const canEditFin = projectCan(project, "finance", "CONTRIBUTE");
  const canDelFin = projectCan(project, "finance", "MANAGE");
  const [records, setRecords] = useState(null);
  const [summary, setSummary] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/finance", { params: { projectId } }).then((r) => setRecords(r.data)).catch(() => setRecords([]));
    api.get(`/finance/summary/${projectId}`).then((r) => setSummary(r.data)).catch(() => {});
  };
  useEffect(() => { if (projectId) load(); }, [projectId]);

  const changeStatus = async (rec, status) => { await api.put(`/finance/${rec.id}`, { status }); load(); toast("Statut mis à jour"); };
  const remove = async (rec) => { if (!(await confirm("Supprimer cet enregistrement ?"))) return; await api.delete(`/finance/${rec.id}`); load(); toast("Supprimé"); };

  const billedPct = summary?.marketAmount ? (summary.billed / summary.marketAmount) * 100 : 0;
  const chartData = (records || []).slice().reverse().map((r, i) => ({ name: r.number, cumul: (r.cumulativeAmount || 0) / 1e6 }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gestion financière" subtitle="Situations de travaux, décomptes & suivi budgétaire" icon={Wallet}
        actions={<div className="flex gap-2 flex-wrap">
          <ProjectPicker projects={projects} value={projectId} onChange={setProjectId} />
          {canEditFin && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouvelle situation</button>}
        </div>}
      />

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Montant du marché" value={fmtMAD(summary.marketAmount)} icon={Banknote} tint="accent" />
          <StatCard label="Facturé (validé)" value={fmtMAD(summary.billed)} icon={Receipt} tint="brand" />
          <StatCard label="Payé" value={fmtMAD(summary.paid)} icon={Wallet} tint="brand" />
          <StatCard label="Reste à facturer" value={fmtMAD(summary.remaining)} icon={TrendingUp} tint="accent" />
        </div>
      )}

      {summary && summary.marketAmount > 0 && (
        <Card>
          <div className="flex justify-between text-sm mb-2"><span className="text-brand-700/70">Taux de facturation</span><span className="font-bold text-brand-900">{Math.round(billedPct)}%</span></div>
          <ProgressBar value={billedPct} />
        </Card>
      )}

      {!records ? <Spinner /> : (
        <>
          {records.length > 1 && (
            <Card>
              <h3 className="font-bold text-brand-900 mb-4">Facturation cumulée (M MAD)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData}>
                  <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#16b563" stopOpacity={0.4} /><stop offset="100%" stopColor="#16b563" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#d6f9e2" vertical={false} />
                  <XAxis dataKey="name" stroke="#0a7543" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#0a7543" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #aff2c8" }} formatter={(v) => `${v.toFixed(2)} M MAD`} />
                  <Area type="monotone" dataKey="cumul" stroke="#0a9350" strokeWidth={3} fill="url(#gf)" />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          )}

          {records.length === 0 ? (
            <Card><EmptyState icon={Wallet} title="Aucune situation" /></Card>
          ) : (
            <Card className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs font-semibold text-brand-700/60 border-b border-brand-100/60">
                  <th className="p-4">N°</th><th className="p-4">Type</th><th className="p-4">Date</th><th className="p-4 text-right">Montant</th><th className="p-4 text-right">Cumulé</th><th className="p-4">Statut</th><th className="p-4"></th>
                </tr></thead>
                <tbody className="divide-y divide-brand-50">
                  {records.map((r) => (
                    <tr key={r.id} className="hover:bg-white/40 transition">
                      <td className="p-4 font-semibold text-brand-900">{r.number}</td>
                      <td className="p-4 text-brand-700">{FINANCE_TYPE[r.type]}</td>
                      <td className="p-4 text-brand-700/70">{new Date(r.date).toLocaleDateString("fr-FR")}</td>
                      <td className="p-4 text-right font-semibold text-brand-900">{fmtMAD(r.amount)}</td>
                      <td className="p-4 text-right text-brand-700/70">{fmtMAD(r.cumulativeAmount)}</td>
                      <td className="p-4">
                        <select value={r.status} onChange={(e) => changeStatus(r, e.target.value)} disabled={!canEditFin} className={`badge border-0 ${canEditFin ? "cursor-pointer" : ""} ${FINANCE_STATUS[r.status].color}`}>
                          {Object.entries(FINANCE_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="p-4 text-right">{canDelFin && <button className="text-red-500 hover:text-red-700" onClick={() => remove(r)}><Trash2 size={15} /></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </>
      )}

      <FinanceModal open={open} onClose={() => setOpen(false)} projectId={projectId} onSaved={() => { setOpen(false); load(); toast("Situation créée"); }} />
    </div>
  );
}

function FinanceModal({ open, onClose, projectId, onSaved }) {
  const [form, setForm] = useState({ type: "SITUATION", status: "BROUILLON" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => { e.preventDefault(); await api.post("/finance", { ...form, projectId }); setForm({ type: "SITUATION", status: "BROUILLON" }); onSaved(); };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle situation / décompte">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Numéro *"><Input value={form.number || ""} onChange={set("number")} placeholder="SIT-005" required /></Field>
          <Field label="Type"><Select value={form.type} onChange={set("type")}>{enumToOptions(FINANCE_TYPE).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Montant (MAD) *"><Input type="number" value={form.amount || ""} onChange={set("amount")} required /></Field>
          <Field label="Montant cumulé (MAD)"><Input type="number" value={form.cumulativeAmount || ""} onChange={set("cumulativeAmount")} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date"><Input type="date" value={form.date || ""} onChange={set("date")} /></Field>
          <Field label="Statut"><Select value={form.status} onChange={set("status")}>{enumToOptions(FINANCE_STATUS).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
        </div>
        <Field label="Note"><Textarea value={form.note || ""} onChange={set("note")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer</button></div>
      </form>
    </Modal>
  );
}

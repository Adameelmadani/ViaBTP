import { useEffect, useState } from "react";
import { Boxes, Plus, ArrowDownToLine, ArrowUpFromLine, AlertTriangle } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, StatCard, Spinner, Modal, Field, Input, Select, Textarea, EmptyState, Badge } from "../components/ui.jsx";
import { fmtMAD, fmtNum } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Stock() {
  const { toast } = useToast();
  const { canCompany } = useAccess();
  const canMove = canCompany("stock", "CONTRIBUTE");
  const [movements, setMovements] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => {
    api.get("/stock/movements").then((r) => setMovements(r.data)).catch(() => setMovements([]));
    api.get("/stock/valuation").then((r) => setValuation(r.data)).catch(() => {});
  };
  useEffect(() => {
    load();
    api.get("/materials").then((r) => setMaterials(r.data));
    api.get("/projects").then((r) => setProjects(r.data));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Stock & mouvements" subtitle="Entrées / sorties, inventaire & valorisation" icon={Boxes}
        actions={canMove && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Mouvement</button>}
      />

      {valuation && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Valeur totale du stock" value={fmtMAD(valuation.totalValue)} icon={Boxes} tint="brand" />
          <StatCard label="Références suivies" value={valuation.itemCount} icon={Boxes} tint="brand" />
          <StatCard label="Alertes seuil" value={valuation.lowStockCount} icon={AlertTriangle} tint="accent" />
        </div>
      )}

      {valuation?.lowStock?.length > 0 && (
        <Card className="ring-1 ring-red-200">
          <h3 className="font-bold text-brand-900 mb-3 flex items-center gap-2"><AlertTriangle size={18} className="text-red-500" /> Alertes de rupture</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {valuation.lowStock.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2.5 rounded-xl bg-red-50/60 border border-red-100">
                <span className="text-sm font-medium text-brand-900 truncate">{m.designation}</span>
                <Badge className="bg-red-100 text-red-700">{fmtNum(m.stockAvailable)}/{fmtNum(m.stockMin)} {m.unit}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {!movements ? <Spinner /> : movements.length === 0 ? (
        <Card><EmptyState icon={Boxes} title="Aucun mouvement" /></Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs font-semibold text-brand-700/60 border-b border-brand-100/60">
              <th className="p-4">Type</th><th className="p-4">Matériau</th><th className="p-4 text-right">Quantité</th><th className="p-4">Projet</th><th className="p-4">Référence</th><th className="p-4">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-brand-50">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-white/40 transition">
                  <td className="p-4">
                    {m.type === "ENTREE"
                      ? <Badge className="bg-brand-100 text-brand-700"><ArrowDownToLine size={12} /> Entrée</Badge>
                      : <Badge className="bg-amber-100 text-amber-700"><ArrowUpFromLine size={12} /> Sortie</Badge>}
                  </td>
                  <td className="p-4 font-medium text-brand-900">{m.material?.designation}</td>
                  <td className="p-4 text-right font-semibold">{fmtNum(m.quantity)} {m.material?.unit}</td>
                  <td className="p-4 text-brand-700/70">{m.project?.name || "-"}</td>
                  <td className="p-4 text-brand-700/70">{m.reference || "-"}</td>
                  <td className="p-4 text-brand-700/70">{new Date(m.date).toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <MovementModal open={open} onClose={() => setOpen(false)} materials={materials} projects={projects} onSaved={() => { setOpen(false); load(); toast("Mouvement enregistré"); }} />
    </div>
  );
}

function MovementModal({ open, onClose, materials, projects, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ type: "ENTREE" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/stock/movements", form); setForm({ type: "ENTREE" }); onSaved(); }
    catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouveau mouvement de stock">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {["ENTREE", "SORTIE"].map((t) => (
            <button type="button" key={t} onClick={() => setForm({ ...form, type: t })}
              className={`btn ${form.type === t ? "btn-primary" : "btn-ghost"}`}>
              {t === "ENTREE" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />} {t === "ENTREE" ? "Entrée" : "Sortie"}
            </button>
          ))}
        </div>
        <Field label="Matériau *">
          <Select value={form.materialId || ""} onChange={set("materialId")} required>
            <option value="">Sélectionner...</option>
            {materials.map((m) => <option key={m.id} value={m.id}>{m.designation} (stock: {m.stockAvailable} {m.unit})</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantité *"><Input type="number" step="any" value={form.quantity || ""} onChange={set("quantity")} required /></Field>
          <Field label="Projet"><Select value={form.projectId || ""} onChange={set("projectId")}><option value="">- Aucun -</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        </div>
        <Field label="Référence"><Input value={form.reference || ""} onChange={set("reference")} placeholder="BL, BC..." /></Field>
        <Field label="Note"><Textarea value={form.note || ""} onChange={set("note")} /></Field>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Enregistrer</button></div>
      </form>
    </Modal>
  );
}

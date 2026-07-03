import { useEffect, useState } from "react";
import { Package, Plus, Search, AlertTriangle, Pencil, Trash2, MapPin } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, StatCard, Spinner, Modal, Field, Input, Select, EmptyState, Badge, ProgressBar } from "../components/ui.jsx";
import { MATERIAL_CATEGORIES, fmtMAD, fmtNum, enumToOptions } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Materials() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canCompany } = useAccess();
  const canEditMat = canCompany("materials", "CONTRIBUTE");
  const canDelMat = canCompany("materials", "MANAGE");
  const [materials, setMaterials] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [valuation, setValuation] = useState(null);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // valeur debouncée
  const [category, setCategory] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = () => {
    const params = {};
    if (query) params.q = query;
    if (category) params.category = category;
    if (lowOnly) params.lowStock = "true";
    api.get("/materials", { params }).then((r) => setMaterials(r.data)).catch(() => setMaterials([]));
    api.get("/stock/valuation").then((r) => setValuation(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [query, category, lowOnly]);
  useEffect(() => { api.get("/suppliers").then((r) => setSuppliers(r.data)); }, []);

  const remove = async (m) => { if (!(await confirm("Supprimer ce matériau ?"))) return; await api.delete(`/materials/${m.id}`); load(); toast("Supprimé"); };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Articles & matériaux" subtitle="Catalogue, stocks et seuils d'alerte" icon={Package}
        actions={canEditMat && <button className="btn-primary" onClick={() => { setEdit(null); setOpen(true); }}><Plus size={18} /> Nouveau matériau</button>}
      />

      {valuation && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Valeur du stock" value={fmtMAD(valuation.totalValue)} icon={Package} tint="brand" />
          <StatCard label="Références" value={valuation.itemCount} icon={Package} tint="brand" />
          <StatCard label="Stocks sous seuil" value={valuation.lowStockCount} icon={AlertTriangle} tint="accent" />
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
          <input className="input pl-10" placeholder="Rechercher..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select max-w-[180px]" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Toutes catégories</option>
          {Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={() => setLowOnly((v) => !v)} className={`btn ${lowOnly ? "btn-primary" : "btn-ghost"}`}><AlertTriangle size={16} /> Stock bas</button>
      </div>

      {!materials ? <Spinner /> : materials.length === 0 ? (
        <Card><EmptyState icon={Package} title="Aucun matériau" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {materials.map((m) => {
            const low = m.stockAvailable <= m.stockMin;
            const ratio = m.stockMin ? Math.min((m.stockAvailable / (m.stockMin * 2)) * 100, 100) : 100;
            return (
              <Card key={m.id} hover className={low ? "ring-1 ring-red-200" : ""}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-900 truncate">{m.designation}</p>
                    <p className="text-xs text-brand-700/60">{m.reference}</p>
                  </div>
                  <Badge className="bg-brand-50 text-brand-700 shrink-0">{MATERIAL_CATEGORIES[m.category]}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-brand-700/70">Stock</span>
                  <span className={`font-bold ${low ? "text-red-600" : "text-brand-900"}`}>{fmtNum(m.stockAvailable)} {m.unit}</span>
                </div>
                <ProgressBar value={ratio} />
                <div className="flex items-center justify-between mt-2 text-xs text-brand-700/60">
                  <span>Seuil : {fmtNum(m.stockMin)}</span>
                  <span className="font-semibold text-brand-800">{fmtMAD(m.unitPrice)}/{m.unit}</span>
                </div>
                {m.storageZone && <p className="flex items-center gap-1 text-xs text-brand-700/60 mt-2"><MapPin size={11} /> {m.storageZone}</p>}
                {low && <Badge className="bg-red-100 text-red-700 mt-2"><AlertTriangle size={11} /> Réapprovisionnement requis</Badge>}
                {(canEditMat || canDelMat) && (
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-brand-100/60">
                    {canEditMat && <button className="btn-ghost btn-sm flex-1" onClick={() => { setEdit(m); setOpen(true); }}><Pencil size={13} /> Modifier</button>}
                    {canDelMat && <button className="btn-danger btn-sm" onClick={() => remove(m)}><Trash2 size={13} /></button>}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <MaterialModal open={open} onClose={() => setOpen(false)} material={edit} suppliers={suppliers} onSaved={() => { setOpen(false); load(); toast(edit ? "Matériau modifié" : "Matériau créé"); }} />
    </div>
  );
}

function MaterialModal({ open, onClose, material, suppliers, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ category: "CIMENT", unit: "u" });
  useEffect(() => { setForm(material ? { ...material } : { category: "CIMENT", unit: "u" }); }, [material, open]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try {
      if (material) await api.put(`/materials/${material.id}`, form);
      else await api.post("/materials", form);
      onSaved();
    } catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };
  return (
    <Modal open={open} onClose={onClose} title={material ? "Modifier le matériau" : "Nouveau matériau"} size="lg">
      <form onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
        <Field label="Désignation *" className="sm:col-span-2"><Input value={form.designation || ""} onChange={set("designation")} required /></Field>
        <Field label="Référence *"><Input value={form.reference || ""} onChange={set("reference")} required /></Field>
        <Field label="Catégorie"><Select value={form.category} onChange={set("category")}>{enumToOptions(MATERIAL_CATEGORIES).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field>
        <Field label="Unité"><Input value={form.unit || ""} onChange={set("unit")} placeholder="sac, m³, tonne..." /></Field>
        <Field label="Prix unitaire (MAD)"><Input type="number" value={form.unitPrice || ""} onChange={set("unitPrice")} /></Field>
        <Field label="Stock disponible"><Input type="number" value={form.stockAvailable || ""} onChange={set("stockAvailable")} /></Field>
        <Field label="Stock minimum (seuil)"><Input type="number" value={form.stockMin || ""} onChange={set("stockMin")} /></Field>
        <Field label="Zone de stockage"><Input value={form.storageZone || ""} onChange={set("storageZone")} /></Field>
        <Field label="Fournisseur"><Select value={form.supplierId || ""} onChange={set("supplierId")}><option value="">- Aucun -</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
        <div className="sm:col-span-2 flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> {material ? "Enregistrer" : "Créer"}</button></div>
      </form>
    </Modal>
  );
}

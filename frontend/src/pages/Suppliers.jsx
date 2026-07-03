import { useEffect, useState } from "react";
import { Truck, Plus, Mail, Phone, MapPin, Star, Pencil, Trash2, Package, ShoppingCart } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, EmptyState, Badge } from "../components/ui.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

function Stars({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={13} className={i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-brand-200"} />
      ))}
      <span className="text-xs text-brand-700/60 ml-1">{value.toFixed(1)}</span>
    </div>
  );
}

export default function Suppliers() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canCompany } = useAccess();
  const canEditSup = canCompany("suppliers", "CONTRIBUTE");
  const canDelSup = canCompany("suppliers", "MANAGE");
  const [suppliers, setSuppliers] = useState(null);
  const [edit, setEdit] = useState(null);
  const [open, setOpen] = useState(false);

  const load = () => api.get("/suppliers").then((r) => setSuppliers(r.data)).catch(() => setSuppliers([]));
  useEffect(() => { load(); }, []);
  const remove = async (s) => { if (!(await confirm("Supprimer ce fournisseur ?"))) return; await api.delete(`/suppliers/${s.id}`); load(); toast("Supprimé"); };

  return (
    <div>
      <PageHeader
        title="Fournisseurs" subtitle="Base fournisseurs & évaluation (délai / qualité / prix)" icon={Truck}
        actions={canEditSup && <button className="btn-primary" onClick={() => { setEdit(null); setOpen(true); }}><Plus size={18} /> Nouveau fournisseur</button>}
      />

      {!suppliers ? <Spinner /> : suppliers.length === 0 ? (
        <Card><EmptyState icon={Truck} title="Aucun fournisseur" /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <Card key={s.id} hover>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="icon-tile grid place-items-center w-11 h-11 rounded-xl ring-1 ring-brand-500/20 text-brand-600"><Truck size={20} /></div>
                  <div><p className="font-bold text-brand-900">{s.name}</p>{s.contactName && <p className="text-xs text-brand-700/60">{s.contactName}</p>}</div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-brand-700/70 mb-3">
                {s.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {s.email}</p>}
                {s.phone && <p className="flex items-center gap-1.5"><Phone size={12} /> {s.phone}</p>}
                {s.address && <p className="flex items-center gap-1.5"><MapPin size={12} /> {s.address}</p>}
              </div>
              <div className="space-y-1 bg-white/50 rounded-xl p-3 border border-white/60 mb-3">
                <div className="flex items-center justify-between"><span className="text-xs text-brand-700/60">Délai</span><Stars value={s.ratingDelay} /></div>
                <div className="flex items-center justify-between"><span className="text-xs text-brand-700/60">Qualité</span><Stars value={s.ratingQuality} /></div>
                <div className="flex items-center justify-between"><span className="text-xs text-brand-700/60">Prix</span><Stars value={s.ratingPrice} /></div>
              </div>
              <div className="flex items-center gap-3 text-xs text-brand-700/60 mb-3">
                <span className="flex items-center gap-1"><Package size={13} /> {s._count?.materials || 0} matériaux</span>
                <span className="flex items-center gap-1"><ShoppingCart size={13} /> {s._count?.orders || 0} commandes</span>
              </div>
              {(canEditSup || canDelSup) && (
                <div className="flex gap-1.5 pt-3 border-t border-brand-100/60">
                  {canEditSup && <button className="btn-ghost btn-sm flex-1" onClick={() => { setEdit(s); setOpen(true); }}><Pencil size={13} /> Modifier</button>}
                  {canDelSup && <button className="btn-danger btn-sm" onClick={() => remove(s)}><Trash2 size={13} /></button>}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <SupplierModal open={open} onClose={() => setOpen(false)} supplier={edit} onSaved={() => { setOpen(false); load(); toast(edit ? "Modifié" : "Créé"); }} />
    </div>
  );
}

function SupplierModal({ open, onClose, supplier, onSaved }) {
  const [form, setForm] = useState({});
  useEffect(() => { setForm(supplier ? { ...supplier } : { ratingDelay: 4, ratingQuality: 4, ratingPrice: 4 }); }, [supplier, open]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    if (supplier) await api.put(`/suppliers/${supplier.id}`, form);
    else await api.post("/suppliers", form);
    onSaved();
  };
  return (
    <Modal open={open} onClose={onClose} title={supplier ? "Modifier le fournisseur" : "Nouveau fournisseur"}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom *"><Input value={form.name || ""} onChange={set("name")} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact"><Input value={form.contactName || ""} onChange={set("contactName")} /></Field>
          <Field label="Téléphone"><Input value={form.phone || ""} onChange={set("phone")} /></Field>
        </div>
        <Field label="Email"><Input type="email" value={form.email || ""} onChange={set("email")} /></Field>
        <Field label="Adresse"><Input value={form.address || ""} onChange={set("address")} /></Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Note délai"><Input type="number" min="0" max="5" step="0.1" value={form.ratingDelay ?? ""} onChange={set("ratingDelay")} /></Field>
          <Field label="Note qualité"><Input type="number" min="0" max="5" step="0.1" value={form.ratingQuality ?? ""} onChange={set("ratingQuality")} /></Field>
          <Field label="Note prix"><Input type="number" min="0" max="5" step="0.1" value={form.ratingPrice ?? ""} onChange={set("ratingPrice")} /></Field>
        </div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> {supplier ? "Enregistrer" : "Créer"}</button></div>
      </form>
    </Modal>
  );
}

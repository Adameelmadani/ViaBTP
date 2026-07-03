import { useEffect, useState } from "react";
import { ShoppingCart, Plus, Trash2, PackageCheck, ChevronRight } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, EmptyState, Badge } from "../components/ui.jsx";
import { ORDER_STATUS, fmtMAD, fmtNum } from "../lib/constants.js";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { useAccess } from "../lib/permissions.js";

export default function Orders() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { canCompany } = useAccess();
  const canOrder = canCompany("orders", "CONTRIBUTE");
  const [orders, setOrders] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = () => api.get("/orders").then((r) => setOrders(r.data)).catch(() => setOrders([]));
  useEffect(() => {
    load();
    api.get("/suppliers").then((r) => setSuppliers(r.data));
    api.get("/materials").then((r) => setMaterials(r.data));
    api.get("/projects").then((r) => setProjects(r.data));
  }, []);

  const receive = async (o) => {
    if (!(await confirm({
      title: "Réceptionner la commande",
      message: "Confirmer la réception ? Le stock sera mis à jour.",
      confirmLabel: "Réceptionner",
      tone: "default",
    }))) return;
    await api.patch(`/orders/${o.id}/status`, { status: "LIVREE" });
    load(); setDetail(null); toast("Commande réceptionnée · stock mis à jour");
  };

  return (
    <div>
      <PageHeader
        title="Bons de commande" subtitle="Achats fournisseurs & réception" icon={ShoppingCart}
        actions={canOrder && <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} /> Nouveau bon</button>}
      />

      {!orders ? <Spinner /> : orders.length === 0 ? (
        <Card><EmptyState icon={ShoppingCart} title="Aucun bon de commande" /></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {orders.map((o) => (
            <Card key={o.id} hover className="cursor-pointer" onClick={() => setDetail(o)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-brand-900">{o.reference}</p>
                  <p className="text-xs text-brand-700/60">{o.supplier?.name} · {new Date(o.date).toLocaleDateString("fr-FR")}</p>
                </div>
                <Badge className={ORDER_STATUS[o.status].color}>{ORDER_STATUS[o.status].label}</Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-brand-100/60">
                <span className="text-xs text-brand-700/60">{o.items?.length || 0} ligne(s) · {o.project?.name || "-"}</span>
                <span className="font-bold text-brand-900">{fmtMAD(o.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OrderModal open={open} onClose={() => setOpen(false)} suppliers={suppliers} materials={materials} projects={projects} onSaved={() => { setOpen(false); load(); toast("Bon de commande créé"); }} />

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.reference || ""} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge className={ORDER_STATUS[detail.status].color}>{ORDER_STATUS[detail.status].label}</Badge>
              <span className="text-brand-700/70">Fournisseur : <b className="text-brand-900">{detail.supplier?.name}</b></span>
              <span className="text-brand-700/70">Projet : {detail.project?.name || "-"}</span>
            </div>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-brand-700/60 border-b border-brand-100/60"><th className="p-3">Matériau</th><th className="p-3 text-right">Qté</th><th className="p-3 text-right">PU</th><th className="p-3 text-right">Total</th></tr></thead>
                <tbody className="divide-y divide-brand-50">
                  {detail.items?.map((it) => (
                    <tr key={it.id}><td className="p-3 font-medium text-brand-900">{it.material?.designation}</td><td className="p-3 text-right">{fmtNum(it.quantity)} {it.material?.unit}</td><td className="p-3 text-right">{fmtMAD(it.unitPrice)}</td><td className="p-3 text-right font-semibold">{fmtMAD(it.quantity * it.unitPrice)}</td></tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-brand-100"><td colSpan={3} className="p-3 text-right font-semibold text-brand-700">Total</td><td className="p-3 text-right font-bold text-brand-900">{fmtMAD(detail.total)}</td></tr></tfoot>
              </table>
            </Card>
            {detail.status !== "LIVREE" && canOrder && (
              <button className="btn-primary w-full" onClick={() => receive(detail)}><PackageCheck size={18} /> Réceptionner (entrée en stock)</button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function OrderModal({ open, onClose, suppliers, materials, projects, onSaved }) {
  const { toast } = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [items, setItems] = useState([{ materialId: "", quantity: 1, unitPrice: 0 }]);

  const setItem = (i, k, v) => setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, [k]: v } : it));
  const addItem = () => setItems((a) => [...a, { materialId: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i) => setItems((a) => a.filter((_, idx) => idx !== i));
  const total = items.reduce((s, it) => s + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);

  const onPickMaterial = (i, materialId) => {
    const m = materials.find((x) => x.id === materialId);
    setItems((arr) => arr.map((it, idx) => idx === i ? { ...it, materialId, unitPrice: m?.unitPrice || 0 } : it));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/orders", { supplierId, projectId: projectId || null, items: items.filter((it) => it.materialId) });
      setSupplierId(""); setProjectId(""); setItems([{ materialId: "", quantity: 1, unitPrice: 0 }]);
      onSaved();
    } catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Nouveau bon de commande" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fournisseur *"><Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required><option value="">Sélectionner...</option>{suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></Field>
          <Field label="Projet"><Select value={projectId} onChange={(e) => setProjectId(e.target.value)}><option value="">- Aucun -</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2"><p className="label mb-0">Lignes de commande</p><button type="button" className="btn-soft btn-sm" onClick={addItem}><Plus size={13} /> Ligne</button></div>
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-end">
                <Field label={i === 0 ? "Matériau" : ""} className="flex-1"><Select value={it.materialId} onChange={(e) => onPickMaterial(i, e.target.value)}><option value="">Choisir...</option>{materials.map((m) => <option key={m.id} value={m.id}>{m.designation}</option>)}</Select></Field>
                <Field label={i === 0 ? "Qté" : ""} className="w-20"><Input type="number" value={it.quantity} onChange={(e) => setItem(i, "quantity", e.target.value)} /></Field>
                <Field label={i === 0 ? "PU" : ""} className="w-24"><Input type="number" value={it.unitPrice} onChange={(e) => setItem(i, "unitPrice", e.target.value)} /></Field>
                {items.length > 1 && <button type="button" className="btn-danger btn-sm mb-0.5" onClick={() => removeItem(i)}><Trash2 size={13} /></button>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between bg-brand-50 rounded-xl p-3"><span className="font-semibold text-brand-700">Total</span><span className="font-bold text-lg text-brand-900">{fmtMAD(total)}</span></div>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer le bon</button></div>
      </form>
    </Modal>
  );
}

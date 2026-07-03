import { useEffect, useState } from "react";
import { Building2, Plus, Users2, FolderKanban, ShieldCheck, Trash2, UserPlus, Search } from "lucide-react";
import api from "../../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, EmptyState, Badge } from "../../components/ui.jsx";
import { useToast } from "../../context/ToastContext.jsx";
import { useConfirm } from "../../context/ConfirmContext.jsx";

export default function Companies() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [companies, setCompanies] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [adminFor, setAdminFor] = useState(null);

  const load = () => api.get("/companies").then((r) => setCompanies(r.data)).catch(() => setCompanies([]));
  useEffect(() => { load(); }, []);

  const remove = async (c) => {
    if (!(await confirm({ title: "Supprimer l'entreprise", message: `Supprimer « ${c.name} » et toutes ses données (projets, utilisateurs, procurement) ? Action irréversible.`, confirmLabel: "Supprimer" }))) return;
    try { await api.delete(`/companies/${c.id}`); toast("Entreprise supprimée"); load(); }
    catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <div>
      <PageHeader
        title="Entreprises" subtitle="Administration de la plateforme · gérez les comptes entreprises" icon={Building2}
        actions={<button className="btn-primary" onClick={() => setCreateOpen(true)}><Plus size={18} /> Nouvelle entreprise</button>}
      />

      {!companies ? <Spinner /> : companies.length === 0 ? (
        <Card><EmptyState icon={Building2} title="Aucune entreprise" subtitle="Créez la première entreprise cliente." /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {companies.map((c) => {
            const admins = c.memberships || [];
            return (
              <Card key={c.id} className="flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="grid place-items-center w-12 h-12 rounded-2xl bg-brand-600 text-white font-bold text-lg shrink-0">{c.name?.[0]}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-brand-900 truncate">{c.name}</h3>
                    <p className="text-xs text-brand-700/60 font-mono">{c.reference}</p>
                  </div>
                  {!c.isActive && <Badge className="bg-red-100 text-red-700">Inactive</Badge>}
                </div>
                <div className="flex items-center gap-4 text-xs text-brand-700/70 mb-3">
                  <span className="flex items-center gap-1"><Users2 size={13} /> {c._count?.memberships || 0} membres</span>
                  <span className="flex items-center gap-1"><FolderKanban size={13} /> {c._count?.projects || 0} projets</span>
                </div>
                <div className="mb-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/50 mb-1">Administrateur(s)</p>
                  {admins.length === 0 ? (
                    <p className="text-xs text-amber-600">Aucun admin désigné</p>
                  ) : admins.map((m) => (
                    <p key={m.id} className="text-sm text-brand-800 flex items-center gap-1.5"><ShieldCheck size={13} className="text-brand-500" /> {m.user.firstName} {m.user.lastName} <span className="text-brand-700/50 text-xs">· {m.user.email}</span></p>
                  ))}
                </div>
                <div className="mt-auto flex items-center gap-2 pt-3 border-t border-brand-100/60">
                  <button className="btn-soft btn-sm flex-1" onClick={() => setAdminFor(c)}><UserPlus size={14} /> Désigner un admin</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(c)}><Trash2 size={14} /></button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateCompanyModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={() => { setCreateOpen(false); load(); toast("Entreprise créée"); }} />
      <AssignAdminModal company={adminFor} onClose={() => setAdminFor(null)} onSaved={() => { setAdminFor(null); load(); toast("Administrateur désigné"); }} />
    </div>
  );
}

function CreateCompanyModal({ open, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", reference: "" });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/companies", form); setForm({ name: "", reference: "" }); onSaved(); }
    catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle entreprise">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom de l'entreprise *"><Input value={form.name} onChange={set("name")} required placeholder="STGM Construction" /></Field>
        <Field label="Référence / identifiant *"><Input value={form.reference} onChange={set("reference")} required placeholder="stgm" /></Field>
        <p className="text-xs text-brand-700/50">La référence est unique et sert d'identifiant lisible de l'entreprise.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><Plus size={16} /> Créer</button></div>
      </form>
    </Modal>
  );
}

function AssignAdminModal({ company, onClose, onSaved }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState("");
  const [found, setFound] = useState(null);

  const lookup = async () => {
    setFound(null);
    if (!accountId.trim()) return;
    try { const r = await api.get("/companies/lookup", { params: { accountId: accountId.trim() } }); setFound(r.data); }
    catch { toast("Aucun compte avec cet identifiant", "error"); }
  };
  const assign = async () => {
    try { await api.post(`/companies/${company.id}/admin`, { accountId: accountId.trim() }); setAccountId(""); setFound(null); onSaved(); }
    catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <Modal open={!!company} onClose={onClose} title={`Désigner l'admin · ${company?.name || ""}`}>
      <div className="space-y-4">
        <Field label="Identifiant de compte (Account ID)">
          <div className="flex gap-2">
            <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="VBT-XXXXXX" />
            <button className="btn-soft" onClick={lookup} type="button"><Search size={16} /> Chercher</button>
          </div>
        </Field>
        {found && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-brand-50 border border-brand-100">
            <div>
              <p className="font-semibold text-brand-900">{found.firstName} {found.lastName}</p>
              <p className="text-xs text-brand-700/60">{found.email}</p>
            </div>
            <button className="btn-primary btn-sm" onClick={assign}><ShieldCheck size={15} /> Désigner admin</button>
          </div>
        )}
        <p className="text-xs text-brand-700/50">Le compte doit déjà être inscrit sur la plateforme. Il deviendra administrateur de cette entreprise (droits complets).</p>
      </div>
    </Modal>
  );
}

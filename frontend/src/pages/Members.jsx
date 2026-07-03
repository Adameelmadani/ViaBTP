import { useEffect, useState } from "react";
import { ShieldCheck, UserPlus, Trash2, Search, Pencil, SlidersHorizontal, Users2, FolderKanban } from "lucide-react";
import api from "../api/client.js";
import { PageHeader, Card, Spinner, Modal, Field, Input, Select, EmptyState, Badge, Tabs, Avatar } from "../components/ui.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { useConfirm } from "../context/ConfirmContext.jsx";
import { ROLE_LABELS } from "../lib/constants.js";
import { PROJECT_MODULES, COMPANY_MODULES, LEVEL_ORDER, LEVEL_LABELS, companyPreset } from "../lib/permissions.js";

const TYPE_OPTIONS = Object.entries(ROLE_LABELS).filter(([k]) => k !== "ADMIN");

function LevelSelect({ value, onChange }) {
  return (
    <select value={value || "NONE"} onChange={(e) => onChange(e.target.value)} className="select !py-1 !px-2 text-xs min-w-[92px]">
      {LEVEL_ORDER.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
    </select>
  );
}

export default function Members() {
  const [tab, setTab] = useState("members");
  return (
    <div>
      <PageHeader title="Équipe & accès" subtitle="Gérez les comptes de votre entreprise et leurs droits par projet" icon={ShieldCheck} />
      <div className="mb-5"><Tabs tabs={[
        { value: "members", label: "Membres", icon: Users2 },
        { value: "access", label: "Accès par projet", icon: FolderKanban },
      ]} active={tab} onChange={setTab} /></div>
      {tab === "members" ? <MembersTab /> : <AccessTab />}
    </div>
  );
}

// ─────────────── Membres de l'entreprise ───────────────
function MembersTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [members, setMembers] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState(null);

  const load = () => api.get("/members").then((r) => setMembers(r.data)).catch(() => setMembers([]));
  useEffect(() => { load(); }, []);

  const remove = async (m) => {
    if (!(await confirm({ title: "Retirer le membre", message: `Retirer ${m.user.firstName} ${m.user.lastName} de l'entreprise ? Ses accès aux projets seront supprimés.`, confirmLabel: "Retirer" }))) return;
    try { await api.delete(`/members/${m.userId}`); toast("Membre retiré"); load(); }
    catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button className="btn-primary" onClick={() => setAddOpen(true)}><UserPlus size={18} /> Ajouter un membre</button>
      </div>
      {!members ? <Spinner /> : members.length === 0 ? (
        <Card><EmptyState icon={Users2} title="Aucun membre" subtitle="Ajoutez un compte via son identifiant." /></Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="divide-y divide-brand-100/60">
            {members.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-white/40 transition">
                <Avatar name={`${m.user.firstName} ${m.user.lastName}`} size={40} />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-semibold text-brand-900 truncate">{m.user.firstName} {m.user.lastName}</p>
                  <p className="text-xs text-brand-700/60 truncate">{m.user.email} · <span className="font-mono">{m.user.accountId}</span></p>
                </div>
                <Badge className="bg-brand-50 text-brand-700">{ROLE_LABELS[m.type] || m.type}</Badge>
                {m.isCompanyAdmin && <Badge className="bg-brand-100 text-brand-700"><ShieldCheck size={12} /> Admin</Badge>}
                <div className="flex items-center gap-1.5 ml-auto">
                  <button className="btn-ghost btn-sm" onClick={() => setEdit(m)}><Pencil size={14} /> Droits</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(m)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load(); toast("Membre ajouté"); }} />
      <EditMemberModal member={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); toast("Droits mis à jour"); }} />
    </div>
  );
}

function AddMemberModal({ open, onClose, onSaved }) {
  const { toast } = useToast();
  const [accountId, setAccountId] = useState("");
  const [type, setType] = useState("CHEF_CHANTIER");
  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/members", { accountId: accountId.trim(), type }); setAccountId(""); onSaved(); }
    catch (err) { toast(err.response?.data?.message || "Erreur", "error"); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un membre">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Identifiant de compte (Account ID) *"><Input value={accountId} onChange={(e) => setAccountId(e.target.value)} required placeholder="VBT-XXXXXX" /></Field>
        <Field label="Type de profil (préréglage des droits)">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPE_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <p className="text-xs text-brand-700/50">Le compte doit déjà être inscrit. Le type choisi pré-remplit ses droits, ajustables ensuite.</p>
        <div className="flex justify-end gap-2"><button type="button" className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary"><UserPlus size={16} /> Ajouter</button></div>
      </form>
    </Modal>
  );
}

function EditMemberModal({ member, onClose, onSaved }) {
  const { toast } = useToast();
  const [type, setType] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [levels, setLevels] = useState({});

  useEffect(() => {
    if (member) { setType(member.type); setIsAdmin(member.isCompanyAdmin); setLevels(member.companyLevels || {}); }
  }, [member]);
  if (!member) return null;

  const save = async () => {
    try {
      await api.put(`/members/${member.userId}`, { type, isCompanyAdmin: isAdmin, companyLevels: levels });
      onSaved();
    } catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <Modal open={!!member} onClose={onClose} title={`Droits · ${member.user.firstName} ${member.user.lastName}`} size="lg">
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Type de profil">
            <Select value={type} onChange={(e) => { const t = e.target.value; setType(t); setLevels(companyPreset(t)); }}>
              {TYPE_OPTIONS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Administrateur de l'entreprise">
            <label className="flex items-center gap-2 input cursor-pointer">
              <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} className="accent-brand-600" />
              <span className="text-sm text-brand-700/80">Accès complet + gestion des membres</span>
            </label>
          </Field>
        </div>
        <div>
          <p className="label flex items-center gap-1.5"><SlidersHorizontal size={14} /> Droits « entreprise »</p>
          <div className={`grid sm:grid-cols-2 gap-2 ${isAdmin ? "opacity-40 pointer-events-none" : ""}`}>
            {COMPANY_MODULES.map((mod) => (
              <div key={mod.key} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/50 border border-white/60">
                <span className="text-sm text-brand-800">{mod.label}</span>
                <LevelSelect value={levels[mod.key]} onChange={(v) => setLevels((s) => ({ ...s, [mod.key]: v }))} />
              </div>
            ))}
          </div>
          {isAdmin && <p className="text-xs text-brand-700/50 mt-1">Un administrateur dispose de tous les droits.</p>}
        </div>
        <p className="text-xs text-brand-700/50">Les accès aux projets se gèrent dans l'onglet « Accès par projet ». Changer le type ici ne réinitialise pas les accès projets déjà définis.</p>
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Annuler</button><button className="btn-primary" onClick={save}>Enregistrer</button></div>
      </div>
    </Modal>
  );
}

// ─────────────── Accès par projet ───────────────
function AccessTab() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [members, setMembers] = useState([]);
  const [access, setAccess] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/projects").then((r) => { setProjects(r.data); if (r.data[0]) setProjectId(r.data[0].id); }).catch(() => {});
    api.get("/members").then((r) => setMembers(r.data)).catch(() => {});
  }, []);

  const loadAccess = () => {
    if (!projectId) return;
    setLoading(true);
    api.get("/members/project-access", { params: { projectId } })
      .then((r) => setAccess(r.data)).catch(() => setAccess([])).finally(() => setLoading(false));
  };
  useEffect(() => { loadAccess(); }, [projectId]);

  const rowFor = (userId) => access.find((a) => a.userId === userId);

  const setLevel = async (m, module, value) => {
    const current = rowFor(m.userId)?.levels || {};
    const levels = { ...current, [module]: value };
    try {
      await api.put("/members/project-access", { userId: m.userId, projectId, type: m.type, levels });
      loadAccess();
    } catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };
  const applyPreset = async (m) => {
    try { await api.put("/members/project-access", { userId: m.userId, projectId, type: m.type }); toast("Préréglage appliqué"); loadAccess(); }
    catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };
  const revoke = async (m) => {
    if (!(await confirm({ message: `Retirer l'accès de ${m.user.firstName} à ce projet ?`, confirmLabel: "Retirer" }))) return;
    try { await api.delete("/members/project-access", { params: { userId: m.userId, projectId } }); loadAccess(); }
    catch (e) { toast(e.response?.data?.message || "Erreur", "error"); }
  };

  return (
    <div>
      <Card className="mb-4">
        <Field label="Projet">
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
            {projects.length === 0 && <option value="">Aucun projet</option>}
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.reference}</option>)}
          </Select>
        </Field>
      </Card>

      {loading ? <Spinner /> : members.length === 0 ? (
        <Card><EmptyState icon={Users2} title="Aucun membre" subtitle="Ajoutez d'abord des membres à l'entreprise." /></Card>
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-[11px] font-semibold text-brand-700/60 border-b border-brand-100/60">
                <th className="p-3 sticky left-0 bg-white/70 backdrop-blur z-10">Membre</th>
                {PROJECT_MODULES.map((mod) => <th key={mod.key} className="p-2 whitespace-nowrap">{mod.label}</th>)}
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {members.map((m) => {
                const row = rowFor(m.userId);
                const has = !!row;
                return (
                  <tr key={m.id} className="hover:bg-white/40">
                    <td className="p-3 sticky left-0 bg-white/70 backdrop-blur z-10">
                      <p className="font-medium text-brand-900 whitespace-nowrap">{m.user.firstName} {m.user.lastName}</p>
                      <p className="text-[11px] text-brand-700/60">{ROLE_LABELS[m.type] || m.type}{m.isCompanyAdmin ? " · Admin" : ""}</p>
                    </td>
                    {PROJECT_MODULES.map((mod) => (
                      <td key={mod.key} className="p-2">
                        {m.isCompanyAdmin ? <span className="text-[11px] text-brand-500">Tout</span> :
                          <LevelSelect value={row?.levels?.[mod.key] || "NONE"} onChange={(v) => setLevel(m, mod.key, v)} />}
                      </td>
                    ))}
                    <td className="p-3 whitespace-nowrap">
                      {!m.isCompanyAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button className="btn-ghost btn-sm" title="Appliquer le préréglage du type" onClick={() => applyPreset(m)}><SlidersHorizontal size={13} /></button>
                          {has && <button className="btn-danger btn-sm" title="Retirer l'accès" onClick={() => revoke(m)}><Trash2 size={13} /></button>}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
      <p className="text-xs text-brand-700/50 mt-3">Astuce : le bouton préréglage applique les niveaux par défaut du type du membre. Les administrateurs ont accès à tout.</p>
    </div>
  );
}

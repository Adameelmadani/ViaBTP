import { useState } from "react";
import { UserCircle, Copy, Check, Building2, ShieldCheck, Save, KeyRound } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { PageHeader, Card, Badge, Avatar, Field, Input } from "../components/ui.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { ROLE_LABELS } from "../lib/constants.js";
import api from "../api/client.js";

export default function Profile() {
  const { user, memberships, isSuperAdmin } = useAuth();
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(user?.accountId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Mon profil" subtitle="Compte et rattachements" icon={UserCircle} />

      <Card className="flex items-center gap-4 mb-5">
        <Avatar name={`${user?.firstName} ${user?.lastName}`} size={56} />
        <div className="min-w-0">
          <p className="text-lg font-bold text-brand-900">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-brand-700/70">{user?.email}</p>
          {isSuperAdmin && <Badge className="bg-indigo-100 text-indigo-700 mt-1">Super-administrateur</Badge>}
        </div>
      </Card>

      <Card className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700/60 mb-2">Identifiant de compte</p>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold text-brand-800 tracking-wider bg-brand-50 rounded-xl px-4 py-2 border border-brand-100">{user?.accountId}</span>
          <button onClick={copyId} className="btn-ghost btn-sm">{copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copié" : "Copier"}</button>
        </div>
        <p className="text-xs text-brand-700/50 mt-2">Communiquez cet identifiant à un administrateur d'entreprise pour être ajouté à ses projets.</p>
      </Card>

      <PersonalInfoCard />
      <PasswordCard />

      <Card>
        <h3 className="font-bold text-brand-900 mb-3 flex items-center gap-2"><Building2 size={18} /> Mes entreprises</h3>
        {memberships.length === 0 ? (
          <p className="text-sm text-brand-700/60">Vous n'êtes rattaché à aucune entreprise pour le moment.</p>
        ) : (
          <div className="space-y-2">
            {memberships.map((m) => (
              <div key={m.companyId} className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-white/60">
                <div className="grid place-items-center w-9 h-9 rounded-lg bg-brand-600 text-white font-bold shrink-0">{m.company.name?.[0]}</div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-brand-900 truncate">{m.company.name}</p>
                  <p className="text-xs text-brand-700/60">{ROLE_LABELS[m.type] || m.type}</p>
                </div>
                {m.isCompanyAdmin && <Badge className="bg-brand-100 text-brand-700"><ShieldCheck size={12} /> Admin</Badge>}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function PersonalInfoCard() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const dirty =
    form.firstName !== (user?.firstName || "") ||
    form.lastName !== (user?.lastName || "") ||
    form.email !== (user?.email || "") ||
    form.phone !== (user?.phone || "");

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/auth/me", { ...form, phone: form.phone.trim() || null });
      setUser(res.data.user);
      toast("Informations mises à jour");
    } catch (err) {
      toast(err.response?.data?.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5">
      <h3 className="font-bold text-brand-900 mb-3 flex items-center gap-2"><UserCircle size={18} /> Informations personnelles</h3>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Prénom"><Input value={form.firstName} onChange={set("firstName")} required /></Field>
          <Field label="Nom"><Input value={form.lastName} onChange={set("lastName")} required /></Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Email"><Input type="email" value={form.email} onChange={set("email")} required /></Field>
          <Field label="Téléphone"><Input value={form.phone} onChange={set("phone")} placeholder="Optionnel" /></Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving || !dirty}><Save size={16} /> Enregistrer</button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return toast("Le nouveau mot de passe doit faire au moins 6 caractères", "error");
    if (form.newPassword !== form.confirm) return toast("Les mots de passe ne correspondent pas", "error");
    setSaving(true);
    try {
      await api.put("/auth/me/password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast("Mot de passe mis à jour");
    } catch (err) {
      toast(err.response?.data?.message || "Erreur", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="mb-5">
      <h3 className="font-bold text-brand-900 mb-3 flex items-center gap-2"><KeyRound size={18} /> Mot de passe</h3>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mot de passe actuel"><Input type="password" value={form.currentPassword} onChange={set("currentPassword")} required autoComplete="current-password" /></Field>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Nouveau mot de passe"><Input type="password" value={form.newPassword} onChange={set("newPassword")} required autoComplete="new-password" placeholder="6 caractères min." /></Field>
          <Field label="Confirmer"><Input type="password" value={form.confirm} onChange={set("confirm")} required autoComplete="new-password" /></Field>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}><KeyRound size={16} /> Changer le mot de passe</button>
        </div>
      </form>
    </Card>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Building2, LogOut, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Logo from "../components/Logo.jsx";

export default function Onboarding() {
  const { user, logout, refreshMemberships } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  const copyId = async () => {
    await navigator.clipboard.writeText(user?.accountId || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const recheck = async () => {
    setChecking(true);
    const m = await refreshMemberships();
    setChecking(false);
    if (m.length) { toast("Bienvenue ! Accès accordé."); navigate("/dashboard"); }
    else toast("Toujours aucune entreprise pour le moment", "info");
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 app-shell">
      <div className="glass-strong w-full max-w-lg p-8 text-center animate-fade-in">
        <div className="flex justify-center mb-5"><Logo size={56} rounded="rounded-3xl" /></div>
        <h1 className="text-2xl font-bold text-brand-900">Bonjour {user?.firstName}</h1>
        <p className="text-sm text-brand-700/70 mt-2 max-w-md mx-auto">
          Votre compte n'est encore rattaché à <b>aucune entreprise</b>. Pour accéder à des projets,
          transmettez votre identifiant de compte à l'administrateur de votre entreprise : il pourra
          vous ajouter et définir vos accès.
        </p>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700/60 mb-2">Votre identifiant de compte</p>
          <button onClick={copyId}
            className="group inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-brand-50 border border-brand-100 hover:bg-brand-100/60 transition">
            <span className="font-mono text-xl font-bold text-brand-800 tracking-wider">{user?.accountId}</span>
            {copied ? <Check size={18} className="text-brand-600" /> : <Copy size={18} className="text-brand-500 group-hover:text-brand-700" />}
          </button>
          <p className="text-[11px] text-brand-700/50 mt-2">Cliquez pour copier</p>
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button onClick={recheck} className="btn-primary" disabled={checking}>
            <RefreshCw size={16} className={checking ? "animate-spin" : ""} /> J'ai été ajouté
          </button>
          <button onClick={() => { logout(); navigate("/login"); }} className="btn-ghost">
            <LogOut size={16} /> Se déconnecter
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-brand-100/70 flex items-center justify-center gap-2 text-xs text-brand-700/50">
          <Building2 size={14} /> ViaBTP - la plateforme de gestion de chantiers pour les entreprises du BTP
        </div>
      </div>
    </div>
  );
}

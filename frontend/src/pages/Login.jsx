import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, Building2, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../context/ToastContext.jsx";

const DEMO = [
  { label: "Admin entreprise (STGM)", email: "admin@stgm.ma" },
  { label: "Conducteur de travaux", email: "conducteur@stgm.ma" },
  { label: "Architecte (multi-entreprises)", email: "archi@viabtp.ma" },
  { label: "Super-admin plateforme", email: "admin@viabtp.ma" },
];

export default function Login() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@stgm.ma");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(email, password);
      toast("Connexion réussie");
      const home = data.user?.platformRole === "SUPERADMIN" ? "/admin" : (data.memberships?.length ? "/dashboard" : "/onboarding");
      navigate(home);
    } catch (err) {
      toast(err.response?.data?.message || "Échec de la connexion", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero gauche */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden text-brand-900">
        {/* fond clair + halos + grille */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-white to-accent-50" />
        <div className="absolute inset-0 grid-overlay grid-overlay-fade opacity-80" />
        <div className="absolute -top-24 -right-16 w-96 h-96 rounded-full bg-accent-300/30 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 -left-10 w-80 h-80 rounded-full bg-brand-300/30 blur-3xl" />
        {/* cristal 3D */}
        <div className="scene-3d absolute top-1/2 right-10 -translate-y-1/2 w-64 h-64 animate-float-lg grid place-items-center">
          <div className="gem w-[190px] h-[190px]">
            <div className="gem-pyr top">
              <span className="gem-facet" /><span className="gem-facet" /><span className="gem-facet" /><span className="gem-facet" />
            </div>
            <div className="gem-pyr bottom">
              <span className="gem-facet" /><span className="gem-facet" /><span className="gem-facet" /><span className="gem-facet" />
            </div>
          </div>
        </div>

        <Link to="/" className="relative flex items-center gap-3 w-fit" title="Accueil ViaBTP">
          <Logo size={48} rounded="rounded-2xl" />
          <span className="font-display text-2xl font-extrabold">Via<span className="text-gradient-accent">BTP</span></span>
        </Link>
        <div className="relative">
          <p className="mono-tag mb-3">[ la meilleure plateform du BTP ]</p>
          <h1 className="text-4xl font-extrabold leading-tight text-brand-900">
            L'espace de votre <br /> <span className="text-gradient-accent">entreprise de chantier.</span>
          </h1>
          <p className="text-sm mt-4 text-brand-700/80 max-w-md">
            Un espace privé pour piloter tous vos chantiers, vos équipes et vos approvisionnements. Vos données restent les vôtres : vous décidez qui voit quoi, sur quel projet.
          </p>
          <div className="mt-8 space-y-3 max-w-sm">
            {[
              { icon: Building2, t: "Un espace privé et isolé pour l'entreprise" },
              { icon: ShieldCheck, t: "Accès précis, par projet et par module" },
              { icon: BarChart3, t: "Avancement, réserves & finance en direct" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/70 backdrop-blur rounded-2xl px-4 py-3 border border-brand-100 shadow-glass-sm">
                <f.icon size={20} className="text-accent-500" />
                <span className="text-sm font-medium text-brand-800">{f.t}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-brand-700/50 font-mono">© 2026 ViaBTP</p>
      </div>

      {/* Formulaire droite */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-8 justify-center" title="Accueil ViaBTP">
            <Logo size={48} rounded="rounded-2xl" />
            <span className="font-display text-2xl font-extrabold text-brand-900">Via<span className="text-gradient-accent">BTP</span></span>
          </Link>

          <div className="glass-strong p-8">
            <h2 className="text-2xl font-bold text-brand-900">Connexion</h2>
            <p className="font-display text-sm text-brand-700/60 mt-1 mb-6">Accédez à votre espace de pilotage.</p>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="label">Adresse email</label>
                <div className="relative">
                  <Mail size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
                  <input className="input pl-10" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="vous@viabtp.ma" />
                </div>
              </div>
              <div>
                <label className="label">Mot de passe</label>
                <div className="relative">
                  <Lock size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400" />
                  <input className="input pl-10" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Se connecter <ArrowRight size={18} /></>}
              </button>
            </form>

            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-700/50 mb-2">Comptes de démonstration</p>
              <div className="grid gap-1.5">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    onClick={() => { setEmail(d.email); setPassword("password123"); }}
                    className="flex items-center justify-between text-left px-3 py-2 rounded-xl bg-brand-50/70 hover:bg-brand-100 transition text-sm"
                  >
                    <span className="font-medium text-brand-800">{d.label}</span>
                    <span className="text-xs text-brand-600">{d.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-brand-700/50 mt-2">Mot de passe : <code className="font-mono">password123</code></p>
            </div>

            <p className="text-center text-sm text-brand-700/70 mt-6">
              Pas encore de compte ?{" "}
              <Link to="/register" className="font-semibold text-brand-600 hover:underline">Créer un compte</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

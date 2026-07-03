import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, Building2, ShieldCheck, BarChart3 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import Logo from "../components/Logo.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", password: "", phone: "",
  });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(form);
      toast("Compte créé avec succès");
      navigate("/onboarding");
    } catch (err) {
      toast(err.response?.data?.message || "Échec de l'inscription", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Hero gauche (identique à la page de connexion) */}
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
            Rejoignez votre <br /> <span className="text-gradient-accent">entreprise sur ViaBTP.</span>
          </h1>
          <p className="text-sm mt-4 text-brand-700/80 max-w-md">
            Créez votre compte, puis faites-vous ajouter par l'administrateur de votre entreprise
            grâce à votre identifiant. Vos accès sont définis projet par projet.
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
        <div className="w-full max-w-lg">
          <Link to="/" className="lg:hidden flex items-center gap-3 mb-8 justify-center" title="Accueil ViaBTP">
            <Logo size={48} rounded="rounded-2xl" />
            <span className="font-display text-2xl font-extrabold text-brand-900">Via<span className="text-gradient-accent">BTP</span></span>
          </Link>

          <div className="glass-strong p-8">
            <h2 className="text-2xl font-bold text-brand-900">Créer un compte</h2>
            <p className="font-display text-sm text-brand-700/60 mt-1 mb-6">Un compte personnel, gratuit, rattaché ensuite à votre entreprise.</p>

            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input className="input" value={form.firstName} onChange={set("firstName")} required />
                </div>
                <div>
                  <label className="label">Nom</label>
                  <input className="input" value={form.lastName} onChange={set("lastName")} required />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={set("email")} required placeholder="vous@viabtp.ma" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Mot de passe</label>
                  <input className="input" type="password" value={form.password} onChange={set("password")} required minLength={6} placeholder="••••••••" />
                </div>
                <div>
                  <label className="label">Téléphone <span className="text-brand-700/40 font-normal">(optionnel)</span></label>
                  <input className="input" value={form.phone} onChange={set("phone")} />
                </div>
              </div>
              <div className="flex items-start gap-2.5 rounded-xl bg-brand-50/70 border border-brand-100 px-3.5 py-2.5">
                <Building2 size={16} className="text-brand-500 mt-0.5 shrink-0" />
                <p className="text-xs text-brand-700/70">Après inscription, vous obtenez un <b>identifiant de compte</b> à transmettre à l'administrateur de votre entreprise pour être ajouté à ses projets.</p>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Créer mon compte <ArrowRight size={18} /></>}
              </button>
            </form>

            <p className="text-center text-sm text-brand-700/70 mt-6">
              Déjà inscrit ?{" "}
              <Link to="/login" className="font-semibold text-brand-600 hover:underline">Se connecter</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

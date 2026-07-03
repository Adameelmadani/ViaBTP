import { useState, useEffect } from "react";
import { NavLink, Link, useNavigate, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Building2, ClipboardList, AlertTriangle, FolderOpen, Camera,
  CalendarRange, Users2, Wallet, Package, Truck, ShoppingCart, Boxes, Warehouse,
  ScrollText, Bell, LogOut, Menu, X, ChevronDown, Check, UserCircle, ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { useCompany } from "../context/CompanyContext.jsx";
import api from "../api/client.js";
import { Avatar } from "./ui.jsx";
import Logo from "./Logo.jsx";
import { ROLE_LABELS } from "../lib/constants.js";

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAuth();
  const { companies, activeCompanyId, activeMembership, selectCompany } = useCompany();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const [companyMenu, setCompanyMenu] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const isCompanyAdmin = !!activeMembership?.isCompanyAdmin;

  const loadNotifs = () => api.get("/notifications").then((r) => setNotifications(r.data)).catch(() => {});
  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000);
    return () => clearInterval(t);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;
  const markAll = async () => { await api.patch("/notifications/read-all"); loadNotifs(); };
  const doLogout = () => { logout(); navigate("/login"); };

  const nav = isSuperAdmin
    ? [{ section: "Plateforme", items: [{ to: "/admin", label: "Entreprises", icon: Building2 }] }]
    : [
        { section: "Pilotage", items: [
          { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, end: true },
          { to: "/projects", label: "Projets", icon: Building2 },
          { to: "/planning", label: "Planning", icon: CalendarRange },
        ] },
        { section: "Suivi chantier", items: [
          { to: "/progress", label: "Avancement", icon: ClipboardList },
          { to: "/reserves", label: "Réserves & NC", icon: AlertTriangle },
          { to: "/photos", label: "Photos & géoloc", icon: Camera },
          { to: "/documents", label: "Documents", icon: FolderOpen },
          { to: "/meetings", label: "Réunions", icon: Users2 },
        ] },
        { section: "Approvisionnement", items: [
          { to: "/materials", label: "Matériaux", icon: Package },
          { to: "/stock", label: "Stock & mouvements", icon: Boxes },
          { to: "/supply", label: "Demandes d'appro", icon: Warehouse },
          { to: "/orders", label: "Bons de commande", icon: ShoppingCart },
          { to: "/suppliers", label: "Fournisseurs", icon: Truck },
        ] },
        { section: "Gestion", items: [
          { to: "/finance", label: "Finance", icon: Wallet },
          ...(isCompanyAdmin ? [
            { to: "/members", label: "Équipe & accès", icon: ShieldCheck },
            { to: "/activity", label: "Journal d'activité", icon: ScrollText },
          ] : []),
        ] },
      ];

  const activeCompany = activeMembership?.company;

  return (
    <div className="min-h-screen flex app-shell">
      <aside className={`fixed lg:sticky top-0 z-40 h-screen w-72 shrink-0 transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="h-full m-3 mr-0 lg:mr-3 glass-strong flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-100/60">
            <Link to={isSuperAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-3 min-w-0" title="Accueil ViaBTP">
              <Logo size={44} rounded="rounded-2xl" />
              <div>
                <p className="font-display font-extrabold text-lg leading-none">
                  <span className="text-brand-900">Via</span><span className="text-gradient-accent">BTP</span>
                </p>
                <p className="font-mono text-[10px] text-brand-700/60 mt-1 tracking-wider">[ plateforme chantier ]</p>
              </div>
            </Link>
            <button className="ml-auto lg:hidden text-brand-600" onClick={() => setMobileOpen(false)}><X size={22} /></button>
          </div>

          {/* Sélecteur d'entreprise */}
          {!isSuperAdmin && activeCompany && (
            <div className="px-3 pt-3">
              <div className="relative">
                <button
                  onClick={() => setCompanyMenu((o) => !o)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-brand-50/70 border border-brand-100 hover:bg-brand-50 transition text-left"
                >
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-brand-600 text-white font-bold text-sm shrink-0">
                    {activeCompany.name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-brand-900 truncate">{activeCompany.name}</p>
                    <p className="text-[10px] text-brand-700/60">{ROLE_LABELS[activeMembership.type] || activeMembership.type}{isCompanyAdmin ? " · Admin" : ""}</p>
                  </div>
                  {companies.length > 1 && <ChevronDown size={15} className="text-brand-500 shrink-0" />}
                </button>
                {companyMenu && companies.length > 1 && (
                  <div className="absolute left-0 right-0 mt-1.5 z-30 glass-strong overflow-hidden animate-fade-in py-1.5">
                    {companies.map((m) => (
                      <button
                        key={m.companyId}
                        onClick={() => { selectCompany(m.companyId); setCompanyMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-brand-50 transition"
                      >
                        <div className="grid place-items-center w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs shrink-0">{m.company.name?.[0]}</div>
                        <span className="text-sm font-medium text-brand-900 truncate flex-1">{m.company.name}</span>
                        {m.companyId === activeCompanyId && <Check size={15} className="text-brand-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
            {nav.map((group) => (
              <div key={group.section}>
                <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-600/50">{group.section}</p>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <NavLink key={item.to} to={item.to} end={item.end} onClick={() => setMobileOpen(false)}
                      className={({ isActive }) => `nav-link ${isActive ? "nav-link-active" : ""}`}>
                      <item.icon size={18} className="shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-brand-100/60 text-center">
            <p className="text-[10px] text-brand-700/40">ViaBTP © 2026</p>
          </div>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-brand-900/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 px-3 lg:px-6 py-3">
          <div className="glass flex items-center gap-3 px-4 py-2.5">
            <button className="lg:hidden text-brand-700" onClick={() => setMobileOpen(true)}><Menu size={22} /></button>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-brand-900">Bonjour, {user?.firstName}</p>
              <p className="text-xs text-brand-700/60">{isSuperAdmin ? "Console d'administration de la plateforme" : "Pilotez vos chantiers en temps réel"}</p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button onClick={() => { setNotifOpen((o) => !o); setUserMenu(false); }}
                  className="relative grid place-items-center w-10 h-10 rounded-xl bg-white/50 border border-white/60 text-brand-700 hover:bg-white/80 transition">
                  <Bell size={19} />
                  {unread > 0 && <span className="absolute -top-1 -right-1 grid place-items-center min-w-5 h-5 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">{unread}</span>}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 glass-strong overflow-hidden animate-fade-in">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-brand-100/60">
                      <p className="font-bold text-brand-900">Notifications</p>
                      {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-brand-600 hover:underline">Tout marquer lu</button>}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-6 text-center text-sm text-brand-700/50">Aucune notification</p>
                      ) : notifications.map((n) => (
                        <div key={n.id} className={`px-4 py-3 border-b border-brand-50 ${!n.read ? "bg-brand-50/50" : ""}`}>
                          <p className="text-sm font-semibold text-brand-900">{n.title}</p>
                          <p className="text-xs text-brand-700/70 mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button onClick={() => { setUserMenu((o) => !o); setNotifOpen(false); }}
                  className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-white/50 border border-white/60 hover:bg-white/80 transition">
                  <Avatar name={`${user?.firstName} ${user?.lastName}`} size={32} />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-bold text-brand-900 leading-tight">{user?.firstName} {user?.lastName}</p>
                    <p className="text-[10px] text-brand-700/60">{isSuperAdmin ? "Super-admin" : (ROLE_LABELS[activeMembership?.type] || "Compte")}</p>
                  </div>
                  <ChevronDown size={15} className="text-brand-600" />
                </button>
                {userMenu && (
                  <div className="absolute right-0 mt-2 w-60 glass-strong overflow-hidden animate-fade-in py-1.5">
                    <div className="px-4 py-2 border-b border-brand-100/60">
                      <p className="text-sm font-bold text-brand-900">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-brand-700/60 truncate">{user?.email}</p>
                      <p className="mt-1 text-[11px] font-mono text-brand-600 bg-brand-50 rounded px-1.5 py-0.5 inline-block">{user?.accountId}</p>
                    </div>
                    <Link to="/profile" onClick={() => setUserMenu(false)} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-brand-800 hover:bg-brand-50 transition">
                      <UserCircle size={16} /> Mon profil
                    </Link>
                    <button onClick={doLogout} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition">
                      <LogOut size={16} /> Se déconnecter
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-3 lg:px-6 pb-8 pt-1 animate-fade-in">
          <Outlet key={activeCompanyId || "platform"} />
        </main>
      </div>
    </div>
  );
}

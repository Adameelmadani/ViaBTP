import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { Spinner } from "./components/ui.jsx";
import Layout from "./components/Layout.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Profile from "./pages/Profile.jsx";
import Companies from "./pages/admin/Companies.jsx";
import Members from "./pages/Members.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectDetail from "./pages/ProjectDetail.jsx";
import Progress from "./pages/Progress.jsx";
import Reserves from "./pages/Reserves.jsx";
import Photos from "./pages/Photos.jsx";
import Documents from "./pages/Documents.jsx";
import Meetings from "./pages/Meetings.jsx";
import Planning from "./pages/Planning.jsx";
import Materials from "./pages/Materials.jsx";
import Stock from "./pages/Stock.jsx";
import Supply from "./pages/Supply.jsx";
import Orders from "./pages/Orders.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Finance from "./pages/Finance.jsx";
import Activity from "./pages/Activity.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen grid place-items-center"><Spinner /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, memberships, isSuperAdmin } = useAuth();
  const home = !user ? "/" : isSuperAdmin ? "/admin" : memberships.length ? "/dashboard" : "/onboarding";

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={home} replace /> : <Register />} />

      {/* Écran d'accueil sans entreprise (plein écran, hors Layout) */}
      <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />

      <Route element={<Protected><Layout /></Protected>}>
        {isSuperAdmin ? (
          <>
            <Route path="/admin" element={<Companies />} />
            <Route path="/profile" element={<Profile />} />
          </>
        ) : memberships.length ? (
          <>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/reserves" element={<Reserves />} />
            <Route path="/photos" element={<Photos />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/supply" element={<Supply />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/finance" element={<Finance />} />
            <Route path="/members" element={<Members />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/profile" element={<Profile />} />
          </>
        ) : null}
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  );
}

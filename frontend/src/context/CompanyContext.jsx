import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import { COMPANY_KEY } from "../api/client.js";

const CompanyContext = createContext(null);

export function CompanyProvider({ children }) {
  const { memberships } = useAuth();
  const [activeCompanyId, setActiveCompanyId] = useState(() => localStorage.getItem(COMPANY_KEY) || null);

  // Garde une entreprise active valide au regard des adhésions courantes.
  useEffect(() => {
    if (!memberships.length) {
      if (activeCompanyId) { setActiveCompanyId(null); localStorage.removeItem(COMPANY_KEY); }
      return;
    }
    const valid = memberships.some((m) => m.companyId === activeCompanyId);
    if (!valid) {
      const first = memberships[0].companyId;
      setActiveCompanyId(first);
      localStorage.setItem(COMPANY_KEY, first);
    }
  }, [memberships]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectCompany = (id) => {
    setActiveCompanyId(id);
    if (id) localStorage.setItem(COMPANY_KEY, id);
    else localStorage.removeItem(COMPANY_KEY);
    // On oublie le dernier projet sélectionné (il appartient peut-être à une autre entreprise).
    localStorage.removeItem("viabtp_project");
  };

  const activeMembership = memberships.find((m) => m.companyId === activeCompanyId) || null;

  return (
    <CompanyContext.Provider value={{ companies: memberships, activeCompanyId, activeMembership, selectCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export const useCompany = () => useContext(CompanyContext);

import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("viabtp_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then((res) => {
        setUser(res.data.user);
        setMemberships(res.data.memberships || []);
      })
      .catch(() => localStorage.removeItem("viabtp_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    localStorage.setItem("viabtp_token", res.data.token);
    setUser(res.data.user);
    setMemberships(res.data.memberships || []);
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post("/auth/register", payload);
    localStorage.setItem("viabtp_token", res.data.token);
    setUser(res.data.user);
    setMemberships(res.data.memberships || []);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem("viabtp_token");
    localStorage.removeItem("viabtp_company");
    setUser(null);
    setMemberships([]);
  };

  const refreshMemberships = async () => {
    const res = await api.get("/auth/me");
    setUser(res.data.user);
    setMemberships(res.data.memberships || []);
    return res.data.memberships || [];
  };

  const isSuperAdmin = user?.platformRole === "SUPERADMIN";

  return (
    <AuthContext.Provider value={{ user, memberships, loading, isSuperAdmin, login, register, logout, setUser, refreshMemberships }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

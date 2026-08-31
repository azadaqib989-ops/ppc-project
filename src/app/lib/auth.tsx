import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
export type Role = "admin" | "reviewer" | "focal" | "investor";
export const API_BASE_URL = "/api/v1";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
  organization?: string;
  provinceId?: string;
  // Legacy fields kept for compatibility with dashboards still reading mock/local data.
  title?: string;
  province?: string;
}

const DEMO_USERS: Array<AuthUser & { password: string }> = [
  { id: "1", email: "admin@pcpp.gov.pk", password: "Admin@123", role: "admin", name: "Ayesha Raza", title: "Central Ministry Administrator" },
  { id: "2", email: "reviewer@pcpp.gov.pk", password: "Reviewer@123", role: "reviewer", name: "Farrukh Zaman", title: "Reviewer / Analyst" },
  { id: "3", email: "focal@pcpp.gov.pk", password: "Focal@123", role: "focal", name: "M. Tariq Bashir", province: "Punjab", provinceId: "punjab", title: "Provincial Focal Point — Punjab" },
  { id: "4", email: "focal.sindh@pcpp.gov.pk", password: "Focal@123", role: "focal", name: "Sana Iqbal", province: "Sindh", provinceId: "sindh", title: "Provincial Focal Point — Sindh" },
  { id: "5", email: "investor@pcpp.gov.pk", password: "Investor@123", role: "investor", name: "James Whitfield", organization: "Global Climate Fund", title: "Investment Partner" },
];

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  // Sets a session user directly without calling the API — used by the demo signup flow, which is not backed by a real endpoint.
  setSessionUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "pcpp_auth_user";
const TOKEN_KEY = "pcpp_access_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore corrupt storage */ }
    }
    if (token) setAccessToken(token);

    if (raw) setUser(JSON.parse(raw));
  }, []);

  const login = async (email: string, password: string) => {
    const authUser = DEMO_USERS.find(u => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password);
    if (!authUser) throw new Error("Invalid demo email or password.");

    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    localStorage.removeItem(TOKEN_KEY);
    return authUser;
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  };

  const setSessionUser = (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
  };

  return <AuthContext.Provider value={{ user, accessToken, login, logout, setSessionUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

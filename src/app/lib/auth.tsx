import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getUsers } from "./store";

export type Role = "admin" | "reviewer" | "focal" | "investor";

export interface AuthUser {
  email: string;
  role: Role;
  name: string;
  title: string;
  province?: string;
}

// Dummy credentials for client demo purposes only — not connected to a real backend.
// Kept in sync with the seed users in lib/store.ts (getUsers()).
export const DEMO_CREDENTIALS: { email: string; password: string; role: Role; label: string }[] = [
  { email: "admin@pcpp.gov.pk", password: "Admin@123", role: "admin", label: "Ministry Admin" },
  { email: "reviewer@pcpp.gov.pk", password: "Reviewer@123", role: "reviewer", label: "Reviewer / Analyst" },
  { email: "focal@pcpp.gov.pk", password: "Focal@123", role: "focal", label: "Provincial Focal Point (Punjab)" },
  { email: "investor@pcpp.gov.pk", password: "Investor@123", role: "investor", label: "Investor" },
];

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => AuthUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "pcpp_auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch { /* ignore corrupt storage */ }
    }
  }, []);

  const login = (email: string, password: string) => {
    const match = getUsers().find(
      u => u.active && u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!match) return null;
    const authUser: AuthUser = { email: match.email, role: match.role, name: match.name, title: match.title, province: match.province };
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    return authUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

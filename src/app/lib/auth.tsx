import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getCurrentUserProfile, loginApi, logoutApi } from "./api";
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

function normalizeAuthUser(user: {
  id?: string | number; email?: string; name?: string;
  provinceName?: string | null; title?: string; province?: string; organization?: string | null;
  role?: string; provinceId?: string | null;
}): AuthUser {
  const rawRole = (user.role ?? "investor").toString().toLowerCase();
  const role: Role = (["admin", "reviewer", "focal", "investor"] as const).includes(rawRole as Role)
    ? (rawRole as Role)
    : "investor";
  return {
    id: String(user.id ?? ""),
    email: user.email ?? "",
    name: user.name ?? "",
    role,
    organization: user.organization ?? undefined,
    provinceId: user.provinceId ?? undefined,
    title: user.title,
    province: user.province ?? user.provinceName ?? undefined,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  /** True until the session has been restored from localStorage on first mount. */
  initializing: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  // Sets a session user directly without calling the API — used by the demo signup flow, which is not backed by a real endpoint.
  setSessionUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "pcpp_auth_user";
const TOKEN_KEY = "pcpp_access_token";
const REFRESH_TOKEN_KEY = "pcpp_refresh_token";

// Read the persisted session synchronously so route guards never see a brief
// null user (which previously caused a refresh on /dashboard/* to bounce to /).
function readStoredAuth(): { user: AuthUser | null; accessToken: string | null } {
  const token = localStorage.getItem(TOKEN_KEY);
  const raw = localStorage.getItem(STORAGE_KEY);
  let user: AuthUser | null = null;
  if (raw) {
    try { user = JSON.parse(raw); } catch { /* ignore corrupt storage */ }
  }
  return { user, accessToken: token };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const initial = readStoredAuth();
  const [user, setUser] = useState<AuthUser | null>(initial.user);
  const [accessToken, setAccessToken] = useState<string | null>(initial.accessToken);
  const [initializing, setInitializing] = useState(Boolean(initial.accessToken && !initial.user));

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (token && !raw) {
      getCurrentUserProfile()
        .then(profile => {
          const hydrated = normalizeAuthUser(profile as any);
          if (hydrated.email) {
            setUser(hydrated);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));
          }
        })
        .catch(() => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(STORAGE_KEY);
          setAccessToken(null);
          setUser(null);
        })
        .finally(() => setInitializing(false));
    }

    if (!token && refreshToken) {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginApi(email, password);
    const token = response.accessToken;
    const refreshToken = response.refreshToken;
    const authUser = normalizeAuthUser(response.user);

    if (!authUser.email) {
      throw new Error("Login response did not include user details.");
    }

    setUser(authUser);
    setAccessToken(token ?? null);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    return authUser;
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    try {
      if (refreshToken) {
        await logoutApi(refreshToken);
      }
    } catch { /* ignore API logout errors */ }

    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  };

  const setSessionUser = (authUser: AuthUser) => {
    setUser(authUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(authUser));
  };

  return <AuthContext.Provider value={{ user, accessToken, initializing, login, logout, setSessionUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

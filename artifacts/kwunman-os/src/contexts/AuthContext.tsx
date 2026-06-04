import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AuthUser {
  id: number;
  username: string;
  role: "管理者" | "參與者" | "員工";
  fullName: string;
  phone: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isPartner: boolean;
  isEmployee: boolean;
  canDelete: boolean;
  canWrite: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 使用环境变量，若未设置则默认指向 Render 后端
const apiBase = import.meta.env.VITE_API_BASE_URL || "https://kwunman-monorepo.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/api/auth/me`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: AuthUser | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "登入失敗");
    }
    const data: AuthUser = await res.json();
    setUser(data);
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${apiBase}/api/auth/logout`, { method: "POST", credentials: "include" });
    setUser(null);
  }, []);

  const isAdmin = user?.role === "管理者";
  const isPartner = user?.role === "參與者";
  const isEmployee = user?.role === "員工";
  const canDelete = isAdmin;
  const canWrite = isAdmin || isPartner;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isPartner, isEmployee, canDelete, canWrite }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
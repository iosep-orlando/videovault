"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { UserDTO } from "@/lib/types";

// Estado global de la sesión en el navegador: quién es el usuario, para la
// cabecera y las páginas. La sesión de verdad es la cookie httpOnly, que el
// JavaScript no puede leer; por eso se pregunta a /api/auth/me.

interface AuthState {
  user: UserDTO | null;
  loading: boolean;
  setUser: (user: UserDTO | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => !cancelled && setUser(data.user ?? null))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth tiene que usarse dentro de <AuthProvider>");
  return ctx;
}

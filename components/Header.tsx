"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href={user ? "/videos" : "/"} className="text-lg font-bold tracking-tight">
          📹 VideoVault
        </Link>
        {!loading && (
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span className="hidden text-slate-500 sm:inline">{user.email}</span>
                <Link href="/videos/subir" className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-strong">
                  Subir vídeo
                </Link>
                <button type="button" onClick={handleLogout} className="text-slate-600 hover:text-slate-900">
                  Salir
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-700 hover:text-slate-900">Iniciar sesión</Link>
                <Link href="/registro" className="rounded-lg bg-accent px-3 py-1.5 font-medium text-white hover:bg-accent-strong">
                  Crear cuenta
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}

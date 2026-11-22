"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { safeNext } from "@/lib/navigation";
import FormError from "./FormError";
import { button, card, input, label } from "./ui";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isLogin = mode === "login";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch(isLogin ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "No se pudo completar. Probá de nuevo.");
        return;
      }
      setUser(data.user);
      router.push(safeNext(params.get("next")));
    } catch {
      setError("No se pudo contactar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`${card} mx-auto mt-12 w-full max-w-md space-y-4`}>
      <h1 className="text-2xl font-bold">{isLogin ? "Iniciar sesión" : "Crear cuenta"}</h1>
      <div>
        <label htmlFor="email" className={label}>Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label htmlFor="password" className={label}>Contraseña</label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={isLogin ? undefined : 8}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className={input}
        />
        {!isLogin && <p className="mt-1 text-xs text-slate-500">Al menos 8 caracteres.</p>}
      </div>
      <FormError message={error} />
      <button type="submit" disabled={pending} className={`${button} w-full`}>
        {pending ? "Un momento…" : isLogin ? "Entrar" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-slate-600">
        {isLogin ? (
          <>¿No tenés cuenta? <Link href="/registro" className="font-medium text-violet-700 hover:underline">Creala</Link></>
        ) : (
          <>¿Ya tenés cuenta? <Link href="/login" className="font-medium text-violet-700 hover:underline">Iniciá sesión</Link></>
        )}
      </p>
    </form>
  );
}

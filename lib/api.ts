import type { ObjectId } from "mongodb";
import { getSession } from "./session";
import { toObjectId } from "./db";

// Respuestas de error con la misma forma en toda la API: { error: "…" }.
export function jsonError(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

/** El cuerpo JSON de la petición, o null si no es un objeto JSON válido. */
export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return typeof body === "object" && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * El usuario de la sesión. proxy.ts ya protege las páginas, pero cada ruta de
 * la API lo vuelve a comprobar: las rutas se pueden llamar directamente.
 */
export async function requireUser(): Promise<{ userId: ObjectId; email: string } | Response> {
  const session = await getSession();
  const userId = session && toObjectId(session.sub);
  if (!session || !userId) return jsonError(401, "Tenés que iniciar sesión.");
  return { userId, email: session.email };
}

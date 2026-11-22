import { cookies } from "next/headers";
import { SESSION_TTL_SECONDS, signSession, verifySession, type SessionPayload } from "./jwt";

export const SESSION_COOKIE = "session";

// httpOnly: el JavaScript de la página no puede leer el JWT (protege de XSS).
// secure solo en producción: en local se trabaja con http://localhost.
// sameSite lax: la cookie no viaja en POST desde otros sitios (CSRF).
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
} as const;

export async function startSession(payload: SessionPayload): Promise<void> {
  const jwt = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, jwt, sessionCookieOptions);
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** La sesión de la petición actual, o null. */
export async function getSession(): Promise<SessionPayload | null> {
  const jwt = (await cookies()).get(SESSION_COOKIE)?.value;
  return jwt ? verifySession(jwt) : null;
}

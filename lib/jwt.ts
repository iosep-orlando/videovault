import { SignJWT, jwtVerify } from "jose";

// JWT de sesión, firmado con HS256 y JWT_SECRET. Sin dependencias de base de
// datos: lo importa proxy.ts, que se ejecuta antes de cada petición.

export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface SessionPayload {
  sub: string; // id del usuario
  email: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('Falta la variable de entorno "JWT_SECRET"');
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

/** El payload si la firma y la caducidad son válidas; null si no. */
export async function verifySession(jwt: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(jwt, getSecret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.email !== "string") return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

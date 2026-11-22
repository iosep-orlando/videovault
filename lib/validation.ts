// Reglas de lo que llega del navegador. Se comprueban en el servidor: una API
// se puede llamar sin pasar por el formulario.

export const MAX_VIDEO_BYTES = 500 * 1024 * 1024; // 500 MB
export const MAX_TAGS = 20;
export const MAX_META_PAIRS = 20;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : null;
}

/** null si es válida; si no, el motivo. */
export function passwordProblem(input: unknown): string | null {
  if (typeof input !== "string") return "Falta la contraseña.";
  if (input.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  // bcrypt solo usa los primeros 72 bytes: más larga daría una falsa seguridad.
  if (new TextEncoder().encode(input).length > 72) return "La contraseña admite como mucho 72 caracteres.";
  return null;
}

/** Texto libre recortado; null si no es texto o supera el máximo. */
export function cleanText(input: unknown, max: number): string | null {
  if (input === undefined || input === null) return "";
  if (typeof input !== "string") return null;
  const text = input.trim();
  return text.length <= max ? text : null;
}

/**
 * Tags: en minúsculas, sin espacios alrededor, sin repetir y sin vacíos.
 * Acepta un array o un texto separado por comas ("Viaje, playa").
 */
export function normalizeTags(input: unknown): string[] | null {
  if (input === undefined || input === null) return [];
  const raw = typeof input === "string" ? input.split(",") : input;
  if (!Array.isArray(raw)) return null;
  const tags: string[] = [];
  for (const t of raw) {
    if (typeof t !== "string") return null;
    const tag = t.trim().toLowerCase();
    if (tag.length > 40) return null;
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags.length <= MAX_TAGS ? tags : null;
}

/**
 * Pares clave-valor libres ("cliente: acme"). La clave se guarda en
 * minúsculas para que la búsqueda no dependa de cómo se escribió; el valor,
 * tal cual. Una clave repetida se queda con el último valor.
 */
export function normalizeMeta(input: unknown): { key: string; value: string }[] | null {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input)) return null;
  const byKey = new Map<string, string>();
  for (const pair of input) {
    if (typeof pair !== "object" || pair === null) return null;
    const { key, value } = pair as Record<string, unknown>;
    if (typeof key !== "string" || typeof value !== "string") return null;
    const k = key.trim().toLowerCase();
    const v = value.trim();
    if (!k && !v) continue; // fila vacía del formulario
    if (!k || k.length > 40 || v.length > 200) return null;
    byKey.set(k, v);
  }
  const meta = [...byKey].map(([key, value]) => ({ key, value }));
  return meta.length <= MAX_META_PAIRS ? meta : null;
}

/** Tipo y tamaño del fichero antes de dar permiso para subirlo. */
export function uploadProblem(contentType: unknown, size: unknown): string | null {
  if (typeof contentType !== "string" || !/^video\/[\w.+-]+$/.test(contentType)) {
    return "Solo se pueden subir vídeos.";
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    return "Tamaño de fichero no válido.";
  }
  if (size > MAX_VIDEO_BYTES) return "El vídeo supera el máximo de 500 MB.";
  return null;
}

/** Escapa un texto para usarlo dentro de una expresión regular de MongoDB. */
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

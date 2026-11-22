// Lógica del campo de tags en fichas: qué separa un tag de otro y cómo se
// limpia cada uno. Sin React, para poder probarla.

/** Coma, punto y coma o salto de línea cierran un tag. */
export const TAG_SEPARATORS = /[,;\n]/;

export function cleanTag(raw: string): string {
  return raw.trim().replace(/^#+/, "").toLowerCase().slice(0, 40);
}

/** Añade los tags de un texto ("viaje; playa, 2026") a la lista, sin repetir. */
export function addTags(current: string[], text: string, max = 20): string[] {
  const next = [...current];
  for (const part of text.split(TAG_SEPARATORS)) {
    const tag = cleanTag(part);
    if (tag && !next.includes(tag) && next.length < max) next.push(tag);
  }
  return next;
}

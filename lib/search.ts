import type { Filter, ObjectId } from "mongodb";
import type { VideoDoc } from "./db";
import { escapeRegex } from "./validation";

export interface SearchParams {
  q?: string; // texto en nombre o descripción
  tag?: string; // tag exacto
  key?: string; // clave de un par clave-valor
  value?: string; // valor de ese par (o cualquier valor si se omite)
}

/** Lee los parámetros de búsqueda de la URL (?q=…&tag=…&key=…&value=…). */
export function parseSearchParams(url: URL): SearchParams {
  const get = (name: string) => url.searchParams.get(name)?.trim().slice(0, 100) || undefined;
  return { q: get("q"), tag: get("tag")?.toLowerCase(), key: get("key")?.toLowerCase(), value: get("value") };
}

/**
 * Construye el filtro de MongoDB. Siempre empieza por el usuario: cada uno
 * busca solo entre sus vídeos, y ese filtro no lo puede quitar ningún
 * parámetro de la URL. Los vídeos a medio subir no aparecen.
 */
export function buildVideoFilter(userId: ObjectId, params: SearchParams): Filter<VideoDoc> {
  const filter: Filter<VideoDoc> = { userId, status: "ready" };

  if (params.q) {
    // El texto del usuario se escapa: "c++" busca "c++", no es una expresión
    // regular que pueda colgar el servidor.
    const re = { $regex: escapeRegex(params.q), $options: "i" };
    filter.$or = [{ name: re }, { description: re }];
  }
  if (params.tag) filter.tags = params.tag;
  if (params.key) {
    // $elemMatch: la clave Y el valor tienen que estar en el MISMO par. Sin
    // él, cliente=acme encontraría un vídeo con {cliente: otro, x: acme}.
    filter.meta = {
      $elemMatch: params.value
        ? { key: params.key, value: { $regex: `^${escapeRegex(params.value)}$`, $options: "i" } }
        : { key: params.key },
    };
  }
  return filter;
}

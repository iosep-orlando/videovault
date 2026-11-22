import { collections, toDTO, toObjectId } from "@/lib/db";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { deleteObject, playUrl } from "@/lib/s3";
import { cleanText, normalizeMeta, normalizeTags } from "@/lib/validation";

type Ctx = RouteContext<"/api/videos/[id]">;

// Un vídeo de otro usuario responde lo mismo que uno que no existe (404): no
// se revela qué ids existen.
async function findOwn(ctx: Ctx, userId: import("mongodb").ObjectId) {
  const id = toObjectId((await ctx.params).id);
  if (!id) return null;
  const { videos } = await collections();
  return videos.findOne({ _id: id, userId, status: "ready" });
}

/** GET — metadatos y una URL firmada para reproducirlo. */
export async function GET(_request: Request, ctx: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const doc = await findOwn(ctx, user.userId);
  if (!doc) return jsonError(404, "Vídeo no encontrado.");
  return Response.json({ video: toDTO(doc), playUrl: await playUrl(doc.s3Key) });
}

/** PATCH — cambia nombre, descripción, tags o pares clave-valor. */
export async function PATCH(request: Request, ctx: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");
  const doc = await findOwn(ctx, user.userId);
  if (!doc) return jsonError(404, "Vídeo no encontrado.");

  const changes: Record<string, unknown> = {};
  if ("name" in body) {
    const name = cleanText(body.name, 120);
    if (!name) return jsonError(400, "El nombre es obligatorio (hasta 120 caracteres).");
    changes.name = name;
  }
  if ("description" in body) {
    const description = cleanText(body.description, 2000);
    if (description === null) return jsonError(400, "La descripción admite hasta 2000 caracteres.");
    changes.description = description;
  }
  if ("tags" in body) {
    const tags = normalizeTags(body.tags);
    if (!tags) return jsonError(400, "Tags no válidos: hasta 20, de hasta 40 caracteres.");
    changes.tags = tags;
  }
  if ("meta" in body) {
    const meta = normalizeMeta(body.meta);
    if (!meta) return jsonError(400, "Pares clave-valor no válidos.");
    changes.meta = meta;
  }

  const { videos } = await collections();
  const updated = await videos.findOneAndUpdate(
    { _id: doc._id, userId: user.userId },
    { $set: changes },
    { returnDocument: "after" },
  );
  if (!updated) return jsonError(404, "Vídeo no encontrado.");
  return Response.json({ video: toDTO(updated) });
}

/** DELETE — borra el fichero de RustFS y sus metadatos. */
export async function DELETE(_request: Request, ctx: Ctx) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const doc = await findOwn(ctx, user.userId);
  if (!doc) return jsonError(404, "Vídeo no encontrado.");

  // Primero el fichero: si falla, los metadatos siguen y se puede reintentar.
  // Al revés quedaría un fichero huérfano ocupando sitio sin que nadie lo vea.
  await deleteObject(doc.s3Key);
  const { videos } = await collections();
  await videos.deleteOne({ _id: doc._id, userId: user.userId });
  return Response.json({ ok: true });
}

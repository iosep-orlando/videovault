import { collections, toDTO, toObjectId } from "@/lib/db";
import { jsonError, requireUser } from "@/lib/api";
import { deleteObject, objectSize } from "@/lib/s3";
import { MAX_VIDEO_BYTES } from "@/lib/validation";

/**
 * POST /api/videos/[id]/complete — segundo paso de la subida. El navegador
 * avisa de que terminó el PUT; el servidor NO se fía de lo que diga: pregunta
 * a RustFS si el fichero está y cuánto ocupa de verdad.
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/videos/[id]/complete">) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const id = toObjectId((await ctx.params).id);
  if (!id) return jsonError(404, "Vídeo no encontrado.");

  const { videos } = await collections();
  const doc = await videos.findOne({ _id: id, userId: user.userId, status: "uploading" });
  if (!doc) return jsonError(404, "Subida no encontrada.");

  const size = await objectSize(doc.s3Key);
  if (size === null) return jsonError(409, "El vídeo no llegó al almacenamiento. Volvé a subirlo.");

  // La URL firmada no limita el tamaño: alguien podría subir más de lo que
  // declaró. Se comprueba aquí, con el tamaño real.
  if (size > MAX_VIDEO_BYTES) {
    await deleteObject(doc.s3Key);
    await videos.deleteOne({ _id: doc._id });
    return jsonError(413, "El vídeo supera el máximo de 500 MB.");
  }

  const ready = await videos.findOneAndUpdate(
    { _id: doc._id, status: "uploading" },
    { $set: { status: "ready", sizeBytes: size } },
    { returnDocument: "after" },
  );
  if (!ready) return jsonError(404, "Subida no encontrada.");
  return Response.json({ video: toDTO(ready) });
}

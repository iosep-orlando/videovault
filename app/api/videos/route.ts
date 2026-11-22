import { ObjectId } from "mongodb";
import { collections, toDTO } from "@/lib/db";
import { jsonError, readJson, requireUser } from "@/lib/api";
import { buildVideoFilter, parseSearchParams } from "@/lib/search";
import { deleteObject, ensureBucket, playUrl, uploadUrl, videoKey } from "@/lib/s3";
import { cleanText, normalizeMeta, normalizeTags, uploadProblem } from "@/lib/validation";

// Una subida que no se completa en este tiempo se da por abandonada.
const STALE_UPLOAD_MS = 60 * 60 * 1000;

/** GET /api/videos?q=&tag=&key=&value= — los vídeos del usuario, filtrados. */
export async function GET(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;

  const { videos } = await collections();
  const filter = buildVideoFilter(user.userId, parseSearchParams(new URL(request.url)));
  const docs = await videos.find(filter).sort({ createdAt: -1 }).limit(200).toArray();
  // Cada vídeo con su URL de previsualización. Firmar es un cálculo local,
  // sin pedir nada a RustFS: 200 URLs no cuestan nada.
  const list = await Promise.all(docs.map(async (doc) => ({ ...toDTO(doc), previewUrl: await playUrl(doc.s3Key) })));
  return Response.json({ videos: list });
}

/**
 * POST /api/videos — primer paso de la subida. Guarda los metadatos con
 * estado "uploading" y devuelve una URL firmada para que el navegador suba el
 * vídeo directamente a RustFS. El segundo paso es POST /api/videos/[id]/complete.
 */
export async function POST(request: Request) {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");

  const problem = uploadProblem(body.contentType, body.size);
  if (problem) return jsonError(400, problem);
  const name = cleanText(body.name, 120);
  const description = cleanText(body.description, 2000);
  const tags = normalizeTags(body.tags);
  const meta = normalizeMeta(body.meta);
  if (!name) return jsonError(400, "El nombre es obligatorio (hasta 120 caracteres).");
  if (description === null) return jsonError(400, "La descripción admite hasta 2000 caracteres.");
  if (!tags) return jsonError(400, "Tags no válidos: hasta 20, de hasta 40 caracteres.");
  if (!meta) return jsonError(400, "Pares clave-valor no válidos: hasta 20, con clave de hasta 40 caracteres.");

  await ensureBucket();
  const { videos } = await collections();

  // Limpieza de subidas abandonadas de este usuario (cerró la pestaña a
  // mitad, se cortó la conexión): ni ocupan sitio en S3 ni en la base.
  const stale = await videos
    .find({ userId: user.userId, status: "uploading", createdAt: { $lt: new Date(Date.now() - STALE_UPLOAD_MS) } })
    .toArray();
  for (const doc of stale) {
    await deleteObject(doc.s3Key);
    await videos.deleteOne({ _id: doc._id });
  }

  const _id = new ObjectId();
  const s3Key = videoKey(user.userId.toString(), _id.toString());
  const contentType = body.contentType as string;
  await videos.insertOne({
    _id,
    userId: user.userId,
    s3Key,
    name,
    description,
    tags,
    meta,
    contentType,
    sizeBytes: 0, // se rellena con el tamaño real al completar
    status: "uploading",
    createdAt: new Date(),
  });

  return Response.json({ id: _id.toString(), uploadUrl: await uploadUrl(s3Key, contentType) }, { status: 201 });
}

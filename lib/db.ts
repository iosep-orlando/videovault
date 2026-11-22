import { ObjectId, type Collection } from "mongodb";
import { getDb } from "./mongodb";
import type { MetaPair, Stats, VideoDTO, VideoStatus } from "./types";

// ---------------------------------------------------------------------------
// Acceso a MongoDB: usuarios y metadatos de vídeos.
// ---------------------------------------------------------------------------

export interface UserDoc {
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface VideoDoc {
  userId: ObjectId;
  s3Key: string;
  name: string;
  description: string;
  tags: string[];
  meta: MetaPair[];
  contentType: string;
  sizeBytes: number; // el tamaño REAL, leído de S3 al terminar la subida
  status: VideoStatus;
  createdAt: Date;
}

let indexes: Promise<unknown> | undefined;

export async function collections() {
  const db = await getDb();
  const users: Collection<UserDoc> = db.collection("users");
  const videos: Collection<VideoDoc> = db.collection("videos");
  // Una vez por proceso (createIndex es idempotente).
  indexes ??= Promise.all([
    users.createIndex({ email: 1 }, { unique: true, name: "email_unique" }),
    // Listado y panel: los vídeos de un usuario, más nuevos primero.
    videos.createIndex({ userId: 1, status: 1, createdAt: -1 }, { name: "user_videos" }),
    // Búsqueda por tag y por par clave-valor dentro de los de un usuario.
    videos.createIndex({ userId: 1, tags: 1 }, { name: "user_tags" }),
    videos.createIndex({ userId: 1, "meta.key": 1, "meta.value": 1 }, { name: "user_meta" }),
  ]).catch((err) => {
    indexes = undefined;
    throw err;
  });
  await indexes;
  return { users, videos };
}

export function isDuplicateKey(err: unknown): boolean {
  return (err as { code?: number })?.code === 11000;
}

export function toObjectId(id: string): ObjectId | null {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

export function toDTO(doc: VideoDoc & { _id: ObjectId }): VideoDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    description: doc.description,
    tags: doc.tags,
    meta: doc.meta,
    sizeBytes: doc.sizeBytes,
    contentType: doc.contentType,
    createdAt: doc.createdAt.toISOString(),
  };
}

/**
 * Panel del usuario, con dos agregaciones: número de vídeos y espacio
 * ocupado, y sus tags más usados.
 */
export async function statsFor(userId: ObjectId): Promise<Stats> {
  const { videos } = await collections();
  const match = { $match: { userId, status: "ready" as const } };
  const [[row], topTags] = await Promise.all([
    videos
      .aggregate<{ count: number; totalBytes: number }>([
        match,
        { $group: { _id: null, count: { $sum: 1 }, totalBytes: { $sum: "$sizeBytes" } } },
      ])
      .toArray(),
    videos
      .aggregate<{ tag: string; count: number }>([
        match,
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
        { $limit: 12 },
        { $project: { _id: 0, tag: "$_id", count: 1 } },
      ])
      .toArray(),
  ]);
  return { count: row?.count ?? 0, totalBytes: row?.totalBytes ?? 0, topTags };
}

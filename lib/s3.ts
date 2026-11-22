import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Almacenamiento de los vídeos en RustFS, que habla el protocolo de S3.
//
// El vídeo nunca pasa por el servidor de Next.js: el servidor firma una URL
// temporal y el navegador sube o descarga directamente de RustFS con ella.
// Las credenciales de S3 no salen nunca del servidor.
// ---------------------------------------------------------------------------

export const UPLOAD_URL_TTL_SECONDS = 15 * 60; // tiempo para empezar a subir
export const PLAY_URL_TTL_SECONDS = 60 * 60; // una película entera

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno "${name}"`);
  return value;
}

export function bucketName(): string {
  return process.env.RUSTFS_BUCKET ?? "videos";
}

let client: S3Client | undefined;

export function s3(): S3Client {
  client ??= new S3Client({
    endpoint: requireEnv("RUSTFS_ENDPOINT"),
    region: process.env.RUSTFS_REGION ?? "us-east-1", // RustFS no usa regiones, pero el SDK pide una
    credentials: {
      accessKeyId: requireEnv("RUSTFS_ACCESS_KEY"),
      secretAccessKey: requireEnv("RUSTFS_SECRET_KEY"),
    },
    // Rutas del tipo http://localhost:9000/videos/clave, no
    // http://videos.localhost:9000/clave, que en local no resuelve.
    forcePathStyle: true,
  });
  return client;
}

/** Para los tests: usa otro cliente (y vuelve a leer el entorno). */
export function resetS3Client(next?: S3Client): void {
  client = next;
  bucketChecked = undefined;
}

// El enunciado pide crear el bucket si no existe. Se comprueba una vez por
// proceso; si falla, se reintenta en la siguiente llamada.
let bucketChecked: Promise<void> | undefined;

export function ensureBucket(): Promise<void> {
  bucketChecked ??= (async () => {
    const Bucket = bucketName();
    try {
      await s3().send(new HeadBucketCommand({ Bucket }));
    } catch (err) {
      const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
      if (status !== 404) throw err;
      await s3().send(new CreateBucketCommand({ Bucket }));
    }
  })().catch((err) => {
    bucketChecked = undefined;
    throw err;
  });
  return bucketChecked;
}

/**
 * Clave del objeto: carpeta del usuario + id del vídeo. No lleva el nombre del
 * fichero: un nombre con espacios o acentos complica las URLs y no aporta
 * nada, porque el nombre visible está en MongoDB.
 */
export function videoKey(userId: string, videoId: string): string {
  return `${userId}/${videoId}`;
}

/** URL para que el navegador suba el vídeo con un PUT. */
export async function uploadUrl(key: string, contentType: string): Promise<string> {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({ Bucket: bucketName(), Key: key, ContentType: contentType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );
}

/** URL para reproducir el vídeo en un <video>. */
export async function playUrl(key: string): Promise<string> {
  return getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucketName(), Key: key }), {
    expiresIn: PLAY_URL_TTL_SECONDS,
  });
}

/** Tamaño real del objeto subido, o null si no está. */
export async function objectSize(key: string): Promise<number | null> {
  try {
    const head = await s3().send(new HeadObjectCommand({ Bucket: bucketName(), Key: key }));
    return head.ContentLength ?? null;
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404) return null;
    throw err;
  }
}

/** Borra el objeto. Borrar uno que no existe no es un error en S3. */
export async function deleteObject(key: string): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: bucketName(), Key: key }));
}

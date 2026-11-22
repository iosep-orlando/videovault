import { CreateBucketCommand, DeleteObjectCommand, HeadBucketCommand, HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteObject, ensureBucket, objectSize, resetS3Client } from "@/lib/s3";

// Un cliente S3 de mentira: responde lo que le digamos y apunta qué comandos
// recibió. Así se prueba la lógica sin RustFS en marcha.
type Reply = unknown | ((cmd: unknown) => unknown);
function fakeS3(replies: Record<string, Reply>) {
  const sent: string[] = [];
  const client = {
    send: async (cmd: object) => {
      const name = cmd.constructor.name;
      sent.push(name);
      const reply = replies[name];
      const value = typeof reply === "function" ? (reply as (c: unknown) => unknown)(cmd) : reply;
      if (value instanceof Error) throw value;
      return value ?? {};
    },
  };
  return { client: client as unknown as S3Client, sent };
}
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { $metadata: { httpStatusCode: status } });

beforeEach(() => {
  process.env.RUSTFS_BUCKET = "videos";
});
afterEach(() => resetS3Client());

describe("bucket", () => {
  it("si no existe (404), lo crea", async () => {
    const { client, sent } = fakeS3({ HeadBucketCommand: httpError(404) });
    resetS3Client(client);
    await ensureBucket();
    expect(sent).toEqual([HeadBucketCommand.name, CreateBucketCommand.name]);
  });

  it("si ya existe, no lo toca, y solo lo comprueba una vez por proceso", async () => {
    const { client, sent } = fakeS3({});
    resetS3Client(client);
    await ensureBucket();
    await ensureBucket();
    expect(sent).toEqual([HeadBucketCommand.name]);
  });

  it("otro error (credenciales, red) no intenta crear nada, y se reintenta la próxima vez", async () => {
    let calls = 0;
    const { client, sent } = fakeS3({ HeadBucketCommand: () => (++calls === 1 ? httpError(403) : {}) });
    resetS3Client(client);
    await expect(ensureBucket()).rejects.toThrow("HTTP 403");
    await ensureBucket();
    expect(sent).toEqual([HeadBucketCommand.name, HeadBucketCommand.name]);
  });
});

describe("objetos", () => {
  it("lee el tamaño real del objeto subido", async () => {
    const { client } = fakeS3({ HeadObjectCommand: { ContentLength: 12345 } });
    resetS3Client(client);
    expect(await objectSize("u1/v1")).toBe(12345);
  });

  it("si el objeto no llegó (404), el tamaño es null", async () => {
    const { client } = fakeS3({ HeadObjectCommand: httpError(404) });
    resetS3Client(client);
    expect(await objectSize("u1/v1")).toBeNull();
  });

  it("otros errores al leer el tamaño no se esconden", async () => {
    const { client } = fakeS3({ HeadObjectCommand: httpError(500) });
    resetS3Client(client);
    await expect(objectSize("u1/v1")).rejects.toThrow("HTTP 500");
  });

  it("borrar manda DeleteObject con el bucket y la clave", async () => {
    let input: unknown;
    const { client } = fakeS3({ DeleteObjectCommand: (cmd: unknown) => { input = (cmd as DeleteObjectCommand).input; } });
    resetS3Client(client);
    await deleteObject("u1/v1");
    expect(input).toEqual({ Bucket: "videos", Key: "u1/v1" });
  });

  it("HeadObject pregunta por la clave correcta", async () => {
    let input: unknown;
    const { client } = fakeS3({ HeadObjectCommand: (cmd: unknown) => { input = (cmd as HeadObjectCommand).input; return { ContentLength: 1 }; } });
    resetS3Client(client);
    await objectSize("u1/v9");
    expect(input).toEqual({ Bucket: "videos", Key: "u1/v9" });
  });
});

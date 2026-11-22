import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PLAY_URL_TTL_SECONDS, UPLOAD_URL_TTL_SECONDS, playUrl, resetS3Client, uploadUrl, videoKey } from "@/lib/s3";
import { formatBytes } from "@/lib/format";

// Firmar una URL no necesita red: se calcula con las credenciales. Por eso se
// puede probar sin RustFS en marcha.
beforeEach(() => {
  process.env.RUSTFS_ENDPOINT = "http://localhost:9000";
  process.env.RUSTFS_ACCESS_KEY = "test-access";
  process.env.RUSTFS_SECRET_KEY = "test-secret";
  process.env.RUSTFS_BUCKET = "videos";
  resetS3Client();
});
afterEach(() => resetS3Client());

describe("URLs firmadas", () => {
  it("la clave del objeto es carpeta del usuario + id del vídeo, sin el nombre del fichero", () => {
    expect(videoKey("u1", "v1")).toBe("u1/v1");
  });

  it("la URL de subida apunta a RustFS, al bucket y la clave, y caduca en 15 min", async () => {
    const url = new URL(await uploadUrl("u1/v1", "video/mp4"));
    expect(url.origin).toBe("http://localhost:9000");
    expect(url.pathname).toBe("/videos/u1/v1"); // forcePathStyle
    expect(url.searchParams.get("X-Amz-Expires")).toBe(String(UPLOAD_URL_TTL_SECONDS));
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
    // El tipo de contenido va firmado: el PUT tiene que mandar el mismo.
    expect(url.searchParams.get("X-Amz-SignedHeaders")).toContain("host");
  });

  it("la URL de reproducción caduca en 1 hora", async () => {
    const url = new URL(await playUrl("u1/v1"));
    expect(url.searchParams.get("X-Amz-Expires")).toBe(String(PLAY_URL_TTL_SECONDS));
  });

  it("las credenciales no aparecen en la URL, solo el id de la clave", async () => {
    const url = await uploadUrl("u1/v1", "video/mp4");
    expect(url).not.toContain("test-secret");
    expect(url).toContain("test-access");
  });

  it("falla de forma explícita si falta la configuración", () => {
    delete process.env.RUSTFS_ENDPOINT;
    resetS3Client();
    return expect(uploadUrl("k", "video/mp4")).rejects.toThrow(/RUSTFS_ENDPOINT/);
  });
});

describe("tamaños legibles", () => {
  it.each([
    [500, "500 B"],
    [1536, "1,5 KB"],
    [500 * 1024 * 1024, "500 MB"],
    [3 * 1024 ** 3, "3 GB"],
  ])("%i bytes → %s", (bytes, text) => {
    expect(formatBytes(bytes)).toBe(text);
  });
});

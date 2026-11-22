import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";
import { buildVideoFilter, parseSearchParams } from "@/lib/search";

const userId = new ObjectId();

describe("búsqueda", () => {
  it("sin filtros: solo los vídeos listos del usuario", () => {
    expect(buildVideoFilter(userId, {})).toEqual({ userId, status: "ready" });
  });

  it("el texto busca en nombre o descripción, sin distinguir mayúsculas, y escapado", () => {
    const filter = buildVideoFilter(userId, { q: "c++" });
    expect(filter.$or).toEqual([
      { name: { $regex: "c\\+\\+", $options: "i" } },
      { description: { $regex: "c\\+\\+", $options: "i" } },
    ]);
  });

  it("el tag es exacto", () => {
    expect(buildVideoFilter(userId, { tag: "playa" }).tags).toBe("playa");
  });

  it("clave y valor tienen que estar en el mismo par ($elemMatch)", () => {
    expect(buildVideoFilter(userId, { key: "cliente", value: "Acme" }).meta).toEqual({
      $elemMatch: { key: "cliente", value: { $regex: "^Acme$", $options: "i" } },
    });
  });

  it("solo la clave: cualquier vídeo que tenga ese dato", () => {
    expect(buildVideoFilter(userId, { key: "cliente" }).meta).toEqual({ $elemMatch: { key: "cliente" } });
  });

  it("ningún parámetro de la URL puede quitar el filtro por usuario", () => {
    const params = parseSearchParams(new URL("http://x/api/videos?userId=otro&status=uploading&q=a"));
    const filter = buildVideoFilter(userId, params);
    expect(filter.userId).toBe(userId);
    expect(filter.status).toBe("ready");
  });

  it("lee la URL: recorta, pasa tag y clave a minúsculas e ignora lo vacío", () => {
    expect(parseSearchParams(new URL("http://x/?q=%20hola%20&tag=Playa&key=Cliente&value=Acme&q2="))).toEqual({
      q: "hola",
      tag: "playa",
      key: "cliente",
      value: "Acme",
    });
    expect(parseSearchParams(new URL("http://x/?q="))).toEqual({ q: undefined, tag: undefined, key: undefined, value: undefined });
  });

  it("un texto de búsqueda muy largo se corta a 100 caracteres", () => {
    expect(parseSearchParams(new URL(`http://x/?q=${"a".repeat(500)}`)).q).toHaveLength(100);
  });
});

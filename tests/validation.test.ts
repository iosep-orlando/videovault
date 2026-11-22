import { describe, expect, it } from "vitest";
import {
  MAX_VIDEO_BYTES,
  cleanText,
  escapeRegex,
  normalizeEmail,
  normalizeMeta,
  normalizeTags,
  passwordProblem,
  uploadProblem,
} from "@/lib/validation";

describe("email y contraseña", () => {
  it("normaliza el email a minúsculas y sin espacios", () => {
    expect(normalizeEmail("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it.each(["", "ana", "ana@", "@x.com", "a b@x.com", 42, null])("rechaza el email %s", (input) => {
    expect(normalizeEmail(input)).toBeNull();
  });

  it("pide al menos 8 caracteres", () => {
    expect(passwordProblem("1234567")).toMatch(/8 caracteres/);
    expect(passwordProblem("12345678")).toBeNull();
  });

  it("rechaza más de 72 bytes: bcrypt ignoraría el resto", () => {
    expect(passwordProblem("a".repeat(73))).toMatch(/72/);
    expect(passwordProblem("ñ".repeat(37))).toMatch(/72/); // 74 bytes en UTF-8
  });

  it("rechaza una contraseña que no es texto", () => {
    expect(passwordProblem(undefined)).toMatch(/Falta/);
  });
});

describe("textos, tags y pares clave-valor", () => {
  it("recorta el texto y respeta el máximo", () => {
    expect(cleanText("  hola ", 10)).toBe("hola");
    expect(cleanText(undefined, 10)).toBe("");
    expect(cleanText("x".repeat(11), 10)).toBeNull();
    expect(cleanText(5, 10)).toBeNull();
  });

  it("los tags van en minúsculas, sin vacíos ni repetidos", () => {
    expect(normalizeTags("Viaje, playa ,, VIAJE")).toEqual(["viaje", "playa"]);
    expect(normalizeTags(["Demo", " demo "])).toEqual(["demo"]);
    expect(normalizeTags(undefined)).toEqual([]);
  });

  it("rechaza tags que no son texto, demasiado largos o demasiados", () => {
    expect(normalizeTags([1])).toBeNull();
    expect(normalizeTags(["x".repeat(41)])).toBeNull();
    expect(normalizeTags(Array.from({ length: 21 }, (_, i) => `t${i}`))).toBeNull();
    expect(normalizeTags({})).toBeNull();
  });

  it("la clave va en minúsculas, el valor tal cual, y una clave repetida se queda con el último", () => {
    expect(
      normalizeMeta([
        { key: " Cliente ", value: " Acme SA " },
        { key: "", value: "" }, // fila vacía del formulario
        { key: "cliente", value: "Otra" },
      ]),
    ).toEqual([{ key: "cliente", value: "Otra" }]);
  });

  it.each([
    [[{ key: "", value: "sin clave" }]],
    [[{ key: "k", value: 3 }]],
    [["no es un objeto"]],
    [[{ key: "x".repeat(41), value: "v" }]],
    ["no es un array"],
  ])("rechaza pares inválidos: %j", (input) => {
    expect(normalizeMeta(input)).toBeNull();
  });
});

describe("subida", () => {
  it("acepta un vídeo dentro del límite", () => {
    expect(uploadProblem("video/mp4", 10_000_000)).toBeNull();
    expect(uploadProblem("video/quicktime", MAX_VIDEO_BYTES)).toBeNull();
  });

  it.each([
    ["image/png", 100, /vídeos/],
    ["video/mp4", MAX_VIDEO_BYTES + 1, /500 MB/],
    ["video/mp4", 0, /Tamaño/],
    ["video/mp4", 1.5, /Tamaño/],
    ["video/mp4; rm -rf", 100, /vídeos/],
  ])("rechaza %s de %s bytes", (type, size, error) => {
    expect(uploadProblem(type, size)).toMatch(error);
  });

  it("escapa los caracteres especiales de una expresión regular", () => {
    expect(escapeRegex("c++ (v2).*")).toBe("c\\+\\+ \\(v2\\)\\.\\*");
    expect(new RegExp(escapeRegex("a.b")).test("axb")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { addTags, cleanTag } from "@/lib/tags";
import { formatDuration } from "@/lib/duration";

describe("fichas de tags", () => {
  it("coma, punto y coma y salto de línea separan tags", () => {
    expect(addTags([], "viaje, playa; 2026\nfamilia")).toEqual(["viaje", "playa", "2026", "familia"]);
  });

  it("en minúsculas, sin # delante, sin vacíos ni repetidos", () => {
    expect(addTags(["viaje"], "#Viaje,, ##Playa ;")).toEqual(["viaje", "playa"]);
  });

  it("no pasa del máximo", () => {
    expect(addTags(["a", "b"], "c, d", 3)).toEqual(["a", "b", "c"]);
  });

  it("un tag largo se corta a 40 caracteres", () => {
    expect(cleanTag("x".repeat(60))).toHaveLength(40);
  });
});

describe("duración", () => {
  it.each([
    [0, "0:00"],
    [9.9, "0:09"],
    [75.4, "1:15"],
    [3725, "1:02:05"],
  ])("%s s → %s", (s, text) => {
    expect(formatDuration(s)).toBe(text);
  });

  it("sin duración conocida no muestra nada", () => {
    expect(formatDuration(Number.NaN)).toBe("");
    expect(formatDuration(Infinity)).toBe("");
  });
});

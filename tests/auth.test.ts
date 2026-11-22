import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/jwt";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { safeNext } from "@/lib/navigation";

describe("sesión (JWT)", () => {
  it("firma y verifica", async () => {
    const jwt = await signSession({ sub: "u1", email: "ana@example.com" });
    expect(await verifySession(jwt)).toEqual({ sub: "u1", email: "ana@example.com" });
  });

  it("rechaza un JWT alterado", async () => {
    const jwt = await signSession({ sub: "u1", email: "ana@example.com" });
    const [h, , s] = jwt.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "admin", email: "x@x.com" })).toString("base64url");
    expect(await verifySession(`${h}.${forged}.${s}`)).toBeNull();
  });

  it("rechaza un JWT firmado con otro secreto", async () => {
    const other = await new SignJWT({ email: "a@b.c" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("otro-secreto"));
    expect(await verifySession(other)).toBeNull();
  });

  it("rechaza un JWT caducado", async () => {
    const expired = await new SignJWT({ email: "a@b.c" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("u1")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifySession(expired)).toBeNull();
  });
});

describe("contraseñas", () => {
  it("guarda un hash bcrypt, no la contraseña, y lo verifica", async () => {
    const hash = await hashPassword("correcta-123");
    expect(hash).not.toContain("correcta-123");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("correcta-123", hash)).toBe(true);
    expect(await verifyPassword("otra-cosa-1", hash)).toBe(false);
  });

  it("con un email inexistente también compara (y siempre falla)", async () => {
    expect(await verifyAgainstDummy("lo-que-sea")).toBe(false);
  });
});

describe("redirección tras el login", () => {
  it.each([
    ["/videos/abc", "/videos/abc"],
    [null, "/videos"],
    ["https://evil.example", "/videos"],
    ["//evil.example", "/videos"],
    ["/\\evil.example", "/videos"],
  ])("?next=%s → %s", (next, want) => {
    expect(safeNext(next)).toBe(want);
  });
});

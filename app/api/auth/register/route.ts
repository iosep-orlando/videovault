import { collections, isDuplicateKey } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { hashPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { normalizeEmail, passwordProblem } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");

  const email = normalizeEmail(body.email);
  if (!email) return jsonError(400, "Email inválido.");
  const problem = passwordProblem(body.password);
  if (problem) return jsonError(400, problem);

  const { users } = await collections();
  try {
    // Solo se guarda el hash, nunca la contraseña.
    const { insertedId } = await users.insertOne({
      email,
      passwordHash: await hashPassword(body.password as string),
      createdAt: new Date(),
    });
    await startSession({ sub: insertedId.toString(), email });
    return Response.json({ user: { id: insertedId.toString(), email } }, { status: 201 });
  } catch (err) {
    // El índice único decide, aunque dos registros lleguen a la vez.
    if (isDuplicateKey(err)) return jsonError(409, "Ya hay una cuenta con ese email. Iniciá sesión.");
    throw err;
  }
}

import { collections } from "@/lib/db";
import { jsonError, readJson } from "@/lib/api";
import { verifyAgainstDummy, verifyPassword } from "@/lib/password";
import { startSession } from "@/lib/session";
import { normalizeEmail } from "@/lib/validation";

// El mismo mensaje si el email no existe y si la contraseña está mal: no se
// revela qué emails tienen cuenta.
const WRONG = "Email o contraseña incorrectos.";

export async function POST(request: Request) {
  const body = await readJson(request);
  if (!body) return jsonError(400, "Cuerpo JSON inválido.");

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) return jsonError(400, "Escribí tu email y tu contraseña.");

  const { users } = await collections();
  const user = await users.findOne({ email });
  // Si el usuario no existe, se compara igual contra un hash cualquiera: así
  // la respuesta tarda lo mismo en los dos casos.
  const ok = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
  if (!user || !ok) return jsonError(401, WRONG);

  await startSession({ sub: user._id.toString(), email });
  return Response.json({ user: { id: user._id.toString(), email } });
}

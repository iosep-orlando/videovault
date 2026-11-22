import bcrypt from "bcryptjs";

// Coste 12: unos 200-300 ms por intento. Lento a propósito: a quien robe la
// base le cuesta lo mismo probar cada contraseña candidata.
const COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Cuando el email no existe, se compara igualmente contra un hash de una
// contraseña al azar. Así el login tarda lo mismo exista o no el usuario: si
// no, el tiempo de respuesta revelaría qué emails están registrados.
let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummy(plain: string): Promise<false> {
  dummyHash ??= bcrypt.hash(crypto.randomUUID(), COST);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}

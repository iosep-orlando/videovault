/** Solo rutas internas: ?next=https://otro-sitio no puede sacar al usuario fuera. */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/videos";
}

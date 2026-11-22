import { NextResponse, type NextRequest } from "next/server";
import { verifySession } from "@/lib/jwt";

// proxy.ts es el sustituto de middleware.ts en Next.js 16. Se ejecuta antes
// de cada petición a las páginas privadas: sin una sesión válida, al login.
// Solo comprueba la firma y la caducidad del JWT, sin tocar MongoDB, para que
// sea rápido. Las rutas de la API lo comprueban por su cuenta (lib/api.ts).
export async function proxy(request: NextRequest) {
  const jwt = request.cookies.get("session")?.value;
  if (jwt && (await verifySession(jwt))) return NextResponse.next();

  const login = new URL("/login", request.url);
  login.searchParams.set("next", request.nextUrl.pathname);
  const response = NextResponse.redirect(login);
  if (jwt) response.cookies.delete("session"); // cookie caducada o alterada
  return response;
}

export const config = {
  matcher: ["/videos/:path*"],
};

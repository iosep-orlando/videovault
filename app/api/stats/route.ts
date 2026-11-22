import { requireUser } from "@/lib/api";
import { statsFor } from "@/lib/db";

/** GET /api/stats — número de vídeos y espacio ocupado del usuario. */
export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json(await statsFor(user.userId));
}

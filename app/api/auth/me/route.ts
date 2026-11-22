import { requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (user instanceof Response) return user;
  return Response.json({ user: { id: user.userId.toString(), email: user.email } });
}

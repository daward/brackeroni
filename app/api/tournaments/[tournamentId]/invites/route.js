import { getCurrentUser } from "@/lib/auth/current-user";
import { bracket } from "@/lib/brackets";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const items = await bracket({ tournamentId, creatorUserId: user.id }).listInvites();

  return json({ items });
});

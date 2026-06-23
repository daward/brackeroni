import { getCurrentUser } from "@/lib/auth/current-user";
import { listTournamentInvites } from "@/lib/data/tournaments";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const items = await listTournamentInvites({
    tournamentId,
    creatorUserId: user.id
  });

  return json({ items });
});

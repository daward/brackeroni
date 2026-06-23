import { getCurrentUser } from "@/lib/auth/current-user";
import { listMatchesForTournament } from "@/lib/data/matches";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const result = await listMatchesForTournament({
    tournamentId,
    userId: user.id
  });

  return json({
    items: result.matches,
    meta: {
      tournament: result.tournament
    }
  });
});

import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getAnonymousVoterTokenFromRequest } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { tournamentId } = await params;
  const result = await listMatchesForTournament({
    tournamentId,
    userId: user?.id ?? null,
    anonymousVoterToken: getAnonymousVoterTokenFromRequest(request)
  });

  return json({
    items: result.matches,
    meta: {
      tournament: result.tournament
    }
  });
});

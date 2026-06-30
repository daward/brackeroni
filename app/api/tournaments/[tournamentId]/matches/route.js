import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getAnonymousVoterTokenFromRequest } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { json, publicCacheControl, withCacheHeaders, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { tournamentId } = await params;
  const anonymousVoterToken = getAnonymousVoterTokenFromRequest(request);
  const result = await listMatchesForTournament({
    tournamentId,
    userId: user?.id ?? null,
    anonymousVoterToken
  });

  const response = json({
    items: result.matches,
    meta: {
      tournament: result.tournament
    }
  });

  if (
    !user &&
    !anonymousVoterToken &&
    result.tournament.visibility === "public_listed" &&
    result.tournament.votingAccess === "anyone"
  ) {
    return withCacheHeaders(response, {
      "cache-control": publicCacheControl({
        sMaxAge: result.tournament.status === "complete" ? 600 : 15,
        staleWhileRevalidate: result.tournament.status === "complete" ? 86400 : 120
      })
    });
  }

  return response;
});

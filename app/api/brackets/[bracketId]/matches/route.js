import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getAnonymousVoterTokenFromRequest } from "@/lib/auth/viewer";
import { bracket } from "@/lib/brackets";
import { json, publicCacheControl, withCacheHeaders, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { bracketId } = await params;
  const anonymousVoterToken = getAnonymousVoterTokenFromRequest(request);
  const result = await bracket({
    bracketId,
    userId: user?.id ?? null,
    anonymousVoterToken
  }).listMatches();

  const response = json({
    items: result.matches,
    meta: {
      tournament: result.bracket
    }
  });

  if (
    !user &&
    !anonymousVoterToken &&
    result.bracket.visibility === "public_listed"
  ) {
    return withCacheHeaders(response, {
      "cache-control": publicCacheControl({
        sMaxAge: result.bracket.status === "complete" ? 600 : 15,
        staleWhileRevalidate: result.bracket.status === "complete" ? 86400 : 120
      })
    });
  }

  return response;
});

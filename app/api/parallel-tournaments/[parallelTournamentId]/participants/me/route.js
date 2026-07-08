import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import {
  createAnonymousVoterToken,
  getAnonymousVoterTokenFromRequest,
  ANONYMOUS_VOTER_COOKIE
} from "@/lib/auth/viewer";
import { openParallelTournamentParticipantBracket } from "@/lib/data/parallel-tournaments";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { parallelTournamentId } = await params;
  const existingAnonymousVoterToken = getAnonymousVoterTokenFromRequest(request);
  const anonymousVoterToken = user ? null : existingAnonymousVoterToken || createAnonymousVoterToken();

  const result = await openParallelTournamentParticipantBracket({
    parallelTournamentId,
    userId: user?.id ?? null,
    anonymousVoterToken
  });

  const response = json({
    item: result
  });

  if (!user && anonymousVoterToken && anonymousVoterToken !== existingAnonymousVoterToken) {
    response.headers.set(
      "set-cookie",
      `${ANONYMOUS_VOTER_COOKIE}=${anonymousVoterToken}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`
    );
  }

  return response;
});

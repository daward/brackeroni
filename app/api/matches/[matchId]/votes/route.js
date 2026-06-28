import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import {
  ANONYMOUS_VOTER_COOKIE,
  createAnonymousVoterToken,
  getAnonymousVoterTokenFromRequest
} from "@/lib/auth/viewer";
import { submitVote } from "@/lib/data/matches";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { voteCreateSchema } from "@/lib/validation/vote";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const routeParams = await params;
  const payload = voteCreateSchema.parse(await readJson(request));
  const existingAnonymousVoterToken = getAnonymousVoterTokenFromRequest(request);
  const anonymousVoterToken = user ? null : existingAnonymousVoterToken ?? createAnonymousVoterToken();
  const vote = await submitVote({
    matchId: routeParams.matchId,
    userId: user?.id ?? null,
    anonymousVoterToken,
    selectedEntryId: payload.selectedEntryId
  });

  const response = json(
    {
      item: vote
    },
    { status: 201 }
  );

  if (!user && !existingAnonymousVoterToken) {
    response.headers.append(
      "Set-Cookie",
      `${ANONYMOUS_VOTER_COOKIE}=${anonymousVoterToken}; Path=/; Max-Age=31536000; HttpOnly; SameSite=Lax`
    );
  }

  return response;
});

import { getCurrentUser } from "@/lib/auth/current-user";
import { submitVote } from "@/lib/data/matches";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { voteCreateSchema } from "@/lib/validation/vote";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const routeParams = await params;
  const payload = voteCreateSchema.parse(await readJson(request));
  const vote = await submitVote({
    matchId: routeParams.matchId,
    userId: user.id,
    selectedEntryId: payload.selectedEntryId
  });

  return json(
    {
      item: vote
    },
    { status: 201 }
  );
});

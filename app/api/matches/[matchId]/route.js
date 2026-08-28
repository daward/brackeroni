import { getCurrentUser } from "@/lib/auth/current-user";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { bracketMatches } from "@/lib/brackets";
import { matchWinnerUpdateSchema } from "@/lib/validation/match";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const routeParams = await params;
  const payload = matchWinnerUpdateSchema.parse(await readJson(request));
  const updatedMatch = await bracketMatches().setManualWinner({
    matchId: routeParams.matchId,
    creatorUserId: user.id,
    winnerEntryId: payload.winnerEntryId
  });

  return json({
    item: updatedMatch
  });
});

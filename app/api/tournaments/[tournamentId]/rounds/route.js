import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { listRoundsForTournament } from "@/lib/data/rounds";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { tournamentId } = await params;
  const rounds = await listRoundsForTournament({
    tournamentId,
    userId: user?.id ?? null
  });

  return json({ items: rounds });
});

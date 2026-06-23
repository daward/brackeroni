import { getCurrentUser } from "@/lib/auth/current-user";
import { createTournamentRerun } from "@/lib/data/tournaments";
import { json, withRouteErrorHandling } from "@/lib/api/http";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const tournament = await createTournamentRerun({
    tournamentId,
    creatorUserId: user.id
  });

  return json(
    {
      item: tournament
    },
    { status: 201 }
  );
});

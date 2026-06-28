import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import {
  archiveTournament,
  getAccessibleTournamentById,
  getTournamentById,
  updateTournament
} from "@/lib/data/tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { tournamentUpdateSchema } from "@/lib/validation/tournament";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { tournamentId } = await params;
  const tournament = await getAccessibleTournamentById({
    tournamentId,
    userId: user?.id ?? null
  });

  return json({ item: tournament });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const patch = tournamentUpdateSchema.parse(await readJson(request));
  const tournament = await updateTournament({
    tournamentId,
    creatorUserId: user.id,
    patch
  });

  return json({
    item: tournament,
    ...(patch.syncWithPool
      ? {
          meta: {
            addedEntryCount: tournament.syncAddedCount ?? 0
          }
        }
      : {})
  });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  await archiveTournament({
    tournamentId,
    creatorUserId: user.id
  });

  return json({
    ok: true
  });
});

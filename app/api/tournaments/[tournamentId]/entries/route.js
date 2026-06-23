import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTournamentById, updateTournamentEntries } from "@/lib/data/tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";

const tournamentEntriesUpdateSchema = z.object({
  entryIds: z.array(z.string().uuid()).min(2)
});

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const tournament = await getTournamentById({
    tournamentId,
    creatorUserId: user.id
  });

  return json({
    items: tournament.entries
  });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { tournamentId } = await params;
  const body = tournamentEntriesUpdateSchema.parse(await readJson(request));
  const tournament = await updateTournamentEntries({
    tournamentId,
    creatorUserId: user.id,
    entryIds: body.entryIds
  });

  return json({
    items: tournament.entries
  });
});

import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveParallelTournament,
  getAccessibleParallelTournamentById,
  updateParallelTournament
} from "@/lib/data/parallel-tournaments";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { parallelTournamentUpdateSchema } from "@/lib/validation/parallel-tournament";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelTournamentId } = await params;
  const item = await getAccessibleParallelTournamentById({
    parallelTournamentId,
    userId: user.id
  });

  return json({ item });
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelTournamentId } = await params;
  const patch = parallelTournamentUpdateSchema.parse(await readJson(request));
  const item = await updateParallelTournament({
    parallelTournamentId,
    creatorUserId: user.id,
    patch
  });

  return json({ item });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { parallelTournamentId } = await params;
  await archiveParallelTournament({
    parallelTournamentId,
    creatorUserId: user.id
  });

  return json({ ok: true });
});

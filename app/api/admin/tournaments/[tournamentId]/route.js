import { requireAdminUser } from "@/lib/auth/admin";
import {
  deleteArchivedTournament,
  updateAdminTournamentVisibility
} from "@/lib/data/admin";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { adminVisibilityUpdateSchema } from "@/lib/validation/admin";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  await requireAdminUser(request);
  const { tournamentId } = await params;
  const payload = adminVisibilityUpdateSchema.parse(await readJson(request));
  await updateAdminTournamentVisibility({
    tournamentId,
    visibility: payload.visibility
  });

  return json({ ok: true });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  await requireAdminUser(request);
  const { tournamentId } = await params;
  await deleteArchivedTournament({ tournamentId });

  return json({ ok: true });
});

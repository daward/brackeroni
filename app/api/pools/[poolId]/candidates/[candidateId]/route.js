import { getCurrentUser } from "@/lib/auth/current-user";
import { pool } from "@/lib/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { candidateUpdateSchema } from "@/lib/validation/candidate";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId, candidateId } = await params;
  const patch = candidateUpdateSchema.parse(await readJson(request));
  const candidate = await pool({ poolId, viewerUserId: user.id }).candidate(candidateId).update(patch);

  return json({ item: candidate });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId, candidateId } = await params;
  const result = await pool({ poolId, viewerUserId: user.id }).candidate(candidateId).remove();

  return json(result);
});

import { getCurrentUser } from "@/lib/auth/current-user";
import { removeCandidateFromPool, updateCandidateInPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { candidateUpdateSchema } from "@/lib/validation/candidate";

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId, candidateId } = await params;
  const patch = candidateUpdateSchema.parse(await readJson(request));
  const candidate = await updateCandidateInPool({
    poolId,
    candidateId,
    creatorUserId: user.id,
    patch
  });

  return json({ item: candidate });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId, candidateId } = await params;
  const pool = await removeCandidateFromPool({
    poolId,
    creatorUserId: user.id,
    candidateId
  });

  return json({ item: pool });
});

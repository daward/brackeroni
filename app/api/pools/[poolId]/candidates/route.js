import { getCurrentUser } from "@/lib/auth/current-user";
import { addCandidatesToPool, removeCandidateFromPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolCandidateAttachSchema, poolCandidateRemoveSchema } from "@/lib/validation/pool";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const payload = poolCandidateAttachSchema.parse(await readJson(request));
  const pool = await addCandidatesToPool({
    poolId,
    creatorUserId: user.id,
    candidateIds: payload.candidateIds
  });

  return json({ item: pool });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const payload = poolCandidateRemoveSchema.parse(await readJson(request));
  const pool = await removeCandidateFromPool({
    poolId,
    creatorUserId: user.id,
    candidateId: payload.candidateId
  });

  return json({ item: pool });
});

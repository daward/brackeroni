import { getCurrentUser } from "@/lib/auth/current-user";
import { addCandidatesToPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolCandidateAttachSchema } from "@/lib/validation/pool";

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

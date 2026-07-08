import { getCurrentUser } from "@/lib/auth/current-user";
import { addCandidatesToPool, createCandidateInPool } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolCandidateAttachSchema, poolCandidateCreateSchema } from "@/lib/validation/pool";

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const body = await readJson(request);
  let pool;

  if (Array.isArray(body?.candidateIds)) {
    const payload = poolCandidateAttachSchema.parse(body);
    pool = await addCandidatesToPool({
      poolId,
      creatorUserId: user.id,
      candidateIds: payload.candidateIds
    });
  } else {
    const payload = poolCandidateCreateSchema.parse(body);
    pool = await createCandidateInPool({
      poolId,
      creatorUserId: user.id,
      name: payload.name,
      description: payload.description,
      imageUrl: payload.imageUrl
    });
  }

  return json({ item: pool });
});

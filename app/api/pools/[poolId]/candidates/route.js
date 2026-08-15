import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { addCandidatesToPool, createCandidateInPool, getPoolById } from "@/lib/data/pools";
import { json, readJson, withRouteErrorHandling } from "@/lib/api/http";
import { poolCandidateAttachSchema, poolCandidateCreateSchema } from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") || "24", 10);
  const offset = Number.parseInt(request.nextUrl.searchParams.get("offset") || "0", 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 48 || !Number.isInteger(offset) || offset < 0) {
    return json({ error: { code: "INVALID_PAGINATION", message: "limit must be 1-48 and offset must be zero or greater." } }, { status: 400 });
  }
  const user = await getOptionalCurrentUser(request);
  const { poolId } = await params;
  const pool = await getPoolById({ poolId, userId: user?.id ?? null, candidateLimit: limit, candidateOffset: offset });
  return json({ items: pool.candidates, meta: pool.candidatePagination });
});

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
      imageUrl: payload.imageUrl,
      sourceUrl: payload.sourceUrl,
      tags: payload.tags
    });
  }

  return json({ item: pool });
});

import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { pool } from "@/lib/pools";
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
  const poolDetail = await pool({ poolId, viewerUserId: user?.id ?? null }).get({
    candidateLimit: limit,
    candidateOffset: offset
  });
  return json({ items: poolDetail.candidates, meta: poolDetail.candidatePagination });
});

export const POST = withRouteErrorHandling(async function POST(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const poolHandle = pool({ poolId, viewerUserId: user.id });
  const body = await readJson(request);
  let poolDetail;

  if (Array.isArray(body?.candidateIds)) {
    const payload = poolCandidateAttachSchema.parse(body);
    poolDetail = await poolHandle.addCandidates({
      candidateIds: payload.candidateIds
    });
  } else {
    const payload = poolCandidateCreateSchema.parse(body);
    poolDetail = await poolHandle.createCandidate({
      name: payload.name,
      description: payload.description,
      imageUrl: payload.imageUrl,
      sourceUrl: payload.sourceUrl,
      tags: payload.tags
    });
  }

  return json({ item: poolDetail });
});

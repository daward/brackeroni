import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import { pool } from "@/lib/pools";
import { json, publicCacheControl, readJson, withCacheHeaders, withRouteErrorHandling } from "@/lib/api/http";
import {
  poolSourceEnrichmentSchema,
  poolTagThresholdCleanupSchema,
  poolTagManagementSchema,
  poolUpdateSchema
} from "@/lib/validation/pool";

export const GET = withRouteErrorHandling(async function GET(request, { params }) {
  const user = await getOptionalCurrentUser(request);
  const { poolId } = await params;
  const poolHandle = pool({ poolId, viewerUserId: user?.id ?? null });
  const candidateLimit = Number.parseInt(request.nextUrl.searchParams.get("candidateLimit") || "", 10);
  const candidateOffset = Number.parseInt(request.nextUrl.searchParams.get("candidateOffset") || "0", 10);
  const poolDetail = await poolHandle.get({
    candidateLimit: Number.isInteger(candidateLimit) && candidateLimit > 0 ? candidateLimit : null,
    candidateOffset: Number.isInteger(candidateOffset) && candidateOffset >= 0 ? candidateOffset : 0
  });

  const response = json({ item: poolDetail });

  if (!user && (poolDetail.visibility === "public_listed" || poolDetail.visibility === "public_unlisted")) {
    return withCacheHeaders(response, {
      "cache-control": publicCacheControl({
        sMaxAge: 300,
        staleWhileRevalidate: 3600
      })
    });
  }

  return response;
});

export const PATCH = withRouteErrorHandling(async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  const poolHandle = pool({ poolId, viewerUserId: user.id });
  const body = await readJson(request);
  if ("enrichFromSourceUrls" in body) {
    poolSourceEnrichmentSchema.parse(body);
    const result = await poolHandle.enrichCandidatesFromSourceUrls();

    return json({
      item: result.pool,
      meta: {
        processedCount: result.processedCount,
        enrichedCount: result.enrichedCount,
        skippedCount: result.skippedCount,
        failedCount: result.failedCount,
        remainingCount: result.remainingCount
      }
    });
  }

  if ("removeTagsAtOrBelowCount" in body) {
    const payload = poolTagThresholdCleanupSchema.parse(body);
    const result = await poolHandle.removeLowValueTagsFromCandidates({
      maxCandidateCount: payload.removeTagsAtOrBelowCount
    });

    return json({
      item: result.pool,
      meta: {
        removedTags: result.removedTags,
        removedTagCount: result.removedTags.length
      }
    });
  }

  const result = "removeTag" in body
    ? {
        item: await poolHandle.removeTagFromCandidates({
          tag: poolTagManagementSchema.parse(body).removeTag
        })
      }
    : {
        item: await poolHandle.update(poolUpdateSchema.parse(body))
      };

  return json({ item: result.item });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  await pool({ poolId, viewerUserId: user.id }).archive();

  return json({
    ok: true
  });
});

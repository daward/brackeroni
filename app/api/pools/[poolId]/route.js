import { getCurrentUser, getOptionalCurrentUser } from "@/lib/auth/current-user";
import {
  archivePool,
  enrichPoolCandidatesFromSourceUrls,
  getPoolById,
  removeLowValueTagsFromPoolCandidates,
  removeTagFromPoolCandidates,
  updatePool
} from "@/lib/data/pools";
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
  const pool = await getPoolById({
    poolId,
    userId: user?.id ?? null
  });

  const response = json({ item: pool });

  if (!user && (pool.visibility === "public_listed" || pool.visibility === "public_unlisted")) {
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
  const body = await readJson(request);
  if ("enrichFromSourceUrls" in body) {
    poolSourceEnrichmentSchema.parse(body);
    const result = await enrichPoolCandidatesFromSourceUrls({
      poolId,
      creatorUserId: user.id
    });

    return json({
      item: result.pool,
      meta: {
        enrichedCount: result.enrichedCount,
        skippedCount: result.skippedCount,
        failedCount: result.failedCount
      }
    });
  }

  if ("removeTagsAtOrBelowCount" in body) {
    const payload = poolTagThresholdCleanupSchema.parse(body);
    const result = await removeLowValueTagsFromPoolCandidates({
      poolId,
      creatorUserId: user.id,
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
        item: await removeTagFromPoolCandidates({
          poolId,
          creatorUserId: user.id,
          tag: poolTagManagementSchema.parse(body).removeTag
        })
      }
    : {
        item: await updatePool({
          poolId,
          creatorUserId: user.id,
          patch: poolUpdateSchema.parse(body)
        })
      };

  return json({ item: result.item });
});

export const DELETE = withRouteErrorHandling(async function DELETE(request, { params }) {
  const user = await getCurrentUser(request);
  const { poolId } = await params;
  await archivePool({
    poolId,
    userId: user.id
  });

  return json({
    ok: true
  });
});

import { normalizeCandidateTags } from "@/lib/candidate-tags";
import { getDb } from "@/lib/db";
import { getCandidateSchemaSupport } from "@/lib/shared-data/candidate-schema";
import { getPoolById, getPoolMutationAccess } from "@/lib/pools/internal/access";
import { insertPoolCandidate } from "@/lib/pools/internal/candidate-persistence";
import { assertPoolMutable } from "@/lib/pools/internal/policy";
import { getPoolVisibilitySupport } from "@/lib/pools/internal/schema-support";
import { enrichCandidateFromSource } from "@/lib/gemini/enrich-candidate-source";
import { resolveCandidateSourceUrl } from "@/lib/source-url";
import type { PoolCandidate, PoolCandidatePatch, PoolDetail, PoolMutationOk } from "@/lib/pools/types";
import type { PoolSqlClient } from "@/lib/pools/internal/schema-support";

const POOL_SOURCE_ENRICHMENT_BATCH_SIZE = 24;
const resolvePoolCandidateSourceUrl = resolveCandidateSourceUrl as (
  sourceUrl?: string | null,
  pageUrl?: string | null
) => string | null;

function selectEnrichmentBatch(candidates: PoolCandidate[], cursorDisplayOrder: number | null | undefined) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return {
      candidates: [],
      remainingCountAfterBatch: 0
    };
  }

  const sortedCandidates = [...candidates].sort((left, right) => {
    const leftOrder = Number.isInteger(left.displayOrder) ? Number(left.displayOrder) : Number.MAX_SAFE_INTEGER;
    const rightOrder = Number.isInteger(right.displayOrder)
      ? Number(right.displayOrder)
      : Number.MAX_SAFE_INTEGER;

    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    return String(left.name || "").localeCompare(String(right.name || ""));
  });

  const startIndex =
    Number.isInteger(cursorDisplayOrder)
      ? sortedCandidates.findIndex((candidate) => (
          candidate.displayOrder != null && candidate.displayOrder > Number(cursorDisplayOrder)
        ))
      : 0;
  const normalizedStartIndex = startIndex >= 0 ? startIndex : 0;
  const rotatedCandidates = [
    ...sortedCandidates.slice(normalizedStartIndex),
    ...sortedCandidates.slice(0, normalizedStartIndex)
  ];

  const batchCandidates = rotatedCandidates.slice(0, POOL_SOURCE_ENRICHMENT_BATCH_SIZE);
  const remainingCountAfterBatch = Math.max(
    sortedCandidates.length - (normalizedStartIndex + batchCandidates.length),
    0
  );

  return {
    candidates: batchCandidates,
    remainingCountAfterBatch
  };
}

export async function removeTagFromPoolCandidates({
  poolId,
  creatorUserId,
  tag,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  tag: string;
  isAdmin?: boolean;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  if (!candidateSupport.hasTags) {
    return pool;
  }

  const normalizedTag = normalizeCandidateTags([tag])[0] || null;
  if (!normalizedTag) {
    return pool;
  }

  await sql.begin(async (tx) => {
    await tx`
      update candidate c
      set
        tags = array(
          select btrim(existing_tag)
          from unnest(c.tags) as existing_tag
          where lower(btrim(existing_tag)) <> lower(${normalizedTag})
        ),
        updated_at = now()
      from candidate_pool_item i
      where i.pool_id = ${poolId}
        and i.candidate_id = c.id
        and c.tags is not null
        and exists (
          select 1
          from unnest(c.tags) as existing_tag
          where lower(btrim(existing_tag)) = lower(${normalizedTag})
        )
    `;

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return getPoolById({ poolId, userId: creatorUserId, isAdmin });
}

export async function removeLowValueTagsFromPoolCandidates({
  poolId,
  creatorUserId,
  maxCandidateCount,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  maxCandidateCount: number | string;
  isAdmin?: boolean;
}): Promise<{ pool: PoolDetail; removedTags: string[] }> {
  const sql = getDb() as PoolSqlClient;
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  if (!candidateSupport.hasTags) {
    return {
      pool,
      removedTags: []
    };
  }

  const threshold = Number(maxCandidateCount);
  if (!Number.isInteger(threshold) || threshold < 1) {
    return {
      pool,
      removedTags: []
    };
  }

  const tagCounts = new Map<string, number>();
  for (const candidate of pool.candidates) {
    for (const tag of normalizeCandidateTags(candidate.tags || [])) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  const removedTags = [...tagCounts.entries()]
    .filter(([, count]) => count <= threshold)
    .map(([tag]) => tag);

  if (removedTags.length === 0) {
    return {
      pool,
      removedTags: []
    };
  }

  await sql.begin(async (tx) => {
    await tx`
      update candidate c
      set
        tags = array(
          select btrim(existing_tag)
          from unnest(c.tags) as existing_tag
          where not (lower(btrim(existing_tag)) = any(${removedTags.map((tag) => tag.toLowerCase())}))
        ),
        updated_at = now()
      from candidate_pool_item i
      where i.pool_id = ${poolId}
        and i.candidate_id = c.id
        and c.tags is not null
        and exists (
          select 1
          from unnest(c.tags) as existing_tag
          where lower(btrim(existing_tag)) = any(${removedTags.map((tag) => tag.toLowerCase())})
        )
    `;

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return {
    pool: await getPoolById({ poolId, userId: creatorUserId, isAdmin }),
    removedTags
  };
}

function buildFetchHeaders(sourceUrl: string) {
  const url = new URL(sourceUrl);

  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    referer: `${url.protocol}//${url.host}/`
  };
}

async function fetchSourceHtml(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    method: "GET",
    headers: buildFetchHeaders(sourceUrl),
    redirect: "follow",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("SOURCE_FETCH_FAILED");
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error("SOURCE_NOT_HTML");
  }

  return response.text();
}

export async function enrichPoolCandidatesFromSourceUrls({
  poolId,
  creatorUserId,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  isAdmin?: boolean;
}): Promise<{
  pool: PoolDetail;
  processedCount?: number;
  enrichedCount: number;
  skippedCount: number;
  failedCount: number;
  remainingCount?: number;
}> {
  const sql = getDb() as PoolSqlClient;
  const support = await getPoolVisibilitySupport(sql);
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  if (!candidateSupport.hasSourceUrl || !candidateSupport.hasTags) {
    return {
      pool,
      enrichedCount: 0,
      skippedCount: pool.candidates.length,
      failedCount: 0
    };
  }

  let enrichedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const enrichmentBatch = support.hasEnrichmentCursorDisplayOrder
    ? selectEnrichmentBatch(pool.candidates, pool.enrichmentCursorDisplayOrder)
    : {
        candidates: pool.candidates,
        remainingCountAfterBatch: 0
      };
  const candidatesToProcess = enrichmentBatch.candidates;

  if (candidatesToProcess.length === 0) {
    return {
      pool,
      processedCount: 0,
      enrichedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      remainingCount: 0
    };
  }

  for (const candidate of candidatesToProcess) {
    const resolvedSourceUrl = resolvePoolCandidateSourceUrl(
      candidate.sourceUrl,
      pool.importSourceUrl || null
    );

    if (!resolvedSourceUrl) {
      skippedCount += 1;
      continue;
    }

    try {
      const html = await fetchSourceHtml(resolvedSourceUrl);
      const enrichment = await enrichCandidateFromSource({
        candidateName: candidate.name,
        sourceUrl: resolvedSourceUrl,
        html,
        model: undefined
      });
      const currentTags = normalizeCandidateTags(candidate.tags || []);
      const nextTags = normalizeCandidateTags([...currentTags, ...(enrichment.tags || [])]);
      const nextDescription = candidate.description || enrichment.description || null;
      const nextImageUrl = candidate.imageUrl || enrichment.imageUrl || null;

      if (
        JSON.stringify(currentTags) === JSON.stringify(nextTags) &&
        nextDescription === (candidate.description || null) &&
        nextImageUrl === (candidate.imageUrl || null)
      ) {
        skippedCount += 1;
        continue;
      }

      await updateCandidateInPool({
        poolId,
        candidateId: candidate.id,
        creatorUserId,
        patch: {
          description: nextDescription,
          imageUrl: nextImageUrl,
          sourceUrl: resolvedSourceUrl,
          tags: nextTags
        },
        isAdmin
      });

      enrichedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  if (support.hasEnrichmentCursorDisplayOrder) {
    const lastProcessedCandidate = candidatesToProcess[candidatesToProcess.length - 1] || null;
    const nextCursorDisplayOrder =
      Number.isInteger(lastProcessedCandidate?.displayOrder)
        ? lastProcessedCandidate.displayOrder
        : null;

    await sql`
      update candidate_pool
      set
        enrichment_cursor_display_order = ${nextCursorDisplayOrder},
        updated_at = now()
      where id = ${poolId}
    `;
  }

  const updatedPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  const processedCount = candidatesToProcess.length;
  const remainingCount = support.hasEnrichmentCursorDisplayOrder
    ? enrichmentBatch.remainingCountAfterBatch
    : 0;

  return {
    pool: updatedPool,
    processedCount,
    enrichedCount,
    skippedCount,
    failedCount,
    remainingCount
  };
}

export async function addCandidatesToPool({
  poolId,
  creatorUserId,
  candidateIds,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  candidateIds: string[];
  isAdmin?: boolean;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);
  const uniqueCandidateIds = [...new Set(candidateIds)];

  const ownedCandidates = await sql`
    select id
    from candidate
    where creator_user_id = ${creatorUserId}
      and id in ${sql(uniqueCandidateIds)}
  `;

  if (ownedCandidates.length !== uniqueCandidateIds.length) {
    throw new Error("FORBIDDEN");
  }

  await sql.begin(async (tx) => {
    for (const candidateId of uniqueCandidateIds) {
      await tx`
        insert into candidate_pool_item (pool_id, candidate_id)
        values (${poolId}, ${candidateId})
        on conflict (pool_id, candidate_id) do nothing
      `;
    }

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return getPoolById({ poolId, userId: creatorUserId, isAdmin });
}

export async function createCandidateInPool({
  poolId,
  creatorUserId,
  name,
  description,
  imageUrl,
  sourceUrl,
  tags = [],
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  sourceUrl?: string | null;
  tags?: string[];
  isAdmin?: boolean;
}): Promise<PoolDetail> {
  const sql = getDb() as PoolSqlClient;
  const candidateSupport = await getCandidateSchemaSupport(sql);
  await getPoolMutationAccess({ sql, poolId, userId: creatorUserId, isAdmin });

  await sql.begin(async (tx) => {
    const createdCandidate = await insertPoolCandidate({
      tx,
      candidateSupport,
      creatorUserId,
      candidate: { name, description, imageUrl, sourceUrl, tags }
    });

    const [nextOrder] = await tx`
      select coalesce(max(display_order), -1)::integer + 1 as "displayOrder"
      from candidate_pool_item
      where pool_id = ${poolId}
    `;

    await tx`
      insert into candidate_pool_item (pool_id, candidate_id, display_order)
      values (${poolId}, ${createdCandidate.id}, ${nextOrder?.displayOrder ?? 0})
      on conflict (pool_id, candidate_id) do nothing
    `;

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return getPoolById({ poolId, userId: creatorUserId, isAdmin });
}

export async function updateCandidateInPool({
  poolId,
  candidateId,
  creatorUserId,
  patch,
  isAdmin = false
}: {
  poolId: string;
  candidateId: string;
  creatorUserId: string;
  patch: PoolCandidatePatch;
  isAdmin?: boolean;
}): Promise<PoolCandidate> {
  const sql = getDb() as PoolSqlClient;
  const candidateSupport = await getCandidateSchemaSupport(sql);
  await getPoolMutationAccess({ sql, poolId, userId: creatorUserId, isAdmin });

  const [existingCandidate] = await sql`
    select
      c.id,
      c.name,
      c.description,
      c.image_url as "imageUrl",
      ${candidateSupport.hasSourceUrl ? sql`c.source_url` : sql`null::text`} as "sourceUrl",
      ${candidateSupport.hasTags ? sql`c.tags` : sql`'{}'::text[]`} as tags
    from candidate c
    join candidate_pool_item i on i.candidate_id = c.id
    where c.id = ${candidateId}
      and c.creator_user_id = ${creatorUserId}
      and i.pool_id = ${poolId}
    limit 1
  `;

  if (!existingCandidate) {
    throw new Error("NOT_FOUND");
  }

  const nextName = Object.hasOwn(patch, "name") ? patch.name : existingCandidate.name;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : existingCandidate.description ?? null;
  const nextImageUrl = Object.hasOwn(patch, "imageUrl")
    ? patch.imageUrl ?? null
    : existingCandidate.imageUrl ?? null;
  const nextSourceUrl = Object.hasOwn(patch, "sourceUrl")
    ? patch.sourceUrl ?? null
    : existingCandidate.sourceUrl ?? null;
  const nextTags = Object.hasOwn(patch, "tags")
    ? normalizeCandidateTags(patch.tags)
    : normalizeCandidateTags(existingCandidate.tags);

  const [candidate] = candidateSupport.hasTags && candidateSupport.hasSourceUrl
    ? await sql`
        update candidate
        set
          name = ${nextName},
          description = ${nextDescription},
          image_url = ${nextImageUrl},
          source_url = ${nextSourceUrl},
          tags = ${nextTags},
          updated_at = now()
        where id = ${candidateId}
        returning
          id,
          name,
          description,
          image_url as "imageUrl",
          source_url as "sourceUrl",
          tags,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `
    : candidateSupport.hasTags
      ? await sql`
          update candidate
          set
            name = ${nextName},
            description = ${nextDescription},
            image_url = ${nextImageUrl},
            tags = ${nextTags},
            updated_at = now()
          where id = ${candidateId}
          returning
            id,
            name,
            description,
            image_url as "imageUrl",
            null::text as "sourceUrl",
            tags,
            created_at as "createdAt",
            updated_at as "updatedAt"
        `
      : candidateSupport.hasSourceUrl
        ? await sql`
            update candidate
            set
              name = ${nextName},
              description = ${nextDescription},
              image_url = ${nextImageUrl},
              source_url = ${nextSourceUrl},
              updated_at = now()
            where id = ${candidateId}
            returning
              id,
              name,
              description,
              image_url as "imageUrl",
              source_url as "sourceUrl",
              '{}'::text[] as tags,
              created_at as "createdAt",
              updated_at as "updatedAt"
          `
        : await sql`
            update candidate
            set
              name = ${nextName},
              description = ${nextDescription},
              image_url = ${nextImageUrl},
              updated_at = now()
            where id = ${candidateId}
            returning
              id,
              name,
              description,
              image_url as "imageUrl",
              null::text as "sourceUrl",
              '{}'::text[] as tags,
              created_at as "createdAt",
              updated_at as "updatedAt"
          `;

  return candidate;
}

export async function removeCandidateFromPool({
  poolId,
  creatorUserId,
  candidateId,
  isAdmin = false
}: {
  poolId: string;
  creatorUserId: string;
  candidateId: string;
  isAdmin?: boolean;
}): Promise<PoolMutationOk> {
  const sql = getDb() as PoolSqlClient;
  await getPoolMutationAccess({ sql, poolId, userId: creatorUserId, isAdmin });

  const ownedCandidate = await sql`
    select id
    from candidate
    where id = ${candidateId}
      and creator_user_id = ${creatorUserId}
    limit 1
  `;

  if (ownedCandidate.length === 0) {
    throw new Error("FORBIDDEN");
  }

  await sql.begin(async (tx) => {
    await tx`
      delete from candidate_pool_item
      where pool_id = ${poolId}
        and candidate_id = ${candidateId}
    `;

    await tx`
      delete from candidate c
      where c.id = ${candidateId}
        and c.creator_user_id = ${creatorUserId}
        and not exists (
          select 1
          from candidate_pool_item i
          where i.candidate_id = c.id
        )
    `;

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;
  });

  return { ok: true };
}

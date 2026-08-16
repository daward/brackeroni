import { normalizeCandidateTags } from "@/lib/candidate-tags";
import { getDb } from "@/lib/db";
import { getCandidateSchemaSupport } from "@/lib/data/candidate-schema";
import { assertPoolMutable, isPublicPoolVisibility } from "@/lib/data/pool-policy";
import { getPoolVisibilitySupport } from "@/lib/data/pool-schema-support";

export async function getPoolById({ poolId, userId, isAdmin = false, candidateLimit = null, candidateOffset = 0 }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const [pool] = support.hasVisibility
    ? await sql`
        select
          p.id,
          p.creator_user_id as "creatorUserId",
          p.name,
          p.description,
          p.visibility,
          ${support.hasImportSourceUrl ? sql`p.import_source_url` : sql`null::text`} as "importSourceUrl",
          ${support.hasImportSourceTitle ? sql`p.import_source_title` : sql`null::text`} as "importSourceTitle",
          ${
            support.hasEnrichmentCursorDisplayOrder
              ? sql`p.enrichment_cursor_display_order`
              : sql`null::integer`
          } as "enrichmentCursorDisplayOrder",
          p.published_at as "publishedAt",
          p.archived_at as "archivedAt",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          count(i.id)::integer as "candidateCount"
        from candidate_pool p
        left join candidate_pool_item i on i.pool_id = p.id
        where p.id = ${poolId}
        group by p.id
      `
    : await sql`
        select
          p.id,
          p.creator_user_id as "creatorUserId",
          p.name,
          p.description,
          'private'::text as visibility,
          null::text as "importSourceUrl",
          null::text as "importSourceTitle",
          null::integer as "enrichmentCursorDisplayOrder",
          null::timestamptz as "publishedAt",
          p.archived_at as "archivedAt",
          p.created_at as "createdAt",
          p.updated_at as "updatedAt",
          count(i.id)::integer as "candidateCount"
        from candidate_pool p
        left join candidate_pool_item i on i.pool_id = p.id
        where p.id = ${poolId}
        group by p.id
      `;

  if (!pool) {
    throw new Error("NOT_FOUND");
  }

  if (!isAdmin && pool.creatorUserId !== userId && !isPublicPoolVisibility(pool.visibility)) {
    throw new Error("FORBIDDEN");
  }

  const candidateRows = candidateLimit
    ? await sql`
    select
      c.id, c.name, c.description, c.image_url as "imageUrl",
      ${candidateSupport.hasSourceUrl ? sql`c.source_url` : sql`null::text`} as "sourceUrl",
      ${candidateSupport.hasTags ? sql`c.tags` : sql`'{}'::text[]`} as tags,
      i.display_order as "displayOrder"
    from candidate_pool_item i join candidate c on c.id = i.candidate_id
    where i.pool_id = ${poolId}
    order by i.display_order nulls last, lower(c.name)
    limit ${candidateLimit + 1} offset ${candidateOffset}
  `
    : await sql`
    select
      c.id,
      c.name,
      c.description,
      c.image_url as "imageUrl",
      ${candidateSupport.hasSourceUrl ? sql`c.source_url` : sql`null::text`} as "sourceUrl",
      ${candidateSupport.hasTags ? sql`c.tags` : sql`'{}'::text[]`} as tags,
      i.display_order as "displayOrder"
    from candidate_pool_item i
    join candidate c on c.id = i.candidate_id
    where i.pool_id = ${poolId}
    order by i.display_order nulls last, lower(c.name)
  `;
  const hasNextPage = candidateLimit ? candidateRows.length > candidateLimit : false;
  const candidates = candidateLimit ? candidateRows.slice(0, candidateLimit) : candidateRows;

  return {
    id: pool.id,
    creatorUserId: pool.creatorUserId,
    name: pool.name,
    description: pool.description,
    importSourceUrl: pool.importSourceUrl,
    importSourceTitle: pool.importSourceTitle,
    enrichmentCursorDisplayOrder: pool.enrichmentCursorDisplayOrder,
    visibility: pool.visibility,
    publishedAt: pool.publishedAt,
    archivedAt: pool.archivedAt,
    candidateCount: pool.candidateCount,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt,
    isOwned: pool.creatorUserId === userId,
    isReadOnly: isPublicPoolVisibility(pool.visibility) && !isAdmin,
    candidatePagination: candidateLimit
      ? { limit: candidateLimit, offset: candidateOffset, hasNextPage }
      : null,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      tags: normalizeCandidateTags(candidate.tags)
    }))
  };
}

export async function getPoolMutationAccess({ sql, poolId, userId, isAdmin = false }) {
  const support = await getPoolVisibilitySupport(sql);
  const [pool] = support.hasVisibility
    ? await sql`
        select p.id, p.creator_user_id as "creatorUserId", p.visibility
        from candidate_pool p
        where p.id = ${poolId}
        limit 1
      `
    : await sql`
        select p.id, p.creator_user_id as "creatorUserId", 'private'::text as visibility
        from candidate_pool p
        where p.id = ${poolId}
        limit 1
      `;

  if (!pool) throw new Error("NOT_FOUND");
  if (!isAdmin && pool.creatorUserId !== userId && !isPublicPoolVisibility(pool.visibility)) {
    throw new Error("FORBIDDEN");
  }

  assertPoolMutable(pool, isAdmin);
  return pool;
}

import { getDb } from "@/lib/db";
import { normalizeCandidateTags } from "@/lib/candidate-tags";
import { getCandidateSchemaSupport } from "@/lib/data/candidate-schema";
import { enrichCandidateFromSource } from "@/lib/gemini/enrich-candidate-source";
import { resolveCandidateSourceUrl } from "@/lib/source-url";

function isPublicPoolVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

async function getPoolVisibilitySupport(sql) {
  const [row] = await sql`
    select
      bool_or(column_name = 'visibility') as "hasVisibility",
      bool_or(column_name = 'published_at') as "hasPublishedAt",
      bool_or(column_name = 'source_pool_id') as "hasSourcePoolId",
      bool_or(column_name = 'featured_on_home') as "hasFeaturedOnHome",
      bool_or(column_name = 'import_source_url') as "hasImportSourceUrl",
      bool_or(column_name = 'import_source_title') as "hasImportSourceTitle"
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'candidate_pool'
      and column_name in (
        'visibility',
        'published_at',
        'source_pool_id',
        'featured_on_home',
        'import_source_url',
        'import_source_title'
      )
  `;

  return {
    hasVisibility: Boolean(row?.hasVisibility),
    hasPublishedAt: Boolean(row?.hasPublishedAt),
    hasSourcePoolId: Boolean(row?.hasSourcePoolId),
    hasFeaturedOnHome: Boolean(row?.hasFeaturedOnHome),
    hasImportSourceUrl: Boolean(row?.hasImportSourceUrl),
    hasImportSourceTitle: Boolean(row?.hasImportSourceTitle)
  };
}

function assertPoolMutable(pool, isAdmin = false) {
  if (isPublicPoolVisibility(pool.visibility) && !isAdmin) {
    throw new Error("POOL_LOCKED");
  }
}

export async function listPools({ userId }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility) {
    return sql`
      select
        p.id,
        p.creator_user_id as "creatorUserId",
        p.name,
        p.description,
        'private'::text as visibility,
        null::text as "importSourceUrl",
        null::text as "importSourceTitle",
        null::timestamptz as "publishedAt",
        p.archived_at as "archivedAt",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        count(i.id)::integer as "candidateCount",
        (p.creator_user_id = ${userId}) as "isOwned",
        false as "isReadOnly"
      from candidate_pool p
      left join candidate_pool_item i on i.pool_id = p.id
      where p.creator_user_id = ${userId}
        and p.archived_at is null
      group by p.id
      order by p.updated_at desc, p.created_at desc, lower(p.name)
    `;
  }

  return sql`
    select
      p.id,
      p.creator_user_id as "creatorUserId",
      p.name,
      p.description,
      p.visibility,
      ${support.hasImportSourceUrl ? sql`p.import_source_url` : sql`null::text`} as "importSourceUrl",
      ${support.hasImportSourceTitle ? sql`p.import_source_title` : sql`null::text`} as "importSourceTitle",
      p.published_at as "publishedAt",
      p.archived_at as "archivedAt",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      count(i.id)::integer as "candidateCount",
      (p.creator_user_id = ${userId}) as "isOwned",
      (p.visibility in ('public_listed', 'public_unlisted')) as "isReadOnly"
    from candidate_pool p
    left join candidate_pool_item i on i.pool_id = p.id
    where (
      p.creator_user_id = ${userId}
      or p.visibility = 'public_listed'
      or p.visibility = 'public_unlisted'
    )
      and p.archived_at is null
    group by p.id
    order by
      case when p.creator_user_id = ${userId} then 0 else 1 end,
      p.updated_at desc,
      p.created_at desc,
      lower(p.name)
  `;
}

export async function listPublicPools({
  limit = 6,
  userId = null,
  query = "",
  favoritesOnly = false,
  featuredOnly = false
}) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility) {
    return [];
  }

  if (featuredOnly && !support.hasFeaturedOnHome) {
    return [];
  }

  const normalizedQuery = query.trim();
  const queryFilter = normalizedQuery
    ? sql`
        and (
          lower(p.name) like ${`%${normalizedQuery.toLowerCase()}%`}
          or lower(coalesce(p.description, '')) like ${`%${normalizedQuery.toLowerCase()}%`}
          or lower(coalesce(creator.name, creator.email)) like ${`%${normalizedQuery.toLowerCase()}%`}
          or exists (
            select 1
            from candidate_pool_item search_item
            join candidate search_candidate on search_candidate.id = search_item.candidate_id
            where search_item.pool_id = p.id
              and lower(search_candidate.name) like ${`%${normalizedQuery.toLowerCase()}%`}
          )
        )
      `
    : sql``;

  const favoritePoolIdSelect = support.hasSourcePoolId
    ? sql`favorites."favoritePoolId"`
    : sql`null::uuid`;
  const isFavoritedSelect = support.hasSourcePoolId
    ? sql`(favorites."favoritePoolId" is not null)`
    : sql`false`;
  const favoritesJoin = support.hasSourcePoolId
    ? sql`
        left join lateral (
          select favorite.id as "favoritePoolId"
          from candidate_pool favorite
          where favorite.creator_user_id = ${userId}
            and favorite.source_pool_id = p.id
            and favorite.archived_at is null
          order by favorite.updated_at desc
          limit 1
        ) favorites on true
      `
    : sql``;

  return sql`
    select
      p.id,
      p.name,
      p.description,
      p.visibility,
      ${support.hasFeaturedOnHome ? sql`p.featured_on_home` : sql`false`} as "featuredOnHome",
      p.published_at as "publishedAt",
      p.updated_at as "updatedAt",
      creator.email as "creatorEmail",
      creator.name as "creatorName",
      counts."candidateCount",
      ${favoritePoolIdSelect} as "favoritePoolId",
      ${isFavoritedSelect} as "isFavorited",
      coalesce(previews."previewCandidates", '[]'::json) as "previewCandidates"
    from candidate_pool p
    join app_user creator on creator.id = p.creator_user_id
    left join lateral (
      select count(*)::integer as "candidateCount"
      from candidate_pool_item item
      where item.pool_id = p.id
    ) counts on true
    left join lateral (
      select
        json_agg(
          json_build_object(
            'id', preview.id,
            'name', preview.name,
            'imageUrl', preview.image_url
          )
          order by preview.display_order nulls last, lower(preview.name)
        ) as "previewCandidates"
      from (
        select
          c.id,
          c.name,
          c.image_url,
          item.display_order
        from candidate_pool_item item
        join candidate c on c.id = item.candidate_id
        where item.pool_id = p.id
        order by item.display_order nulls last, lower(c.name)
        limit 10
      ) preview
    ) previews on true
    ${favoritesJoin}
    where p.archived_at is null
      and p.visibility = 'public_listed'
      ${featuredOnly && support.hasFeaturedOnHome ? sql`and p.featured_on_home = true` : sql``}
      ${queryFilter}
      ${favoritesOnly && userId && support.hasSourcePoolId
        ? sql`and favorites."favoritePoolId" is not null`
        : sql``}
    order by
      ${support.hasFeaturedOnHome ? sql`p.featured_on_home desc,` : sql``}
      coalesce(p.published_at, p.updated_at) desc
    limit ${limit}
  `;
}

export async function createPool({
  creatorUserId,
  name,
  description,
  visibility = "private",
  candidates = [],
  sourcePoolId = null
  ,
  importSourceUrl = null,
  importSourceTitle = null
}) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const uniqueCandidates = normalizeImportedCandidates(candidates);

  const pool = await sql.begin(async (tx) => {
    if (!support.hasVisibility && visibility !== "private") {
      throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
    }

    const [createdPool] = support.hasVisibility && support.hasSourcePoolId
      ? await tx`
          insert into candidate_pool (
            creator_user_id,
            name,
            description,
            visibility,
            published_at,
            source_pool_id,
            import_source_url,
            import_source_title
          )
          values (
            ${creatorUserId},
            ${name},
            ${description ?? null},
            ${visibility},
            ${isPublicPoolVisibility(visibility) ? tx`now()` : null},
            ${sourcePoolId},
            ${support.hasImportSourceUrl ? importSourceUrl : null},
            ${support.hasImportSourceTitle ? importSourceTitle : null}
          )
          returning
            id,
            name,
            description,
            archived_at as "archivedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `
      : support.hasVisibility
        ? await tx`
            insert into candidate_pool (
              creator_user_id,
              name,
              description,
              visibility,
              published_at,
              import_source_url,
              import_source_title
            )
            values (
              ${creatorUserId},
              ${name},
              ${description ?? null},
              ${visibility},
              ${isPublicPoolVisibility(visibility) ? tx`now()` : null},
              ${support.hasImportSourceUrl ? importSourceUrl : null},
              ${support.hasImportSourceTitle ? importSourceTitle : null}
            )
            returning
              id,
              name,
              description,
              archived_at as "archivedAt",
              created_at as "createdAt",
              updated_at as "updatedAt"
          `
      : await tx`
          insert into candidate_pool (creator_user_id, name, description)
          values (${creatorUserId}, ${name}, ${description ?? null})
          returning
            id,
            name,
            description,
            archived_at as "archivedAt",
            created_at as "createdAt",
            updated_at as "updatedAt"
        `;

    for (const [index, candidate] of uniqueCandidates.entries()) {
      const [createdCandidate] = candidateSupport.hasTags && candidateSupport.hasSourceUrl
        ? await tx`
            insert into candidate (creator_user_id, name, description, image_url, source_url, tags)
            values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.sourceUrl}, ${candidate.tags})
            returning id
          `
        : candidateSupport.hasTags
          ? await tx`
              insert into candidate (creator_user_id, name, description, image_url, tags)
              values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.tags})
              returning id
            `
          : candidateSupport.hasSourceUrl
            ? await tx`
                insert into candidate (creator_user_id, name, description, image_url, source_url)
                values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.sourceUrl})
                returning id
              `
            : await tx`
                insert into candidate (creator_user_id, name, description, image_url)
                values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl})
                returning id
              `;

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id, display_order)
        values (${createdPool.id}, ${createdCandidate.id}, ${index})
      `;
    }

    return createdPool;
  });

  return getPoolById({ poolId: pool.id, userId: creatorUserId });
}

function normalizeImportedCandidates(candidates) {
  const uniqueCandidates = [];
  const seenLabels = new Set();

  for (const candidate of candidates) {
    const nameValue = candidate.name?.trim();

    if (!nameValue) {
      continue;
    }

    const dedupeKey = nameValue.toLowerCase();

    if (seenLabels.has(dedupeKey)) {
      continue;
    }

    seenLabels.add(dedupeKey);
    uniqueCandidates.push({
      name: nameValue,
      description: candidate.description?.trim() || null,
      imageUrl: candidate.imageUrl?.trim() || null,
      sourceUrl: resolveCandidateSourceUrl(candidate.sourceUrl),
      tags: normalizeCandidateTags(candidate.tags)
    });
  }

  return uniqueCandidates;
}

export async function importCandidatesIntoPool({
  poolId,
  creatorUserId,
  candidates,
  isAdmin = false
}) {
  const sql = getDb();
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  const normalizedCandidates = normalizeImportedCandidates(candidates);

  const result = await sql.begin(async (tx) => {
    const existingCandidates = await tx`
      select c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${poolId}
    `;

    const existingNames = new Set(
      existingCandidates
        .map((candidate) => candidate.name?.trim().toLowerCase())
        .filter(Boolean)
    );

    const [nextOrderRow] = await tx`
      select coalesce(max(display_order), -1)::integer + 1 as "nextDisplayOrder"
      from candidate_pool_item
      where pool_id = ${poolId}
    `;

    let displayOrder = nextOrderRow?.nextDisplayOrder ?? 0;
    let importedCount = 0;
    let skippedCount = 0;
    const importedNames = [];
    const skippedNames = [];

    for (const candidate of normalizedCandidates) {
      const dedupeKey = candidate.name.toLowerCase();

      if (existingNames.has(dedupeKey)) {
        skippedCount += 1;
        skippedNames.push(candidate.name);
        continue;
      }

      existingNames.add(dedupeKey);

      const [createdCandidate] = candidateSupport.hasTags && candidateSupport.hasSourceUrl
        ? await tx`
            insert into candidate (creator_user_id, name, description, image_url, source_url, tags)
            values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.sourceUrl}, ${candidate.tags})
            returning id
          `
        : candidateSupport.hasTags
          ? await tx`
              insert into candidate (creator_user_id, name, description, image_url, tags)
              values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.tags})
              returning id
            `
          : candidateSupport.hasSourceUrl
            ? await tx`
                insert into candidate (creator_user_id, name, description, image_url, source_url)
                values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl}, ${candidate.sourceUrl})
                returning id
              `
            : await tx`
                insert into candidate (creator_user_id, name, description, image_url)
                values (${creatorUserId}, ${candidate.name}, ${candidate.description}, ${candidate.imageUrl})
                returning id
              `;

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id, display_order)
        values (${poolId}, ${createdCandidate.id}, ${displayOrder})
      `;

      displayOrder += 1;
      importedCount += 1;
      importedNames.push(candidate.name);
    }

    await tx`
      update candidate_pool
      set updated_at = now()
      where id = ${poolId}
    `;

    return {
      importedCount,
      skippedCount,
      importedNames,
      skippedNames
    };
  });

  const updatedPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });

  return {
    pool: updatedPool,
    importedCount: result.importedCount,
    skippedCount: result.skippedCount,
    importedNames: result.importedNames,
    skippedNames: result.skippedNames
  };
}

export async function favoritePool({ poolId, creatorUserId }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const sourcePool = await getPoolById({
    poolId,
    userId: creatorUserId
  });

  if (support.hasSourcePoolId) {
    const [existingFavorite] = await sql`
      select id
      from candidate_pool
      where creator_user_id = ${creatorUserId}
        and source_pool_id = ${sourcePool.id}
        and archived_at is null
      order by updated_at desc
      limit 1
    `;

    if (existingFavorite) {
      return getPoolById({ poolId: existingFavorite.id, userId: creatorUserId });
    }
  }

  return createPool({
    creatorUserId,
    name: sourcePool.name,
    description: sourcePool.description,
    visibility: "private",
    sourcePoolId: sourcePool.id,
    candidates: sourcePool.candidates.map((candidate) => ({
      name: candidate.name,
      description: candidate.description,
      imageUrl: candidate.imageUrl,
      sourceUrl: candidate.sourceUrl,
      tags: candidate.tags
    }))
  });
}

export async function getPoolById({ poolId, userId, isAdmin = false }) {
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

  const candidates = await sql`
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

  return {
    id: pool.id,
    creatorUserId: pool.creatorUserId,
    name: pool.name,
    description: pool.description,
    importSourceUrl: pool.importSourceUrl,
    importSourceTitle: pool.importSourceTitle,
    visibility: pool.visibility,
    publishedAt: pool.publishedAt,
    archivedAt: pool.archivedAt,
    candidateCount: pool.candidateCount,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt,
    isOwned: pool.creatorUserId === userId,
    isReadOnly: isPublicPoolVisibility(pool.visibility) && !isAdmin,
    candidates: candidates.map((candidate) => ({
      ...candidate,
      tags: normalizeCandidateTags(candidate.tags)
    }))
  };
}

export async function archivePool({ poolId, userId, isAdmin = false }) {
  const sql = getDb();
  const pool = await getPoolById({ poolId, userId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  await sql`
    update candidate_pool
    set
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = ${poolId}
  `;

  return { ok: true };
}

export async function updatePool({ poolId, creatorUserId, patch }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const current = await getPoolById({ poolId, userId: creatorUserId, isAdmin: patch.isAdmin === true });
  assertPoolMutable(current, patch.isAdmin === true);
  const nextName = Object.hasOwn(patch, "name") ? patch.name : current.name;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextVisibility = Object.hasOwn(patch, "visibility") ? patch.visibility : current.visibility;

  if (!support.hasVisibility && nextVisibility !== "private") {
    throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
  }

  if (support.hasVisibility) {
    await sql`
      update candidate_pool
      set
        name = ${nextName},
        description = ${nextDescription},
        visibility = ${nextVisibility},
        published_at = case
          when ${current.visibility} = 'private' and ${nextVisibility} <> 'private' then coalesce(published_at, now())
          else published_at
        end,
        updated_at = now()
      where id = ${poolId}
    `;
  } else {
    await sql`
      update candidate_pool
      set
        name = ${nextName},
        description = ${nextDescription},
        updated_at = now()
      where id = ${poolId}
    `;
  }

  return getPoolById({ poolId, userId: creatorUserId, isAdmin: patch.isAdmin === true });
}

export async function removeTagFromPoolCandidates({
  poolId,
  creatorUserId,
  tag,
  isAdmin = false
}) {
  const sql = getDb();
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
}) {
  const sql = getDb();
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

  const tagCounts = new Map();
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

function buildFetchHeaders(sourceUrl) {
  const url = new URL(sourceUrl);

  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "en-US,en;q=0.9",
    referer: `${url.protocol}//${url.host}/`
  };
}

async function fetchSourceHtml(sourceUrl) {
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
}) {
  const sql = getDb();
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

  for (const candidate of pool.candidates) {
    const resolvedSourceUrl = resolveCandidateSourceUrl(
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
        html
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

  const updatedPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });

  return {
    pool: updatedPool,
    enrichedCount,
    skippedCount,
    failedCount
  };
}

export async function addCandidatesToPool({ poolId, creatorUserId, candidateIds, isAdmin = false }) {
  const sql = getDb();
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
}) {
  const sql = getDb();
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

  await sql.begin(async (tx) => {
    const [createdCandidate] = candidateSupport.hasTags && candidateSupport.hasSourceUrl
      ? await tx`
          insert into candidate (creator_user_id, name, description, image_url, source_url, tags)
          values (${creatorUserId}, ${name}, ${description ?? null}, ${imageUrl ?? null}, ${sourceUrl ?? null}, ${normalizeCandidateTags(tags)})
          returning id
        `
      : candidateSupport.hasTags
        ? await tx`
            insert into candidate (creator_user_id, name, description, image_url, tags)
            values (${creatorUserId}, ${name}, ${description ?? null}, ${imageUrl ?? null}, ${normalizeCandidateTags(tags)})
            returning id
          `
        : candidateSupport.hasSourceUrl
          ? await tx`
              insert into candidate (creator_user_id, name, description, image_url, source_url)
              values (${creatorUserId}, ${name}, ${description ?? null}, ${imageUrl ?? null}, ${sourceUrl ?? null})
              returning id
            `
          : await tx`
              insert into candidate (creator_user_id, name, description, image_url)
              values (${creatorUserId}, ${name}, ${description ?? null}, ${imageUrl ?? null})
              returning id
            `;

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
}) {
  const sql = getDb();
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

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

export async function removeCandidateFromPool({ poolId, creatorUserId, candidateId, isAdmin = false }) {
  const sql = getDb();
  const pool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(pool, isAdmin);

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

  return getPoolById({ poolId, userId: creatorUserId, isAdmin });
}

export async function mergePoolIntoPool({ poolId, sourcePoolId, creatorUserId, isAdmin = false }) {
  if (poolId === sourcePoolId) {
    throw new Error("INVALID_POOL_MERGE");
  }

  const sql = getDb();
  const targetPool = await getPoolById({ poolId, userId: creatorUserId, isAdmin });
  assertPoolMutable(targetPool, isAdmin);
  await getPoolById({ poolId: sourcePoolId, userId: creatorUserId, isAdmin });

  await sql.begin(async (tx) => {
    const targetCandidates = await tx`
      select c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${poolId}
    `;

    const sourceCandidates = await tx`
      select c.id, c.name
      from candidate_pool_item i
      join candidate c on c.id = i.candidate_id
      where i.pool_id = ${sourcePoolId}
      order by i.display_order nulls last, lower(c.name)
    `;

    const existingNames = new Set(
      targetCandidates.map((candidate) => candidate.name.trim().toLowerCase())
    );

    for (const candidate of sourceCandidates) {
      const normalizedName = candidate.name?.trim().toLowerCase();

      if (!normalizedName || existingNames.has(normalizedName)) {
        continue;
      }

      existingNames.add(normalizedName);

      await tx`
        insert into candidate_pool_item (pool_id, candidate_id)
        values (${poolId}, ${candidate.id})
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

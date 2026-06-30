import { getDb } from "@/lib/db";

let poolVisibilitySupportPromise;

function isPublicPoolVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

async function getPoolVisibilitySupport(sql) {
  if (!poolVisibilitySupportPromise) {
    poolVisibilitySupportPromise = sql`
      select
        bool_or(column_name = 'visibility') as "hasVisibility",
        bool_or(column_name = 'published_at') as "hasPublishedAt",
        bool_or(column_name = 'source_pool_id') as "hasSourcePoolId"
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'candidate_pool'
        and column_name in ('visibility', 'published_at', 'source_pool_id')
    `.then(([row]) => ({
      hasVisibility: Boolean(row?.hasVisibility),
      hasPublishedAt: Boolean(row?.hasPublishedAt),
      hasSourcePoolId: Boolean(row?.hasSourcePoolId)
    }));
  }

  return poolVisibilitySupportPromise;
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
      order by lower(p.name), p.created_at desc
    `;
  }

  return sql`
    select
      p.id,
      p.creator_user_id as "creatorUserId",
      p.name,
      p.description,
      p.visibility,
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
      lower(p.name),
      p.created_at desc
  `;
}

export async function listPublicPools({
  limit = 6,
  userId = null,
  query = "",
  favoritesOnly = false
}) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility) {
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
      ${queryFilter}
      ${favoritesOnly && userId && support.hasSourcePoolId
        ? sql`and favorites."favoritePoolId" is not null`
        : sql``}
    order by coalesce(p.published_at, p.updated_at) desc
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
}) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
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
      imageUrl: candidate.imageUrl?.trim() || null
    });
  }

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
            source_pool_id
          )
          values (
            ${creatorUserId},
            ${name},
            ${description ?? null},
            ${visibility},
            ${isPublicPoolVisibility(visibility) ? tx`now()` : null},
            ${sourcePoolId}
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
            insert into candidate_pool (creator_user_id, name, description, visibility, published_at)
            values (
              ${creatorUserId},
              ${name},
              ${description ?? null},
              ${visibility},
              ${isPublicPoolVisibility(visibility) ? tx`now()` : null}
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
      const [createdCandidate] = await tx`
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
      imageUrl: candidate.imageUrl
    }))
  });
}

export async function getPoolById({ poolId, userId, isAdmin = false }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const [pool] = support.hasVisibility
    ? await sql`
        select
          p.id,
          p.creator_user_id as "creatorUserId",
          p.name,
          p.description,
          p.visibility,
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
    visibility: pool.visibility,
    publishedAt: pool.publishedAt,
    archivedAt: pool.archivedAt,
    candidateCount: pool.candidateCount,
    createdAt: pool.createdAt,
    updatedAt: pool.updatedAt,
    isOwned: pool.creatorUserId === userId,
    isReadOnly: isPublicPoolVisibility(pool.visibility) && !isAdmin,
    candidates
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

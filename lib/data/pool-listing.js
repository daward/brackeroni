import { getDb } from "@/lib/db";
import { getPoolVisibilitySupport } from "@/lib/data/pool-schema-support";

export async function listPools({ userId, limit = null, offset = 0 }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const safeLimit =
    limit == null ? null : Math.min(Math.max(Number.parseInt(String(limit), 10) || 24, 1), 48);
  const safeOffset = Math.max(Number.parseInt(String(offset), 10) || 0, 0);
  const paginationClause =
    safeLimit == null ? sql`` : sql`limit ${safeLimit} offset ${safeOffset}`;

  const rows = !support.hasVisibility
    ? await sql`
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
          count(*) over()::integer as "totalCount",
          (p.creator_user_id = ${userId}) as "isOwned",
          false as "isReadOnly"
        from candidate_pool p
        left join candidate_pool_item i on i.pool_id = p.id
        where p.creator_user_id = ${userId}
          and p.archived_at is null
        group by p.id
        order by p.updated_at desc, p.created_at desc, lower(p.name)
        ${paginationClause}
      `
    : await sql`
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
          count(*) over()::integer as "totalCount",
          (p.creator_user_id = ${userId}) as "isOwned",
          (p.visibility in ('public_listed', 'public_unlisted')) as "isReadOnly"
        from candidate_pool p
        left join candidate_pool_item i on i.pool_id = p.id
        where p.creator_user_id = ${userId}
          and p.archived_at is null
        group by p.id
        order by p.updated_at desc, p.created_at desc, lower(p.name)
        ${paginationClause}
      `;

  return {
    items: rows.map(({ totalCount, ...pool }) => pool),
    totalCount: Number(rows[0]?.totalCount || 0),
    limit: safeLimit,
    offset: safeOffset
  };
}
export async function listPublicPools({
  limit = 6,
  offset = 0,
  userId = null,
  query = "",
  favoritesOnly = false,
  featuredOnly = false
}) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);
  const safeLimit = Math.min(Math.max(Number.parseInt(String(limit), 10) || 6, 1), 48);
  const safeOffset = Math.max(Number.parseInt(String(offset), 10) || 0, 0);

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
    limit ${safeLimit}
    offset ${safeOffset}
  `;
}


import { getDb } from "@/lib/db";

function isPublicTournamentVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

function getRoundClosureModeForAudience({ sharingMode, visibility }) {
  if (isPublicTournamentVisibility(visibility)) {
    return "manual";
  }

  if (sharingMode === "with_friends") {
    return "all_votes_received";
  }

  return "automatic_when_settled";
}

async function getPoolVisibilitySupport(sql) {
  const [row] = await sql`
    select
      bool_or(column_name = 'visibility') as "hasVisibility",
      bool_or(column_name = 'featured_on_home') as "hasFeaturedOnHome"
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'candidate_pool'
      and column_name in ('visibility', 'featured_on_home')
  `;

  return {
    hasVisibility: Boolean(row?.hasVisibility),
    hasFeaturedOnHome: Boolean(row?.hasFeaturedOnHome)
  };
}

export async function listAdminPools() {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility) {
    return sql`
      select
        p.id,
        p.name,
        p.description,
        'private'::text as visibility,
        false as "featuredOnHome",
        null::timestamptz as "publishedAt",
        p.archived_at as "archivedAt",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        creator.email as "creatorEmail",
        creator.name as "creatorName",
        count(i.id)::integer as "candidateCount"
      from candidate_pool p
      join app_user creator on creator.id = p.creator_user_id
      left join candidate_pool_item i on i.pool_id = p.id
      group by p.id, creator.email, creator.name
      order by p.archived_at is null desc, p.updated_at desc
    `;
  }

  return sql`
    select
      p.id,
      p.name,
      p.description,
      p.visibility,
      ${support.hasFeaturedOnHome ? sql`p.featured_on_home` : sql`false`} as "featuredOnHome",
      p.published_at as "publishedAt",
      p.archived_at as "archivedAt",
      p.created_at as "createdAt",
      p.updated_at as "updatedAt",
      creator.email as "creatorEmail",
      creator.name as "creatorName",
      count(i.id)::integer as "candidateCount"
    from candidate_pool p
    join app_user creator on creator.id = p.creator_user_id
    left join candidate_pool_item i on i.pool_id = p.id
    group by p.id, creator.email, creator.name
    order by
      case
        when p.archived_at is not null then 2
        when ${support.hasFeaturedOnHome ? sql`p.featured_on_home` : sql`false`} then 0
        when p.visibility in ('public_listed', 'public_unlisted') then 1
        else 2
      end,
      p.updated_at desc
  `;
}

export async function updateAdminPool({ poolId, visibility, featuredOnHome }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility && visibility && visibility !== "private") {
    throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
  }

  if (!support.hasFeaturedOnHome && featuredOnHome !== undefined) {
    throw new Error("POOL_FEATURED_REQUIRES_MIGRATION");
  }

  if (!support.hasVisibility && visibility === undefined) {
    return { ok: true };
  }

  const [currentPool] = await sql`
    select id, visibility
    from candidate_pool
    where id = ${poolId}
    limit 1
  `;

  if (!currentPool) {
    throw new Error("NOT_FOUND");
  }

  const nextVisibility = visibility ?? currentPool.visibility;
  const shouldFeature = featuredOnHome === true && nextVisibility === "public_listed";
  const [pool] = support.hasFeaturedOnHome
    ? await sql`
        update candidate_pool
        set
          visibility = ${nextVisibility},
          featured_on_home = ${shouldFeature},
          published_at = case
            when ${nextVisibility} <> 'private' then coalesce(published_at, now())
            else published_at
          end,
          updated_at = now()
        where id = ${poolId}
        returning id
      `
    : await sql`
        update candidate_pool
        set
          visibility = ${nextVisibility},
          published_at = case
            when ${nextVisibility} <> 'private' then coalesce(published_at, now())
            else published_at
          end,
          updated_at = now()
        where id = ${poolId}
        returning id
      `;

  if (!pool) {
    throw new Error("NOT_FOUND");
  }

  return { ok: true };
}

export async function deleteArchivedPool({ poolId }) {
  const sql = getDb();

  const [pool] = await sql`
    delete from candidate_pool
    where id = ${poolId}
      and archived_at is not null
    returning id
  `;

  if (!pool) {
    throw new Error("NOT_FOUND");
  }

  return { ok: true };
}

export async function listAdminTournaments() {
  const sql = getDb();

  return sql`
    select
      t.id,
      t.title,
      t.description,
      t.status,
      t.visibility,
      t.play_style as "playStyle",
      t.voting_access as "votingAccess",
      t.sharing_mode as "sharingMode",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.round_closure_mode as "roundClosureMode",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      creator.email as "creatorEmail",
      creator.name as "creatorName",
      count(e.id)::integer as "entryCount",
      (
        t.archived_at is null
        and t.visibility = 'public_listed'
        and coalesce(t.last_vote_at, t.updated_at) < now() - interval '7 days'
      ) as "isStalePublic"
    from tournament t
    join app_user creator on creator.id = t.creator_user_id
    left join tournament_entry e on e.tournament_id = t.id
    where t.visibility <> 'private'
       or t.archived_at is not null
    group by t.id, creator.email, creator.name
    order by
      case
        when t.archived_at is not null then 2
        when t.visibility in ('public_listed', 'public_unlisted') then 0
        else 1
      end,
      coalesce(t.last_vote_at, t.updated_at) desc
  `;
}

export async function updateAdminTournamentVisibility({ tournamentId, visibility }) {
  const sql = getDb();
  const [currentTournament] = await sql`
    select
      id,
      sharing_mode as "sharingMode"
    from tournament
    where id = ${tournamentId}
  `;

  if (!currentTournament) {
    throw new Error("NOT_FOUND");
  }

  const nextRoundClosureMode = getRoundClosureModeForAudience({
    sharingMode: currentTournament.sharingMode,
    visibility
  });
  const nextVotingAccess = isPublicTournamentVisibility(visibility) ? "anyone" : "signed_in_only";

  const [tournament] = await sql`
    update tournament
    set
      visibility = ${visibility},
      round_closure_mode = ${nextRoundClosureMode},
      voting_access = ${nextVotingAccess},
      updated_at = now()
    where id = ${tournamentId}
    returning id
  `;

  return { ok: true };
}

export async function deleteArchivedTournament({ tournamentId }) {
  const sql = getDb();

  const [tournament] = await sql.begin(async (tx) => {
    await tx`
      delete from vote
      where match_id in (
        select id
        from match
        where tournament_id = ${tournamentId}
      )
    `;

    return tx`
      delete from tournament
      where id = ${tournamentId}
        and archived_at is not null
      returning id
    `;
  });

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  return { ok: true };
}

export async function deleteAllArchivedMaterial() {
  const sql = getDb();

  return sql.begin(async (tx) => {
    await tx`
      delete from vote
      where match_id in (
        select id
        from match
        where tournament_id in (
          select id
          from tournament
          where archived_at is not null
        )
      )
    `;

    const deletedArchivedTournaments = await tx`
      delete from tournament
      where archived_at is not null
      returning id
    `;

    const deletedArchivedPools = await tx`
      delete from candidate_pool
      where archived_at is not null
      returning id
    `;

    return {
      deletedTournamentCount: deletedArchivedTournaments.length,
      deletedPoolCount: deletedArchivedPools.length
    };
  });
}

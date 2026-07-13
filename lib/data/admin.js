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

async function getParallelTournamentSupport(sql) {
  const [row] = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'parallel_tournament'
    ) as "hasParallelTournamentTable"
  `;

  return {
    hasParallelTournamentTable: Boolean(row?.hasParallelTournamentTable)
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
  const parallelSupport = await getParallelTournamentSupport(sql);

  const standardTournaments = await sql`
    select
      t.id,
      'standard'::text as kind,
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

  if (!parallelSupport.hasParallelTournamentTable) {
    return standardTournaments;
  }

  const parallelTournaments = await sql`
    select
      pt.id,
      'parallel_parent'::text as kind,
      pt.title,
      pt.description,
      pt.status,
      pt.visibility,
      'fixed_bracket'::text as "playStyle",
      pt.voting_access as "votingAccess",
      pt.sharing_mode as "sharingMode",
      pt.result_mode as "resultMode",
      pt.tie_break_mode as "tieBreakMode",
      ${sql`case
        when pt.visibility in ('public_listed', 'public_unlisted') then 'manual'
        when pt.sharing_mode = 'with_friends' then 'automatic_when_settled'
        else 'automatic_when_settled'
      end`} as "roundClosureMode",
      null::timestamptz as "lastVoteAt",
      pt.started_at as "startedAt",
      pt.completed_at as "completedAt",
      pt.archived_at as "archivedAt",
      pt.created_at as "createdAt",
      pt.updated_at as "updatedAt",
      creator.email as "creatorEmail",
      creator.name as "creatorName",
      coalesce(pool_size."entryCount", 0)::integer as "entryCount",
      (
        pt.archived_at is null
        and pt.visibility = 'public_listed'
        and pt.updated_at < now() - interval '7 days'
      ) as "isStalePublic"
    from parallel_tournament pt
    join app_user creator on creator.id = pt.creator_user_id
    left join lateral (
      select count(*)::integer as "entryCount"
      from candidate_pool_item item
      where item.pool_id = pt.source_pool_id
    ) pool_size on true
    where pt.visibility <> 'private'
       or pt.archived_at is not null
    order by
      case
        when pt.archived_at is not null then 2
        when pt.visibility in ('public_listed', 'public_unlisted') then 0
        else 1
      end,
      pt.updated_at desc
  `;

  return [...standardTournaments, ...parallelTournaments].sort((left, right) => {
    const leftRank = left.archivedAt ? 2 : left.visibility !== "private" ? 0 : 1;
    const rightRank = right.archivedAt ? 2 : right.visibility !== "private" ? 0 : 1;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftTime = new Date(left.lastVoteAt || left.updatedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.lastVoteAt || right.updatedAt || right.createdAt || 0).getTime();

    return rightTime - leftTime;
  });
}

export async function updateAdminTournamentVisibility({ tournamentId, visibility }) {
  const sql = getDb();
  const parallelSupport = await getParallelTournamentSupport(sql);
  const [currentTournament] = await sql`
    select
      id,
      'standard'::text as kind,
      sharing_mode as "sharingMode"
    from tournament
    where id = ${tournamentId}
  `;

  if (currentTournament) {
    const nextRoundClosureMode = getRoundClosureModeForAudience({
      sharingMode: currentTournament.sharingMode,
      visibility
    });
    const nextVotingAccess = isPublicTournamentVisibility(visibility) ? "anyone" : "signed_in_only";

    await sql`
      update tournament
      set
        visibility = ${visibility},
        round_closure_mode = ${nextRoundClosureMode},
        voting_access = ${nextVotingAccess},
        updated_at = now()
      where id = ${tournamentId}
    `;

    return { ok: true };
  }

  if (!parallelSupport.hasParallelTournamentTable) {
    throw new Error("NOT_FOUND");
  }

  const [currentParallelTournament] = await sql`
    select id
    from parallel_tournament
    where id = ${tournamentId}
  `;

  if (!currentParallelTournament) {
    throw new Error("NOT_FOUND");
  }

  const nextVotingAccess = isPublicTournamentVisibility(visibility) ? "anyone" : "signed_in_only";

  await sql`
    update parallel_tournament
    set
      visibility = ${visibility},
      voting_access = ${nextVotingAccess},
      updated_at = now()
    where id = ${tournamentId}
  `;

  return { ok: true };
}

export async function deleteArchivedTournament({ tournamentId }) {
  const sql = getDb();
  const parallelSupport = await getParallelTournamentSupport(sql);

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
    if (!parallelSupport.hasParallelTournamentTable) {
      throw new Error("NOT_FOUND");
    }

    const [parallelTournament] = await sql.begin(async (tx) => {
      const childTournamentIds = await tx`
        select tournament_id as id
        from parallel_tournament_participant
        where parallel_tournament_id = ${tournamentId}
          and tournament_id is not null
      `;

      if (childTournamentIds.length > 0) {
        await tx`
          delete from vote
          where match_id in (
            select id
            from match
            where tournament_id in ${sql(childTournamentIds.map((row) => row.id))}
          )
        `;

        await tx`
          delete from tournament
          where id in ${sql(childTournamentIds.map((row) => row.id))}
        `;
      }

      await tx`
        delete from parallel_tournament_participant
        where parallel_tournament_id = ${tournamentId}
      `;

      return tx`
        delete from parallel_tournament
        where id = ${tournamentId}
          and archived_at is not null
        returning id
      `;
    });

    if (!parallelTournament) {
      throw new Error("NOT_FOUND");
    }

    return { ok: true };
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

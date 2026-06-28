import { getDb } from "@/lib/db";

let poolVisibilitySupportPromise;

async function getPoolVisibilitySupport(sql) {
  if (!poolVisibilitySupportPromise) {
    poolVisibilitySupportPromise = sql`
      select bool_or(column_name = 'visibility') as "hasVisibility"
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'candidate_pool'
        and column_name = 'visibility'
    `.then(([row]) => ({
      hasVisibility: Boolean(row?.hasVisibility)
    }));
  }

  return poolVisibilitySupportPromise;
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
        when p.visibility in ('public_listed', 'public_unlisted') then 0
        else 1
      end,
      p.updated_at desc
  `;
}

export async function updateAdminPoolVisibility({ poolId, visibility }) {
  const sql = getDb();
  const support = await getPoolVisibilitySupport(sql);

  if (!support.hasVisibility && visibility !== "private") {
    throw new Error("POOL_PUBLIC_REQUIRES_MIGRATION");
  }

  if (!support.hasVisibility) {
    return { ok: true };
  }

  const [pool] = await sql`
    update candidate_pool
    set
      visibility = ${visibility},
      published_at = case
        when ${visibility} <> 'private' then coalesce(published_at, now())
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
      t.voting_access as "votingAccess",
      t.sharing_mode as "sharingMode",
      t.result_mode as "resultMode",
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

  const [tournament] = await sql`
    update tournament
    set
      visibility = ${visibility},
      updated_at = now()
    where id = ${tournamentId}
    returning id
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

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

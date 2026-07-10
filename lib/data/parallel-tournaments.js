import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";

function isPublicParallelVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function canInspectAllParallelParticipants({ sharingMode, visibility }) {
  if (isPublicParallelVisibility(visibility)) {
    return false;
  }

  return sharingMode === "with_friends";
}

export function filterVisibleParallelParticipants({
  participants,
  userId = null,
  anonymousVoterToken = null,
  canInspectAllParticipants = false
}) {
  if (canInspectAllParticipants) {
    return participants;
  }

  return participants.filter(
    (participant) =>
      (userId && participant.userId === userId) ||
      (anonymousVoterToken && participant.anonymousVoterToken === anonymousVoterToken)
  );
}

function createShareToken() {
  return randomBytes(18).toString("base64url");
}

async function ensureParallelTournamentSupport(sql) {
  const [row] = await sql`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'parallel_tournament'
    ) as "hasParallelTournamentTable"
  `;

  if (!row?.hasParallelTournamentTable) {
    throw new Error("PARALLEL_TOURNAMENTS_REQUIRES_MIGRATION");
  }
}

async function getAccessibleSourcePool(sql, { sourcePoolId, creatorUserId }) {
  const [pool] = await sql`
    select
      p.id,
      p.name
    from candidate_pool p
    where p.id = ${sourcePoolId}
      and (
        p.creator_user_id = ${creatorUserId}
        or p.visibility in ('public_listed', 'public_unlisted')
      )
    limit 1
  `;

  if (!pool) {
    throw new Error("NOT_FOUND");
  }

  const [candidateCountRow] = await sql`
    select count(*)::integer as "candidateCount"
    from candidate_pool_item
    where pool_id = ${sourcePoolId}
  `;

  if (!candidateCountRow?.candidateCount) {
    throw new Error("POOL_EMPTY");
  }

  return {
    ...pool,
    candidateCount: candidateCountRow.candidateCount
  };
}

async function createParticipantChildTournament(
  tx,
  {
    parallelTournament,
    parallelTournamentId,
    existingParticipant = null,
    userId = null,
    anonymousVoterToken = null
  }
) {
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  if (existingParticipant?.tournamentId) {
    return existingParticipant.tournamentId;
  }

  const poolCandidates = await tx`
    select
      c.id,
      i.display_order as "displayOrder"
    from candidate_pool_item i
    join candidate c on c.id = i.candidate_id
    where i.pool_id = ${parallelTournament.sourcePoolId}
    order by i.display_order nulls last, lower(c.name), c.created_at
  `;

  if (poolCandidates.length === 0) {
    throw new Error("POOL_EMPTY");
  }

  const [createdTournament] = await tx`
    insert into tournament (
      creator_user_id,
      title,
      description,
      source_pool_id,
      sharing_mode,
      visibility,
      voting_access,
      play_style,
      result_mode,
      tie_break_mode,
      round_closure_mode,
      status,
      started_at,
      parent_parallel_tournament_id
    )
    values (
      ${parallelTournament.creatorUserId},
      ${parallelTournament.title},
      ${parallelTournament.description ?? null},
      ${parallelTournament.sourcePoolId},
      'private',
      'private',
      'signed_in_only',
      'fixed_bracket',
      'full_ranking',
      ${parallelTournament.tieBreakMode},
      'automatic_when_settled',
      'active',
      now(),
      ${parallelTournamentId}
    )
    returning id
  `;

  for (const [index, candidate] of poolCandidates.entries()) {
    await tx`
      insert into tournament_entry (tournament_id, candidate_id, seed)
      values (${createdTournament.id}, ${candidate.id}, ${index + 1})
    `;
  }

  if (existingParticipant) {
    await tx`
      update parallel_tournament_participant
      set
        tournament_id = ${createdTournament.id},
        status = 'active',
        started_at = coalesce(started_at, now()),
        updated_at = now()
      where id = ${existingParticipant.id}
    `;
  } else {
    await tx`
      insert into parallel_tournament_participant (
        parallel_tournament_id,
        user_id,
        anonymous_voter_token,
        tournament_id,
        status,
        started_at
      )
      values (
        ${parallelTournamentId},
        ${userId}::uuid,
        ${typedAnonymousVoterToken}::text,
        ${createdTournament.id},
        'active',
        now()
      )
    `;
  }

  if (parallelTournament.status === "draft") {
    await tx`
      update parallel_tournament
      set
        status = 'active',
        started_at = coalesce(started_at, now()),
        updated_at = now()
      where id = ${parallelTournamentId}
    `;
  }

  return createdTournament.id;
}

export async function listParallelTournaments({ creatorUserId }) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);

  return sql`
    select
      pt.id,
      pt.creator_user_id as "creatorUserId",
      pt.title,
      pt.description,
      pt.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      pt.sharing_mode as "sharingMode",
      pt.visibility,
      pt.voting_access as "votingAccess",
      pt.tie_break_mode as "tieBreakMode",
      pt.status,
      pt.started_at as "startedAt",
      pt.completed_at as "completedAt",
      pt.archived_at as "archivedAt",
      pt.created_at as "createdAt",
      pt.updated_at as "updatedAt",
      coalesce(pool_size."candidateCount", 0)::integer as "candidateCount",
      coalesce(participant_counts."participantCount", 0)::integer as "participantCount",
      coalesce(participant_counts."activeParticipantCount", 0)::integer as "activeParticipantCount",
      coalesce(participant_counts."completedParticipantCount", 0)::integer as "completedParticipantCount",
      access_participant.id as "viewerParticipantId",
      access_participant.status as "viewerParticipantStatus",
      access_participant.tournament_id as "viewerTournamentId"
    from parallel_tournament pt
    join candidate_pool p on p.id = pt.source_pool_id
    left join parallel_tournament_participant access_participant
      on access_participant.parallel_tournament_id = pt.id
     and access_participant.user_id = ${creatorUserId}
    left join lateral (
      select count(*)::integer as "candidateCount"
      from candidate_pool_item item
      where item.pool_id = pt.source_pool_id
    ) pool_size on true
    left join lateral (
      select
        count(*)::integer as "participantCount",
        count(*) filter (where participant.status = 'active')::integer as "activeParticipantCount",
        count(*) filter (where participant.status = 'complete')::integer as "completedParticipantCount"
      from parallel_tournament_participant participant
      where participant.parallel_tournament_id = pt.id
    ) participant_counts on true
    where pt.creator_user_id = ${creatorUserId}
      and pt.archived_at is null
    order by
      case pt.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      pt.created_at desc
  `;
}

export async function listAccessibleParallelTournaments({
  userId,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  return sql`
    select
      pt.id,
      pt.creator_user_id as "creatorUserId",
      pt.title,
      pt.description,
      pt.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      pt.sharing_mode as "sharingMode",
      pt.visibility,
      pt.voting_access as "votingAccess",
      pt.tie_break_mode as "tieBreakMode",
      pt.status,
      pt.started_at as "startedAt",
      pt.completed_at as "completedAt",
      pt.archived_at as "archivedAt",
      pt.created_at as "createdAt",
      pt.updated_at as "updatedAt",
      coalesce(pool_size."candidateCount", 0)::integer as "candidateCount",
      coalesce(participant_counts."participantCount", 0)::integer as "participantCount",
      coalesce(participant_counts."activeParticipantCount", 0)::integer as "activeParticipantCount",
      coalesce(participant_counts."completedParticipantCount", 0)::integer as "completedParticipantCount"
    from parallel_tournament pt
    join candidate_pool p on p.id = pt.source_pool_id
    left join parallel_tournament_participant access_participant
      on access_participant.parallel_tournament_id = pt.id
     and (
       (${userId}::uuid is not null and access_participant.user_id = ${userId}::uuid)
       or (
         ${typedAnonymousVoterToken}::text is not null
         and access_participant.anonymous_voter_token = ${typedAnonymousVoterToken}::text
       )
     )
    left join lateral (
      select count(*)::integer as "candidateCount"
      from candidate_pool_item item
      where item.pool_id = pt.source_pool_id
    ) pool_size on true
    left join lateral (
      select
        count(*)::integer as "participantCount",
        count(*) filter (where participant.status = 'active')::integer as "activeParticipantCount",
        count(*) filter (where participant.status = 'complete')::integer as "completedParticipantCount"
      from parallel_tournament_participant participant
      where participant.parallel_tournament_id = pt.id
    ) participant_counts on true
    where pt.archived_at is null
      and (
        pt.creator_user_id = ${userId}
        or access_participant.id is not null
      )
    order by
      case pt.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      pt.created_at desc
  `;
}

export async function listPublicParallelTournaments({
  statuses = ["active", "complete"],
  limit = 12
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);

  return sql`
    select
      pt.id,
      pt.creator_user_id as "creatorUserId",
      pt.title,
      pt.description,
      pt.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      pt.sharing_mode as "sharingMode",
      pt.visibility,
      pt.voting_access as "votingAccess",
      pt.tie_break_mode as "tieBreakMode",
      pt.status,
      pt.started_at as "startedAt",
      pt.completed_at as "completedAt",
      pt.archived_at as "archivedAt",
      pt.created_at as "createdAt",
      pt.updated_at as "updatedAt",
      coalesce(pool_size."candidateCount", 0)::integer as "candidateCount",
      coalesce(participant_counts."participantCount", 0)::integer as "participantCount",
      coalesce(participant_counts."activeParticipantCount", 0)::integer as "activeParticipantCount",
      coalesce(participant_counts."completedParticipantCount", 0)::integer as "completedParticipantCount"
    from parallel_tournament pt
    join candidate_pool p on p.id = pt.source_pool_id
    left join lateral (
      select count(*)::integer as "candidateCount"
      from candidate_pool_item item
      where item.pool_id = pt.source_pool_id
    ) pool_size on true
    left join lateral (
      select
        count(*)::integer as "participantCount",
        count(*) filter (where participant.status = 'active')::integer as "activeParticipantCount",
        count(*) filter (where participant.status = 'complete')::integer as "completedParticipantCount"
      from parallel_tournament_participant participant
      where participant.parallel_tournament_id = pt.id
    ) participant_counts on true
    where pt.archived_at is null
      and pt.visibility = 'public_listed'
      and pt.status in ${sql(statuses)}
    order by
      case pt.status
        when 'active' then 0
        else 1
      end,
      pt.updated_at desc,
      pt.created_at desc
    limit ${limit}
  `;
}

export async function getAccessibleParallelTournamentById({
  parallelTournamentId,
  userId = null,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  const [parallelTournament] = await sql`
    select
      pt.id,
      pt.creator_user_id as "creatorUserId",
      pt.title,
      pt.description,
      pt.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      pt.sharing_mode as "sharingMode",
      pt.visibility,
      pt.voting_access as "votingAccess",
      pt.tie_break_mode as "tieBreakMode",
      pt.status,
      pt.started_at as "startedAt",
      pt.completed_at as "completedAt",
      pt.archived_at as "archivedAt",
      pt.created_at as "createdAt",
      pt.updated_at as "updatedAt",
      coalesce(pool_size."candidateCount", 0)::integer as "candidateCount",
      coalesce(participant_counts."participantCount", 0)::integer as "participantCount",
      coalesce(participant_counts."activeParticipantCount", 0)::integer as "activeParticipantCount",
      coalesce(participant_counts."completedParticipantCount", 0)::integer as "completedParticipantCount",
      access_participant.id as "viewerParticipantId",
      access_participant.status as "viewerParticipantStatus",
      access_participant.tournament_id as "viewerTournamentId"
    from parallel_tournament pt
    join candidate_pool p on p.id = pt.source_pool_id
    left join parallel_tournament_participant access_participant
      on access_participant.parallel_tournament_id = pt.id
     and (
       (${userId}::uuid is not null and access_participant.user_id = ${userId}::uuid)
       or (
         ${typedAnonymousVoterToken}::text is not null
         and access_participant.anonymous_voter_token = ${typedAnonymousVoterToken}::text
       )
     )
    left join lateral (
      select count(*)::integer as "candidateCount"
      from candidate_pool_item item
      where item.pool_id = pt.source_pool_id
    ) pool_size on true
    left join lateral (
      select
        count(*)::integer as "participantCount",
        count(*) filter (where participant.status = 'active')::integer as "activeParticipantCount",
        count(*) filter (where participant.status = 'complete')::integer as "completedParticipantCount"
      from parallel_tournament_participant participant
      where participant.parallel_tournament_id = pt.id
    ) participant_counts on true
    where pt.id = ${parallelTournamentId}
      and pt.archived_at is null
      and (
        pt.creator_user_id = ${userId}
        or access_participant.id is not null
        or pt.visibility in ('public_listed', 'public_unlisted')
      )
    limit 1
  `;

  if (!parallelTournament) {
    throw new Error("NOT_FOUND");
  }

  const participants =
    userId && parallelTournament.creatorUserId === userId
      ? await sql`
          select
            participant.id,
            participant.user_id as "userId",
            participant.anonymous_voter_token as "anonymousVoterToken",
            participant.tournament_id as "tournamentId",
            participant.status,
            participant.started_at as "startedAt",
            participant.completed_at as "completedAt",
            participant.created_at as "createdAt",
            participant.updated_at as "updatedAt",
            user_record.name,
            user_record.email,
            user_record.image_url as "imageUrl"
          from parallel_tournament_participant participant
          left join app_user user_record on user_record.id = participant.user_id
          where participant.parallel_tournament_id = ${parallelTournamentId}
          order by participant.created_at asc
        `
      : [];

  return {
    ...parallelTournament,
    participants
  };
}

async function getParallelTournamentByIdForCreator({ parallelTournamentId, creatorUserId }) {
  const parallelTournament = await getAccessibleParallelTournamentById({
    parallelTournamentId,
    userId: creatorUserId
  });

  if (parallelTournament.creatorUserId !== creatorUserId) {
    throw new Error("FORBIDDEN");
  }

  return parallelTournament;
}

async function ensureParallelShareLinkSupport(sql) {
  const [row] = await sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'share_link'
        and column_name = 'parallel_tournament_id'
    ) as "hasParallelTournamentShareLinks"
  `;

  if (!row?.hasParallelTournamentShareLinks) {
    throw new Error("PARALLEL_TOURNAMENTS_REQUIRES_MIGRATION");
  }
}

export async function createParallelTournament({
  creatorUserId,
  title,
  description,
  sourcePoolId,
  sharingMode,
  visibility = "private",
  votingAccess = "signed_in_only",
  tieBreakMode = "higher_seed_wins"
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);
  await getAccessibleSourcePool(sql, { sourcePoolId, creatorUserId });

  const parallelTournament = await sql.begin(async (tx) => {
    const [createdParallelTournament] = await tx`
      insert into parallel_tournament (
        creator_user_id,
        title,
        description,
        source_pool_id,
        sharing_mode,
        visibility,
        voting_access,
        tie_break_mode
      )
      values (
        ${creatorUserId},
        ${title},
        ${description ?? null},
        ${sourcePoolId},
        ${sharingMode},
        ${visibility},
        ${votingAccess},
        ${tieBreakMode}
      )
      returning id
    `;

    await tx`
      insert into parallel_tournament_participant (
        parallel_tournament_id,
        user_id,
        status
      )
      values (
        ${createdParallelTournament.id},
        ${creatorUserId},
        'invited'
      )
    `;

    return createdParallelTournament;
  });

  return getAccessibleParallelTournamentById({
    parallelTournamentId: parallelTournament.id,
    userId: creatorUserId
  });
}

export async function listParallelTournamentShareLinks({
  parallelTournamentId,
  creatorUserId
}) {
  const sql = getDb();
  await ensureParallelShareLinkSupport(sql);
  const parallelTournament = await getParallelTournamentByIdForCreator({
    parallelTournamentId,
    creatorUserId
  });

  if (parallelTournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  return sql`
    select
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from share_link
    where parallel_tournament_id = ${parallelTournamentId}
    order by created_at desc
  `;
}

export async function ensureParallelTournamentShareLink({
  parallelTournamentId,
  creatorUserId
}) {
  const sql = getDb();
  await ensureParallelShareLinkSupport(sql);
  const parallelTournament = await getParallelTournamentByIdForCreator({
    parallelTournamentId,
    creatorUserId
  });

  if (parallelTournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  const [existing] = await sql`
    select
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from share_link
    where parallel_tournament_id = ${parallelTournamentId}
      and active = true
    order by created_at desc
    limit 1
  `;

  if (existing) {
    return existing;
  }

  const [created] = await sql`
    insert into share_link (parallel_tournament_id, token, active, created_by_user_id)
    values (${parallelTournamentId}, ${createShareToken()}, true, ${creatorUserId})
    returning
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return created;
}

export async function rotateParallelTournamentShareLink({
  parallelTournamentId,
  creatorUserId
}) {
  const sql = getDb();
  await ensureParallelShareLinkSupport(sql);
  const parallelTournament = await getParallelTournamentByIdForCreator({
    parallelTournamentId,
    creatorUserId
  });

  if (parallelTournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  return sql.begin(async (tx) => {
    await tx`
      update share_link
      set
        active = false,
        updated_at = now()
      where parallel_tournament_id = ${parallelTournamentId}
        and active = true
    `;

    const [created] = await tx`
      insert into share_link (parallel_tournament_id, token, active, created_by_user_id)
      values (${parallelTournamentId}, ${createShareToken()}, true, ${creatorUserId})
      returning
        id,
        token,
        active,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    return created;
  });
}

export async function updateParallelTournament({
  parallelTournamentId,
  creatorUserId,
  patch
}) {
  const sql = getDb();
  const current = await getParallelTournamentByIdForCreator({
    parallelTournamentId,
    creatorUserId
  });
  const shouldChangeStatus = Object.hasOwn(patch, "status");
  const nextStatus = shouldChangeStatus ? patch.status : current.status;

  const nextTitle = Object.hasOwn(patch, "title") ? patch.title : current.title;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextSourcePoolId = Object.hasOwn(patch, "sourcePoolId")
    ? patch.sourcePoolId
    : current.sourcePoolId;
  const nextSharingMode = Object.hasOwn(patch, "sharingMode")
    ? patch.sharingMode
    : current.sharingMode;
  const nextVisibility = Object.hasOwn(patch, "visibility")
    ? patch.visibility
    : current.visibility;
  const nextVotingAccess = Object.hasOwn(patch, "votingAccess")
    ? patch.votingAccess
    : current.votingAccess;
  const nextTieBreakMode = Object.hasOwn(patch, "tieBreakMode")
    ? patch.tieBreakMode
    : current.tieBreakMode;
  const shouldLockPublishedParallelBracket =
    current.status !== "draft" && isPublicParallelVisibility(current.visibility);

  if (
    shouldLockPublishedParallelBracket &&
    (Object.hasOwn(patch, "title") ||
      Object.hasOwn(patch, "description") ||
      Object.hasOwn(patch, "sourcePoolId") ||
      Object.hasOwn(patch, "sharingMode") ||
      Object.hasOwn(patch, "visibility") ||
      Object.hasOwn(patch, "votingAccess") ||
      Object.hasOwn(patch, "tieBreakMode") ||
      Object.hasOwn(patch, "status"))
  ) {
    throw new Error("TOURNAMENT_PUBLISHED_LOCKED");
  }

  if (
    current.status !== "draft" &&
    (Object.hasOwn(patch, "sourcePoolId") ||
      Object.hasOwn(patch, "sharingMode") ||
      Object.hasOwn(patch, "visibility") ||
      Object.hasOwn(patch, "votingAccess") ||
      Object.hasOwn(patch, "tieBreakMode"))
  ) {
    throw new Error("TOURNAMENT_CONFIG_LOCKED");
  }

  if (shouldChangeStatus) {
    const allowedTransitions = {
      draft: ["active", "complete"],
      active: ["complete"],
      complete: []
    };

    if (nextStatus !== current.status && !allowedTransitions[current.status]?.includes(nextStatus)) {
      throw new Error("INVALID_TOURNAMENT_STATUS_TRANSITION");
    }
  }

  if (Object.hasOwn(patch, "sourcePoolId")) {
    await getAccessibleSourcePool(sql, {
      sourcePoolId: nextSourcePoolId,
      creatorUserId
    });
  }

  await sql`
    update parallel_tournament
    set
      title = ${nextTitle},
      description = ${nextDescription},
      source_pool_id = ${nextSourcePoolId},
      sharing_mode = ${nextSharingMode},
      visibility = ${nextVisibility},
      voting_access = ${nextVotingAccess},
      tie_break_mode = ${nextTieBreakMode},
      status = ${nextStatus},
      started_at = case
        when ${nextStatus} = 'active' then coalesce(started_at, now())
        else started_at
      end,
      completed_at = case
        when ${nextStatus} = 'complete' then coalesce(completed_at, now())
        else completed_at
      end,
      updated_at = now()
    where id = ${parallelTournamentId}
  `;

  return getAccessibleParallelTournamentById({
    parallelTournamentId,
    userId: creatorUserId
  });
}

export async function archiveParallelTournament({
  parallelTournamentId,
  creatorUserId
}) {
  const sql = getDb();
  await getParallelTournamentByIdForCreator({
    parallelTournamentId,
    creatorUserId
  });

  await sql`
    update parallel_tournament
    set
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = ${parallelTournamentId}
  `;

  return { ok: true };
}

export async function openParallelTournamentParticipantBracket({
  parallelTournamentId,
  userId = null,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);

  if (!userId && !anonymousVoterToken) {
    throw new Error("UNAUTHORIZED");
  }

  return sql.begin(async (tx) => {
    const typedAnonymousVoterToken = anonymousVoterToken ?? null;
    const [parallelTournament] = await tx`
      select
        pt.id,
        pt.creator_user_id as "creatorUserId",
        pt.title,
        pt.description,
        pt.source_pool_id as "sourcePoolId",
        pt.sharing_mode as "sharingMode",
        pt.visibility,
        pt.voting_access as "votingAccess",
        pt.tie_break_mode as "tieBreakMode",
        pt.status
      from parallel_tournament pt
      left join parallel_tournament_participant access_participant
        on access_participant.parallel_tournament_id = pt.id
       and (
         (${userId}::uuid is not null and access_participant.user_id = ${userId}::uuid)
         or (
           ${typedAnonymousVoterToken}::text is not null
           and access_participant.anonymous_voter_token = ${typedAnonymousVoterToken}::text
         )
       )
      where pt.id = ${parallelTournamentId}
        and pt.archived_at is null
        and (
          pt.creator_user_id = ${userId}
          or access_participant.id is not null
          or pt.visibility in ('public_listed', 'public_unlisted')
        )
      limit 1
    `;

    if (!parallelTournament) {
      throw new Error("NOT_FOUND");
    }

    if (parallelTournament.status === "complete") {
      throw new Error("PARALLEL_TOURNAMENT_CLOSED");
    }

    const [existingParticipant] = await tx`
      select
        id,
        tournament_id as "tournamentId",
        status
      from parallel_tournament_participant
      where parallel_tournament_id = ${parallelTournamentId}
        and (
          (${userId}::uuid is not null and user_id = ${userId}::uuid)
          or (
            ${typedAnonymousVoterToken}::text is not null
            and anonymous_voter_token = ${typedAnonymousVoterToken}::text
          )
        )
      limit 1
    `;

    const tournamentId = await createParticipantChildTournament(tx, {
      parallelTournament,
      parallelTournamentId,
      existingParticipant,
      userId,
      anonymousVoterToken: typedAnonymousVoterToken
    });

    return {
      parallelTournamentId,
      tournamentId
    };
  });
}

export async function getFeaturedParallelTeaserMatchups({ limit = 6 }) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);

  return sql`
    with ranked_candidates as (
      select
        pt.id as "parallelTournamentId",
        pt.title as "parallelTournamentTitle",
        coalesce(pt.started_at, pt.updated_at) as "activityAt",
        c.id as "candidateId",
        c.name as "candidateName",
        c.image_url as "candidateImageUrl",
        row_number() over (
          partition by pt.id
          order by item.display_order nulls last, lower(c.name), c.created_at
        )::integer as seed,
        count(*) over (partition by pt.id)::integer as "candidateCount"
      from parallel_tournament pt
      join candidate_pool_item item on item.pool_id = pt.source_pool_id
      join candidate c on c.id = item.candidate_id
      where pt.archived_at is null
        and pt.visibility = 'public_listed'
        and pt.status = 'active'
    )
    select
      left_candidate."parallelTournamentId",
      left_candidate."parallelTournamentTitle",
      left_candidate."activityAt",
      left_candidate."candidateId" as "leftCandidateId",
      left_candidate."candidateName" as "leftName",
      left_candidate."candidateImageUrl" as "leftImageUrl",
      left_candidate.seed as "leftSeed",
      right_candidate."candidateId" as "rightCandidateId",
      right_candidate."candidateName" as "rightName",
      right_candidate."candidateImageUrl" as "rightImageUrl",
      right_candidate.seed as "rightSeed"
    from ranked_candidates left_candidate
    join ranked_candidates right_candidate
      on right_candidate."parallelTournamentId" = left_candidate."parallelTournamentId"
     and right_candidate.seed = left_candidate."candidateCount"
    where left_candidate.seed = 1
      and left_candidate."candidateCount" > 1
    order by left_candidate."activityAt" desc
    limit ${limit}
  `;
}

export async function getParallelTournamentAggregateResults({
  parallelTournamentId,
  userId = null,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  await ensureParallelTournamentSupport(sql);
  const parallelTournament = await getAccessibleParallelTournamentById({
    parallelTournamentId,
    userId,
    anonymousVoterToken
  });

  const completedParticipants = await sql`
    select
      participant.id,
      participant.user_id as "userId",
      participant.anonymous_voter_token as "anonymousVoterToken",
      participant.tournament_id as "tournamentId",
      participant.status,
      participant.started_at as "startedAt",
      participant.completed_at as "completedAt",
      participant.created_at as "createdAt",
      participant.updated_at as "updatedAt",
      user_record.name,
      user_record.email,
      user_record.image_url as "imageUrl"
    from parallel_tournament_participant participant
    left join app_user user_record on user_record.id = participant.user_id
    where participant.parallel_tournament_id = ${parallelTournamentId}
      and participant.tournament_id is not null
      and participant.status = 'complete'
    order by participant.completed_at asc nulls last, participant.created_at asc
  `;

  const completedTournamentIds = completedParticipants
    .map((participant) => participant.tournamentId)
    .filter(Boolean);

  const aggregateEntries =
    completedTournamentIds.length > 0
      ? await sql`
          select
            entry.candidate_id as "candidateId",
            min(entry.seed)::integer as seed,
            candidate.name as "candidateName",
            candidate.description as "candidateDescription",
            candidate.image_url as "candidateImageUrl",
            avg(entry.final_rank::numeric)::float8 as "averageRank",
            coalesce(stddev_pop(entry.final_rank::numeric), 0)::float8 as "rankStdDev",
            count(*)::integer as "ballotCount"
          from tournament_entry entry
          join candidate on candidate.id = entry.candidate_id
          where entry.tournament_id in ${sql(completedTournamentIds)}
            and entry.final_rank is not null
          group by entry.candidate_id, candidate.name, candidate.description, candidate.image_url
        `
      : [];

  const orderedAggregateEntries = [...aggregateEntries]
    .sort((left, right) => {
      if (left.averageRank !== right.averageRank) {
        return left.averageRank - right.averageRank;
      }

      if (left.rankStdDev !== right.rankStdDev) {
        return left.rankStdDev - right.rankStdDev;
      }

      return left.seed - right.seed;
    })
    .map((entry, index) => ({
      ...entry,
      id: `${parallelTournamentId}:${entry.candidateId}`,
      finalRank: index + 1
    }));

  const canInspectAllParticipants = canInspectAllParallelParticipants({
    sharingMode: parallelTournament.sharingMode,
    visibility: parallelTournament.visibility
  });
  const visibleParticipants = filterVisibleParallelParticipants({
    participants: completedParticipants,
    userId,
    anonymousVoterToken,
    canInspectAllParticipants
  });
  const visibleTournamentIds = visibleParticipants.map((participant) => participant.tournamentId);

  const participantEntryRows =
    visibleTournamentIds.length > 0
      ? await sql`
          select
            entry.tournament_id as "tournamentId",
            entry.id as "entryId",
            entry.candidate_id as "candidateId",
            entry.final_rank as "finalRank"
          from tournament_entry entry
          where entry.tournament_id in ${sql(visibleTournamentIds)}
        `
      : [];

  const participantMatchRows =
    visibleTournamentIds.length > 0
      ? await sql`
          select
            match.id,
            match.tournament_id as "tournamentId",
            match.status,
            match.resolution_source as "resolutionSource",
            match.winner_entry_id as "winnerEntryId",
            round.id as "roundId",
            round.sequence_number as "roundNumber",
            round.ranking_target_rank as "rankingTargetRank",
            dense_rank() over (
              partition by match.tournament_id, round.ranking_target_rank
              order by round.sequence_number asc
            ) as "rankingRoundNumber",
            left_entry.id as "leftEntryId",
            left_entry.seed as "leftSeed",
            left_candidate.name as "leftName",
            left_candidate.description as "leftDescription",
            left_candidate.image_url as "leftImageUrl",
            coalesce(left_votes."voteCount", 0)::integer as "leftVoteCount",
            right_entry.id as "rightEntryId",
            right_entry.seed as "rightSeed",
            right_candidate.name as "rightName",
            right_candidate.description as "rightDescription",
            right_candidate.image_url as "rightImageUrl",
            coalesce(right_votes."voteCount", 0)::integer as "rightVoteCount"
          from match
          join tournament_round round on round.id = match.round_id
          left join tournament_entry left_entry on left_entry.id = match.left_entry_id
          left join candidate left_candidate on left_candidate.id = left_entry.candidate_id
          left join lateral (
            select count(*)::integer as "voteCount"
            from vote
            where vote.match_id = match.id
              and vote.selected_entry_id = match.left_entry_id
          ) left_votes on true
          left join tournament_entry right_entry on right_entry.id = match.right_entry_id
          left join candidate right_candidate on right_candidate.id = right_entry.candidate_id
          left join lateral (
            select count(*)::integer as "voteCount"
            from vote
            where vote.match_id = match.id
              and vote.selected_entry_id = match.right_entry_id
          ) right_votes on true
          where match.tournament_id in ${sql(visibleTournamentIds)}
          order by
            round.sequence_number asc,
            case when match.right_entry_id is null then 1 else 0 end asc,
            left_entry.seed asc nulls last,
            right_entry.seed desc nulls last,
            match.created_at asc
        `
      : [];

  const participantRanksByTournamentId = participantEntryRows.reduce((map, row) => {
    const current = map.get(row.tournamentId) ?? {};
    current[row.candidateId] = {
      finalRank: row.finalRank,
      entryId: row.entryId
    };
    map.set(row.tournamentId, current);
    return map;
  }, new Map());

  const participantMatchesByTournamentId = participantMatchRows.reduce((map, match) => {
    const current = map.get(match.tournamentId) ?? [];
    current.push(match);
    map.set(match.tournamentId, current);
    return map;
  }, new Map());

  return {
    bracketType: "parallel_parent",
    tournament: {
      id: parallelTournament.id,
      title: parallelTournament.title,
      description: parallelTournament.description,
      sourcePoolId: parallelTournament.sourcePoolId,
      sourcePoolName: parallelTournament.sourcePoolName,
      sharingMode: parallelTournament.sharingMode,
      visibility: parallelTournament.visibility,
      votingAccess: parallelTournament.votingAccess,
      playStyle: "fixed_bracket",
      resultMode: "parallel_full_ranking",
      tieBreakMode: parallelTournament.tieBreakMode,
      status: parallelTournament.status,
      viewerParticipantId: parallelTournament.viewerParticipantId ?? null,
      viewerParticipantStatus: parallelTournament.viewerParticipantStatus ?? null,
      viewerTournamentId: parallelTournament.viewerTournamentId ?? null,
      startedAt: parallelTournament.startedAt,
      completedAt: parallelTournament.completedAt,
      archivedAt: parallelTournament.archivedAt,
      createdAt: parallelTournament.createdAt,
      updatedAt: parallelTournament.updatedAt,
      entries: orderedAggregateEntries,
      participantCount: parallelTournament.participantCount,
      completedParticipantCount: parallelTournament.completedParticipantCount
    },
    aggregateEntries: orderedAggregateEntries,
    participants: visibleParticipants.map((participant) => ({
      ...participant,
      candidateRanks: participantRanksByTournamentId.get(participant.tournamentId) ?? {},
      matches: participantMatchesByTournamentId.get(participant.tournamentId) ?? []
    })),
    canInspectAllParticipants,
    completedBallotCount: completedParticipants.length
  };
}

export { ensureParallelTournamentSupport, isPublicParallelVisibility };

import { getDb } from "@/lib/db";
import { closeCurrentRound } from "@/lib/data/rounds";
import { buildInitialRound } from "@/lib/tournament/rounds";
import { randomBytes } from "node:crypto";

function createShareToken() {
  return randomBytes(18).toString("base64url");
}

export async function createRound(tx, { tournamentId, sequenceNumber, matches, rankingTargetRank = 1 }) {
  const [round] = await tx`
    insert into tournament_round (
      tournament_id,
      sequence_number,
      ranking_target_rank,
      status,
      opened_at
    )
    values (${tournamentId}, ${sequenceNumber}, ${rankingTargetRank}, 'active', now())
    returning id, ranking_target_rank as "rankingTargetRank"
  `;

  for (const match of matches) {
    await tx`
      insert into match (
        tournament_id,
        round_id,
        left_entry_id,
        right_entry_id,
        left_slot_type,
        right_slot_type,
        status,
        winner_entry_id,
        resolution_source,
        pair_key
      )
      values (
        ${tournamentId},
        ${round.id},
        ${match.leftEntryId},
        ${match.rightEntryId},
        ${match.leftSlotType},
        ${match.rightSlotType},
        ${match.status},
        ${match.winnerEntryId},
        ${match.resolutionSource},
        ${match.pairKey}
      )
    `;
  }

  return round;
}

export async function ensureInitialRoundGenerated(tx, tournamentId) {
  const entries = await tx`
    select id, seed
    from tournament_entry
    where tournament_id = ${tournamentId}
    order by seed asc
  `;

  const existingRounds = await tx`
    select id
    from tournament_round
    where tournament_id = ${tournamentId}
    limit 1
  `;

  if (existingRounds.length > 0) {
    return;
  }

  const roundMatches = buildInitialRound(entries);
  await createRound(tx, {
    tournamentId,
    sequenceNumber: 1,
    matches: roundMatches,
    rankingTargetRank: 1
  });
}

export async function listTournaments({ creatorUserId }) {
  const sql = getDb();

  return sql`
    select
      t.id,
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      count(e.id)::integer as "entryCount",
      coalesce(open_votes."openVoteCount", 0)::integer as "openVoteCount",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_entry e on e.tournament_id = t.id
    left join lateral (
      select count(*)::integer as "openVoteCount"
      from match m
      left join vote user_vote
        on user_vote.match_id = m.id
       and user_vote.user_id = ${creatorUserId}
      where m.tournament_id = t.id
        and m.status = 'open'
        and user_vote.id is null
    ) open_votes on true
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
    ) winner on true
    where t.creator_user_id = ${creatorUserId}
      and t.archived_at is null
    group by
      t.id,
      p.name,
      open_votes."openVoteCount",
      ranked_winner.id,
      ranked_winner.name,
      ranked_winner.seed,
      winner.id,
      winner.name,
      winner.seed
    order by
      case t.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      t.created_at desc
  `;
}

export async function listAccessibleTournaments({ userId }) {
  const sql = getDb();

  return sql`
    select
      t.id,
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      count(e.id)::integer as "entryCount",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_entry e on e.tournament_id = t.id
    left join tournament_invite invite
      on invite.tournament_id = t.id
     and invite.user_id = ${userId}
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
    ) winner on true
    where t.archived_at is null
      and (
        t.creator_user_id = ${userId}
        or invite.user_id is not null
      )
    group by
      t.id,
      p.name,
      ranked_winner.id,
      ranked_winner.name,
      ranked_winner.seed,
      winner.id,
      winner.name,
      winner.seed
    order by
      case t.status
        when 'active' then 0
        when 'draft' then 1
        else 2
      end,
      t.created_at desc
  `;
}

export async function getTournamentById({ tournamentId, creatorUserId }) {
  const sql = getDb();

  const [tournament] = await sql`
    select
      t.id,
      t.creator_user_id as "creatorUserId",
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
    ) winner on true
    where t.id = ${tournamentId}
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  if (tournament.creatorUserId !== creatorUserId) {
    throw new Error("FORBIDDEN");
  }

  const entries = await sql`
    select
      e.id,
      e.seed,
      e.final_rank as "finalRank",
      c.id as "candidateId",
      c.name as "candidateName",
      c.description as "candidateDescription",
      c.image_url as "candidateImageUrl"
    from tournament_entry e
    join candidate c on c.id = e.candidate_id
    where e.tournament_id = ${tournamentId}
    order by e.seed asc
  `;

  return {
    id: tournament.id,
    title: tournament.title,
    description: tournament.description,
    sourcePoolId: tournament.sourcePoolId,
    sourcePoolName: tournament.sourcePoolName,
    sharingMode: tournament.sharingMode,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    status: tournament.status,
    roundClosureMode: tournament.roundClosureMode,
    startedAt: tournament.startedAt,
    completedAt: tournament.completedAt,
    archivedAt: tournament.archivedAt,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    winnerEntryId: tournament.winnerEntryId,
    winnerName: tournament.winnerName,
    winnerSeed: tournament.winnerSeed,
    entries
  };
}

export async function getAccessibleTournamentById({ tournamentId, userId }) {
  const sql = getDb();

  const [tournament] = await sql`
    select
      t.id,
      t.creator_user_id as "creatorUserId",
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join tournament_invite invite
      on invite.tournament_id = t.id
     and invite.user_id = ${userId}
    left join lateral (
      select
        ranked_entry.id,
        ranked_entry.seed,
        ranked_candidate.name
      from tournament_entry ranked_entry
      join candidate ranked_candidate on ranked_candidate.id = ranked_entry.candidate_id
      where ranked_entry.tournament_id = t.id
        and ranked_entry.final_rank = 1
      limit 1
    ) ranked_winner on true
    left join lateral (
      select
        winner_entry.id,
        winner_entry.seed,
        winner_candidate.name
      from tournament_round r
      join match m on m.round_id = r.id
      join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
      join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
      where r.tournament_id = t.id
      order by r.sequence_number desc, m.created_at desc
      limit 1
    ) winner on true
    where t.id = ${tournamentId}
      and t.archived_at is null
      and (
        t.creator_user_id = ${userId}
        or invite.user_id is not null
      )
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  const entries = await sql`
    select
      e.id,
      e.seed,
      e.final_rank as "finalRank",
      c.id as "candidateId",
      c.name as "candidateName",
      c.description as "candidateDescription",
      c.image_url as "candidateImageUrl"
    from tournament_entry e
    join candidate c on c.id = e.candidate_id
    where e.tournament_id = ${tournamentId}
    order by e.seed asc
  `;

  return {
    id: tournament.id,
    title: tournament.title,
    description: tournament.description,
    sourcePoolId: tournament.sourcePoolId,
    sourcePoolName: tournament.sourcePoolName,
    sharingMode: tournament.sharingMode,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    status: tournament.status,
    roundClosureMode: tournament.roundClosureMode,
    startedAt: tournament.startedAt,
    completedAt: tournament.completedAt,
    archivedAt: tournament.archivedAt,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    winnerEntryId: tournament.winnerEntryId,
    winnerName: tournament.winnerName,
    winnerSeed: tournament.winnerSeed,
    entries
  };
}

export async function listTournamentInvites({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  return sql`
    select
      i.id,
      i.status,
      i.joined_at as "joinedAt",
      u.id as "userId",
      u.name,
      u.email,
      u.image_url as "imageUrl",
      coalesce(active_round."openMatchCount", 0)::integer as "openMatchCount",
      coalesce(invite_progress."votesCast", 0)::integer as "votesCast"
    from tournament_invite i
    join app_user u on u.id = i.user_id
    left join lateral (
      select
        r.id,
        count(*) filter (where m.status = 'open')::integer as "openMatchCount"
      from tournament_round r
      join match m on m.round_id = r.id
      where r.tournament_id = ${tournamentId}
        and r.status = 'active'
      group by r.id, r.sequence_number
      order by r.sequence_number desc
      limit 1
    ) active_round on true
    left join lateral (
      select count(*)::integer as "votesCast"
      from vote v
      join match m on m.id = v.match_id
      where v.user_id = i.user_id
        and m.round_id = active_round.id
    ) invite_progress on true
    where i.tournament_id = ${tournamentId}
    order by i.joined_at asc
  `;
}

export async function listTournamentShareLinks({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  return sql`
    select
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
    from share_link
    where tournament_id = ${tournamentId}
    order by created_at desc
  `;
}

export async function ensureTournamentShareLink({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (tournament.sharingMode !== "with_friends") {
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
    where tournament_id = ${tournamentId}
      and active = true
    order by created_at desc
    limit 1
  `;

  if (existing) {
    return existing;
  }

  const [created] = await sql`
    insert into share_link (tournament_id, token, active, created_by_user_id)
    values (${tournamentId}, ${createShareToken()}, true, ${creatorUserId})
    returning
      id,
      token,
      active,
      created_at as "createdAt",
      updated_at as "updatedAt"
  `;

  return created;
}

export async function rotateTournamentShareLink({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (tournament.sharingMode !== "with_friends") {
    throw new Error("FORBIDDEN");
  }

  return sql.begin(async (tx) => {
    await tx`
      update share_link
      set
        active = false,
        updated_at = now()
      where tournament_id = ${tournamentId}
        and active = true
    `;

    const [created] = await tx`
      insert into share_link (tournament_id, token, active, created_by_user_id)
      values (${tournamentId}, ${createShareToken()}, true, ${creatorUserId})
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

export async function getTournamentByShareToken({ token, userId }) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [record] = await tx`
      select
        s.id as "shareLinkId",
        s.active,
        t.id as "tournamentId",
        t.title,
        t.status,
        t.sharing_mode as "sharingMode",
        t.source_pool_id as "sourcePoolId",
        p.name as "sourcePoolName",
        t.creator_user_id as "creatorUserId",
        creator.name as "creatorName",
        creator.email as "creatorEmail",
        count(e.id)::integer as "entryCount"
      from share_link s
      join tournament t on t.id = s.tournament_id
      join app_user creator on creator.id = t.creator_user_id
      left join candidate_pool p on p.id = t.source_pool_id
      left join tournament_entry e on e.tournament_id = t.id
      where s.token = ${token}
      group by s.id, t.id, p.name, creator.name, creator.email
      limit 1
    `;

    if (!record || record.sharingMode !== "with_friends") {
      throw new Error("NOT_FOUND");
    }

    const [invite] = await tx`
      select
        id,
        status
      from tournament_invite
      where tournament_id = ${record.tournamentId}
        and user_id = ${userId}
      limit 1
    `;

    const isCreator = record.creatorUserId === userId;
    let inviteStatus = invite?.status || null;
    let joined = Boolean(invite) || isCreator;
    let accessState = "waiting";

    if (!isCreator && record.status === "draft" && record.active) {
      if (!invite) {
        const [createdInvite] = await tx`
          insert into tournament_invite (tournament_id, user_id, status)
          values (${record.tournamentId}, ${userId}, 'pending')
          on conflict (tournament_id, user_id) do update
            set joined_at = tournament_invite.joined_at
          returning id, status
        `;
        inviteStatus = createdInvite.status;
      }

      joined = true;
      accessState = "waiting";
    } else if (!isCreator && !invite) {
      accessState = record.active ? "not_invited" : "link_inactive";
    } else if (record.status === "active") {
      accessState = "active";
    } else if (record.status === "complete") {
      accessState = "complete";
    } else if (!record.active) {
      accessState = "link_inactive";
    }

    return {
      tournamentId: record.tournamentId,
      title: record.title,
      status: record.status,
      sharingMode: record.sharingMode,
      sourcePoolId: record.sourcePoolId,
      sourcePoolName: record.sourcePoolName,
      creatorName: record.creatorName,
      creatorEmail: record.creatorEmail,
      entryCount: record.entryCount,
      shareLinkActive: record.active,
      isCreator,
      joined,
      inviteStatus,
      accessState
    };
  });
}

export async function archiveTournament({ tournamentId, creatorUserId }) {
  const sql = getDb();
  await getTournamentById({ tournamentId, creatorUserId });

  await sql`
    update tournament
    set
      archived_at = coalesce(archived_at, now()),
      updated_at = now()
    where id = ${tournamentId}
  `;

  return { ok: true };
}

export async function createTournament({
  creatorUserId,
  title,
  description,
  sourcePoolId,
  sharingMode,
  playStyle,
  resultMode,
  tieBreakMode
}) {
  const sql = getDb();
  let poolCandidates = [];

  if (sourcePoolId) {
    poolCandidates = await sql`
      select
        c.id,
        c.name,
        i.display_order as "displayOrder"
      from candidate_pool p
      join candidate_pool_item i on i.pool_id = p.id
      join candidate c on c.id = i.candidate_id
      where p.id = ${sourcePoolId}
        and p.creator_user_id = ${creatorUserId}
      order by i.display_order nulls last, lower(c.name), c.created_at
    `;
  }

  const roundClosureMode =
    sharingMode === "private" ? "automatic_when_settled" : "manual";

  const tournament = await sql.begin(async (tx) => {
    const [createdTournament] = await tx`
      insert into tournament (
        creator_user_id,
        title,
        description,
        source_pool_id,
        sharing_mode,
        play_style,
        result_mode,
        tie_break_mode,
        round_closure_mode
      )
      values (
        ${creatorUserId},
        ${title},
        ${description ?? null},
        ${sourcePoolId},
        ${sharingMode},
        ${playStyle},
        ${resultMode},
        ${tieBreakMode},
        ${roundClosureMode}
      )
      returning id
    `;

    for (const [index, candidate] of poolCandidates.entries()) {
      await tx`
        insert into tournament_entry (tournament_id, candidate_id, seed)
        values (${createdTournament.id}, ${candidate.id}, ${index + 1})
      `;
    }

    return createdTournament;
  });

  return getTournamentById({
    tournamentId: tournament.id,
    creatorUserId
  });
}

export async function createTournamentRerun({ tournamentId, creatorUserId }) {
  const sql = getDb();
  const sourceTournament = await getTournamentById({
    tournamentId,
    creatorUserId
  });

  const nextTitle = sourceTournament.title.endsWith(" Rerun")
    ? sourceTournament.title
    : `${sourceTournament.title} Rerun`;

  const rerunTournament = await sql.begin(async (tx) => {
    const [createdTournament] = await tx`
      insert into tournament (
        creator_user_id,
        title,
        description,
        source_pool_id,
        sharing_mode,
        play_style,
        result_mode,
        tie_break_mode,
        round_closure_mode,
        status
      )
      values (
        ${creatorUserId},
        ${nextTitle},
        ${sourceTournament.description ?? null},
        ${sourceTournament.sourcePoolId},
        ${sourceTournament.sharingMode},
        ${sourceTournament.playStyle},
        ${sourceTournament.resultMode},
        ${sourceTournament.tieBreakMode},
        ${sourceTournament.roundClosureMode},
        'draft'
      )
      returning id
    `;

    for (const entry of sourceTournament.entries) {
      await tx`
        insert into tournament_entry (tournament_id, candidate_id, seed)
        values (${createdTournament.id}, ${entry.candidateId}, ${entry.seed})
      `;
    }

    return createdTournament;
  });

  return getTournamentById({
    tournamentId: rerunTournament.id,
    creatorUserId
  });
}

export async function updateTournament({ tournamentId, creatorUserId, patch }) {
  const sql = getDb();
  const current = await getTournamentById({ tournamentId, creatorUserId });
  const shouldCloseCurrentRound = patch.closeCurrentRound === true;
  const shouldSyncWithPool = patch.syncWithPool === true;
  const nextTitle = Object.hasOwn(patch, "title") ? patch.title : current.title;
  const nextDescription = Object.hasOwn(patch, "description")
    ? patch.description ?? null
    : current.description ?? null;
  const nextSourcePoolId = Object.hasOwn(patch, "sourcePoolId")
    ? patch.sourcePoolId ?? null
    : current.sourcePoolId ?? null;
  const nextSharingMode = Object.hasOwn(patch, "sharingMode")
    ? patch.sharingMode
    : current.sharingMode;
  const nextPlayStyle = Object.hasOwn(patch, "playStyle") ? patch.playStyle : current.playStyle;
  const nextResultMode = Object.hasOwn(patch, "resultMode") ? patch.resultMode : current.resultMode;
  const nextTieBreakMode = Object.hasOwn(patch, "tieBreakMode")
    ? patch.tieBreakMode
    : current.tieBreakMode;
  const nextRoundClosureMode =
    nextSharingMode === "private" ? "automatic_when_settled" : "manual";

  if (shouldCloseCurrentRound) {
    await sql.begin(async (tx) => {
      await closeCurrentRound({
        tx,
        tournamentId,
        creatorUserId
      });
    });

    return getTournamentById({ tournamentId, creatorUserId });
  }

  if (shouldSyncWithPool) {
    if (current.status !== "draft") {
      throw new Error("TOURNAMENT_SEEDING_LOCKED");
    }

    let addedEntryCount = 0;

    await sql.begin(async (tx) => {
      const poolCandidates = await tx`
        select
          c.id,
          i.display_order as "displayOrder"
        from candidate_pool p
        join candidate_pool_item i on i.pool_id = p.id
        join candidate c on c.id = i.candidate_id
        where p.id = ${current.sourcePoolId}
          and p.creator_user_id = ${creatorUserId}
        order by i.display_order nulls last, lower(c.name), c.created_at
      `;

      const existingEntries = await tx`
        select candidate_id as "candidateId", seed
        from tournament_entry
        where tournament_id = ${tournamentId}
        order by seed asc
      `;

      const existingCandidateIds = new Set(existingEntries.map((entry) => entry.candidateId));
      const missingCandidates = poolCandidates.filter(
        (candidate) => !existingCandidateIds.has(candidate.id)
      );
      addedEntryCount = missingCandidates.length;

      let nextSeed = existingEntries.length + 1;

      for (const candidate of missingCandidates) {
        await tx`
          insert into tournament_entry (tournament_id, candidate_id, seed)
          values (${tournamentId}, ${candidate.id}, ${nextSeed})
        `;
        nextSeed += 1;
      }

      await tx`
        update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          sharing_mode = ${nextSharingMode},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          round_closure_mode = ${nextRoundClosureMode},
          updated_at = now()
        where id = ${tournamentId}
      `;
    });

    const syncedTournament = await getTournamentById({ tournamentId, creatorUserId });

    return {
      ...syncedTournament,
      syncAddedCount: addedEntryCount
    };
  }

  const shouldReplaceSource =
    Object.hasOwn(patch, "sourcePoolId") ||
    Object.hasOwn(patch, "sharingMode") ||
    Object.hasOwn(patch, "playStyle") ||
    Object.hasOwn(patch, "resultMode") ||
    Object.hasOwn(patch, "tieBreakMode");

  if (shouldReplaceSource) {
    if (current.status !== "draft") {
      throw new Error("TOURNAMENT_SEEDING_LOCKED");
    }

    await sql.begin(async (tx) => {
      let nextPoolCandidates = [];

      if (nextSourcePoolId) {
        nextPoolCandidates = await tx`
          select
            c.id,
            i.display_order as "displayOrder"
          from candidate_pool p
          join candidate_pool_item i on i.pool_id = p.id
          join candidate c on c.id = i.candidate_id
          where p.id = ${nextSourcePoolId}
            and p.creator_user_id = ${creatorUserId}
          order by i.display_order nulls last, lower(c.name), c.created_at
        `;
      }

      if (Object.hasOwn(patch, "sourcePoolId")) {
        await tx`
          delete from tournament_entry
          where tournament_id = ${tournamentId}
        `;

        for (const [index, candidate] of nextPoolCandidates.entries()) {
          await tx`
            insert into tournament_entry (tournament_id, candidate_id, seed)
            values (${tournamentId}, ${candidate.id}, ${index + 1})
          `;
        }
      }

      await tx`
        update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          source_pool_id = ${nextSourcePoolId},
          sharing_mode = ${nextSharingMode},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          round_closure_mode = ${nextRoundClosureMode},
          updated_at = now()
        where id = ${tournamentId}
      `;
    });

    return getTournamentById({ tournamentId, creatorUserId });
  }

  if (Object.hasOwn(patch, "status")) {
    const nextStatus = patch.status;

    if (nextStatus === current.status) {
      return current;
    }

    const allowedTransitions = {
      draft: ["active"],
      active: ["complete"],
      complete: []
    };

    if (!allowedTransitions[current.status]?.includes(nextStatus)) {
      throw new Error("INVALID_TOURNAMENT_STATUS_TRANSITION");
    }

    if (nextStatus === "active") {
      await sql.begin(async (tx) => {
        await ensureInitialRoundGenerated(tx, tournamentId);

        if (nextSharingMode === "with_friends") {
          await tx`
            update tournament_invite
            set status = 'locked'
            where tournament_id = ${tournamentId}
          `;
        }

        await tx`
          update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          source_pool_id = ${nextSourcePoolId},
          sharing_mode = ${nextSharingMode},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          round_closure_mode = ${nextRoundClosureMode},
          status = 'active',
          started_at = coalesce(started_at, now()),
          updated_at = now()
          where id = ${tournamentId}
        `;
      });
    } else if (nextStatus === "complete") {
      await sql`
        update tournament
        set
          title = ${nextTitle},
          description = ${nextDescription},
          source_pool_id = ${nextSourcePoolId},
          sharing_mode = ${nextSharingMode},
          play_style = ${nextPlayStyle},
          result_mode = ${nextResultMode},
          tie_break_mode = ${nextTieBreakMode},
          round_closure_mode = ${nextRoundClosureMode},
          status = 'complete',
          completed_at = coalesce(completed_at, now()),
          updated_at = now()
        where id = ${tournamentId}
      `;
    }
  } else {
    await sql`
      update tournament
      set
        title = ${nextTitle},
        description = ${nextDescription},
        source_pool_id = ${nextSourcePoolId},
        sharing_mode = ${nextSharingMode},
        play_style = ${nextPlayStyle},
        result_mode = ${nextResultMode},
        tie_break_mode = ${nextTieBreakMode},
        round_closure_mode = ${nextRoundClosureMode},
        updated_at = now()
      where id = ${tournamentId}
    `;
  }

  return getTournamentById({ tournamentId, creatorUserId });
}

export async function updateTournamentEntries({
  tournamentId,
  creatorUserId,
  entryIds
}) {
  const sql = getDb();
  const tournament = await getTournamentById({ tournamentId, creatorUserId });

  if (tournament.status !== "draft") {
    throw new Error("TOURNAMENT_SEEDING_LOCKED");
  }

  const currentEntryIds = tournament.entries.map((entry) => entry.id);

  if (entryIds.length !== currentEntryIds.length) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  const nextEntryIds = [...new Set(entryIds)];

  if (nextEntryIds.length !== currentEntryIds.length) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  const currentEntryIdSet = new Set(currentEntryIds);
  const hasUnexpectedEntry = nextEntryIds.some((entryId) => !currentEntryIdSet.has(entryId));

  if (hasUnexpectedEntry) {
    throw new Error("INVALID_TOURNAMENT_ENTRIES");
  }

  await sql.begin(async (tx) => {
    for (const [index, entryId] of nextEntryIds.entries()) {
      await tx`
        update tournament_entry
        set
          seed = ${1000 + index + 1}
        where id = ${entryId}
          and tournament_id = ${tournamentId}
      `;
    }

    for (const [index, entryId] of nextEntryIds.entries()) {
      await tx`
        update tournament_entry
        set
          seed = ${index + 1}
        where id = ${entryId}
          and tournament_id = ${tournamentId}
      `;
    }

    await tx`
      update tournament
      set updated_at = now()
      where id = ${tournamentId}
    `;
  });

  return getTournamentById({ tournamentId, creatorUserId });
}

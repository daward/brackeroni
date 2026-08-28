// @ts-nocheck
import { getDb } from "@/lib/db";
import { getParallelTournamentSchemaSupport } from "@/lib/brackets/internal/tournament-schema-support";
import { parseSeedingStructure } from "@/lib/brackets/engine/seeding-structure";

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
      t.visibility,
      t.voting_access as "votingAccess",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.advancement_mode as "advancementMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.seeding_structure as "seedingStructure",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      active_round."activeRoundNumber",
      coalesce(active_round."openMatchCount", 0)::integer as "activeRoundOpenMatchCount",
      coalesce(open_votes."openVoteCount", 0)::integer as "openVoteCount",
      exists (
        select 1
        from tournament_round hidden_round
        where hidden_round.tournament_id = t.id
          and hidden_round.status = 'closed'
          and hidden_round.revealed_at is null
      ) as "hasHiddenClosedRounds",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
    left join candidate_pool p on p.id = t.source_pool_id
    left join lateral (
      select
        r.sequence_number::integer as "activeRoundNumber",
        count(*) filter (where m.status = 'open')::integer as "openMatchCount"
      from tournament_round r
      join match m on m.round_id = r.id
      where r.tournament_id = t.id
        and r.status = 'active'
      group by r.id, r.sequence_number
      order by r.sequence_number desc
      limit 1
    ) active_round on true
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
      coalesce(e.subseed, 0) as "subSeed",
      e.final_rank as "finalRank",
      c.id as "candidateId",
      c.name as "candidateName",
      c.description as "candidateDescription",
      c.image_url as "candidateImageUrl"
    from tournament_entry e
    join candidate c on c.id = e.candidate_id
    where e.tournament_id = ${tournamentId}
    order by e.seed asc, coalesce(e.subseed, 0) asc
  `;

  return {
    id: tournament.id,
    creatorUserId: tournament.creatorUserId,
    title: tournament.title,
    description: tournament.description,
    sourcePoolId: tournament.sourcePoolId,
    sourcePoolName: tournament.sourcePoolName,
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    advancementMode: tournament.advancementMode,
    status: tournament.status,
    roundClosureMode: tournament.roundClosureMode,
    seedingStructure: parseSeedingStructure(tournament.seedingStructure),
    parentParallelTournamentId: tournament.parentParallelTournamentId,
    lastVoteAt: tournament.lastVoteAt,
    startedAt: tournament.startedAt,
    completedAt: tournament.completedAt,
    archivedAt: tournament.archivedAt,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    activeRoundNumber: tournament.activeRoundNumber,
    activeRoundOpenMatchCount: tournament.activeRoundOpenMatchCount,
    openVoteCount: tournament.openVoteCount,
    winnerEntryId: tournament.winnerEntryId,
    winnerName: tournament.winnerName,
    winnerSeed: tournament.winnerSeed,
    entries
  };
}

export async function getAccessibleTournamentById({
  tournamentId,
  userId,
  anonymousVoterToken = null
}) {
  const sql = getDb();
  const { hasParallelTournamentParticipantTable } = await getParallelTournamentSchemaSupport(sql);
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  const participantJoin = hasParallelTournamentParticipantTable
    ? sql`
        left join parallel_tournament_participant parallel_participant
          on parallel_participant.tournament_id = t.id
         and (
           (${userId}::uuid is not null and parallel_participant.user_id = ${userId}::uuid)
           or (
             ${typedAnonymousVoterToken}::text is not null
             and parallel_participant.anonymous_voter_token = ${typedAnonymousVoterToken}::text
           )
         )
      `
    : sql``;

  const participantAccessClause = hasParallelTournamentParticipantTable
    ? sql`or parallel_participant.id is not null`
    : sql``;

  const [tournament] = await sql`
    select
      t.id,
      t.creator_user_id as "creatorUserId",
      t.title,
      t.description,
      t.source_pool_id as "sourcePoolId",
      p.name as "sourcePoolName",
      t.sharing_mode as "sharingMode",
      t.visibility,
      t.voting_access as "votingAccess",
      t.play_style as "playStyle",
      t.result_mode as "resultMode",
      t.tie_break_mode as "tieBreakMode",
      t.advancement_mode as "advancementMode",
      t.status,
      t.round_closure_mode as "roundClosureMode",
      t.seeding_structure as "seedingStructure",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.last_vote_at as "lastVoteAt",
      t.started_at as "startedAt",
      t.completed_at as "completedAt",
      t.archived_at as "archivedAt",
      t.created_at as "createdAt",
      t.updated_at as "updatedAt",
      active_round."activeRoundNumber",
      coalesce(active_round."openMatchCount", 0)::integer as "activeRoundOpenMatchCount",
      coalesce(open_votes."openVoteCount", 0)::integer as "openVoteCount",
      exists (
        select 1
        from tournament_round hidden_round
        where hidden_round.tournament_id = t.id
          and hidden_round.status = 'closed'
          and hidden_round.revealed_at is null
      ) as "hasHiddenClosedRounds",
      coalesce(ranked_winner.id, winner.id) as "winnerEntryId",
      coalesce(ranked_winner.name, winner.name) as "winnerName",
      coalesce(ranked_winner.seed, winner.seed) as "winnerSeed"
    from tournament t
      left join candidate_pool p on p.id = t.source_pool_id
      left join tournament_invite invite
        on invite.tournament_id = t.id
       and invite.user_id = ${userId}
      ${participantJoin}
      left join lateral (
        select
          r.sequence_number::integer as "activeRoundNumber",
          count(*) filter (where m.status = 'open')::integer as "openMatchCount"
        from tournament_round r
        join match m on m.round_id = r.id
        where r.tournament_id = t.id
          and r.status = 'active'
        group by r.id, r.sequence_number
        order by r.sequence_number desc
        limit 1
      ) active_round on true
      left join lateral (
        select count(*)::integer as "openVoteCount"
        from match m
        left join vote user_vote
          on user_vote.match_id = m.id
         and (
           (${userId}::uuid is not null and user_vote.user_id = ${userId}::uuid)
           or (
             ${typedAnonymousVoterToken}::text is not null
             and user_vote.anonymous_voter_token = ${typedAnonymousVoterToken}::text
           )
         )
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
    where t.id = ${tournamentId}
      and t.archived_at is null
      and (
        t.visibility in ('public_listed', 'public_unlisted')
        or t.creator_user_id = ${userId}
        or invite.user_id is not null
        ${participantAccessClause}
      )
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  const canInspectAllProgress = Boolean(userId && tournament.creatorUserId === userId);
  const shouldHideUnrevealedResults =
    !canInspectAllProgress && Boolean(tournament.hasHiddenClosedRounds);

  const entries = await sql`
    select
      e.id,
      e.seed,
      coalesce(e.subseed, 0) as "subSeed",
      case
        when ${shouldHideUnrevealedResults} then null
        else e.final_rank
      end as "finalRank",
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
    creatorUserId: tournament.creatorUserId,
    title: tournament.title,
    description: tournament.description,
    sourcePoolId: tournament.sourcePoolId,
    sourcePoolName: tournament.sourcePoolName,
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    advancementMode: tournament.advancementMode,
    status: tournament.status,
    roundClosureMode: tournament.roundClosureMode,
    seedingStructure: parseSeedingStructure(tournament.seedingStructure),
    parentParallelTournamentId: tournament.parentParallelTournamentId,
    lastVoteAt: tournament.lastVoteAt,
    startedAt: tournament.startedAt,
    completedAt: tournament.completedAt,
    archivedAt: tournament.archivedAt,
    createdAt: tournament.createdAt,
    updatedAt: tournament.updatedAt,
    activeRoundNumber: tournament.activeRoundNumber,
    activeRoundOpenMatchCount: tournament.activeRoundOpenMatchCount,
    openVoteCount: tournament.openVoteCount,
    winnerEntryId: shouldHideUnrevealedResults ? null : tournament.winnerEntryId,
    winnerName: shouldHideUnrevealedResults ? null : tournament.winnerName,
    winnerSeed: shouldHideUnrevealedResults ? null : tournament.winnerSeed,
    entries
  };
}


// @ts-nocheck
import { getDb } from "@/lib/db";
import { getCandidateSchemaSupport } from "@/lib/shared-data/candidate-schema";
import { ensureInitialRoundGenerated } from "@/lib/brackets/internal/tournament-rounds";
import { usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import { parseSeedingStructure } from "@/lib/brackets/engine/seeding-structure";
import {
  assertTournamentAccess,
  hasParallelParticipantSupport,
} from "@/lib/brackets/internal/tournament-access-service";

function getMatchSubBracketName(match, seedingStructure = {}) {
  const subBrackets = Array.isArray(seedingStructure.subBrackets)
    ? seedingStructure.subBrackets
    : [];
  const entryBrackets =
    seedingStructure.entryBrackets &&
    typeof seedingStructure.entryBrackets === "object"
      ? seedingStructure.entryBrackets
      : {};
  const subBracketNameById = new Map(
    subBrackets.map((subBracket) => [subBracket.id, subBracket.name || ""]),
  );
  const pairKey = typeof match.pairKey === "string" ? match.pairKey : "";
  const pairKeyMatch = pairKey.match(/^group-(.+?)-round-/);

  if (pairKeyMatch) {
    return subBracketNameById.get(pairKeyMatch[1]) || null;
  }

  const bracketIds = [match.leftEntryId, match.rightEntryId]
    .filter(Boolean)
    .map((entryId) => entryBrackets[entryId] || null)
    .filter(Boolean);

  if (bracketIds.length === 0) {
    return null;
  }

  const firstBracketId = bracketIds[0];
  if (!bracketIds.every((bracketId) => bracketId === firstBracketId)) {
    return null;
  }

  return subBracketNameById.get(firstBracketId) || null;
}

export async function listMatchesForTournament({
  tournamentId,
  creatorUserId,
  userId = null,
  anonymousVoterToken = null,
}) {
  const sql = getDb();
  const candidateSupport = await getCandidateSchemaSupport(sql);
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;

  const tournament = await getTournamentAccess({
    tournamentId,
    userId,
    anonymousVoterToken,
    creatorUserId,
    mode: "read",
  });

  if (tournament.status === "active") {
    await sql.begin(async (tx) => {
      await ensureInitialRoundGenerated(tx, tournamentId);
    });
  }

  const matches = await sql`
    select
      m.id,
      m.pair_key as "pairKey",
      m.status,
      m.resolution_source as "resolutionSource",
      m.winner_entry_id as "winnerEntryId",
      r.id as "roundId",
      r.sequence_number as "roundNumber",
      r.status as "roundStatus",
      r.closed_at as "roundClosedAt",
      r.revealed_at as "roundRevealedAt",
      r.ranking_target_rank as "rankingTargetRank",
      dense_rank() over (
        partition by r.ranking_target_rank
        order by r.sequence_number asc
      ) as "rankingRoundNumber",
      left_entry.id as "leftEntryId",
      left_entry.seed as "leftSeed",
      left_candidate.name as "leftName",
      left_candidate.description as "leftDescription",
      left_candidate.image_url as "leftImageUrl",
      ${candidateSupport.hasTags ? sql`left_candidate.tags` : sql`'{}'::text[]`} as "leftTags",
      coalesce(left_votes."voteCount", 0)::integer as "leftVoteCount",
      right_entry.id as "rightEntryId",
      right_entry.seed as "rightSeed",
      right_candidate.name as "rightName",
      right_candidate.description as "rightDescription",
      right_candidate.image_url as "rightImageUrl",
      ${candidateSupport.hasTags ? sql`right_candidate.tags` : sql`'{}'::text[]`} as "rightTags",
      coalesce(right_votes."voteCount", 0)::integer as "rightVoteCount",
      user_vote.selected_entry_id as "userVoteEntryId"
    from match m
    join tournament t on t.id = m.tournament_id
    join tournament_round r on r.id = m.round_id
    left join tournament_entry left_entry on left_entry.id = m.left_entry_id
    left join candidate left_candidate on left_candidate.id = left_entry.candidate_id
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.left_entry_id
    ) left_votes on true
    left join tournament_entry right_entry on right_entry.id = m.right_entry_id
    left join candidate right_candidate on right_candidate.id = right_entry.candidate_id
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.right_entry_id
    ) right_votes on true
    left join vote user_vote
      on user_vote.match_id = m.id
     and (
       (${typedUserId}::uuid is not null and user_vote.user_id = ${typedUserId}::uuid)
       or (
         ${typedAnonymousVoterToken}::text is not null
         and user_vote.anonymous_voter_token = ${typedAnonymousVoterToken}::text
       )
     )
    where m.tournament_id = ${tournamentId}
      and (
        t.creator_user_id = ${userId}
        or r.status = 'active'
        or r.revealed_at is not null
      )
    order by
      r.sequence_number asc,
      case when m.right_entry_id is null then 1 else 0 end asc,
      left_entry.seed asc nulls last,
      right_entry.seed desc nulls last,
      m.created_at asc
  `;
  const seedingStructure = parseSeedingStructure(tournament.seedingStructure);

  return {
    tournament,
    matches: matches.map((match) => {
      const shouldHideOpenTallies =
        match.status === "open" &&
        tournament.sharingMode !== "private" &&
        tournament.creatorUserId !== userId;

      return {
        ...match,
        subBracketName: getMatchSubBracketName(match, seedingStructure),
        leftVoteCount: shouldHideOpenTallies ? null : match.leftVoteCount,
        rightVoteCount: shouldHideOpenTallies ? null : match.rightVoteCount,
      };
    }),
  };
}

export async function listTournamentVoterScores({
  tournament,
  userId = null,
  anonymousVoterToken = null,
  includeVoteHistory = false,
}) {
  if (!tournament?.id) {
    return {
      canInspectAllScores: false,
      scores: [],
    };
  }

  const isPrivateOrFriends =
    tournament.visibility === "private" ||
    tournament.sharingMode === "with_friends";

  if (!isPrivateOrFriends || tournament.parentParallelTournamentId) {
    return {
      canInspectAllScores: false,
      scores: [],
    };
  }

  const sql = getDb();
  const typedUserId = userId ?? null;
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;
  const scoringEnabled = !usesSwissResultMode(tournament.resultMode);
  const canInspectAllScores =
    tournament.sharingMode === "with_friends"
      ? Boolean(userId)
      : Boolean(userId && tournament.creatorUserId === userId);

  if (!canInspectAllScores && !typedUserId && !typedAnonymousVoterToken) {
    return {
      canInspectAllScores,
      scores: [],
      voteHistoryByVoterKey: {},
      scoringEnabled,
    };
  }

  const scoreRows = await sql`
    with visible_votes as (
      select
        case
          when v.user_id is not null then v.user_id::text
          else concat('anon:', v.anonymous_voter_token)
        end as "voterKey",
        v.user_id as "userId",
        v.anonymous_voter_token as "anonymousVoterToken",
        coalesce(u.name, u.email, 'Anonymous voter') as name,
        u.email,
        r.sequence_number::integer as "roundNumber",
        (v.selected_entry_id = m.winner_entry_id) as correct
      from vote v
      join match m on m.id = v.match_id
      join tournament_round r on r.id = m.round_id
      left join app_user u on u.id = v.user_id
      where m.tournament_id = ${tournament.id}
        and m.winner_entry_id is not null
        and (
          ${canInspectAllScores}
          or (${typedUserId}::uuid is not null and v.user_id = ${typedUserId}::uuid)
          or (
            ${typedAnonymousVoterToken}::text is not null
            and v.anonymous_voter_token = ${typedAnonymousVoterToken}::text
          )
        )
        and (
          ${canInspectAllScores}
          or r.status = 'active'
          or r.revealed_at is not null
        )
    )
    select
      "voterKey",
      "userId",
      "anonymousVoterToken",
      name,
      email,
      count(*)::integer as "totalPicks",
      count(*) filter (where correct)::integer as "correctPicks",
      ${
        scoringEnabled
          ? sql`coalesce(sum(case when correct then power("roundNumber", 2) else 0 end), 0)::integer`
          : sql`null::integer`
      } as score
    from visible_votes
    group by "voterKey", "userId", "anonymousVoterToken", name, email
    order by
      score desc,
      count(*) filter (where correct) desc,
      count(*) desc,
      min(name) asc
  `;

  const scores = scoreRows.map((row) => {
    const totalPicks = row.totalPicks ?? 0;
    const correctPicks = row.correctPicks ?? 0;

    return {
      voterKey: row.voterKey,
      userId: row.userId,
      anonymousVoterToken: row.anonymousVoterToken,
      name: row.name,
      email: row.email,
      totalPicks,
      correctPicks,
      incorrectPicks: Math.max(totalPicks - correctPicks, 0),
      score: row.score ?? 0,
      winPercentage: totalPicks > 0 ? correctPicks / totalPicks : 0,
      isCurrentViewer: typedUserId
        ? row.userId === typedUserId
        : Boolean(
            typedAnonymousVoterToken &&
            row.anonymousVoterToken === typedAnonymousVoterToken,
          ),
    };
  });

  if (!includeVoteHistory) {
    return {
      canInspectAllScores,
      scores,
      voteHistoryByVoterKey: {},
      scoringEnabled,
    };
  }

  const voteRows = await sql`
    select
      case
        when v.user_id is not null then v.user_id::text
        else concat('anon:', v.anonymous_voter_token)
      end as "voterKey",
      r.sequence_number::integer as "roundNumber",
      r.ranking_target_rank as "rankingTargetRank",
      dense_rank() over (
        partition by r.ranking_target_rank
        order by r.sequence_number asc
      ) as "rankingRoundNumber",
      m.id as "matchId",
      m.winner_entry_id as "winnerEntryId",
      left_entry.id as "leftEntryId",
      right_entry.id as "rightEntryId",
      left_entry.seed as "leftSeed",
      right_entry.seed as "rightSeed",
      left_candidate.name as "leftName",
      right_candidate.name as "rightName",
      selected_entry.id as "selectedEntryId",
      selected_entry.seed as "selectedSeed",
      selected_candidate.name as "selectedName",
      winner_entry.seed as "winnerSeed",
      winner_candidate.name as "winnerName",
      (v.selected_entry_id = m.winner_entry_id) as correct,
      case
        when ${scoringEnabled} and v.selected_entry_id = m.winner_entry_id then power(r.sequence_number::integer, 2)
        when ${scoringEnabled} then 0
        else null
      end::integer as "pointsEarned"
    from vote v
    join match m on m.id = v.match_id
    join tournament_round r on r.id = m.round_id
    left join tournament_entry left_entry on left_entry.id = m.left_entry_id
    left join candidate left_candidate on left_candidate.id = left_entry.candidate_id
    left join tournament_entry right_entry on right_entry.id = m.right_entry_id
    left join candidate right_candidate on right_candidate.id = right_entry.candidate_id
    left join tournament_entry selected_entry on selected_entry.id = v.selected_entry_id
    left join candidate selected_candidate on selected_candidate.id = selected_entry.candidate_id
    left join tournament_entry winner_entry on winner_entry.id = m.winner_entry_id
    left join candidate winner_candidate on winner_candidate.id = winner_entry.candidate_id
    where m.tournament_id = ${tournament.id}
      and m.winner_entry_id is not null
      and (
        ${canInspectAllScores}
        or (${typedUserId}::uuid is not null and v.user_id = ${typedUserId}::uuid)
        or (
          ${typedAnonymousVoterToken}::text is not null
          and v.anonymous_voter_token = ${typedAnonymousVoterToken}::text
        )
      )
      and (
        ${canInspectAllScores}
        or r.status = 'active'
        or r.revealed_at is not null
      )
    order by
      r.sequence_number desc,
      m.created_at asc
  `;

  const voteHistoryByVoterKey = voteRows.reduce((map, row) => {
    const existing = map[row.voterKey] || [];
    const selectedIsLeft = row.selectedEntryId === row.leftEntryId;

    existing.push({
      matchId: row.matchId,
      roundNumber: row.roundNumber,
      rankingTargetRank: row.rankingTargetRank,
      rankingRoundNumber: row.rankingRoundNumber,
      selectedEntryId: row.selectedEntryId,
      selectedName: row.selectedName,
      selectedSeed: row.selectedSeed,
      opponentName: selectedIsLeft ? row.rightName : row.leftName,
      opponentSeed: selectedIsLeft ? row.rightSeed : row.leftSeed,
      winnerEntryId: row.winnerEntryId,
      winnerName: row.winnerName,
      winnerSeed: row.winnerSeed,
      correct: Boolean(row.correct),
      pointsEarned: row.pointsEarned ?? 0,
    });
    map[row.voterKey] = existing;
    return map;
  }, {});

  return {
    canInspectAllScores,
    scores,
    voteHistoryByVoterKey,
    scoringEnabled,
  };
}

export async function getTournamentAccess({
  tournamentId,
  userId = null,
  anonymousVoterToken = null,
  creatorUserId,
  mode = "read",
}) {
  const sql = getDb();
  const parallelParticipantSupport = await hasParallelParticipantSupport(sql);
  const typedAnonymousVoterToken = anonymousVoterToken ?? null;
  const participantJoin = parallelParticipantSupport
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

  const [tournament] = await sql`
    select
      t.id,
      t.title,
      t.sharing_mode as "sharingMode",
      t.visibility,
      t.voting_access as "votingAccess",
      t.advancement_mode as "advancementMode",
      t.round_closure_mode as "roundClosureMode",
      t.status,
      t.creator_user_id as "creatorUserId",
      t.parent_parallel_tournament_id as "parentParallelTournamentId",
      t.seeding_structure as "seedingStructure"
    from tournament t
    ${participantJoin}
    where t.id = ${tournamentId}
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  await assertTournamentAccess({
    sql,
    tournamentId,
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    creatorUserId: creatorUserId ?? tournament.creatorUserId,
    userId,
    anonymousVoterToken,
    isParallelParticipantTournament: Boolean(
      tournament.parentParallelTournamentId,
    ),
    mode,
  });

  return tournament;
}

export async function setManualMatchWinner({
  matchId,
  creatorUserId,
  winnerEntryId,
}) {
  const sql = getDb();

  return sql.begin(async (tx) => {
    const [match] = await tx`
      select
        m.id,
        m.status,
        m.left_entry_id as "leftEntryId",
        m.right_entry_id as "rightEntryId",
        t.creator_user_id as "tournamentCreatorUserId",
        t.advancement_mode as "advancementMode",
        t.status as "tournamentStatus"
      from match m
      join tournament t on t.id = m.tournament_id
      where m.id = ${matchId}
      limit 1
    `;

    if (!match) {
      throw new Error("NOT_FOUND");
    }

    if (match.tournamentCreatorUserId !== creatorUserId) {
      throw new Error("FORBIDDEN");
    }

    if (match.tournamentStatus !== "active") {
      throw new Error("MATCH_WINNER_NOT_EDITABLE");
    }

    if (match.advancementMode !== "manual_winner" || match.status !== "open") {
      throw new Error("MATCH_WINNER_NOT_EDITABLE");
    }

    if (
      winnerEntryId !== null &&
      winnerEntryId !== match.leftEntryId &&
      winnerEntryId !== match.rightEntryId
    ) {
      throw new Error("INVALID_MATCH_SELECTION");
    }

    const [updatedMatch] = await tx`
      update match
      set
        winner_entry_id = ${winnerEntryId},
        resolution_source = ${winnerEntryId ? "manual_result" : null},
        updated_at = now()
      where id = ${matchId}
      returning
        id,
        winner_entry_id as "winnerEntryId",
        resolution_source as "resolutionSource"
    `;

    return updatedMatch;
  });
}

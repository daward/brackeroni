import { createRound } from "@/lib/data/tournaments";
import {
  buildNextRound,
  buildSwissRound,
  calculateSwissRoundCount
} from "@/lib/tournament/rounds";
import { resolveMatchWinner } from "@/lib/tournament/match-resolution";

async function markParallelParticipantComplete(tx, tournamentId) {
  await tx`
    update parallel_tournament_participant
    set
      status = 'complete',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where tournament_id = ${tournamentId}
  `;
}

export async function closeActiveRoundIfReady(
  tx,
  {
    tournamentId,
    roundId,
    playStyle,
    resultMode,
    tieBreakMode,
    roundClosureMode,
    sharingMode = null,
    force = false
  }
) {
  const [round] = await tx`
    select
      id,
      sequence_number as "sequenceNumber",
      ranking_target_rank as "rankingTargetRank",
      status
    from tournament_round
    where id = ${roundId}
      and tournament_id = ${tournamentId}
  `;

  if (!round || round.status !== "active") {
    return { advanced: false };
  }

  const matches = await tx`
    select
      m.id,
      m.status,
      m.left_entry_id as "leftEntryId",
      m.right_entry_id as "rightEntryId",
      m.winner_entry_id as "winnerEntryId",
      left_entry.seed as "leftSeed",
      right_entry.seed as "rightSeed",
      coalesce(left_votes."voteCount", 0)::integer as "leftVoteCount",
      coalesce(right_votes."voteCount", 0)::integer as "rightVoteCount"
    from match m
    left join tournament_entry left_entry on left_entry.id = m.left_entry_id
    left join tournament_entry right_entry on right_entry.id = m.right_entry_id
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.left_entry_id
    ) left_votes on true
    left join lateral (
      select count(*)::integer as "voteCount"
      from vote v
      where v.match_id = m.id
        and v.selected_entry_id = m.right_entry_id
    ) right_votes on true
    where m.round_id = ${roundId}
    order by m.created_at asc
  `;

  const openMatches = matches.filter((match) => match.status === "open");
  const effectiveRoundClosureMode =
    !force && sharingMode === "with_friends" && roundClosureMode === "manual"
      ? "all_votes_received"
      : roundClosureMode;

  if (!force) {
    if (effectiveRoundClosureMode === "automatic_when_settled") {
      if (openMatches.some((match) => match.leftVoteCount + match.rightVoteCount === 0)) {
        return { advanced: false };
      }
    } else if (effectiveRoundClosureMode === "all_votes_received") {
      const allParticipantVotesReceived = await hasAllParticipantVotesForRound(tx, {
        tournamentId,
        roundId,
        openMatchCount: openMatches.length
      });

      if (!allParticipantVotesReceived) {
        return { advanced: false };
      }
    } else {
      return { advanced: false };
    }
  }

  for (const match of openMatches) {
    const resolution = resolveMatchWinner(match, tieBreakMode);

    await tx`
      update match
      set
        status = 'closed',
        winner_entry_id = ${resolution.winnerEntryId},
        resolution_source = ${resolution.resolutionSource},
        updated_at = now()
      where id = ${match.id}
    `;
  }

  await tx`
    update tournament_round
    set
      status = 'closed',
      closed_at = coalesce(closed_at, now()),
      updated_at = now()
    where id = ${roundId}
  `;

  if (resultMode === "fast_full_rank") {
    return continueFastFullRankingProgress(tx, {
      tournamentId,
      round,
      tieBreakMode,
      roundClosureMode,
      sharingMode
    });
  }

  const advancingEntryIds = matches
    .map((match) => {
      if (match.status === "open") {
        return resolveMatchWinner(match, tieBreakMode).winnerEntryId;
      }

      return match.winnerEntryId;
    })
    .filter(Boolean);

  if (advancingEntryIds.length === 1) {
    if (resultMode === "full_ranking") {
      await tx`
        update tournament_entry
        set
          final_rank = case
            when id = ${advancingEntryIds[0]} then ${round.rankingTargetRank}
            else final_rank
          end,
          updated_at = now()
        where tournament_id = ${tournamentId}
      `;

      return continueFullRankingProgress(tx, {
        tournamentId,
        playStyle
      });
    }

    await tx`
      update tournament
      set
        status = 'complete',
        completed_at = coalesce(completed_at, now()),
        updated_at = now()
      where id = ${tournamentId}
    `;

    await markParallelParticipantComplete(tx, tournamentId);

    return { advanced: true, completed: true };
  }

  const advancingEntries = await tx`
    select id, seed
    from tournament_entry
    where tournament_id = ${tournamentId}
  `;

  const entryById = new Map(advancingEntries.map((entry) => [entry.id, entry]));
  const orderedEntries = advancingEntryIds.map((entryId) => entryById.get(entryId)).filter(Boolean);
  const nextSequenceNumber = round.sequenceNumber + 1;
  const existingNextRound = await tx`
    select id
    from tournament_round
    where tournament_id = ${tournamentId}
      and sequence_number = ${nextSequenceNumber}
    limit 1
  `;

  if (existingNextRound.length > 0) {
    return { advanced: true };
  }

  const nextRoundMatches = buildNextRound(orderedEntries, {
    playStyle,
    roundNumber: nextSequenceNumber
  });

  const resolvedMatches = await applyPriorResults(tx, {
    tournamentId,
    matches: nextRoundMatches
  });

  const nextRound = await createRound(tx, {
    tournamentId,
    sequenceNumber: nextSequenceNumber,
    matches: resolvedMatches,
    rankingTargetRank: round.rankingTargetRank
  });

  if (!resolvedMatches.some((match) => match.status === "open")) {
    return closeActiveRoundIfReady(tx, {
      tournamentId,
      roundId: nextRound.id,
      playStyle,
      resultMode,
      tieBreakMode,
      roundClosureMode,
      sharingMode
    });
  }

  return { advanced: true, completed: false };
}

export async function closeCurrentRound({ tx, tournamentId, creatorUserId }) {
  const [tournament] = await tx`
    select
      id,
      creator_user_id as "creatorUserId",
      sharing_mode as "sharingMode",
      play_style as "playStyle",
      result_mode as "resultMode",
      tie_break_mode as "tieBreakMode",
      round_closure_mode as "roundClosureMode",
      status
    from tournament
    where id = ${tournamentId}
  `;

  if (!tournament) {
    throw new Error("NOT_FOUND");
  }

  if (tournament.creatorUserId !== creatorUserId) {
    throw new Error("FORBIDDEN");
  }

  if (tournament.status !== "active") {
    throw new Error("ROUND_NOT_CLOSABLE");
  }

  const [activeRound] = await tx`
    select id
    from tournament_round
    where tournament_id = ${tournamentId}
      and status = 'active'
    order by sequence_number desc
    limit 1
  `;

  if (!activeRound) {
    throw new Error("ROUND_NOT_CLOSABLE");
  }

  const result = await closeActiveRoundIfReady(tx, {
    tournamentId,
    roundId: activeRound.id,
    sharingMode: tournament.sharingMode,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    roundClosureMode: tournament.roundClosureMode,
    force: true
  });

  if (!result.advanced) {
    throw new Error("ROUND_NOT_READY");
  }

  return result;
}

async function continueFastFullRankingProgress(
  tx,
  { tournamentId, round, tieBreakMode, roundClosureMode, sharingMode }
) {
  const entries = await tx`
    select id, seed
    from tournament_entry
    where tournament_id = ${tournamentId}
    order by seed asc
  `;

  const totalRounds = calculateSwissRoundCount(entries.length);

  if (round.sequenceNumber >= totalRounds) {
    return finalizeFastFullRankTournament(tx, { tournamentId, entries });
  }

  const priorMatches = await tx`
    select
      left_entry_id as "leftEntryId",
      right_entry_id as "rightEntryId",
      winner_entry_id as "winnerEntryId",
      resolution_source as "resolutionSource"
    from match
    where tournament_id = ${tournamentId}
      and winner_entry_id is not null
    order by created_at asc
  `;

  const standings = buildSwissStandings(entries, priorMatches);
  const standingsById = new Map(standings.map((entry) => [entry.id, entry]));
  const nextSequenceNumber = round.sequenceNumber + 1;
  const existingNextRound = await tx`
    select id
    from tournament_round
    where tournament_id = ${tournamentId}
      and sequence_number = ${nextSequenceNumber}
    limit 1
  `;

  if (existingNextRound.length > 0) {
    return { advanced: true, completed: false };
  }

  const nextRoundMatches = buildSwissRound(
    entries.map((entry) => ({
      ...entry,
      score: standingsById.get(entry.id)?.wins || 0,
      buchholz: standingsById.get(entry.id)?.buchholz || 0
    })),
    {
      roundNumber: nextSequenceNumber,
      priorMatches
    }
  );

  const nextRound = await createRound(tx, {
    tournamentId,
    sequenceNumber: nextSequenceNumber,
    matches: nextRoundMatches,
    rankingTargetRank: 1
  });

  if (!nextRoundMatches.some((match) => match.status === "open")) {
    return closeActiveRoundIfReady(tx, {
      tournamentId,
      roundId: nextRound.id,
      playStyle: "fixed_bracket",
      resultMode: "fast_full_rank",
      tieBreakMode,
      roundClosureMode,
      sharingMode
    });
  }

  return { advanced: true, completed: false };
}

async function finalizeFastFullRankTournament(tx, { tournamentId, entries }) {
  const completedMatches = await tx`
    select
      left_entry_id as "leftEntryId",
      right_entry_id as "rightEntryId",
      winner_entry_id as "winnerEntryId",
      resolution_source as "resolutionSource"
    from match
    where tournament_id = ${tournamentId}
      and winner_entry_id is not null
    order by created_at asc
  `;

  const standings = buildSwissStandings(entries, completedMatches);

  for (const [index, entry] of standings.entries()) {
    await tx`
      update tournament_entry
      set
        final_rank = ${index + 1},
        updated_at = now()
      where id = ${entry.id}
    `;
  }

  await tx`
    update tournament
    set
      status = 'complete',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
    where id = ${tournamentId}
  `;

  await markParallelParticipantComplete(tx, tournamentId);

  return { advanced: true, completed: true };
}

function buildSwissStandings(entries, matches) {
  const statsById = new Map(
    entries.map((entry) => [
      entry.id,
      {
        id: entry.id,
        seed: entry.seed,
        wins: 0,
        losses: 0,
        played: 0,
        opponents: []
      }
    ])
  );

  for (const match of matches) {
    if (match.leftEntryId && match.rightEntryId) {
      const left = statsById.get(match.leftEntryId);
      const right = statsById.get(match.rightEntryId);

      if (!left || !right) {
        continue;
      }

      left.played += 1;
      right.played += 1;
      left.opponents.push(right.id);
      right.opponents.push(left.id);

      if (match.winnerEntryId === left.id) {
        left.wins += 1;
        right.losses += 1;
      } else if (match.winnerEntryId === right.id) {
        right.wins += 1;
        left.losses += 1;
      }

      continue;
    }

    const byeWinnerId = match.leftEntryId || match.rightEntryId || match.winnerEntryId;
    const winner = statsById.get(byeWinnerId);

    if (winner) {
      winner.played += 1;
      winner.wins += 1;
    }
  }

  const enriched = [...statsById.values()].map((entry) => ({
    ...entry,
    buchholz: entry.opponents.reduce(
      (total, opponentId) => total + (statsById.get(opponentId)?.wins || 0),
      0
    )
  }));

  enriched.sort((left, right) => {
    if (left.wins !== right.wins) {
      return right.wins - left.wins;
    }

    if (left.buchholz !== right.buchholz) {
      return right.buchholz - left.buchholz;
    }

    if (left.played !== right.played) {
      return right.played - left.played;
    }

    return left.seed - right.seed;
  });

  return enriched;
}

async function continueFullRankingProgress(tx, { tournamentId, playStyle }) {
  while (true) {
    const entries = await tx`
      select id, seed, final_rank as "finalRank"
      from tournament_entry
      where tournament_id = ${tournamentId}
      order by seed asc
    `;

    const rankedEntries = entries.filter((entry) => entry.finalRank !== null);
    const unrankedEntries = entries.filter((entry) => entry.finalRank === null);

    if (unrankedEntries.length === 0) {
      await tx`
        update tournament
        set
          status = 'complete',
          completed_at = coalesce(completed_at, now()),
          updated_at = now()
        where id = ${tournamentId}
      `;

      await markParallelParticipantComplete(tx, tournamentId);

      return { advanced: true, completed: true };
    }

    const nextRank = rankedEntries.length + 1;
    const eligibleEntries = await getNextRankingEntries(tx, {
      tournamentId,
      rankedEntryIds: rankedEntries.map((entry) => entry.id)
    });

    if (eligibleEntries.length === 0) {
      const fallbackEntry = unrankedEntries[0];

    await tx`
      update tournament_entry
        set
          final_rank = ${nextRank},
          updated_at = now()
        where id = ${fallbackEntry.id}
      `;

      continue;
    }

    if (eligibleEntries.length === 1) {
      await tx`
        update tournament_entry
        set
          final_rank = ${nextRank},
          updated_at = now()
        where id = ${eligibleEntries[0].id}
      `;

      continue;
    }

    const [lastRound] = await tx`
      select sequence_number as "sequenceNumber"
      from tournament_round
      where tournament_id = ${tournamentId}
      order by sequence_number desc
      limit 1
    `;

    const nextSequenceNumber = (lastRound?.sequenceNumber ?? 0) + 1;
    const nextRoundMatches = buildNextRound(eligibleEntries, {
      playStyle,
      roundNumber: nextSequenceNumber
    });
    const resolvedMatches = await applyPriorResults(tx, {
      tournamentId,
      matches: nextRoundMatches
    });
    const nextRound = await createRound(tx, {
      tournamentId,
      sequenceNumber: nextSequenceNumber,
      matches: resolvedMatches,
      rankingTargetRank: nextRank
    });

    if (resolvedMatches.some((match) => match.status === "open")) {
      return { advanced: true, completed: false };
    }

    return closeActiveRoundIfReady(tx, {
      tournamentId,
      roundId: nextRound.id,
      playStyle,
      resultMode: "full_ranking",
      roundClosureMode: "automatic_when_settled"
    });
  }
}

async function hasAllParticipantVotesForRound(tx, { tournamentId, roundId, openMatchCount }) {
  if (openMatchCount === 0) {
    return true;
  }

  const [result] = await tx`
    with participants as (
      select creator_user_id as user_id
      from tournament
      where id = ${tournamentId}

      union

      select user_id
      from tournament_invite
      where tournament_id = ${tournamentId}
        and status = 'locked'
    )
    select coalesce(bool_and(coalesce(vote_counts."votesCast", 0) >= ${openMatchCount}), false) as ready
    from participants p
    left join lateral (
      select count(*)::integer as "votesCast"
      from vote v
      join match m on m.id = v.match_id
      where v.user_id = p.user_id
        and m.round_id = ${roundId}
        and m.status = 'open'
    ) vote_counts on true
  `;

  return Boolean(result?.ready);
}

async function getNextRankingEntries(tx, { tournamentId, rankedEntryIds }) {
  if (rankedEntryIds.length === 0) {
    return [];
  }

  return tx`
    select distinct
      candidate_entry.id,
      candidate_entry.seed
    from match m
    join tournament_entry ranked_entry on ranked_entry.id = m.winner_entry_id
    join tournament_entry candidate_entry
      on candidate_entry.id = case
        when m.left_entry_id = m.winner_entry_id then m.right_entry_id
        else m.left_entry_id
      end
    where m.tournament_id = ${tournamentId}
      and m.winner_entry_id in ${tx(rankedEntryIds)}
      and candidate_entry.final_rank is null
    order by candidate_entry.seed asc
  `;
}

async function applyPriorResults(tx, { tournamentId, matches }) {
  const priorResults = await tx`
    select distinct on (
      least(left_entry_id, right_entry_id),
      greatest(left_entry_id, right_entry_id)
    )
      left_entry_id as "leftEntryId",
      right_entry_id as "rightEntryId",
      winner_entry_id as "winnerEntryId"
    from match
    where tournament_id = ${tournamentId}
      and winner_entry_id is not null
      and left_entry_id is not null
      and right_entry_id is not null
    order by
      least(left_entry_id, right_entry_id),
      greatest(left_entry_id, right_entry_id),
      created_at desc
  `;

  const winnerByPair = new Map(
    priorResults.map((result) => [
      [result.leftEntryId, result.rightEntryId].sort().join(":"),
      result.winnerEntryId
    ])
  );

  return matches.map((match) => {
    if (!match.leftEntryId || !match.rightEntryId) {
      return match;
    }

    const pairKey = [match.leftEntryId, match.rightEntryId].sort().join(":");
    const priorWinnerId = winnerByPair.get(pairKey);

    if (!priorWinnerId) {
      return match;
    }

    return {
      ...match,
      status: "auto_resolved",
      resolutionSource: "prior_result",
      winnerEntryId: priorWinnerId
    };
  });
}

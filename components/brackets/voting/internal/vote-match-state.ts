import { isPartialRankingMode, usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/bracket-modes";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";

function nextPowerOfTwo(value: number) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

export function openMatchesForTournament(tournament: VoteTournament): VoteMatch[] {
  if (tournament.kind === "parallel_parent") {
    return tournament.status === "active" && tournament.viewerParticipantStatus !== "complete" ? [{ id: `parallel:${tournament.id}`, status: "open" }] : [];
  }

  return (tournament.matches || []).filter((match) => match.status === "open" && !match.userVoteEntryId);
}

function getTournamentRoundCount(tournament: VoteTournament) {
  const entryCount = tournament.entryCount ?? tournament.entries?.length ?? 0;

  if (entryCount <= 1) {
    return 0;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    const hardCap = entryCount - 1 + (entryCount % 2 === 1 ? 1 : 0);
    return Math.min(hardCap, Math.ceil(Math.log2(entryCount)) + 1);
  }

  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return null;
  }

  return Math.ceil(Math.log2(nextPowerOfTwo(entryCount)));
}

function getRankingTargetCount(tournament: VoteTournament) {
  const entryCount = tournament.entryCount ?? tournament.entries?.length ?? 0;
  if (entryCount <= 0) return 0;
  return isPartialRankingMode(tournament.resultMode) ? Math.ceil(entryCount / 2) : entryCount;
}

function getEliminationRoundCount(entryCount: number) {
  if (entryCount <= 1) return 0;
  return Math.ceil(Math.log2(nextPowerOfTwo(entryCount)));
}

function getRankingRoundCount(match: VoteMatch, tournament: VoteTournament) {
  const entryCount = tournament.entryCount ?? tournament.entries?.length ?? 0;

  if (match.rankingTargetRank === 1 && entryCount > 1) {
    return getEliminationRoundCount(entryCount);
  }

  const rankingEntryIds = new Set<string>();

  for (const candidateMatch of tournament.matches || []) {
    if (candidateMatch.rankingTargetRank !== match.rankingTargetRank) {
      continue;
    }

    if (candidateMatch.leftEntryId) {
      rankingEntryIds.add(candidateMatch.leftEntryId);
    }

    if (candidateMatch.rightEntryId) {
      rankingEntryIds.add(candidateMatch.rightEntryId);
    }
  }

  return getEliminationRoundCount(rankingEntryIds.size);
}

export function formatVoteHeader(match: VoteMatch, tournament: VoteTournament) {
  const totalRounds = getTournamentRoundCount(tournament);
  let roundLabel: string;

  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    const rankingTargetCount = getRankingTargetCount(tournament);
    const rankingLabel = rankingTargetCount ? `Ranking ${match.rankingTargetRank} of ${rankingTargetCount}` : `Ranking ${match.rankingTargetRank}`;
    const rankingRoundCount = getRankingRoundCount(match, tournament);
    const rankingRoundLabel = rankingRoundCount ? `Round ${match.rankingRoundNumber} of ${rankingRoundCount}` : `Round ${match.rankingRoundNumber}`;
    roundLabel = `${rankingLabel} / ${rankingRoundLabel}`;
  } else if (usesSwissResultMode(tournament.resultMode)) {
    roundLabel = totalRounds ? `Swiss Round ${match.roundNumber} of ${totalRounds}` : `Swiss Round ${match.roundNumber}`;
  } else {
    roundLabel = totalRounds ? `Round ${match.roundNumber} of ${totalRounds}` : `Round ${match.roundNumber}`;
  }

  return match.subBracketName ? `${roundLabel} / ${match.subBracketName}` : roundLabel;
}

export function getCurrentRoundProgress(tournament: VoteTournament | null, focusedMatch: VoteMatch | null) {
  if (!tournament || !focusedMatch) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const currentRoundMatches = (tournament.matches || []).filter(
    (match) => match.roundNumber === focusedMatch.roundNumber && match.leftEntryId && match.rightEntryId && match.status !== "auto_resolved",
  );
  const total = currentRoundMatches.length;

  if (total === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const completed = currentRoundMatches.filter((match) => Boolean(match.userVoteEntryId)).length;

  return {
    completed,
    total,
    percent: Math.max(0, Math.min((completed / total) * 100, 100)),
  };
}

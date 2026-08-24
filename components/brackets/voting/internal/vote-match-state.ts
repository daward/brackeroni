import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/bracket-modes";
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
    return tournament.status === "active" && tournament.viewerParticipantStatus !== "complete"
      ? [{ id: `parallel:${tournament.id}`, status: "open" }]
      : [];
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

export function formatVoteHeader(match: VoteMatch, tournament: VoteTournament) {
  const totalRounds = getTournamentRoundCount(tournament);
  let roundLabel: string;

  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    roundLabel = `Ranking ${match.rankingTargetRank} / Round ${match.rankingRoundNumber}`;
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
    (match) =>
      match.roundNumber === focusedMatch.roundNumber &&
      match.leftEntryId &&
      match.rightEntryId &&
      match.status !== "auto_resolved",
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

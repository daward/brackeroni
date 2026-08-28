import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import type { ResultTournament, VoteHistoryEntry } from "../types";

export function formatScoringRoundLabel(vote: VoteHistoryEntry, tournament: ResultTournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode) && vote.rankingTargetRank) {
    return `Rank ${vote.rankingTargetRank}.${vote.rankingRoundNumber}`;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    return `Swiss ${vote.roundNumber}`;
  }

  return String(vote.roundNumber);
}

export function formatWinPercentage(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

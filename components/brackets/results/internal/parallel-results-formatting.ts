import { usesOpenEndedRankingMode } from "@/lib/brackets/engine/result-modes";
import type { ResultMatch, ResultTournament } from "../types";

export function formatRank(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return value.toFixed(2).replace(/\.00$/, "");
}

export function formatSignedRankDiff(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

export function formatRoundLabel(match: ResultMatch, tournament: ResultTournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  return `Round ${match.roundNumber}`;
}

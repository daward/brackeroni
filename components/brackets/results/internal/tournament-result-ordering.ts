import type { ResultEntry, ResultMatch, ResultTournament } from "../types";
import { isVisibleHistoryMatch } from "./tournament-result-history";

export function getEntryRecordStats(matches: ResultMatch[], entryId: string) {
  const relevantMatches = matches.filter((match) => {
    return isVisibleHistoryMatch(match) && (match.left?.id === entryId || match.right?.id === entryId) && match.winnerEntryId;
  });
  const wins = relevantMatches.filter((match) => match.winnerEntryId === entryId).length;
  const losses = relevantMatches.length - wins;
  const played = relevantMatches.length;
  const winPct = played > 0 ? wins / played : 0;

  return {
    wins,
    losses,
    played,
    winPct,
  };
}

export function orderResultEntries(entries: ResultEntry[], matches: ResultMatch[], tournament: ResultTournament) {
  return [...entries].sort((left, right) => {
    if (tournament.resultMode === "winner_only") {
      const leftStats = getEntryRecordStats(matches, left.id);
      const rightStats = getEntryRecordStats(matches, right.id);

      if (left.id === tournament.winner?.id) {
        return -1;
      }

      if (right.id === tournament.winner?.id) {
        return 1;
      }

      if (leftStats.winPct !== rightStats.winPct) {
        return rightStats.winPct - leftStats.winPct;
      }

      if (leftStats.wins !== rightStats.wins) {
        return rightStats.wins - leftStats.wins;
      }

      if (leftStats.played !== rightStats.played) {
        return rightStats.played - leftStats.played;
      }
    }

    const leftRank = left.finalRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.finalRank ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.seed - right.seed;
  });
}

export function formatRecord(matches: ResultMatch[], entryId: string) {
  const { wins, losses } = getEntryRecordStats(matches, entryId);
  return `${wins}-${losses}`;
}

export function getDisplayRank(entry: ResultEntry | null, orderedEntries: ResultEntry[], fallbackIndex = 0) {
  if (entry?.finalRank) {
    return entry.finalRank;
  }

  const orderedIndex = orderedEntries.findIndex((candidate) => candidate.id === entry?.id);
  return (orderedIndex >= 0 ? orderedIndex : fallbackIndex) + 1;
}

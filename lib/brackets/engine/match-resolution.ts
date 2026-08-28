import type { BracketTieBreakMode } from "@/lib/brackets/types";

export type ResolvableMatch = {
  leftEntryId?: string | null;
  rightEntryId?: string | null;
  leftSeed?: number | null;
  rightSeed?: number | null;
  leftVoteCount?: number | null;
  rightVoteCount?: number | null;
};

export type MatchResolution = {
  winnerEntryId: string | null | undefined;
  resolutionSource: "bye" | "vote" | "tie_break";
};

export function resolveMatchWinner(match: ResolvableMatch, tieBreakMode: BracketTieBreakMode | string): MatchResolution {
  if (!match.leftEntryId) {
    return {
      winnerEntryId: match.rightEntryId,
      resolutionSource: "bye"
    };
  }

  if (!match.rightEntryId) {
    return {
      winnerEntryId: match.leftEntryId,
      resolutionSource: "bye"
    };
  }

  const leftVoteCount = match.leftVoteCount ?? 0;
  const rightVoteCount = match.rightVoteCount ?? 0;

  if (leftVoteCount > rightVoteCount) {
    return {
      winnerEntryId: match.leftEntryId,
      resolutionSource: "vote"
    };
  }

  if (rightVoteCount > leftVoteCount) {
    return {
      winnerEntryId: match.rightEntryId,
      resolutionSource: "vote"
    };
  }

  if (tieBreakMode === "random") {
    return {
      winnerEntryId: Math.random() < 0.5 ? match.leftEntryId : match.rightEntryId,
      resolutionSource: "tie_break"
    };
  }

  return {
    winnerEntryId: Number(match.leftSeed) <= Number(match.rightSeed) ? match.leftEntryId : match.rightEntryId,
    resolutionSource: "tie_break"
  };
}

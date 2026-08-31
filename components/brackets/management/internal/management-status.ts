import type { BracketMatch, Bracket } from "@/lib/brackets/types";

/** Live round facts used by creator-management status surfaces. */
export type ActiveStandardBracketStatus = {
  usesManualAdvancement: boolean;
  isPublicBracket: boolean;
  isPrivateBracket: boolean;
  awaitingNextRound: boolean;
  currentRoundMatches: BracketMatch[];
  completedManualResults: number;
  unresolvedManualCount: number;
  roundVoteTotal: number;
  activeVotedMatchCount: number;
  canCloseManualVoting: boolean;
};

export function getActiveStandardBracketStatus(
  tournament: Pick<
    Bracket,
    "advancementMode" | "visibility" | "hasHiddenClosedRounds"
  >,
  matches: BracketMatch[],
): ActiveStandardBracketStatus {
  const usesManualAdvancement = tournament.advancementMode === "manual_winner";
  const isPublicBracket =
    tournament.visibility === "public_listed" ||
    tournament.visibility === "public_unlisted";
  const currentRoundMatches = matches.filter(
    (match) => match.status === "open",
  );
  const completedManualResults = currentRoundMatches.filter(
    (match) => match.winnerEntryId,
  ).length;
  const unresolvedManualCount =
    currentRoundMatches.length - completedManualResults;
  const roundVoteTotal = currentRoundMatches.reduce(
    (sum, match) =>
      sum + (match.left?.voteCount ?? 0) + (match.right?.voteCount ?? 0),
    0,
  );
  const activeVotedMatchCount = currentRoundMatches.filter(
    (match) => (match.left?.voteCount ?? 0) + (match.right?.voteCount ?? 0) > 0,
  ).length;

  return {
    usesManualAdvancement,
    isPublicBracket,
    isPrivateBracket: tournament.visibility === "private",
    awaitingNextRound: Boolean(
      isPublicBracket && tournament.hasHiddenClosedRounds,
    ),
    currentRoundMatches,
    completedManualResults,
    unresolvedManualCount,
    roundVoteTotal,
    activeVotedMatchCount,
    canCloseManualVoting: unresolvedManualCount === 0,
  };
}

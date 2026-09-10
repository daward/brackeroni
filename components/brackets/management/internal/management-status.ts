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
    "advancementMode" | "visibility" | "hasUnrevealedClosedRounds"
  >,
  matches: BracketMatch[],
): ActiveStandardBracketStatus {
  const usesManualAdvancement = tournament.advancementMode === "manual_winner";
  const isPublicBracket =
    tournament.visibility === "public_listed" ||
    tournament.visibility === "public_unlisted";
  const awaitingNextRound = Boolean(
    isPublicBracket && tournament.hasUnrevealedClosedRounds,
  );
  const currentRoundMatches = getCurrentRoundMatches(matches, awaitingNextRound);
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
    awaitingNextRound,
    currentRoundMatches,
    completedManualResults,
    unresolvedManualCount,
    roundVoteTotal,
    activeVotedMatchCount,
    canCloseManualVoting: unresolvedManualCount === 0,
  };
}

function getCurrentRoundMatches(
  matches: BracketMatch[],
  awaitingNextRound: boolean,
) {
  const candidates = awaitingNextRound
    ? matches.filter(
        (match) =>
          match.roundStatus === "closed" &&
          !match.roundRevealedAt,
      )
    : matches.filter((match) => match.status === "open");

  const latestRoundNumber = Math.max(
    ...candidates.map((match) => match.roundNumber ?? 0),
  );

  return latestRoundNumber > 0
    ? candidates.filter((match) => match.roundNumber === latestRoundNumber)
    : candidates;
}

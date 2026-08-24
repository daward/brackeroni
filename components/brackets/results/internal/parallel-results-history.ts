import type { ResultMatch } from "../types";

export function isVisibleHistoryMatch(match: ResultMatch) {
  return Boolean(match.leftEntryId && match.rightEntryId && match.status !== "auto_resolved");
}

export function formatVoteTally(match: ResultMatch, candidateEntryId: string) {
  const isLeft = match.leftEntryId === candidateEntryId;
  const selectedVotes = isLeft ? match.leftVoteCount : match.rightVoteCount;
  const opponentVotes = isLeft ? match.rightVoteCount : match.leftVoteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

export function describeHistoryResult(match: ResultMatch, candidateEntryId: string) {
  return match.winnerEntryId === candidateEntryId ? "Won" : "Lost";
}

export function describeHistoryOpponent(match: ResultMatch, candidateEntryId: string) {
  const isLeft = match.leftEntryId === candidateEntryId;
  const opponentName = isLeft ? match.rightName : match.leftName;
  const opponentSeed = isLeft ? match.rightSeed : match.leftSeed;

  return `Against ${opponentName}${opponentSeed ? ` (Seed ${opponentSeed})` : ""}.`;
}

export function getOpponentImageUrl(match: ResultMatch, candidateEntryId: string) {
  return match.leftEntryId === candidateEntryId ? match.rightImageUrl : match.leftImageUrl;
}

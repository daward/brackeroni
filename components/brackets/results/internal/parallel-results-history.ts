import type { ResultMatch } from "../types";

export function isVisibleHistoryMatch(match: ResultMatch) {
  return Boolean(match.left && match.right && match.status !== "auto_resolved");
}

export function formatVoteTally(match: ResultMatch, candidateEntryId: string) {
  const isLeft = match.left?.id === candidateEntryId;
  const selectedVotes = isLeft ? match.left?.voteCount : match.right?.voteCount;
  const opponentVotes = isLeft ? match.right?.voteCount : match.left?.voteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

export function describeHistoryResult(match: ResultMatch, candidateEntryId: string) {
  return match.winnerEntryId === candidateEntryId ? "Won" : "Lost";
}

export function describeHistoryOpponent(match: ResultMatch, candidateEntryId: string) {
  const isLeft = match.left?.id === candidateEntryId;
  const opponentName = isLeft ? match.right?.name : match.left?.name;
  const opponentSeed = isLeft ? match.right?.seed : match.left?.seed;

  return `Against ${opponentName}${opponentSeed ? ` (Seed ${opponentSeed})` : ""}.`;
}

export function getOpponentImageUrl(match: ResultMatch, candidateEntryId: string) {
  return match.left?.id === candidateEntryId ? match.right?.imageUrl : match.left?.imageUrl;
}

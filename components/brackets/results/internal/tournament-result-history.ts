import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import type { ResultMatch, ResultTournament } from "../types";
import type { EntrySeedDisplay, UserVoteNote } from "./tournament-result-types";
import { formatSeedLabel } from "./tournament-seed-display";

export function formatRoundLabel(match: ResultMatch, tournament: ResultTournament) {
  let roundLabel = `Round ${match.roundNumber}`;

  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    roundLabel = `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  } else if (usesSwissResultMode(tournament.resultMode)) {
    roundLabel = `Swiss Round ${match.roundNumber}`;
  }

  return match.subBracketName ? `${roundLabel} / ${match.subBracketName}` : roundLabel;
}

function formatOpponentSeedLabel(
  match: ResultMatch,
  entryId: string,
  seedDisplayByEntryId: Map<string, EntrySeedDisplay>,
) {
  const isLeft = match.left?.id === entryId;
  const opponent = isLeft ? match.right : match.left;
  const opponentEntryId = opponent?.id;
  const opponentSeed = opponent?.seed;

  if (!opponentEntryId) {
    return opponentSeed ? `Seed ${opponentSeed}` : null;
  }

  return formatSeedLabel(seedDisplayByEntryId, opponentEntryId, opponentSeed);
}

export function isContestedMatch(match: ResultMatch) {
  return Boolean(match.left && match.right);
}

export function isVisibleHistoryMatch(match: ResultMatch) {
  return isContestedMatch(match) && match.status !== "auto_resolved";
}

export function describeHistoryResult(match: ResultMatch, entryId: string) {
  return match.winnerEntryId === entryId ? "Won" : "Lost";
}

export function describeUserVote(match: ResultMatch): UserVoteNote | null {
  if (!match.userVoteEntryId) {
    return null;
  }

  let pickedName = null;

  if (match.userVoteEntryId === match.left?.id) {
    pickedName = match.left.name;
  } else if (match.userVoteEntryId === match.right?.id) {
    pickedName = match.right.name;
  }

  if (!pickedName) {
    return null;
  }

  return {
    label: `You picked ${pickedName}`,
    className: match.userVoteEntryId === match.winnerEntryId ? "results-history-vote-for" : "results-history-vote-against",
  };
}

export function describeHistoryOpponent(
  match: ResultMatch,
  entryId: string,
  seedDisplayByEntryId: Map<string, EntrySeedDisplay>,
) {
  const isLeft = match.left?.id === entryId;
  const opponentName = isLeft ? match.right?.name : match.left?.name;
  const opponentSeedLabel = formatOpponentSeedLabel(match, entryId, seedDisplayByEntryId);

  if (!opponentName) {
    return "Advanced on a bye.";
  }

  return `Against ${opponentName}${opponentSeedLabel ? ` (${opponentSeedLabel})` : ""}.`;
}

export function getOpponentImageUrl(match: ResultMatch, entryId: string) {
  return match.left?.id === entryId ? match.right?.imageUrl : match.left?.imageUrl;
}

export function formatVoteTally(match: ResultMatch, entryId: string) {
  const isLeft = match.left?.id === entryId;
  const selectedVotes = isLeft ? match.left?.voteCount : match.right?.voteCount;
  const opponentVotes = isLeft ? match.right?.voteCount : match.left?.voteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

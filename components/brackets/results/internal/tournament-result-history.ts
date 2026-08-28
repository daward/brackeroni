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
  const isLeft = match.leftEntryId === entryId;
  const opponentEntryId = isLeft ? match.rightEntryId : match.leftEntryId;
  const opponentSeed = isLeft ? match.rightSeed : match.leftSeed;

  if (!opponentEntryId) {
    return opponentSeed ? `Seed ${opponentSeed}` : null;
  }

  return formatSeedLabel(seedDisplayByEntryId, opponentEntryId, opponentSeed);
}

export function isContestedMatch(match: ResultMatch) {
  return Boolean(match.leftEntryId && match.rightEntryId);
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

  if (match.userVoteEntryId === match.leftEntryId) {
    pickedName = match.leftName;
  } else if (match.userVoteEntryId === match.rightEntryId) {
    pickedName = match.rightName;
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
  const isLeft = match.leftEntryId === entryId;
  const opponentName = isLeft ? match.rightName : match.leftName;
  const opponentSeedLabel = formatOpponentSeedLabel(match, entryId, seedDisplayByEntryId);

  if (!opponentName) {
    return "Advanced on a bye.";
  }

  return `Against ${opponentName}${opponentSeedLabel ? ` (${opponentSeedLabel})` : ""}.`;
}

export function getOpponentImageUrl(match: ResultMatch, entryId: string) {
  return match.leftEntryId === entryId ? match.rightImageUrl : match.leftImageUrl;
}

export function formatVoteTally(match: ResultMatch, entryId: string) {
  const isLeft = match.leftEntryId === entryId;
  const selectedVotes = isLeft ? match.leftVoteCount : match.rightVoteCount;
  const opponentVotes = isLeft ? match.rightVoteCount : match.leftVoteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

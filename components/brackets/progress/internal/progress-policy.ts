import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";

export type ProgressTournament = { id: string; title: string; resultMode?: string | null };
export type ProgressRound = {
  id: string;
  roundNumber: number;
  rankingTargetRank?: number | null;
  rankingRoundNumber?: number | null;
};

export type ProgressMatch = {
  id: string;
  roundNumber: number;
  leftEntryId?: string | null;
  rightEntryId?: string | null;
  leftName?: string | null;
  rightName?: string | null;
  leftSeed?: number | null;
  rightSeed?: number | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  leftVoteCount?: number | null;
  rightVoteCount?: number | null;
  winnerEntryId?: string | null;
};

export type ProgressEntry = {
  id: string;
  candidateName: string;
  seed: number;
  finalRank?: number | null;
  candidateImageUrl?: string | null;
};

export type MatchSummary = ProgressMatch & {
  totalVotes: number;
  margin: number;
  winnerName?: string | null;
  loserName?: string | null;
  winnerSeed?: number | null;
  loserSeed?: number | null;
  winnerImageUrl?: string | null;
  winnerVotes: number;
  loserVotes: number;
  winnerPercent: number;
  upsetDelta: number;
};

type VoteLeader = {
  entryId: string;
  name?: string | null;
  seed?: number | null;
  imageUrl?: string | null;
  votes: number;
};

export type RoundStats = {
  totalVotes: number;
  voteLeader: VoteLeader | null;
  voteLeaderTieCount: number;
  closestMatch: MatchSummary | null;
  closestMatchTieCount: number;
  biggestBlowout: MatchSummary | null;
  biggestBlowoutTieCount: number;
  biggestUpset: MatchSummary | null;
  biggestUpsetTieCount: number;
  winners: MatchSummary[];
};

export function formatRoundTitle(round: ProgressRound, tournament: ProgressTournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode) && round.rankingTargetRank) {
    return `Ranking ${round.rankingTargetRank}: Round ${round.rankingRoundNumber}`;
  }

  return usesSwissResultMode(tournament.resultMode) ? `Swiss Round ${round.roundNumber}` : `Round ${round.roundNumber}`;
}

/** Open-ended rankings use internal decision steps, not participant-facing rounds. */
export function supportsRoundProgressView(resultMode: string | null | undefined) {
  return !usesOpenEndedRankingMode(resultMode);
}

export function getMatchSummary(match: ProgressMatch): MatchSummary {
  const leftVotes = match.leftVoteCount ?? 0;
  const rightVotes = match.rightVoteCount ?? 0;
  const totalVotes = leftVotes + rightVotes;
  const winnerIsLeft = match.winnerEntryId === match.leftEntryId;
  const winnerSeed = winnerIsLeft ? match.leftSeed : match.rightSeed;
  const loserSeed = winnerIsLeft ? match.rightSeed : match.leftSeed;
  const winnerVotes = winnerIsLeft ? leftVotes : rightVotes;
  const loserVotes = winnerIsLeft ? rightVotes : leftVotes;

  return {
    ...match,
    totalVotes,
    margin: Math.abs(leftVotes - rightVotes),
    winnerName: winnerIsLeft ? match.leftName : match.rightName,
    loserName: winnerIsLeft ? match.rightName : match.leftName,
    winnerSeed,
    loserSeed,
    winnerImageUrl: winnerIsLeft ? match.leftImageUrl : match.rightImageUrl,
    winnerVotes,
    loserVotes,
    winnerPercent: totalVotes ? winnerVotes / totalVotes : 0,
    upsetDelta: winnerSeed && loserSeed && winnerSeed > loserSeed ? winnerSeed - loserSeed : 0
  };
}

const countTies = <T extends Record<string, unknown>>(items: T[], key: keyof T) => {
  return items.length <= 1 ? 0 : items.slice(1).filter((item) => item[key] === items[0][key]).length;
};

export function getRoundStats(matches: ProgressMatch[]): RoundStats {
  const visible = matches.filter((match) => match.leftEntryId && match.rightEntryId);
  const winners = visible.filter((match) => match.winnerEntryId).map(getMatchSummary);
  const leaders = new Map<string, VoteLeader>();

  for (const match of visible) {
    const matchEntries = [
      [match.leftEntryId, match.leftName, match.leftSeed, match.leftImageUrl, match.leftVoteCount],
      [match.rightEntryId, match.rightName, match.rightSeed, match.rightImageUrl, match.rightVoteCount]
    ] as const;

    for (const [entryId, name, seed, imageUrl, votes] of matchEntries) {
      if (!entryId) continue;

      const current = leaders.get(entryId) ?? { entryId, name, seed, imageUrl, votes: 0 };
      current.votes += votes ?? 0;
      leaders.set(entryId, current);
    }
  }

  const voteLeaders = [...leaders.values()].filter((leader) => leader.votes > 0).sort((a, b) => b.votes - a.votes);
  const closest = winners.filter((match) => match.totalVotes > 0).sort((a, b) => a.margin - b.margin);
  const blowouts = winners.filter((match) => match.totalVotes > 0).sort((a, b) => b.winnerPercent - a.winnerPercent);
  const upsets = winners.filter((match) => match.upsetDelta > 0).sort((a, b) => b.upsetDelta - a.upsetDelta);

  return {
    totalVotes: visible.reduce((sum, match) => sum + (match.leftVoteCount ?? 0) + (match.rightVoteCount ?? 0), 0),
    voteLeader: voteLeaders[0] ?? null,
    voteLeaderTieCount: countTies(voteLeaders, "votes"),
    closestMatch: closest[0] ?? null,
    closestMatchTieCount: countTies(closest, "margin"),
    biggestBlowout: blowouts[0] ?? null,
    biggestBlowoutTieCount: countTies(blowouts, "winnerPercent"),
    biggestUpset: upsets[0] ?? null,
    biggestUpsetTieCount: countTies(upsets, "upsetDelta"),
    winners
  };
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatTieSuffix(tieCount: number) {
  return tieCount > 0 ? `and ${tieCount} other${tieCount === 1 ? "" : "s"}` : "";
}

export function orderFinalEntries(entries: ProgressEntry[] | null | undefined) {
  return [...(entries ?? [])].sort((left, right) => {
    return (left.finalRank ?? Number.MAX_SAFE_INTEGER) - (right.finalRank ?? Number.MAX_SAFE_INTEGER) || left.seed - right.seed;
  });
}

export function getSwissEntryStatsThroughRound(matches: ProgressMatch[], roundNumber: number) {
  const stats = new Map<string, { points: number; wins: number; losses: number; byes: number }>();
  const ensure = (entryId: string | null | undefined) => {
    if (!entryId) return null;
    const current = stats.get(entryId) ?? { points: 0, wins: 0, losses: 0, byes: 0 };
    stats.set(entryId, current);
    return current;
  };
  for (const match of matches) {
    if (!match.winnerEntryId || match.roundNumber > roundNumber) continue;
    const left = ensure(match.leftEntryId);
    const right = ensure(match.rightEntryId);
    const winner = match.winnerEntryId === match.leftEntryId ? left : match.winnerEntryId === match.rightEntryId ? right : null;
    const loser = winner === left ? right : winner === right ? left : null;
    if (!winner) continue;
    winner.points += 1;
    if (!match.leftEntryId || !match.rightEntryId) winner.byes += 1;
    else {
      winner.wins += 1;
      if (loser) loser.losses += 1;
    }
  }
  return stats;
}

export function getSwissPointsEarned(match: ProgressMatch, entryId: string | null | undefined) {
  return match.winnerEntryId === entryId ? 1 : 0;
}

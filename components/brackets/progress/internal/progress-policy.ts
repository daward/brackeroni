import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import type { Bracket, BracketCandidate, BracketEntry, BracketMatch, BracketRound } from "@/lib/brackets/types";

export type ProgressTournament = Pick<Bracket, "id" | "title" | "resultMode">;
export type ProgressRound = Pick<BracketRound, "id" | "roundNumber" | "rankingTargetRank" | "rankingRoundNumber">;
export type ProgressMatch = BracketMatch & { roundNumber: number };
export type ProgressEntry = Pick<BracketEntry, "id" | "candidateName" | "seed" | "finalRank" | "candidateImageUrl">;

export type MatchSummary = ProgressMatch & {
  totalVotes: number;
  margin: number;
  winner: BracketCandidate | null;
  loser: BracketCandidate | null;
  winnerVotes: number;
  loserVotes: number;
  winnerPercent: number;
  upsetDelta: number;
};

type VoteLeader = {
  candidate: BracketCandidate;
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
  const leftVotes = match.left?.voteCount ?? 0;
  const rightVotes = match.right?.voteCount ?? 0;
  const totalVotes = leftVotes + rightVotes;
  const winnerIsLeft = match.winnerEntryId === match.left?.id;
  const winner = winnerIsLeft ? match.left : match.right;
  const loser = winnerIsLeft ? match.right : match.left;
  const winnerVotes = winnerIsLeft ? leftVotes : rightVotes;
  const loserVotes = winnerIsLeft ? rightVotes : leftVotes;

  return {
    ...match,
    totalVotes,
    margin: Math.abs(leftVotes - rightVotes),
    winner,
    loser,
    winnerVotes,
    loserVotes,
    winnerPercent: totalVotes ? winnerVotes / totalVotes : 0,
    upsetDelta: winner && loser && winner.seed > loser.seed ? winner.seed - loser.seed : 0
  };
}

const countTies = <T extends Record<string, unknown>>(items: T[], key: keyof T) => {
  return items.length <= 1 ? 0 : items.slice(1).filter((item) => item[key] === items[0][key]).length;
};

export function getRoundStats(matches: ProgressMatch[]): RoundStats {
  const visible = matches.filter((match) => match.left && match.right);
  const winners = visible.filter((match) => match.winnerEntryId).map(getMatchSummary);
  const leaders = new Map<string, VoteLeader>();

  for (const match of visible) {
    for (const side of [match.left, match.right]) {
      if (!side) continue;

      const current = leaders.get(side.id) ?? {
        candidate: side,
        votes: 0,
      };
      current.votes += side.voteCount ?? 0;
      leaders.set(side.id, current);
    }
  }

  const voteLeaders = [...leaders.values()].filter((leader) => leader.votes > 0).sort((a, b) => b.votes - a.votes);
  const closest = winners.filter((match) => match.totalVotes > 0).sort((a, b) => a.margin - b.margin);
  const blowouts = winners.filter((match) => match.totalVotes > 0).sort((a, b) => b.winnerPercent - a.winnerPercent);
  const upsets = winners.filter((match) => match.upsetDelta > 0).sort((a, b) => b.upsetDelta - a.upsetDelta);

  return {
    totalVotes: visible.reduce((sum, match) => sum + (match.left?.voteCount ?? 0) + (match.right?.voteCount ?? 0), 0),
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
    const left = ensure(match.left?.id);
    const right = ensure(match.right?.id);
    const winner = match.winnerEntryId === match.left?.id ? left : match.winnerEntryId === match.right?.id ? right : null;
    const loser = winner === left ? right : winner === right ? left : null;
    if (!winner) continue;
    winner.points += 1;
    if (!match.left || !match.right) winner.byes += 1;
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

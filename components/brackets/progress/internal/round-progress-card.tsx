"use client";

import { MobileSwipeRail } from "@/components/shared";
import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/brackets/engine/result-modes";
import {
  formatPercent,
  getRoundStats,
  getSwissEntryStatsThroughRound,
  orderFinalEntries,
  type MatchSummary,
  type ProgressEntry,
  type ProgressMatch,
  type RoundStats,
} from "./progress-policy";
import { RoundRevealControls } from "./round-reveal-controls";
import { RoundMoreActions } from "./round-share-actions";
import { RankingTile } from "./ranking-tile";
import { WinnerTile } from "./round-result-tiles";
import { RoundStatCard } from "./round-stat-card";

type ProgressTournament = {
  id: string;
  title: string;
  status: string;
  resultMode?: string | null;
  entries?: ProgressEntry[] | null;
};
type ProgressRound = { id: string; roundNumber: number; matchCount: number; status: string; revealedAt?: string | null };
export type ShareCardPayload = { tournament: ProgressTournament; round: ProgressRound; stats: RoundStats; isFinalResults: boolean };
type RoundProgressCardProps = {
  tournament: ProgressTournament;
  round: ProgressRound;
  matches: ProgressMatch[];
  statMatches?: ProgressMatch[];
  allMatches?: ProgressMatch[];
  isFinalResults?: boolean;
  isSuperseded?: boolean;
  isCreator: boolean;
  onOpenShareCard: (payload: ShareCardPayload) => void;
  onReveal: (round: { id: string; revealedAt?: string | null }) => void;
};

export function RoundProgressCard({
  tournament,
  round,
  matches,
  statMatches = matches,
  allMatches = statMatches,
  isFinalResults = false,
  isSuperseded = false,
  isCreator,
  onOpenShareCard,
  onReveal,
}: RoundProgressCardProps) {
  const stats = getRoundStats(statMatches);
  const matchStats = getRoundStats(matches);
  const roundWinners = matchStats.winners;
  const isRankingFinalResults = isFinalResults && (usesSwissResultMode(tournament.resultMode) || tournament.resultMode !== "winner_only");
  const swissStats = usesSwissResultMode(tournament.resultMode) ? getSwissEntryStatsThroughRound(allMatches, round.roundNumber) : null;
  const finalEntries = isRankingFinalResults ? orderFinalEntries(tournament.entries).slice(0, 12) : [];
  const isEffectivelyRevealed = Boolean(round.revealedAt || isSuperseded);
  const isHidden = round.status === "closed" && !isEffectivelyRevealed;
  const statItems = getStatItems(stats);
  const resultsHeading = getResultsHeading({
    isRankingFinalResults,
    isFinalResults,
    isSwiss: usesSwissResultMode(tournament.resultMode),
  });

  return (
    <article id={`round-${round.id}`} className="progress-round-card">
      <div>
        <p className="results-kicker">{round.status}</p>
        {isFinalResults ? <h2 className="results-title text-3xl sm:text-4xl">Final Results</h2> : null}
        <p className="results-meta max-w-full leading-6 sm:leading-normal">
          {round.matchCount} matchups | {matchStats.totalVotes} votes
          {isHidden ? " | Hidden from participants" : ""}
          {isEffectivelyRevealed ? " | Revealed" : ""}
        </p>
      </div>

      <div className="progress-round-stat-rail">
        <MobileSwipeRail items={statItems} getKey={(item) => item.label} renderItem={(item) => <RoundStatCard {...item} />} />
      </div>

      <div className="progress-round-stat-grid">
        {statItems.map((item) => (
          <RoundStatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="progress-round-results">
        <h3 className="progress-round-results-heading">{resultsHeading}</h3>
        <div className="progress-round-result-grid">{isRankingFinalResults ? renderRankingResults(finalEntries, swissStats) : renderWinnerResults(roundWinners, swissStats)}</div>
      </div>

      {isCreator ? (
        <div className="progress-round-actions">
          <RoundRevealControls
            tournament={tournament}
            round={round}
            canReveal={isCreator && !isEffectivelyRevealed}
            isFinalRound={!usesOpenEndedRankingMode(tournament.resultMode) && round.matchCount === 1}
            onReveal={onReveal}
          />
          <RoundMoreActions tournament={tournament} round={round} stats={stats} isFinalResults={isFinalResults} onOpenShareCard={onOpenShareCard} />
        </div>
      ) : null}
    </article>
  );
}

function getStatItems(stats: RoundStats) {
  return [
    {
      label: "Most Votes",
      value: stats.voteLeader?.candidate.name || "No votes yet",
      tieCount: stats.voteLeaderTieCount,
      tone: "blue" as const,
      detail: stats.voteLeader ? `${stats.voteLeader.votes} votes | Seed ${stats.voteLeader.candidate.seed}` : null,
    },
    {
      label: "Closest Match",
      value: stats.closestMatch?.winner?.name || "No closed match yet",
      tieCount: stats.closestMatchTieCount,
      tone: "yellow" as const,
      detail: stats.closestMatch ? `Beat ${stats.closestMatch.loser?.name} by ${stats.closestMatch.margin} votes` : null,
    },
    {
      label: "Biggest Blowout",
      value: stats.biggestBlowout?.winner?.name || "No closed match yet",
      tieCount: stats.biggestBlowoutTieCount,
      tone: "blue" as const,
      detail: stats.biggestBlowout ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loser?.name}` : null,
    },
    {
      label: "Biggest Upset",
      value: stats.biggestUpset?.winner?.name || "No seed upset",
      tieCount: stats.biggestUpsetTieCount,
      tone: "yellow" as const,
      detail: stats.biggestUpset ? `Seed ${stats.biggestUpset.winner?.seed} beat seed ${stats.biggestUpset.loser?.seed}` : null,
    },
  ];
}

function getResultsHeading({ isRankingFinalResults, isFinalResults, isSwiss }: { isRankingFinalResults: boolean; isFinalResults: boolean; isSwiss: boolean }) {
  if (isRankingFinalResults) return "Final Ranking";
  if (isFinalResults) return "Champion";
  if (isSwiss) return "Match Winners";
  return "Winners Advancing";
}

function renderRankingResults(finalEntries: ProgressEntry[], swissStats: Map<string, { points: number; wins: number; losses: number; byes: number }> | null) {
  if (finalEntries.length === 0) {
    return <p className="progress-round-empty">No final ranking is available yet.</p>;
  }

  return finalEntries.map((entry, index) => <RankingTile key={entry.id} entry={entry} fallbackRank={index + 1} swissStats={swissStats} />);
}

function renderWinnerResults(roundWinners: MatchSummary[], swissStats: Map<string, { points: number; wins: number; losses: number; byes: number }> | null) {
  if (roundWinners.length === 0) {
    return <p className="progress-round-empty">No winners recorded for this round yet.</p>;
  }

  return roundWinners.map((match) => <WinnerTile key={match.id} match={match} swissStats={swissStats} />);
}

"use client";

import { MobileSwipeRail } from "@/components/shared";
import { usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/bracket-modes";
import { formatPercent, getRoundStats, getSwissEntryStatsThroughRound, orderFinalEntries } from "@/lib/brackets/progress";
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
  entries?: import("@/lib/brackets/progress").ProgressEntry[] | null;
};
type ProgressRound = { id: string; roundNumber: number; matchCount: number; status: string; revealedAt?: string | null };
export type ShareCardPayload = { tournament: ProgressTournament; round: ProgressRound; stats: import("@/lib/brackets/progress").RoundStats; isFinalResults: boolean };
type RoundProgressCardProps = {
  tournament: ProgressTournament;
  round: ProgressRound;
  matches: import("@/lib/brackets/progress").ProgressMatch[];
  statMatches?: import("@/lib/brackets/progress").ProgressMatch[];
  allMatches?: import("@/lib/brackets/progress").ProgressMatch[];
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
  onReveal
}: RoundProgressCardProps) {
  const stats = getRoundStats(statMatches);
  const roundWinners = getRoundStats(matches).winners;
  const isRankingFinalResults =
    isFinalResults &&
    (usesSwissResultMode(tournament.resultMode) || tournament.resultMode !== "winner_only");
  const swissStats = usesSwissResultMode(tournament.resultMode)
    ? getSwissEntryStatsThroughRound(allMatches, round.roundNumber)
    : null;
  const finalEntries = isRankingFinalResults ? orderFinalEntries(tournament.entries).slice(0, 12) : [];
  const isEffectivelyRevealed = Boolean(round.revealedAt || isSuperseded);
  const isHidden = round.status === "closed" && !isEffectivelyRevealed;
  return (
    <article
      id={`round-${round.id}`}
      className="progress-round-card"
    >
      <div>
        <p className="results-kicker">{round.status}</p>
        {isFinalResults ? (
          <h2 className="results-title text-3xl sm:text-4xl">Final Results</h2>
        ) : null}
        <p className="results-meta max-w-full leading-6 sm:leading-normal">
          {round.matchCount} matchups | {getRoundStats(matches).totalVotes} votes
          {isHidden ? " | Hidden from participants" : ""}
          {isEffectivelyRevealed ? " | Revealed" : ""}
        </p>
      </div>

      <div className="progress-round-stat-rail">
        <MobileSwipeRail
          items={[
            { label: "Most Votes", value: stats.voteLeader?.name || "No votes yet", tieCount: stats.voteLeaderTieCount, tone: "blue" as const, detail: stats.voteLeader ? `${stats.voteLeader.votes} votes | Seed ${stats.voteLeader.seed}` : null },
            { label: "Closest Match", value: stats.closestMatch?.winnerName || "No closed match yet", tieCount: stats.closestMatchTieCount, tone: "yellow" as const, detail: stats.closestMatch ? `Beat ${stats.closestMatch.loserName} by ${stats.closestMatch.margin} votes` : null },
            { label: "Biggest Blowout", value: stats.biggestBlowout?.winnerName || "No closed match yet", tieCount: stats.biggestBlowoutTieCount, tone: "blue" as const, detail: stats.biggestBlowout ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loserName}` : null },
            { label: "Biggest Upset", value: stats.biggestUpset?.winnerName || "No seed upset", tieCount: stats.biggestUpsetTieCount, tone: "yellow" as const, detail: stats.biggestUpset ? `Seed ${stats.biggestUpset.winnerSeed} beat seed ${stats.biggestUpset.loserSeed}` : null }
          ]}
          getKey={(item) => item.label}
          renderItem={(item) => <RoundStatCard {...item} />}
        />
      </div>

      <div className="progress-round-stat-grid">
        <RoundStatCard
          label="Most Votes"
          value={stats.voteLeader ? stats.voteLeader.name : "No votes yet"}
          tieCount={stats.voteLeaderTieCount}
          tone="blue"
          detail={
            stats.voteLeader
              ? `${stats.voteLeader.votes} votes | Seed ${stats.voteLeader.seed}`
              : null
          }
        />
        <RoundStatCard
          label="Closest Match"
          value={stats.closestMatch ? stats.closestMatch.winnerName : "No closed match yet"}
          tieCount={stats.closestMatchTieCount}
          tone="yellow"
          detail={
            stats.closestMatch
              ? `Beat ${stats.closestMatch.loserName} by ${stats.closestMatch.margin} votes`
              : null
          }
        />
        <RoundStatCard
          label="Biggest Blowout"
          value={stats.biggestBlowout ? stats.biggestBlowout.winnerName : "No closed match yet"}
          tieCount={stats.biggestBlowoutTieCount}
          tone="blue"
          detail={
            stats.biggestBlowout
              ? `${formatPercent(stats.biggestBlowout.winnerPercent)} over ${stats.biggestBlowout.loserName}`
              : null
          }
        />
        <RoundStatCard
          label="Biggest Upset"
          value={stats.biggestUpset ? stats.biggestUpset.winnerName : "No seed upset"}
          tieCount={stats.biggestUpsetTieCount}
          tone="yellow"
          detail={
            stats.biggestUpset
              ? `Seed ${stats.biggestUpset.winnerSeed} beat seed ${stats.biggestUpset.loserSeed}`
              : null
          }
        />
      </div>

      <div className="progress-round-results">
        <h3 className="font-serif text-sm font-bold uppercase tracking-[0.24em] text-[var(--accent-3)]">
          {isRankingFinalResults
            ? "Final Ranking"
            : isFinalResults
              ? "Champion"
              : usesSwissResultMode(tournament.resultMode)
                ? "Match Winners"
                : "Winners Advancing"}
        </h3>
        <div className="mt-3 grid gap-x-8 md:grid-cols-2">
          {isRankingFinalResults ? (
            finalEntries.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No final ranking is available yet.</p>
            ) : (
              finalEntries.map((entry, index) => (
                <RankingTile key={entry.id} entry={entry} fallbackRank={index + 1} swissStats={swissStats} />
              ))
            )
          ) : roundWinners.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No winners recorded for this round yet.</p>
          ) : (
            roundWinners.map((match) => <WinnerTile key={match.id} match={match} swissStats={swissStats} />)
          )}
        </div>
      </div>

      {isCreator ? (
          <div className="mt-4 flex min-w-0 items-center gap-3">
          <RoundRevealControls
            tournament={tournament}
            round={round}
            canReveal={isCreator && !isEffectivelyRevealed}
            isFinalRound={!usesOpenEndedRankingMode(tournament.resultMode) && round.matchCount === 1}
            onReveal={onReveal}
          />
          <RoundMoreActions
            tournament={tournament}
            round={round}
            stats={stats}
            isFinalResults={isFinalResults}
            onOpenShareCard={onOpenShareCard}
          />
        </div>
      ) : null}
    </article>
  );
}

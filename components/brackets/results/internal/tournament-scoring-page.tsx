"use client";

import { useMemo, useState } from "react";
import { formatResultModeLabel, usesOpenEndedRankingMode, usesSwissResultMode } from "@/lib/bracket-modes";
import type { ResultTournament, TournamentScoringPageProps, VoterScore, VoteHistoryEntry } from "../types";
import { BracketOutcomeHeader } from "./bracket-outcome-header";
import { ResultsTable } from "./results-table";

type ScoreCollectionProps = {
  scores: VoterScore[];
  selectedVoterKey?: string | null;
  onSelectVoter: (voterKey: string) => void;
  scoringEnabled: boolean;
};

type VoterHistoryProps = {
  tournament: ResultTournament;
  votes: VoteHistoryEntry[];
  scoringEnabled: boolean;
};

type VoterSummaryBarProps = {
  score: VoterScore | null;
  scoringEnabled: boolean;
};

function formatRoundLabel(vote: VoteHistoryEntry, tournament: ResultTournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode) && vote.rankingTargetRank) {
    return `Rank ${vote.rankingTargetRank}.${vote.rankingRoundNumber}`;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    return `Swiss ${vote.roundNumber}`;
  }

  return String(vote.roundNumber);
}

function formatWinPercentage(value?: number | null) {
  return `${Math.round((value ?? 0) * 100)}%`;
}

function AggregateScoreTable({ scores, selectedVoterKey, onSelectVoter, scoringEnabled }: ScoreCollectionProps) {
  return (
    <ResultsTable className="results-scoring-table" wrapperClassName="hidden md:block">
      <thead>
        <tr>
          <th className="results-scoring-rank-column">#</th>
          <th>Voter</th>
          {scoringEnabled ? <th>Score</th> : null}
          <th>Win %</th>
          <th>Record</th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score, index) => (
          <tr key={score.voterKey} className={selectedVoterKey === score.voterKey ? "results-scoreboard-row-active" : undefined}>
            <td className="results-scoring-rank-column">{index + 1}</td>
            <td>
              <button type="button" onClick={() => onSelectVoter(score.voterKey)} className="text-left">
                <div className="results-scoreboard-name">
                  <span>{score.name || "Anonymous voter"}</span>
                  {score.email ? <span className="results-scoreboard-subtle">{score.email}</span> : null}
                </div>
              </button>
            </td>
            {scoringEnabled ? <td>{score.score}</td> : null}
            <td>{formatWinPercentage(score.winPercentage)}</td>
            <td>
              {score.correctPicks}-{score.incorrectPicks}
            </td>
          </tr>
        ))}
      </tbody>
    </ResultsTable>
  );
}

function AggregateScoreList({ scores, selectedVoterKey, onSelectVoter, scoringEnabled }: ScoreCollectionProps) {
  return (
    <ol className="divide-y divide-[var(--line)] md:hidden">
      {scores.map((score, index) => (
        <li key={score.voterKey}>
          <button
            type="button"
            onClick={() => onSelectVoter(score.voterKey)}
            className={`grid w-full grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 py-4 text-left ${selectedVoterKey === score.voterKey ? "text-[var(--accent-2)]" : ""}`}
          >
            <span className="display-face text-xl font-black text-[var(--accent-2)]">{index + 1}</span>
            <span className="min-w-0">
              <span className="display-face block truncate text-lg font-black text-[var(--ink)]">{score.name || "Anonymous voter"}</span>
              {score.email ? <span className="mt-1 block truncate text-xs uppercase tracking-[0.08em] text-[var(--muted)]">{score.email}</span> : null}
            </span>
            <span className="text-right">
              {scoringEnabled ? <span className="display-face block text-lg font-black text-[var(--ink)]">{score.score}</span> : null}
              <span className="block text-xs uppercase tracking-[0.1em] text-[var(--muted)]">
                {formatWinPercentage(score.winPercentage)} · {score.correctPicks}-{score.incorrectPicks}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function VoterHistoryList({ tournament, votes, scoringEnabled }: VoterHistoryProps) {
  if (!votes.length) return <p className="results-empty-copy md:hidden">No scored picks are visible here yet.</p>;

  return (
    <ol className="divide-y divide-[var(--line)] md:hidden">
      {votes.map((vote) => (
        <li key={vote.matchId} className="py-4">
          <p className="results-kicker">Round {formatRoundLabel(vote, tournament)}</p>
          <p className="display-face mt-2 text-lg font-black">{vote.selectedName}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">over {vote.opponentName || "bye"}</p>
          <p className="mt-2 text-sm text-[var(--accent-3)]">
            {vote.correct ? "Correct" : `Lost to ${vote.winnerName}`}
            {scoringEnabled ? ` · ${vote.pointsEarned} points` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
function VoterHistoryTable({ tournament, votes, scoringEnabled }: VoterHistoryProps) {
  if (!votes.length) {
    return <p className="results-empty-copy">No scored picks are visible here yet.</p>;
  }

  return (
    <ResultsTable className="results-scoring-table" wrapperClassName="hidden md:block">
      <thead>
        <tr>
          <th className="results-scoring-round-column">#</th>
          <th>Pick</th>
          <th>Result</th>
          {scoringEnabled ? <th>Points</th> : null}
        </tr>
      </thead>
      <tbody>
        {votes.map((vote) => (
          <tr key={vote.matchId}>
            <td className="results-scoring-round-column">{formatRoundLabel(vote, tournament)}</td>
            <td>
              <div className="results-scoring-pick">
                <span>{vote.selectedName}</span>
                <span className="results-scoreboard-subtle">over {vote.opponentName || "bye"}</span>
              </div>
            </td>
            <td>{vote.correct ? "Correct" : `Lost to ${vote.winnerName}`}</td>
            {scoringEnabled ? <td>{vote.pointsEarned}</td> : null}
          </tr>
        ))}
      </tbody>
    </ResultsTable>
  );
}

function VoterSummaryBar({ score, scoringEnabled }: VoterSummaryBarProps) {
  if (!score) {
    return <p className="results-empty-copy">No voter details available.</p>;
  }

  return (
    <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
      <p className="results-kicker">Voter Summary</p>
      <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
        <span className="display-face text-2xl font-black">{score.name || "Anonymous voter"}</span>
        {scoringEnabled ? <span className="results-scoreboard-stat">Score {score.score}</span> : null}
        <span className="results-scoreboard-stat">{formatWinPercentage(score.winPercentage)}</span>
        <span className="results-scoreboard-stat">
          {score.correctPicks}-{score.incorrectPicks}
        </span>
      </div>
      {score.email ? <p className="results-details-meta mt-2">{score.email}</p> : null}
      <p className="results-scoreboard-note mt-2">
        {score.correctPicks} correct out of {score.totalPicks} scored picks.
      </p>
    </div>
  );
}

export function TournamentScoringPage({
  tournament,
  voterScores,
  voteHistoryByVoterKey,
  canInspectAllVoterScores,
  scoringEnabled,
  outcomeNav = null,
  headerAction = null,
}: TournamentScoringPageProps) {
  const visibleScores = useMemo(() => (canInspectAllVoterScores ? voterScores : voterScores.filter((score) => score.isCurrentViewer)), [canInspectAllVoterScores, voterScores]);
  const [selectedView, setSelectedView] = useState(canInspectAllVoterScores ? "aggregate" : (visibleScores[0]?.voterKey ?? "aggregate"));
  const selectedScore = visibleScores.find((score) => score.voterKey === selectedView) ?? visibleScores[0] ?? null;
  const selectedVotes = selectedScore ? (voteHistoryByVoterKey[selectedScore.voterKey] ?? []) : [];
  const showingAggregate = selectedView === "aggregate";

  return (
    <div className="results-page">
      <section className="results-shell">
        <BracketOutcomeHeader
          title={tournament.title}
          meta={`${formatResultModeLabel(tournament.resultMode)} | ${scoringEnabled ? "round squared scoring" : "win percentage only"}`}
          outcomeNav={outcomeNav}
          headerAction={
            <div className="results-scoring-header-control">
              {canInspectAllVoterScores && visibleScores.length > 0 ? (
                <select value={selectedView} onChange={(event) => setSelectedView(event.target.value)} className="ui-field ui-field-select results-scoring-header-select">
                  <option value="aggregate">Leaderboard</option>
                  {visibleScores.map((score) => (
                    <option key={score.voterKey} value={score.voterKey}>
                      {score.name || score.email || "Anonymous voter"}
                    </option>
                  ))}
                </select>
              ) : null}
              {headerAction}
            </div>
          }
        />

        {!showingAggregate && selectedScore ? (
          <div className="mt-6">
            <VoterSummaryBar score={selectedScore} scoringEnabled={scoringEnabled} />
          </div>
        ) : null}

        <div className="mt-6">
          <h2 className="results-section-title">{showingAggregate ? "Leaderboard" : "Pick History"}</h2>
          {showingAggregate ? (
            visibleScores.length > 0 ? (
              <>
                <AggregateScoreList
                  scores={visibleScores}
                  selectedVoterKey={selectedScore?.voterKey ?? null}
                  onSelectVoter={(voterKey) => setSelectedView(voterKey)}
                  scoringEnabled={scoringEnabled}
                />
                <AggregateScoreTable
                  scores={visibleScores}
                  selectedVoterKey={selectedScore?.voterKey ?? null}
                  onSelectVoter={(voterKey) => setSelectedView(voterKey)}
                  scoringEnabled={scoringEnabled}
                />
              </>
            ) : (
              <p className="results-empty-copy">No scoring data is visible here yet.</p>
            )
          ) : (
            <>
              <VoterHistoryList tournament={tournament} votes={selectedVotes} scoringEnabled={scoringEnabled} />
              <VoterHistoryTable tournament={tournament} votes={selectedVotes} scoringEnabled={scoringEnabled} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}

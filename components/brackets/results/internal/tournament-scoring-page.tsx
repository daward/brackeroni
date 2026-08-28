"use client";

import { useMemo, useState } from "react";
import { formatResultModeLabel } from "@/lib/brackets/engine/result-modes";
import type { TournamentScoringPageProps } from "../types";
import { AggregateScoreList } from "./aggregate-score-list";
import { AggregateScoreTable } from "./aggregate-score-table";
import { BracketOutcomeHeader } from "./bracket-outcome-header";
import { VoterHistoryList } from "./voter-history-list";
import { VoterHistoryTable } from "./voter-history-table";
import { VoterSummaryBar } from "./voter-summary-bar";

export function TournamentScoringPage({
  tournament,
  voterScores,
  voteHistoryByVoterKey,
  canInspectAllVoterScores,
  scoringEnabled,
  outcomeNav = null,
  headerAction = null,
}: TournamentScoringPageProps) {
  const visibleScores = useMemo(() => {
    return canInspectAllVoterScores ? voterScores : voterScores.filter((score) => score.isCurrentViewer);
  }, [canInspectAllVoterScores, voterScores]);
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
                <select
                  value={selectedView}
                  onChange={(event) => setSelectedView(event.target.value)}
                  className="ui-field ui-field-select results-scoring-header-select"
                >
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
          <div className="results-scoring-summary-shell">
            <VoterSummaryBar score={selectedScore} scoringEnabled={scoringEnabled} />
          </div>
        ) : null}

        <div className="results-scoring-body">
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

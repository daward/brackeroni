"use client";

import { useState } from "react";
import { formatResultModeLabel } from "@/lib/bracket-modes";
import type { ParallelResultsPageProps } from "../types";
import { AggregateEntryDetails } from "./aggregate-entry-details";
import { AggregateResultsTable } from "./aggregate-results-table";
import { BracketOutcomeHeader } from "./bracket-outcome-header";
import type { AggregateResultEntry, AggregateSortDirection, AggregateSortKey } from "./parallel-results-types";
import { getParticipantEntry } from "./parallel-participant-entry";
import { AGGREGATE_SORT_OPTIONS, getAggregateSortValue } from "./parallel-results-sorting";
import { isVisibleHistoryMatch } from "./parallel-results-history";
import { ParticipantEntryDetails } from "./participant-entry-details";
import { ResultsRankingList } from "./results-ranking-list";

export function ParallelResultsPage({
  tournament,
  aggregateEntries,
  participants,
  completedBallotCount,
  headerAction = null,
}: ParallelResultsPageProps) {
  const typedAggregateEntries = aggregateEntries as AggregateResultEntry[];
  const [selectedEntryId, setSelectedEntryId] = useState(aggregateEntries[0]?.id ?? null);
  const [selectedParticipantId, setSelectedParticipantId] = useState("aggregate");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [aggregateSortKey, setAggregateSortKey] = useState<AggregateSortKey>("averageRank");
  const [aggregateSortDirection, setAggregateSortDirection] = useState<AggregateSortDirection>("asc");
  const showingAggregate = selectedParticipantId === "aggregate";
  const viewerParticipant = participants.find((participant) => participant.id === tournament.viewerParticipantId) ?? null;
  const aggregateEntriesWithViewerRank = typedAggregateEntries.map((entry) => {
    const viewerRank = viewerParticipant?.candidateRanks?.[entry.candidateId]?.finalRank ?? null;

    return {
      ...entry,
      yourRank: viewerRank,
      rankDifference: typeof viewerRank === "number" ? viewerRank - entry.finalRank : null,
    };
  });
  const selectedParticipant = participants.find((participant) => participant.id === selectedParticipantId) ?? null;
  const displayedEntries = showingAggregate
    ? [...aggregateEntriesWithViewerRank].sort((left, right) => {
        const leftValue = getAggregateSortValue(left, aggregateSortKey);
        const rightValue = getAggregateSortValue(right, aggregateSortKey);

        if (leftValue < rightValue) {
          return aggregateSortDirection === "asc" ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return aggregateSortDirection === "asc" ? 1 : -1;
        }

        return left.finalRank - right.finalRank;
      })
    : [...typedAggregateEntries].sort((left, right) => {
        const leftRank = selectedParticipant?.candidateRanks[left.candidateId]?.finalRank ?? Number.MAX_SAFE_INTEGER;
        const rightRank = selectedParticipant?.candidateRanks[right.candidateId]?.finalRank ?? Number.MAX_SAFE_INTEGER;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.finalRank - right.finalRank;
      });
  const selectedEntry = displayedEntries.find((entry) => entry.id === selectedEntryId) ?? displayedEntries[0] ?? null;
  const participantEntry = getParticipantEntry(selectedEntry, selectedParticipant);
  const selectedParticipantHistory =
    participantEntry && selectedParticipant
      ? selectedParticipant.matches.filter((match) => {
          return (
            isVisibleHistoryMatch(match) &&
            (match.leftEntryId === participantEntry.participantEntryId ||
              match.rightEntryId === participantEntry.participantEntryId)
          );
        })
      : [];
  const participantCount = tournament.participantCount ?? completedBallotCount;
  const hasOpenBallots = tournament.status !== "complete" || completedBallotCount < participantCount;
  const progressLabel =
    participantCount > 0 ? `${completedBallotCount}/${participantCount} ballots complete` : `${completedBallotCount} completed ballots`;

  function handleSelectEntry(entryId: string) {
    setSelectedEntryId(entryId);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  }

  function handleToggleAggregateSort(nextKey: AggregateSortKey) {
    if (aggregateSortKey === nextKey) {
      setAggregateSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setAggregateSortKey(nextKey);
    setAggregateSortDirection(AGGREGATE_SORT_OPTIONS[nextKey].direction);
  }

  return (
    <div className="results-page results-page-parallel">
      <section className="results-shell">
        <BracketOutcomeHeader
          title={tournament.title}
          meta={`${formatResultModeLabel(tournament.resultMode)} | ${aggregateEntries.length} ranked entries | ${progressLabel}`}
          headerNotice={
            <p className="results-meta">
              {hasOpenBallots
                ? "Voting is still in progress. These aggregate ranks update as more personal brackets finish."
                : "All ballots are complete. These are the final aggregate ranks."}
            </p>
          }
          headerAction={
            participants.length > 0 || headerAction ? (
              <div className="results-scoring-header-control">
                {participants.length > 0 ? (
                  <select
                    value={selectedParticipantId}
                    onChange={(event) => setSelectedParticipantId(event.target.value)}
                    className="ui-field ui-field-select results-scoring-header-select"
                  >
                    <option value="aggregate">Final Results</option>
                    {participants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        {participant.name || participant.email || "Anonymous voter"}
                      </option>
                    ))}
                  </select>
                ) : null}
                {headerAction}
              </div>
            ) : null
          }
        />

        <div className="results-grid">
          <section className="results-ranking-rail">
            <h2 className="results-section-title">Final Ranking</h2>
            {showingAggregate ? (
              <AggregateResultsTable
                entries={displayedEntries}
                selectedEntryId={selectedEntry?.id ?? null}
                onSelectEntry={handleSelectEntry}
                sortKey={aggregateSortKey}
                sortDirection={aggregateSortDirection}
                onToggleSort={handleToggleAggregateSort}
              />
            ) : (
              <ResultsRankingList
                entries={displayedEntries}
                selectedEntryId={selectedEntry?.id}
                onSelectEntry={handleSelectEntry}
                getRank={(entry, index) => {
                  if (!entry.candidateId) {
                    return index + 1;
                  }

                  return selectedParticipant?.candidateRanks[entry.candidateId]?.finalRank ?? index + 1;
                }}
                getSeedLabel={(entry) => `Seed ${entry.seed}`}
              />
            )}
          </section>

          <aside className="results-details-rail ui-scroll-subtle">
            {showingAggregate ? (
              <AggregateEntryDetails
                selectedEntry={selectedEntry}
                participants={participants}
                viewerParticipant={viewerParticipant}
                hasOpenBallots={hasOpenBallots}
              />
            ) : (
              <ParticipantEntryDetails
                tournament={tournament}
                selectedEntry={selectedEntry}
                participantEntry={participantEntry}
                selectedParticipant={selectedParticipant}
                selectedParticipantHistory={selectedParticipantHistory}
                includeParticipantName
              />
            )}
          </aside>
        </div>
      </section>
      {isDrawerOpen && selectedEntry ? (
        <div className="results-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="results-drawer ui-scroll-subtle" onClick={(event) => event.stopPropagation()}>
            <div className="results-drawer-header">
              <p className="results-section-title">Candidate Details</p>
              <button type="button" onClick={() => setIsDrawerOpen(false)} className="results-drawer-close">
                Close
              </button>
            </div>
            <div className="space-y-6">
              {showingAggregate ? (
                <AggregateEntryDetails
                  selectedEntry={selectedEntry}
                  participants={participants}
                  viewerParticipant={viewerParticipant}
                  hasOpenBallots={hasOpenBallots}
                />
              ) : (
                <ParticipantEntryDetails
                  tournament={tournament}
                  selectedEntry={selectedEntry}
                  participantEntry={participantEntry}
                  selectedParticipant={selectedParticipant}
                  selectedParticipantHistory={selectedParticipantHistory}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

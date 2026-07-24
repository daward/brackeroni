"use client";

import { useState } from "react";
import { BracketOutcomeHeader } from "@/components/bracket-outcome-header";
import { BackdropRemoteImage } from "@/components/resilient-remote-image";
import {
  formatResultModeLabel,
  usesOpenEndedRankingMode
} from "@/lib/bracket-modes";

const AGGREGATE_SORT_OPTIONS = {
  aggregateRank: { key: "finalRank", direction: "asc" },
  show: { key: "candidateName", direction: "asc" },
  yourRank: { key: "yourRank", direction: "asc" },
  rankDifference: { key: "rankDifference", direction: "asc" },
  averageRank: { key: "averageRank", direction: "asc" },
  rankStdDev: { key: "rankStdDev", direction: "asc" }
};

function formatRank(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return value.toFixed(2).replace(/\.00$/, "");
}

function formatSignedRankDiff(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  if (value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : `${value}`;
}

function formatRoundLabel(match, tournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  return `Round ${match.roundNumber}`;
}

function isVisibleHistoryMatch(match) {
  return Boolean(match.leftEntryId && match.rightEntryId && match.status !== "auto_resolved");
}

function formatVoteTally(match, candidateEntryId) {
  const isLeft = match.leftEntryId === candidateEntryId;
  const selectedVotes = isLeft ? match.leftVoteCount : match.rightVoteCount;
  const opponentVotes = isLeft ? match.rightVoteCount : match.leftVoteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

function describeHistoryResult(match, candidateEntryId) {
  return match.winnerEntryId === candidateEntryId ? "Won" : "Lost";
}

function describeHistoryOpponent(match, candidateEntryId) {
  const isLeft = match.leftEntryId === candidateEntryId;
  const opponentName = isLeft ? match.rightName : match.leftName;
  const opponentSeed = isLeft ? match.rightSeed : match.leftSeed;

  return `Against ${opponentName}${opponentSeed ? ` (Seed ${opponentSeed})` : ""}.`;
}

function getOpponentImageUrl(match, candidateEntryId) {
  return match.leftEntryId === candidateEntryId ? match.rightImageUrl : match.leftImageUrl;
}

function AggregateEntryDetails({
  selectedEntry,
  participants,
  viewerParticipant,
  hasOpenBallots
}) {
  if (!selectedEntry) {
    return <p className="results-empty-copy">No aggregate results available yet.</p>;
  }

  const participantScores = [...participants]
    .map((participant) => ({
      id: participant.id,
      name: participant.name || participant.email || "Anonymous voter",
      rank: participant.candidateRanks[selectedEntry.candidateId]?.finalRank ?? null
    }))
    .filter((participant) => typeof participant.rank === "number")
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.name.localeCompare(right.name);
    });

  return (
    <>
      <div className="results-details-header">
        {selectedEntry.candidateImageUrl ? (
          <BackdropRemoteImage
            src={selectedEntry.candidateImageUrl}
            alt={selectedEntry.candidateName}
            className="results-details-image"
            imageClassName="object-cover object-center"
            undersizedImageClassName="object-contain p-2"
            minimumSourceWidth={96}
            minimumSourceHeight={96}
          />
        ) : null}
        <div>
          <p className="results-kicker">Candidate Details</p>
          <h2 className="results-details-title">{selectedEntry.candidateName}</h2>
          <p className="results-details-meta">
            Rank {selectedEntry.finalRank} | Avg rank {formatRank(selectedEntry.averageRank)} | Spread{" "}
            {formatRank(selectedEntry.rankStdDev)}
          </p>
          {viewerParticipant ? (
            <p className="results-details-meta">
              Your rank {selectedEntry.yourRank ?? "n/a"} | Rank diff{" "}
              {formatSignedRankDiff(selectedEntry.rankDifference)}
            </p>
          ) : null}
        </div>
      </div>

      <section className="results-history">
        <h3 className="results-section-title">
          {hasOpenBallots ? "Participant Scores So Far" : "Participant Scores"}
        </h3>
        <div className="results-table-wrap results-table-wrap-compact">
          {participantScores.length === 0 ? (
            <p className="results-empty-copy">No completed participant ranks are available yet.</p>
          ) : (
            <table className="results-table results-table-compact">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rank</th>
                </tr>
              </thead>
              <tbody>
                {participantScores.map((participant) => (
                  <tr key={participant.id}>
                    <td>{participant.name}</td>
                    <td>{participant.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

function AggregateResultsTable({
  entries,
  selectedEntryId,
  onSelectEntry,
  sortKey,
  sortDirection,
  onToggleSort
}) {
  return (
    <div className="results-table-wrap">
      <table className="results-table parallel-results-table">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                className="results-table-sort"
                onClick={() => onToggleSort("aggregateRank")}
              >
                Aggregate Rank
                {sortKey === "aggregateRank" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
            <th>
              <button type="button" className="results-table-sort" onClick={() => onToggleSort("show")}>
                Show
                {sortKey === "show" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="results-table-sort"
                onClick={() => onToggleSort("yourRank")}
              >
                Your Rank
                {sortKey === "yourRank" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="results-table-sort"
                onClick={() => onToggleSort("rankDifference")}
              >
                Rank Diff
                {sortKey === "rankDifference" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="results-table-sort"
                onClick={() => onToggleSort("averageRank")}
              >
                Avg Rank
                {sortKey === "averageRank" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
            <th>
              <button
                type="button"
                className="results-table-sort"
                onClick={() => onToggleSort("rankStdDev")}
              >
                Spread
                {sortKey === "rankStdDev" ? ` ${sortDirection === "asc" ? "^" : "v"}` : ""}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.id}
              className={selectedEntryId === entry.id ? "results-table-row-active" : ""}
            >
              <td>
                <span className="results-ranking-rank parallel-results-table-rank">
                  {entry.finalRank}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry.id)}
                  className="results-table-entry parallel-results-table-entry"
                >
                  {entry.candidateImageUrl ? (
                    <BackdropRemoteImage
                      src={entry.candidateImageUrl}
                      alt={entry.candidateName}
                      className="results-ranking-image"
                      imageClassName="object-cover object-center"
                      undersizedImageClassName="object-contain p-1.5"
                      minimumSourceWidth={72}
                      minimumSourceHeight={72}
                    />
                  ) : null}
                  <div className="results-ranking-copy">
                    <p className="results-ranking-name">{entry.candidateName}</p>
                    <p className="results-ranking-seed">Seed {entry.seed}</p>
                  </div>
                </button>
              </td>
              <td>{typeof entry.yourRank === "number" ? entry.yourRank : "n/a"}</td>
              <td>{formatSignedRankDiff(entry.rankDifference)}</td>
              <td>{formatRank(entry.averageRank)}</td>
              <td>{formatRank(entry.rankStdDev)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CandidateHistory({
  tournament,
  selectedEntry,
  selectedParticipant,
  historyMatches
}) {
  if (!selectedParticipant) {
    return (
      <section className="results-history">
        <h3 className="results-section-title">Ballot History</h3>
        <p className="results-empty-copy">No participant ballot details are visible here.</p>
      </section>
    );
  }

  return (
    <section className="results-history">
      <h3 className="results-section-title">Ballot History</h3>
      <div className="results-history-list">
        <div className="results-history-card">
          <p className="results-history-round">Selected Voter</p>
          <div className="results-history-card-body">
            <div>
              <p className="results-history-result">
                {selectedParticipant.name || selectedParticipant.email || "Anonymous voter"}
              </p>
              <p className="results-history-opponent">
                Final rank for this candidate: #
                {selectedParticipant.candidateRanks[selectedEntry.candidateId]?.finalRank ?? "n/a"}
              </p>
            </div>
          </div>
        </div>
        {historyMatches.length === 0 ? (
          <p className="results-empty-copy">No played matches to show for this candidate.</p>
        ) : (
          historyMatches.map((match) => {
            const opponentLabel = describeHistoryOpponent(match, selectedEntry.participantEntryId);
            const opponentImageUrl = getOpponentImageUrl(match, selectedEntry.participantEntryId);

            return (
              <article key={match.id} className="results-history-card">
                <p className="results-history-round">{formatRoundLabel(match, tournament)}</p>
                <div className="results-history-card-body">
                  <div>
                    <p className="results-history-result">
                      {describeHistoryResult(match, selectedEntry.participantEntryId)}
                    </p>
                    <p className="results-history-tally">
                      Vote: {formatVoteTally(match, selectedEntry.participantEntryId)}
                    </p>
                    <p className="results-history-opponent">{opponentLabel}</p>
                  </div>
                  {opponentImageUrl ? (
                    <BackdropRemoteImage
                      src={opponentImageUrl}
                      alt={opponentLabel}
                      className="results-history-image"
                      imageClassName="object-cover object-center"
                      undersizedImageClassName="object-contain p-2"
                      minimumSourceWidth={100}
                      minimumSourceHeight={100}
                    />
                  ) : null}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

export function ParallelResultsPage({
  tournament,
  aggregateEntries,
  participants,
  completedBallotCount,
  canInspectAllParticipants,
  headerAction = null
}) {
  const [selectedEntryId, setSelectedEntryId] = useState(aggregateEntries[0]?.id ?? null);
  const [selectedParticipantId, setSelectedParticipantId] = useState("aggregate");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [aggregateSortKey, setAggregateSortKey] = useState("averageRank");
  const [aggregateSortDirection, setAggregateSortDirection] = useState("asc");
  const showingAggregate = selectedParticipantId === "aggregate";
  const viewerParticipant =
    participants.find((participant) => participant.id === tournament.viewerParticipantId) ?? null;
  const aggregateEntriesWithViewerRank = aggregateEntries.map((entry) => {
    const viewerRank = viewerParticipant?.candidateRanks?.[entry.candidateId]?.finalRank ?? null;

    return {
      ...entry,
      yourRank: viewerRank,
      rankDifference: typeof viewerRank === "number" ? viewerRank - entry.finalRank : null
    };
  });
  const selectedParticipant =
    participants.find((participant) => participant.id === selectedParticipantId) ?? null;
  const displayedEntries = showingAggregate
    ? [...aggregateEntriesWithViewerRank].sort((left, right) => {
        const leftValue =
          aggregateSortKey === "show"
            ? left.candidateName.toLowerCase()
            : aggregateSortKey === "yourRank"
              ? left.yourRank ?? Number.MAX_SAFE_INTEGER
              : left[AGGREGATE_SORT_OPTIONS[aggregateSortKey].key];
        const rightValue =
          aggregateSortKey === "show"
            ? right.candidateName.toLowerCase()
            : aggregateSortKey === "yourRank"
              ? right.yourRank ?? Number.MAX_SAFE_INTEGER
              : right[AGGREGATE_SORT_OPTIONS[aggregateSortKey].key];

        if (leftValue < rightValue) {
          return aggregateSortDirection === "asc" ? -1 : 1;
        }

        if (leftValue > rightValue) {
          return aggregateSortDirection === "asc" ? 1 : -1;
        }

        return left.finalRank - right.finalRank;
      })
    : [...aggregateEntries].sort((left, right) => {
        const leftRank = selectedParticipant?.candidateRanks[left.candidateId]?.finalRank ?? Number.MAX_SAFE_INTEGER;
        const rightRank = selectedParticipant?.candidateRanks[right.candidateId]?.finalRank ?? Number.MAX_SAFE_INTEGER;

        if (leftRank !== rightRank) {
          return leftRank - rightRank;
        }

        return left.finalRank - right.finalRank;
      });
  const selectedEntry =
    displayedEntries.find((entry) => entry.id === selectedEntryId) ?? displayedEntries[0] ?? null;

  const participantEntry =
    selectedEntry && selectedParticipant
      ? (() => {
          const candidateRank = selectedParticipant.candidateRanks[selectedEntry.candidateId];
          const participantEntryId = candidateRank?.entryId;

          return participantEntryId
            ? {
                ...selectedEntry,
                participantEntryId
              }
            : null;
        })()
      : null;

  const selectedParticipantHistory =
    participantEntry && selectedParticipant
      ? selectedParticipant.matches.filter(
          (match) =>
            isVisibleHistoryMatch(match) &&
            (match.leftEntryId === participantEntry.participantEntryId ||
              match.rightEntryId === participantEntry.participantEntryId)
        )
      : [];
  const participantCount = tournament.participantCount ?? completedBallotCount;
  const hasOpenBallots =
    tournament.status !== "complete" ||
    completedBallotCount < participantCount;
  const progressLabel =
    participantCount > 0
      ? `${completedBallotCount}/${participantCount} ballots complete`
      : `${completedBallotCount} completed ballots`;

  function handleSelectEntry(entryId) {
    setSelectedEntryId(entryId);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  }

  function handleToggleAggregateSort(nextKey) {
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
              <div className="results-ranking-list">
                {displayedEntries.map((entry, index) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => handleSelectEntry(entry.id)}
                    className={`results-ranking-item ${
                      selectedEntry?.id === entry.id
                        ? "results-ranking-item-active"
                        : "results-ranking-item-idle"
                    }`}
                  >
                    <span className="results-ranking-rank">
                      {selectedParticipant?.candidateRanks[entry.candidateId]?.finalRank ?? index + 1}
                    </span>
                    {entry.candidateImageUrl ? (
                      <BackdropRemoteImage
                        src={entry.candidateImageUrl}
                        alt={entry.candidateName}
                        className="results-ranking-image"
                        imageClassName="object-cover object-center"
                        undersizedImageClassName="object-contain p-1.5"
                        minimumSourceWidth={72}
                        minimumSourceHeight={72}
                      />
                    ) : null}
                    <div className="results-ranking-copy">
                      <p className="results-ranking-name">{entry.candidateName}</p>
                      <p className="results-ranking-seed">Seed {entry.seed}</p>
                    </div>
                  </button>
                ))}
              </div>
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
            ) : selectedEntry ? (
              <>
                <div className="results-details-header">
                  {selectedEntry.candidateImageUrl ? (
                    <BackdropRemoteImage
                      src={selectedEntry.candidateImageUrl}
                      alt={selectedEntry.candidateName}
                      className="results-details-image"
                      imageClassName="object-cover object-center"
                      undersizedImageClassName="object-contain p-2"
                      minimumSourceWidth={96}
                      minimumSourceHeight={96}
                    />
                  ) : null}
                  <div>
                    <p className="results-kicker">Candidate Details</p>
                    <h2 className="results-details-title">{selectedEntry.candidateName}</h2>
                    <p className="results-details-meta">
                      Rank {selectedParticipant?.candidateRanks[selectedEntry.candidateId]?.finalRank ?? "n/a"} | Seed{" "}
                      {selectedEntry.seed} | {selectedParticipant?.name || selectedParticipant?.email || "Anonymous voter"}
                    </p>
                  </div>
                </div>

                <CandidateHistory
                  tournament={tournament}
                  selectedEntry={participantEntry ?? selectedEntry}
                  selectedParticipant={selectedParticipant}
                  historyMatches={selectedParticipantHistory}
                />
              </>
            ) : (
              <p className="results-empty-copy">No completed ballots yet.</p>
            )}
          </aside>
        </div>
      </section>
      {isDrawerOpen && selectedEntry ? (
        <div className="results-drawer-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div
            className="results-drawer ui-scroll-subtle"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="results-drawer-header">
              <p className="results-section-title">Candidate Details</p>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="results-drawer-close"
              >
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
                <>
                  <div className="results-details-header">
                    {selectedEntry.candidateImageUrl ? (
                      <BackdropRemoteImage
                        src={selectedEntry.candidateImageUrl}
                        alt={selectedEntry.candidateName}
                        className="results-details-image"
                        imageClassName="object-cover object-center"
                        undersizedImageClassName="object-contain p-2"
                        minimumSourceWidth={96}
                        minimumSourceHeight={96}
                      />
                    ) : null}
                    <div>
                      <p className="results-kicker">Candidate Details</p>
                      <h2 className="results-details-title">{selectedEntry.candidateName}</h2>
                      <p className="results-details-meta">
                        Rank {selectedParticipant?.candidateRanks[selectedEntry.candidateId]?.finalRank ?? "n/a"} | Seed{" "}
                        {selectedEntry.seed}
                      </p>
                    </div>
                  </div>
                  <CandidateHistory
                    tournament={tournament}
                    selectedEntry={participantEntry ?? selectedEntry}
                    selectedParticipant={selectedParticipant}
                    historyMatches={selectedParticipantHistory}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

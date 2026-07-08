"use client";

import { useState } from "react";
import { BackdropRemoteImage } from "@/components/resilient-remote-image";

function formatRank(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "n/a";
  }

  return value.toFixed(2).replace(/\.00$/, "");
}

function formatRoundLabel(match, tournament) {
  if (tournament.resultMode === "full_ranking" || tournament.resultMode === "parallel_full_ranking") {
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
  const showingAggregate = selectedParticipantId === "aggregate";
  const selectedParticipant =
    participants.find((participant) => participant.id === selectedParticipantId) ?? null;
  const displayedEntries = showingAggregate
    ? aggregateEntries
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

  function handleSelectEntry(entryId) {
    if (showingAggregate) {
      return;
    }

    setSelectedEntryId(entryId);

    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  }

  return (
    <div className="results-page">
      <section className="results-shell">
        <header className="results-header">
          <div className="results-header-row">
            <div className="results-header-copy">
              <p className="results-kicker">Bracket Results</p>
              <h1 className="results-title">{tournament.title}</h1>
              <p className="results-meta">
                Parallel full ranking | {aggregateEntries.length} ranked entries | {completedBallotCount} completed ballots
              </p>
              <p className="results-meta">
                Aggregates update as more personal brackets finish. Incomplete brackets are excluded.
              </p>
            </div>
            <div className="results-header-action">
              <div className="flex items-center gap-3">
                <select
                  value={selectedParticipantId}
                  onChange={(event) => setSelectedParticipantId(event.target.value)}
                  className="ui-field ui-field-panel ui-field-select min-w-[15rem]"
                >
                  <option value="aggregate">Final Results</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name || participant.email || "Anonymous voter"}
                    </option>
                  ))}
                </select>
                {headerAction}
              </div>
            </div>
          </div>
        </header>

        <div className="results-grid">
          <section className="results-ranking-rail">
            <h2 className="results-section-title">Final Ranking</h2>
            <div className="results-ranking-list">
              {displayedEntries.map((entry, index) =>
                showingAggregate ? (
                  <div key={entry.id} className="results-ranking-item results-ranking-item-idle">
                    <span className="results-ranking-rank">{entry.finalRank}</span>
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
                      <p className="results-ranking-seed">
                        Avg rank {formatRank(entry.averageRank)} | Spread {formatRank(entry.rankStdDev)}
                      </p>
                    </div>
                  </div>
                ) : (
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
                      <p className="results-ranking-seed">
                        Seed {entry.seed}
                      </p>
                    </div>
                  </button>
                )
              )}
            </div>
          </section>

          <aside className="results-details-rail ui-scroll-subtle">
            {showingAggregate ? (
              <section className="results-history">
                <h3 className="results-section-title">Final Results</h3>
                <div className="results-history-list">
                  <article className="results-history-card">
                    <p className="results-history-round">Aggregate Summary</p>
                    <div className="results-history-card-body">
                      <div>
                        <p className="results-history-result">{completedBallotCount} completed ballots</p>
                        <p className="results-history-opponent">
                          Aggregates update as more personal brackets finish. Incomplete brackets are excluded.
                        </p>
                      </div>
                    </div>
                  </article>
                </div>
              </section>
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
      {isDrawerOpen && selectedEntry && !showingAggregate ? (
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
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

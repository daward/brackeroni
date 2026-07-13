"use client";

import { useState } from "react";
import { BackdropRemoteImage } from "@/components/resilient-remote-image";
import {
  formatResultModeLabel,
  usesOpenEndedRankingMode,
  usesSwissResultMode
} from "@/lib/bracket-modes";

function formatRoundLabel(match, tournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    return `Swiss Round ${match.roundNumber}`;
  }

  return `Round ${match.roundNumber}`;
}

function isContestedMatch(match) {
  return Boolean(match.leftEntryId && match.rightEntryId);
}

function isVisibleHistoryMatch(match) {
  return isContestedMatch(match) && match.status !== "auto_resolved";
}

function getEntryRecordStats(matches, entryId) {
  const relevantMatches = matches.filter(
    (match) =>
      isVisibleHistoryMatch(match) &&
      (match.leftEntryId === entryId || match.rightEntryId === entryId) &&
      match.winnerEntryId
  );
  const wins = relevantMatches.filter((match) => match.winnerEntryId === entryId).length;
  const losses = relevantMatches.length - wins;
  const played = relevantMatches.length;
  const winPct = played > 0 ? wins / played : 0;

  return {
    wins,
    losses,
    played,
    winPct
  };
}

function orderResultEntries(entries, matches, tournament) {
  return [...entries].sort((left, right) => {
    if (tournament.resultMode === "winner_only") {
      const leftStats = getEntryRecordStats(matches, left.id);
      const rightStats = getEntryRecordStats(matches, right.id);

      if (left.id === tournament.winnerEntryId) {
        return -1;
      }

      if (right.id === tournament.winnerEntryId) {
        return 1;
      }

      if (leftStats.winPct !== rightStats.winPct) {
        return rightStats.winPct - leftStats.winPct;
      }

      if (leftStats.wins !== rightStats.wins) {
        return rightStats.wins - leftStats.wins;
      }

      if (leftStats.played !== rightStats.played) {
        return rightStats.played - leftStats.played;
      }
    }

    const leftRank = left.finalRank ?? Number.MAX_SAFE_INTEGER;
    const rightRank = right.finalRank ?? Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.seed - right.seed;
  });
}

function formatRecord(matches, entryId) {
  const { wins, losses } = getEntryRecordStats(matches, entryId);
  return `${wins}-${losses}`;
}

function describeHistoryResult(match, entryId) {
  return match.winnerEntryId === entryId ? "Won" : "Lost";
}

function describeUserVote(match, entryId) {
  if (!match.userVoteEntryId) {
    return null;
  }

  return match.userVoteEntryId === entryId
    ? { label: "You voted for this pick", className: "results-history-vote-for" }
    : { label: "You voted against it", className: "results-history-vote-against" };
}

function describeHistoryOpponent(match, entryId) {
  const isLeft = match.leftEntryId === entryId;
  const opponentName = isLeft ? match.rightName : match.leftName;
  const opponentSeed = isLeft ? match.rightSeed : match.leftSeed;

  if (!opponentName) {
    return "Advanced on a bye.";
  }

  return `Against ${opponentName}${opponentSeed ? ` (Seed ${opponentSeed})` : ""}.`;
}

function getOpponentImageUrl(match, entryId) {
  return match.leftEntryId === entryId ? match.rightImageUrl : match.leftImageUrl;
}

function formatVoteTally(match, entryId) {
  const isLeft = match.leftEntryId === entryId;
  const selectedVotes = isLeft ? match.leftVoteCount : match.rightVoteCount;
  const opponentVotes = isLeft ? match.rightVoteCount : match.leftVoteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

function getDisplayRank(entry, orderedEntries, fallbackIndex = 0) {
  if (entry?.finalRank) {
    return entry.finalRank;
  }

  const orderedIndex = orderedEntries.findIndex((candidate) => candidate.id === entry?.id);
  return (orderedIndex >= 0 ? orderedIndex : fallbackIndex) + 1;
}

function ResultEntryDetails({ tournament, orderedEntries, selectedEntry, selectedEntryHistory }) {
  if (!selectedEntry) {
    return <p className="results-empty-copy">No result details available.</p>;
  }

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
            Rank {getDisplayRank(selectedEntry, orderedEntries)} | Seed {selectedEntry.seed} | {" "}
            {formatRecord(selectedEntryHistory, selectedEntry.id)}
          </p>
        </div>
      </div>

      <section className="results-history">
        <h3 className="results-section-title">Match History</h3>
        <div className="results-history-list">
          {selectedEntryHistory.length === 0 ? (
            <p className="results-empty-copy">No played matches to show yet.</p>
          ) : (
            selectedEntryHistory.map((match) => {
              const voteNote = describeUserVote(match, selectedEntry.id);
              const opponentLabel = describeHistoryOpponent(match, selectedEntry.id);
              const opponentImageUrl = getOpponentImageUrl(match, selectedEntry.id);

              return (
                <article key={match.id} className="results-history-card">
                  <p className="results-history-round">{formatRoundLabel(match, tournament)}</p>
                  <div className="results-history-card-body">
                    <div>
                      <p className="results-history-result">
                        {describeHistoryResult(match, selectedEntry.id)}
                      </p>
                      {voteNote ? (
                        <p className={`results-history-vote-note ${voteNote.className}`}>
                          {voteNote.label}
                        </p>
                      ) : null}
                      <p className="results-history-tally">
                        Vote: {formatVoteTally(match, selectedEntry.id)}
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
    </>
  );
}

export function TournamentResultsPage({
  tournament,
  matches,
  headerAction = null,
  headerNotice = null
}) {
  const orderedEntries = orderResultEntries(tournament.entries ?? [], matches ?? [], tournament);
  const [selectedEntryId, setSelectedEntryId] = useState(orderedEntries[0]?.id ?? null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const selectedEntry =
    orderedEntries.find((entry) => entry.id === selectedEntryId) ?? orderedEntries[0] ?? null;
  const selectedEntryHistory = selectedEntry
    ? matches.filter(
        (match) =>
          isVisibleHistoryMatch(match) &&
          (match.leftEntryId === selectedEntry.id || match.rightEntryId === selectedEntry.id)
      )
    : [];

  function handleSelectEntry(entryId) {
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
                {formatResultModeLabel(tournament.resultMode)} | {orderedEntries.length} ranked
                entries
              </p>
              {headerNotice ? <div className="mt-4">{headerNotice}</div> : null}
            </div>
            {headerAction ? <div className="results-header-action">{headerAction}</div> : null}
          </div>
        </header>

        <div className="results-grid">
          <section className="results-ranking-rail">
            <h2 className="results-section-title">Final Ranking</h2>
            <div className="results-ranking-list">
              {orderedEntries.map((entry, index) => (
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
                    {getDisplayRank(entry, orderedEntries, index)}
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
          </section>

          <aside className="results-details-rail ui-scroll-subtle">
            <ResultEntryDetails
              tournament={tournament}
              orderedEntries={orderedEntries}
              selectedEntry={selectedEntry}
              selectedEntryHistory={selectedEntryHistory}
            />
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
            <ResultEntryDetails
              tournament={tournament}
              orderedEntries={orderedEntries}
              selectedEntry={selectedEntry}
              selectedEntryHistory={selectedEntryHistory}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

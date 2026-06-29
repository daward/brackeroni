"use client";

import { useState } from "react";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

function formatRoundLabel(match, tournament) {
  if (tournament.resultMode === "full_ranking") {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  if (tournament.resultMode === "fast_full_rank") {
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
    ? { label: "✓ You voted for this pick", className: "text-[var(--accent-2)]" }
    : { label: "✓ You voted against it", className: "text-[var(--accent)]" };
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
    return <p className="text-sm text-[var(--muted)]">No result details available.</p>;
  }

  return (
    <>
      <div className="flex items-start gap-4 border-b border-[var(--line)] pb-4">
        {selectedEntry.candidateImageUrl ? (
          <ResilientRemoteImage
            src={selectedEntry.candidateImageUrl}
            alt={selectedEntry.candidateName}
            className="h-20 w-20 rounded-sm object-cover"
          />
        ) : null}
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Candidate Details
          </p>
          <h2 className="display-face mt-2 text-2xl font-black">{selectedEntry.candidateName}</h2>
          <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
            Rank {getDisplayRank(selectedEntry, orderedEntries)} • Seed {selectedEntry.seed} •{" "}
            {formatRecord(selectedEntryHistory, selectedEntry.id)}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
          Match History
        </p>
        <div className="mt-4 space-y-3">
          {selectedEntryHistory.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No played matches to show yet.</p>
          ) : (
            selectedEntryHistory.map((match) => (
              <div
                key={match.id}
                className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {formatRoundLabel(match, tournament)}
                </p>
                <div className="mt-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="display-face text-lg font-black">
                      {describeHistoryResult(match, selectedEntry.id)}
                    </p>
                    {describeUserVote(match, selectedEntry.id) ? (
                      <p
                        className={`mt-1 text-xs uppercase tracking-[0.18em] ${
                          describeUserVote(match, selectedEntry.id).className
                        }`}
                      >
                        {describeUserVote(match, selectedEntry.id).label}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Vote: {formatVoteTally(match, selectedEntry.id)}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                      {describeHistoryOpponent(match, selectedEntry.id)}
                    </p>
                  </div>
                  {getOpponentImageUrl(match, selectedEntry.id) ? (
                    <ResilientRemoteImage
                      src={getOpponentImageUrl(match, selectedEntry.id)}
                      alt={describeHistoryOpponent(match, selectedEntry.id)}
                      className="h-20 w-28 flex-shrink-0 rounded-sm object-cover object-center sm:h-24 sm:w-32"
                    />
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export function TournamentResultsPage({ tournament, matches }) {
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
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
              Bracket Results
            </p>
            <h1 className="display-face mt-2 text-3xl font-black">{tournament.title}</h1>
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
              {tournament.resultMode.replace("_", " ")} • {orderedEntries.length} ranked entries
            </p>
          </div>
        </div>

        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="bg-[var(--panel)] px-5 py-5">
            <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
              Final Ranking
            </p>
            <div className="mt-4 space-y-2">
              {orderedEntries.map((entry, index) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleSelectEntry(entry.id)}
                  className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${
                    selectedEntry?.id === entry.id
                      ? "border-[var(--accent-3)] bg-[var(--panel-2)]"
                      : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent-2)]"
                  }`}
                >
                  <span className="display-face w-12 text-lg font-black uppercase text-[var(--accent-2)]">
                    {getDisplayRank(entry, orderedEntries, index)}
                  </span>
                  {entry.candidateImageUrl ? (
                    <ResilientRemoteImage
                      src={entry.candidateImageUrl}
                      alt={entry.candidateName}
                      className="h-12 w-12 rounded-sm object-cover"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="display-face truncate text-sm font-black">{entry.candidateName}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                      Seed {entry.seed}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="ui-scroll-subtle hidden bg-[var(--panel)] px-5 py-5 lg:block lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
            <ResultEntryDetails
              tournament={tournament}
              orderedEntries={orderedEntries}
              selectedEntry={selectedEntry}
              selectedEntryHistory={selectedEntryHistory}
            />
          </div>
        </div>
      </section>
      {isDrawerOpen && selectedEntry ? (
        <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setIsDrawerOpen(false)}>
          <div
            className="ui-scroll-subtle absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto border-t border-[var(--line)] bg-[var(--panel)] px-5 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                Candidate Details
              </p>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]"
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

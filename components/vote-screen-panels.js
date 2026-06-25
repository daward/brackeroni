"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StatusPill } from "@/components/status-pill";

function openMatchesForTournament(tournament) {
  return (tournament.matches || []).filter(
    (match) => match.status === "open" && !match.userVoteEntryId
  );
}

function proxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

function formatRoundLabel(match, tournament) {
  if (tournament.resultMode === "full_ranking") {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  return `Round ${match.roundNumber}`;
}

function isContestedMatch(match) {
  return Boolean(match.leftEntryId && match.rightEntryId);
}

function isVisibleHistoryMatch(match) {
  return isContestedMatch(match) && match.status !== "auto_resolved";
}

function buildCreateReturnUrl(tournamentId, stage = "active") {
  return `/create?stage=${stage}&tournament=${tournamentId}`;
}

function buildResultsUrl(tournamentId) {
  return `/results/${tournamentId}`;
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

export function VoteScreenPanels({
  activeTournaments,
  completedTournaments,
  initialFocusedTournamentId = null,
  initialResultsTournamentId = null,
  initialReturnTo = null
}) {
  const router = useRouter();
  const [active, setActive] = useState(activeTournaments);
  const [completed, setCompleted] = useState(completedTournaments);
  const [focusedTournamentId, setFocusedTournamentId] = useState(initialFocusedTournamentId);
  const [resultsTournament, setResultsTournament] = useState(null);
  const [resultsEntries, setResultsEntries] = useState([]);
  const [resultsMatches, setResultsMatches] = useState([]);
  const [selectedResultEntryId, setSelectedResultEntryId] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [postRoundPollCount, setPostRoundPollCount] = useState(0);

  const focusedTournament =
    active.find((tournament) => tournament.id === focusedTournamentId) ?? null;
  const focusedMatches = focusedTournament ? openMatchesForTournament(focusedTournament) : [];
  const focusedMatch = focusedMatches[0] ?? null;
  const selectedResultEntry =
    resultsEntries.find((entry) => entry.id === selectedResultEntryId) ?? resultsEntries[0] ?? null;
  const selectedResultHistory = selectedResultEntry
    ? resultsMatches.filter(
        (match) =>
          isVisibleHistoryMatch(match) &&
          (match.leftEntryId === selectedResultEntry.id ||
            match.rightEntryId === selectedResultEntry.id)
      )
    : [];
  const waitingTournamentIds = active
    .filter((tournament) => openMatchesForTournament(tournament).length === 0)
    .map((tournament) => tournament.id)
    .sort();
  const waitingTournamentKey = waitingTournamentIds.join(":");
  const shouldReturnToCreate = initialReturnTo === "create";
  const postRoundPollEnabled =
    waitingTournamentIds.length > 0 &&
    postRoundPollCount < 18 &&
    !pendingVoteMatchId &&
    !resultsTournament &&
    !shouldReturnToCreate;
  const isFocusedTournamentWaiting =
    Boolean(focusedTournament) &&
    !focusedMatch &&
    waitingTournamentIds.includes(focusedTournament.id) &&
    postRoundPollEnabled;

  useEffect(() => {
    if (!initialResultsTournamentId || resultsTournament) {
      return;
    }

    const requestedTournament = completed.find(
      (tournament) => tournament.id === initialResultsTournamentId
    );

    if (requestedTournament) {
      openResultsModal(requestedTournament);
    }
  }, [completed, initialResultsTournamentId, resultsTournament]);

  useEffect(() => {
    setPostRoundPollCount(0);
  }, [waitingTournamentKey]);

  useEffect(() => {
    if (!postRoundPollEnabled) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        await Promise.all(waitingTournamentIds.map((tournamentId) => refreshTournamentState(tournamentId)));
      } finally {
        setPostRoundPollCount((current) => current + 1);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [postRoundPollEnabled, postRoundPollCount, waitingTournamentKey]);

  useEffect(() => {
    if (!focusedTournamentId) {
      return;
    }

    if (focusedTournament) {
      return;
    }

    setFocusedTournamentId(null);
  }, [focusedTournamentId, focusedTournament]);

  useEffect(() => {
    if (!focusedTournament) {
      return;
    }

    if (focusedMatch || isFocusedTournamentWaiting) {
      return;
    }

    setFocusedTournamentId(null);
  }, [focusedTournament, focusedMatch, isFocusedTournamentWaiting]);

  useEffect(() => {
    if (!shouldReturnToCreate || !focusedTournament || focusedMatch || pendingVoteMatchId) {
      return;
    }

    router.replace(buildCreateReturnUrl(focusedTournament.id, "active"));
  }, [shouldReturnToCreate, focusedTournament, focusedMatch, pendingVoteMatchId, router]);

  async function vote(matchId, tournamentId, selectedEntryId) {
    if (pendingVoteMatchId) {
      return;
    }

    setError("");
    setMessage("");
    setTransitionMessage("");
    setPendingVoteMatchId(matchId);

    const response = await fetch(`/api/matches/${matchId}/votes`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ selectedEntryId })
    });
    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400 && data.error?.code === "MATCH_NOT_OPEN") {
        setTransitionMessage("That round closed before your vote was submitted, so it did not count.");
        await refreshTournamentState(tournamentId);
        setMessage("That round already closed. Moving you to the latest bracket state.");
        setPendingVoteMatchId(null);
        return;
      }

      if (response.status === 409 && data.error?.code === "ALREADY_VOTED") {
        setTransitionMessage("");
        await refreshTournamentState(tournamentId);
        setMessage("That vote was already recorded. Moving to the next available matchup.");
        setPendingVoteMatchId(null);
        return;
      }

      setError(data.error?.message || "Failed to record vote.");
      setPendingVoteMatchId(null);
      return;
    }

    const [matchResponse, tournamentResponse] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/matches`, {
        cache: "no-store"
      }),
      fetch(`/api/tournaments/${tournamentId}`, {
        cache: "no-store"
      })
    ]);

    const matchData = await matchResponse.json();
    const tournamentData = await tournamentResponse.json();

    if (!matchResponse.ok) {
      setError(matchData.error?.message || "Failed to refresh matches.");
      setPendingVoteMatchId(null);
      return;
    }

    if (!tournamentResponse.ok) {
        setError(tournamentData.error?.message || "Failed to refresh bracket.");
      setPendingVoteMatchId(null);
      return;
    }

    if (tournamentData.item.status === "complete") {
      setTransitionMessage("");
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [tournamentData.item, ...current]);
      setFocusedTournamentId(null);
      router.replace(buildResultsUrl(tournamentId));
      return;
    }

    const refreshedTournament = {
      ...tournamentData.item,
      matches: matchData.items
    };
    const remainingOpenMatches = openMatchesForTournament(refreshedTournament).length;

    setActive((current) =>
      current.map((tournament) => (tournament.id === tournamentId ? refreshedTournament : tournament))
    );
    setFocusedTournamentId(tournamentId);
    setMessage(
      remainingOpenMatches > 0
        ? "Vote recorded. Next matchup ready."
        : shouldReturnToCreate
          ? "Vote recorded. Returning to create."
          : "Vote recorded. No open matches remain in this round. Checking for the next round."
    );
    setPendingVoteMatchId(null);
  }

  async function refreshTournamentState(tournamentId) {
    const [matchResponse, tournamentResponse] = await Promise.all([
      fetch(`/api/tournaments/${tournamentId}/matches`, {
        cache: "no-store"
      }),
      fetch(`/api/tournaments/${tournamentId}`, {
        cache: "no-store"
      })
    ]);

    const matchData = await matchResponse.json();
    const tournamentData = await tournamentResponse.json();

    if (!matchResponse.ok) {
      setError(matchData.error?.message || "Failed to refresh matches.");
      return;
    }

    if (!tournamentResponse.ok) {
      setError(tournamentData.error?.message || "Failed to refresh bracket.");
      return;
    }

    if (tournamentData.item.status === "complete") {
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [tournamentData.item, ...current]);
      setFocusedTournamentId(null);
      router.replace(buildResultsUrl(tournamentId));
      return;
    }

    const refreshedTournament = {
      ...tournamentData.item,
      matches: matchData.items
    };
    const remainingOpenMatches = openMatchesForTournament(refreshedTournament).length;

    setActive((current) =>
      current.map((tournament) => (tournament.id === tournamentId ? refreshedTournament : tournament))
    );
    setFocusedTournamentId(
      focusedTournamentId === tournamentId || remainingOpenMatches > 0 ? tournamentId : null
    );
  }

  async function openResultsModal(tournament) {
    setError("");
    setMessage("");
    setResultsTournament(tournament);
    setResultsEntries([]);
    setResultsMatches([]);
    setSelectedResultEntryId(null);
    setResultsLoading(true);

    try {
      const [tournamentResponse, matchesResponse] = await Promise.all([
        fetch(`/api/tournaments/${tournament.id}`, {
          cache: "no-store"
        }),
        fetch(`/api/tournaments/${tournament.id}/matches`, {
          cache: "no-store"
        })
      ]);
      const data = await tournamentResponse.json();
      const matchData = await matchesResponse.json();

      if (!tournamentResponse.ok) {
        setError(data.error?.message || "Failed to load bracket results.");
        setResultsTournament(null);
        return;
      }

      if (!matchesResponse.ok) {
        setError(matchData.error?.message || "Failed to load bracket history.");
        setResultsTournament(null);
        return;
      }

      const orderedEntries = orderResultEntries(data.item?.entries ?? [], matchData.items ?? [], data.item);

      setResultsEntries(orderedEntries);
      setResultsMatches(matchData.items ?? []);
      setSelectedResultEntryId(orderedEntries[0]?.id ?? null);
    } catch {
      setError("Failed to load bracket results.");
      setResultsTournament(null);
    } finally {
      setResultsLoading(false);
    }
  }

  function closeResultsView() {
    setResultsTournament(null);
    setResultsEntries([]);
    setResultsMatches([]);
    setSelectedResultEntryId(null);
  }

  if (resultsTournament) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          {error ? (
            <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)]">
              {message}
            </p>
          ) : null}
        </div>

        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Bracket Results
              </p>
              <h2 className="display-face mt-2 text-3xl font-black">
                {resultsTournament.title}
              </h2>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {resultsTournament.resultMode.replace("_", " ")} • {resultsEntries.length} ranked entries
              </p>
            </div>
            <button
              type="button"
              onClick={closeResultsView}
              className="display-face border border-[var(--line)] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
            >
              Back To Index
            </button>
          </div>

          {resultsLoading ? (
            <div className="px-5 py-6">
              <p className="text-sm text-[var(--muted)]">Loading results...</p>
            </div>
          ) : (
            <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[0.9fr_1.1fr]">
              <div className="bg-[var(--panel)] px-5 py-5">
                <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                  Final Ranking
                </p>
                <div className="mt-4 space-y-2">
                  {resultsEntries.map((entry, index) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => setSelectedResultEntryId(entry.id)}
                      className={`flex w-full items-center gap-3 border px-3 py-3 text-left transition ${
                        selectedResultEntry?.id === entry.id
                          ? "border-[var(--accent-3)] bg-[var(--panel-2)]"
                          : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent-2)]"
                      }`}
                    >
                      <span className="display-face w-12 text-lg font-black uppercase text-[var(--accent-2)]">
                        {entry.finalRank ?? index + 1}
                      </span>
                      {entry.candidateImageUrl ? (
                        <img
                          src={proxiedImageUrl(entry.candidateImageUrl)}
                          alt={entry.candidateName}
                          className="h-12 w-12 rounded-sm object-cover"
                        />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="display-face truncate text-sm font-black">
                          {entry.candidateName}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                          Seed {entry.seed}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[var(--panel)] px-5 py-5 lg:self-start lg:sticky lg:top-4">
                {selectedResultEntry ? (
                  <>
                    <div className="flex items-start gap-4 border-b border-[var(--line)] pb-4">
                      {selectedResultEntry.candidateImageUrl ? (
                        <img
                          src={proxiedImageUrl(selectedResultEntry.candidateImageUrl)}
                          alt={selectedResultEntry.candidateName}
                          className="h-20 w-20 rounded-sm object-cover"
                        />
                      ) : null}
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                          Candidate Details
                        </p>
                        <h3 className="display-face mt-2 text-2xl font-black">
                          {selectedResultEntry.candidateName}
                        </h3>
                        <p className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                          Rank {selectedResultEntry.finalRank ?? "Unranked"} • Seed {selectedResultEntry.seed} •{" "}
                          {formatRecord(selectedResultHistory, selectedResultEntry.id)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5">
                      <p className="display-face text-sm font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                        Match History
                      </p>
                      <div className="mt-4 space-y-3">
                        {selectedResultHistory.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">No played matches to show yet.</p>
                        ) : (
                          selectedResultHistory.map((match) => (
                            <div
                              key={match.id}
                              className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
                            >
                              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
                                {formatRoundLabel(match, resultsTournament)}
                              </p>
                              <div className="mt-3 flex items-start justify-between gap-4">
                              <div>
                                <p className="display-face text-lg font-black">
                                  {describeHistoryResult(match, selectedResultEntry.id)}
                                </p>
                                {describeUserVote(match, selectedResultEntry.id) ? (
                                  <p
                                    className={`mt-1 text-xs uppercase tracking-[0.18em] ${
                                      describeUserVote(match, selectedResultEntry.id).className
                                    }`}
                                  >
                                    {describeUserVote(match, selectedResultEntry.id).label}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                  Vote tally {formatVoteTally(match, selectedResultEntry.id)}
                                </p>
                                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                                    {describeHistoryOpponent(match, selectedResultEntry.id)}
                                  </p>
                                </div>
                                {getOpponentImageUrl(match, selectedResultEntry.id) ? (
                                  <img
                                    src={proxiedImageUrl(
                                      getOpponentImageUrl(match, selectedResultEntry.id)
                                    )}
                                    alt={describeHistoryOpponent(match, selectedResultEntry.id)}
                                    className="h-16 w-16 rounded-sm object-cover"
                                  />
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--muted)]">No result details available.</p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {error ? (
          <p className="border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)]">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)]">
            {message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
              Open Matches
            </h2>
          </div>
          {active.length === 0 ? (
            <div className="px-5 py-8">
              <div className="border border-[var(--line)] bg-[var(--panel-2)] px-5 py-6">
                <p className="display-face text-xl font-black text-[var(--muted)]">
                  No Active Brackets
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                  Nothing is waiting on a vote.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-0">
              {active.map((tournament) => {
                const openMatches = openMatchesForTournament(tournament);

                return (
                  <div
                    key={tournament.id}
                    className="border-b border-[var(--line)] bg-[var(--panel-2)] p-5 last:border-b-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="display-face text-2xl font-black">
                          {tournament.title}
                        </h3>
                        <p className="mt-1 text-sm uppercase tracking-[0.15em] text-[var(--muted)]">
                          {tournament.sharingMode.replace("_", " ")} • {tournament.entryCount} entries
                        </p>
                      </div>
                      <StatusPill>{tournament.status}</StatusPill>
                    </div>
                    <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line)] pt-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                          {openMatches.length} open {openMatches.length === 1 ? "match" : "matches"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                          Pool: {tournament.sourcePoolName || "Unknown pool"}.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFocusedTournamentId(tournament.id)}
                        disabled={openMatches.length === 0}
                        className="display-face border border-[var(--accent)] bg-[var(--accent)] px-4 py-3 text-sm font-bold uppercase tracking-[0.18em] text-black transition hover:bg-[var(--accent-2)] disabled:border-[var(--line)] disabled:bg-[var(--panel-3)] disabled:text-[var(--muted)]"
                      >
                        Vote
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">Completed</h2>
          </div>
          <div className="space-y-4 px-5 py-5">
            {completed.length === 0 ? (
              <div className="border border-[var(--line)] bg-[var(--panel-2)] px-5 py-6">
                <p className="display-face text-xl font-black text-[var(--muted)]">
                  No Completed Brackets
                </p>
              </div>
            ) : (
              completed.map((tournament) => (
                <button
                  key={tournament.id}
                  type="button"
                  onClick={() => openResultsModal(tournament)}
                  className="w-full border border-[var(--line)] bg-[var(--panel-2)] px-5 py-4 text-left transition hover:border-[var(--accent-3)] hover:bg-[var(--panel)]"
                >
                  <h3 className="display-face text-lg font-black">{tournament.title}</h3>
                  {tournament.winnerName ? (
                    <p className="mt-3 display-face text-xl font-black text-[var(--accent-3)]">
                      Winner: {tournament.winnerName}
                      {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
                    </p>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </section>
      </div>

      {focusedTournament && focusedMatch ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-4 py-6">
          <div className="mx-auto w-full max-w-6xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                  {formatRoundLabel(focusedMatch, focusedTournament)}
                </p>
                <h2 className="display-face mt-2 text-3xl font-black">
                  {focusedTournament.title}
                </h2>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  {focusedMatches.length} open {focusedMatches.length === 1 ? "match" : "matches"} remain
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFocusedTournamentId(null)}
                className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            {transitionMessage ? (
              <div className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4">
                <p className="text-sm leading-6 text-[var(--accent-2)]">{transitionMessage}</p>
              </div>
            ) : null}

            <div className="grid gap-px bg-[var(--line)] md:grid-cols-[1fr_auto_1fr]">
              <CandidateVoteCard
                name={focusedMatch.leftName}
                seed={focusedMatch.leftSeed}
                description={focusedMatch.leftDescription}
                imageUrl={focusedMatch.leftImageUrl}
                disabled={pendingVoteMatchId === focusedMatch.id}
                onVote={() => vote(focusedMatch.id, focusedTournament.id, focusedMatch.leftEntryId)}
              />
              <div className="flex items-center justify-center bg-[var(--panel-3)] px-6 py-8">
                <p className="display-face text-2xl font-black tracking-[0.18em] text-[var(--accent-2)]">
                  Vs
                </p>
              </div>
              <CandidateVoteCard
                name={focusedMatch.rightName}
                seed={focusedMatch.rightSeed}
                description={focusedMatch.rightDescription}
                imageUrl={focusedMatch.rightImageUrl}
                disabled={pendingVoteMatchId === focusedMatch.id}
                onVote={() => vote(focusedMatch.id, focusedTournament.id, focusedMatch.rightEntryId)}
              />
            </div>
          </div>
        </div>
      ) : null}

      {focusedTournament && isFocusedTournamentWaiting ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 px-4 py-6">
          <div className="mx-auto w-full max-w-3xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Round Complete
              </p>
              <h2 className="display-face mt-2 text-3xl font-black">{focusedTournament.title}</h2>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                Waiting for the next round to open
              </p>
            </div>
            <div className="space-y-5 px-5 py-6">
              {transitionMessage ? (
                <p className="text-sm leading-7 text-[var(--accent-2)]">{transitionMessage}</p>
              ) : null}
              <p className="text-sm leading-7 text-[var(--ink)]">
                Your current round is done. This page will keep checking for the next matchup and
                update automatically when it opens.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Polling
                  </p>
                  <p className="display-face mt-2 text-xl font-black text-[var(--accent-2)]">
                    Every 10 seconds
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Checks Remaining
                  </p>
                  <p className="display-face mt-2 text-xl font-black text-[var(--accent-2)]">
                    {Math.max(18 - postRoundPollCount, 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
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

function getOpponentImageUrl(match, entryId) {
  const isLeft = match.leftEntryId === entryId;
  return isLeft ? match.rightImageUrl : match.leftImageUrl;
}

function formatVoteTally(match, entryId) {
  const isLeft = match.leftEntryId === entryId;
  const selectedVotes = isLeft ? match.leftVoteCount : match.rightVoteCount;
  const opponentVotes = isLeft ? match.rightVoteCount : match.leftVoteCount;

  return `${selectedVotes}-${opponentVotes}`;
}

function formatRecord(matches, entryId) {
  const { wins, losses } = getEntryRecordStats(matches, entryId);

  return `${wins}-${losses}`;
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

function CandidateVoteCard({
  name,
  seed,
  description,
  imageUrl,
  onVote,
  disabled = false
}) {
  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      className={`group bg-[var(--panel-2)] text-left transition hover:bg-[var(--panel)] disabled:cursor-wait disabled:opacity-70 ${
        imageUrl ? "" : "flex min-h-[17rem] flex-col"
      }`}
    >
      <div className="border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent-2)]">Seed {seed}</p>
      </div>
      {imageUrl ? (
        <div className="relative flex min-h-[11rem] items-center justify-center overflow-hidden bg-[var(--panel-3)] p-4 md:min-h-[14rem] md:p-5">
          <img
            src={proxiedImageUrl(imageUrl)}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl saturate-125"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(15,15,15,0.12)_42%,rgba(15,15,15,0.75)_100%)]" />
          <img
            src={proxiedImageUrl(imageUrl)}
            alt={name}
            className="relative z-10 max-h-[8rem] max-w-full object-contain shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition duration-200 group-hover:scale-[1.03] md:max-h-[10rem]"
          />
        </div>
      ) : null}
      <div className={`px-4 py-4 sm:px-5 sm:py-5 ${imageUrl ? "" : "mt-auto"}`}>
        <p className="display-face text-2xl font-black leading-tight sm:text-3xl">{name}</p>
        {description ? (
          <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        ) : null}
        <p className="mt-4 display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
          {disabled ? "Recording Vote" : `Vote For ${name}`}
        </p>
      </div>
    </button>
  );
}

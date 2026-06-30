"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";
import { StatusPill } from "@/components/status-pill";
import { TournamentResultsPage } from "@/components/tournament-results-page";

function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

function openMatchesForTournament(tournament) {
  return (tournament.matches || []).filter(
    (match) => match.status === "open" && !match.userVoteEntryId
  );
}

function getTournamentRoundCount(tournament) {
  const entryCount = tournament?.entryCount ?? tournament?.entries?.length ?? 0;

  if (entryCount <= 1) {
    return 0;
  }

  if (tournament.resultMode === "fast_full_rank") {
    const hardCap = entryCount - 1 + (entryCount % 2 === 1 ? 1 : 0);
    return Math.min(hardCap, Math.ceil(Math.log2(entryCount)) + 1);
  }

  if (tournament.resultMode === "full_ranking") {
    return null;
  }

  return Math.ceil(Math.log2(nextPowerOfTwo(entryCount)));
}

function formatRoundLabel(match, tournament) {
  if (tournament.resultMode === "full_ranking") {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  const totalRounds = getTournamentRoundCount(tournament);

  if (tournament.resultMode === "fast_full_rank") {
    return totalRounds
      ? `Swiss Round ${match.roundNumber} of ${totalRounds}`
      : `Swiss Round ${match.roundNumber}`;
  }

  return totalRounds ? `Round ${match.roundNumber} of ${totalRounds}` : `Round ${match.roundNumber}`;
}

function buildCreateReturnUrl(tournamentId, stage = "active") {
  return `/create?stage=${stage}&tournament=${tournamentId}`;
}

function buildResultsUrl(tournamentId) {
  return `/results/${tournamentId}`;
}

function getCurrentRoundProgress(tournament, focusedMatch, focusedOpenMatches) {
  if (!tournament || !focusedMatch) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const currentRoundMatches = (tournament.matches || []).filter(
    (match) =>
      match.roundNumber === focusedMatch.roundNumber &&
      match.leftEntryId &&
      match.rightEntryId &&
      match.status !== "auto_resolved"
  );
  const total = currentRoundMatches.length;

  if (total === 0) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const completed = currentRoundMatches.filter((match) => Boolean(match.userVoteEntryId)).length;

  return {
    completed,
    total,
    percent: Math.max(0, Math.min((completed / total) * 100, 100))
  };
}

export function VoteScreenPanels({
  activeTournaments,
  completedTournaments,
  initialFocusedTournamentId = null,
  initialResultsTournamentId = null,
  initialReturnTo = null,
  signInRequiredTournament = null
}) {
  const router = useRouter();
  const [active, setActive] = useState(activeTournaments);
  const [completed, setCompleted] = useState(completedTournaments);
  const [focusedTournamentId, setFocusedTournamentId] = useState(initialFocusedTournamentId);
  const [resultsTournament, setResultsTournament] = useState(null);
  const [resultsMatches, setResultsMatches] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [postRoundPollCount, setPostRoundPollCount] = useState(0);
  const [mobileOpenSection, setMobileOpenSection] = useState("open");

  const focusedTournament =
    active.find((tournament) => tournament.id === focusedTournamentId) ?? null;
  const openActiveTournaments = active.filter(
    (tournament) => openMatchesForTournament(tournament).length > 0
  );
  const openMatchCount = openActiveTournaments.reduce(
    (count, tournament) => count + openMatchesForTournament(tournament).length,
    0
  );
  const focusedMatches = focusedTournament ? openMatchesForTournament(focusedTournament) : [];
  const focusedMatch = focusedMatches[0] ?? null;
  const currentRoundProgress = getCurrentRoundProgress(
    focusedTournament,
    focusedMatch,
    focusedMatches
  );
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
    setResultsMatches([]);
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

      setResultsTournament(data.item);
      setResultsMatches(matchData.items ?? []);
    } catch {
      setError("Failed to load bracket results.");
      setResultsTournament(null);
    } finally {
      setResultsLoading(false);
    }
  }

  function closeResultsView() {
    setResultsTournament(null);
    setResultsMatches([]);
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

        <div className="flex justify-end">
          <button
            type="button"
            onClick={closeResultsView}
            className="display-face border border-[var(--line)] px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
          >
            Back To Index
          </button>
        </div>

        {resultsLoading ? (
          <section className="border border-[var(--line)] bg-[var(--panel)] px-5 py-6">
            <p className="text-sm text-[var(--muted)]">Loading results...</p>
          </section>
        ) : (
          <TournamentResultsPage tournament={resultsTournament} matches={resultsMatches} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-px border border-[var(--line)] bg-[var(--line)] lg:grid-cols-3">
        <SummaryBlock
          label="Active"
          value={active.length}
          toneClass="text-[var(--accent-3)]"
          isOpen={mobileOpenSection === "active"}
          onToggle={() => setMobileOpenSection((current) => (current === "active" ? null : "active"))}
        />
        <SummaryBlock
          label="Open Matches"
          value={openMatchCount}
          toneClass="text-[var(--accent-2)]"
          isOpen={mobileOpenSection === "open"}
          onToggle={() => setMobileOpenSection((current) => (current === "open" ? null : "open"))}
        />
        <SummaryBlock
          label="Completed"
          value={completed.length}
          toneClass="text-[var(--accent)]"
          isOpen={mobileOpenSection === "completed"}
          onToggle={() =>
            setMobileOpenSection((current) => (current === "completed" ? null : "completed"))
          }
        />
      </section>

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
        {signInRequiredTournament ? (
          <section className="border border-[var(--line)] bg-[var(--panel)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Sign-In Required
              </p>
              <h2 className="display-face mt-2 text-2xl font-black">
                {signInRequiredTournament.title}
              </h2>
            </div>
            <div className="space-y-4 px-5 py-5">
              <p className="text-sm leading-7 text-[var(--muted)]">
                This public bracket is visible, but voting in it requires a signed-in account.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/api/auth/signin" className="ui-button ui-button-primary">
                  Sign In To Vote
                </Link>
                <Link
                  href={buildResultsUrl(signInRequiredTournament.id)}
                  className="ui-button ui-button-muted"
                >
                  View Results
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="space-y-4 lg:hidden">
        {mobileOpenSection === "active" ? (
          <section className="border border-[var(--line)] bg-[var(--panel)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                Active
              </h2>
            </div>
            <TournamentListSection
              tournaments={active}
              emptyTitle="No Active Brackets"
              emptySubtitle="Nothing is waiting on a vote."
              onSelectTournament={setFocusedTournamentId}
            />
          </section>
        ) : null}

        {mobileOpenSection === "open" ? (
          <section className="border border-[var(--line)] bg-[var(--panel)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                Open Matches
              </h2>
            </div>
            <TournamentListSection
              tournaments={openActiveTournaments}
              emptyTitle="No Open Matches"
              emptySubtitle="Nothing is waiting on a vote."
              onSelectTournament={setFocusedTournamentId}
            />
          </section>
        ) : null}

        {mobileOpenSection === "completed" ? (
          <section className="border border-[var(--line)] bg-[var(--panel)]">
            <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                Completed
              </h2>
            </div>
            <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} />
          </section>
        ) : null}
      </div>

      <div className="hidden gap-6 lg:grid lg:grid-cols-[1.05fr_0.95fr]">
        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
              Open Matches
            </h2>
          </div>
          <TournamentListSection
            tournaments={openActiveTournaments}
            emptyTitle="No Open Matches"
            emptySubtitle="Nothing is waiting on a vote."
            onSelectTournament={setFocusedTournamentId}
          />
        </section>

        <section className="border border-[var(--line)] bg-[var(--panel)]">
          <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">Completed</h2>
          </div>
          <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} />
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
                <h2 className="display-face mt-2 text-[1.5rem] font-black leading-[0.95] sm:text-3xl">
                  {focusedTournament.title}
                </h2>
                {currentRoundProgress.total > 0 ? (
                  <div className="mt-2 flex max-w-xs items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 overflow-hidden border border-[var(--line)] bg-[var(--panel)]">
                      <div
                        className="h-full bg-[var(--accent-3)] transition-[width] duration-300"
                        style={{ width: `${currentRoundProgress.percent}%` }}
                      />
                    </div>
                    <p className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      {currentRoundProgress.completed}/{currentRoundProgress.total}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                    {focusedMatches.length} open {focusedMatches.length === 1 ? "match" : "matches"} remain
                  </p>
                )}
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

            <div className="bg-[var(--line)] md:grid md:grid-cols-[1fr_auto_1fr] md:gap-px">
              <CandidateVoteCard
                name={focusedMatch.leftName}
                seed={focusedMatch.leftSeed}
                description={focusedMatch.leftDescription}
                imageUrl={focusedMatch.leftImageUrl}
                disabled={pendingVoteMatchId === focusedMatch.id}
                onVote={() => vote(focusedMatch.id, focusedTournament.id, focusedMatch.leftEntryId)}
              />
              <div className="relative h-10 bg-[var(--panel)] md:flex md:h-auto md:items-center md:justify-center md:bg-[var(--panel-3)] md:px-6 md:py-8">
                <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] md:static md:translate-x-0 md:translate-y-0 md:rounded-none md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none">
                  <p className="display-face text-2xl font-black tracking-[0.18em] text-[var(--accent-2)]">
                    Vs
                  </p>
                </div>
                <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-[var(--line)] md:hidden" />
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
      className="group flex h-full min-h-[14rem] max-h-[17rem] flex-col overflow-hidden bg-[var(--panel-2)] text-left transition hover:bg-[var(--panel)] disabled:cursor-wait disabled:opacity-70 sm:min-h-[16rem] sm:max-h-[20rem] md:min-h-[20rem] md:max-h-[29rem]"
    >
      <div className="border-b border-[var(--line)] px-4 py-2 sm:px-5 sm:py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent-2)]">Seed {seed}</p>
      </div>
      {imageUrl ? (
        <div className="relative min-h-0 max-h-[13.5rem] flex-1 overflow-hidden bg-[var(--panel-3)] sm:max-h-[12rem] md:max-h-none">
          <ResilientRemoteImage
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl saturate-125"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(15,15,15,0.12)_42%,rgba(15,15,15,0.75)_100%)]" />
          <ResilientRemoteImage
            src={imageUrl}
            alt={name}
            className="relative z-10 h-full w-full object-contain p-0 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition duration-200 group-hover:scale-[1.03] sm:p-3 md:p-5"
          />
        </div>
      ) : null}
      <div className={`px-4 py-2 sm:px-5 sm:py-5 ${imageUrl ? "" : "mt-auto"}`}>
        <p className="display-face text-[1.45rem] font-black leading-tight sm:text-3xl">{name}</p>
        {description ? (
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">{description}</p>
        ) : null}
      </div>
    </button>
  );
}

function SummaryBlock({ label, value, toneClass, isOpen, onToggle }) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className="bg-[var(--panel-3)] px-5 py-4 text-left lg:hidden"
        aria-expanded={isOpen}
      >
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`display-face text-2xl font-black ${toneClass}`}>{value}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {isOpen ? "Hide" : "Show"}
          </p>
        </div>
      </button>
      <div className="hidden bg-[var(--panel-3)] px-5 py-4 lg:block">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
        <p className={`display-face mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
      </div>
    </>
  );
}

function TournamentListSection({
  tournaments,
  emptyTitle,
  emptySubtitle,
  onSelectTournament
}) {
  if (tournaments.length === 0) {
    return (
      <div className="px-5 py-8">
        <div className="border border-[var(--line)] bg-[var(--panel-2)] px-5 py-6">
          <p className="display-face text-xl font-black text-[var(--muted)]">{emptyTitle}</p>
          {emptySubtitle ? (
            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
              {emptySubtitle}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {tournaments.map((tournament) => {
        const openMatches = openMatchesForTournament(tournament);

        return (
          <div
            key={tournament.id}
            className="border-b border-[var(--line)] bg-[var(--panel-2)] p-5 last:border-b-0"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="display-face text-2xl font-black">{tournament.title}</h3>
                <p className="mt-1 text-sm uppercase tracking-[0.15em] text-[var(--muted)]">
                  {tournament.sharingMode.replace("_", " ")} | {tournament.entryCount} entries
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
                onClick={() => onSelectTournament(tournament.id)}
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
  );
}

function CompletedListSection({ tournaments, onOpenResults }) {
  return (
    <div className="space-y-4 px-5 py-5">
      {tournaments.length === 0 ? (
        <div className="border border-[var(--line)] bg-[var(--panel-2)] px-5 py-6">
          <p className="display-face text-xl font-black text-[var(--muted)]">
            No Completed Brackets
          </p>
        </div>
      ) : (
        tournaments.map((tournament) => (
          <button
            key={tournament.id}
            type="button"
            onClick={() => onOpenResults(tournament)}
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
  );
}

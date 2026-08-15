"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompletedBracketCard } from "@/components/completed-bracket-card";
import { CompactRailHeader } from "@/components/compact-rail-header";
import { useInfiniteScroll } from "@/components/use-infinite-scroll";
import { BackdropRemoteImage } from "@/components/resilient-remote-image";
import { TournamentResultsPage } from "@/components/tournament-results-page";
import {
  usesOpenEndedRankingMode,
  usesSwissResultMode
} from "@/lib/bracket-modes";
import {
  getTournamentWithMatches,
  submitMatchVote
} from "@/lib/client-api/voting";

const LAST_OPEN_VOTE_TOURNAMENT_KEY = "brackeroni-last-open-vote-tournament";

function nextPowerOfTwo(value) {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

function openMatchesForTournament(tournament) {
  if (tournament.kind === "parallel_parent") {
    return tournament.status === "active" &&
      tournament.viewerParticipantStatus !== "complete"
      ? [{ id: `parallel:${tournament.id}`, status: "open" }]
      : [];
  }

  return (tournament.matches || []).filter(
    (match) => match.status === "open" && !match.userVoteEntryId
  );
}

function getTournamentRoundCount(tournament) {
  const entryCount = tournament?.entryCount ?? tournament?.entries?.length ?? 0;

  if (entryCount <= 1) {
    return 0;
  }

  if (usesSwissResultMode(tournament.resultMode)) {
    const hardCap = entryCount - 1 + (entryCount % 2 === 1 ? 1 : 0);
    return Math.min(hardCap, Math.ceil(Math.log2(entryCount)) + 1);
  }

  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return null;
  }

  return Math.ceil(Math.log2(nextPowerOfTwo(entryCount)));
}

function formatRoundLabel(match, tournament) {
  if (usesOpenEndedRankingMode(tournament.resultMode)) {
    return `Ranking ${match.rankingTargetRank}: Round ${match.rankingRoundNumber}`;
  }

  const totalRounds = getTournamentRoundCount(tournament);

  if (usesSwissResultMode(tournament.resultMode)) {
    return totalRounds
      ? `Swiss Round ${match.roundNumber} of ${totalRounds}`
      : `Swiss Round ${match.roundNumber}`;
  }

  return totalRounds ? `Round ${match.roundNumber} of ${totalRounds}` : `Round ${match.roundNumber}`;
}

function formatVoteHeader(match, tournament) {
  const roundLabel = usesOpenEndedRankingMode(tournament.resultMode)
    ? `Ranking ${match.rankingTargetRank} / Round ${match.rankingRoundNumber}`
    : usesSwissResultMode(tournament.resultMode)
      ? (() => {
          const totalRounds = getTournamentRoundCount(tournament);
          return totalRounds
            ? `Swiss Round ${match.roundNumber} of ${totalRounds}`
            : `Swiss Round ${match.roundNumber}`;
        })()
      : (() => {
          const totalRounds = getTournamentRoundCount(tournament);
          return totalRounds ? `Round ${match.roundNumber} of ${totalRounds}` : `Round ${match.roundNumber}`;
        })();

  return match.subBracketName ? `${roundLabel} / ${match.subBracketName}` : roundLabel;
}

function buildCreateReturnUrl(tournamentId, stage = "active") {
  return `/brackets?stage=${stage}`;
}

function buildResultsUrl(tournamentOrId) {
  if (typeof tournamentOrId === "string") {
    return `/results/${tournamentOrId}`;
  }

  return `/results/${tournamentOrId.parentParallelTournamentId || tournamentOrId.id}`;
}

function buildVoteUrl({ tournamentId = null, returnTo = null }) {
  const params = new URLSearchParams();

  if (tournamentId) {
    params.set("tournament", tournamentId);
  }

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  const query = params.toString();
  return query ? `/vote?${query}` : "/vote";
}

function readStoredFocusedTournamentId() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.sessionStorage.getItem(LAST_OPEN_VOTE_TOURNAMENT_KEY);
  } catch {
    return null;
  }
}

function writeStoredFocusedTournamentId(tournamentId) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (tournamentId) {
      window.sessionStorage.setItem(LAST_OPEN_VOTE_TOURNAMENT_KEY, tournamentId);
    } else {
      window.sessionStorage.removeItem(LAST_OPEN_VOTE_TOURNAMENT_KEY);
    }
  } catch {}
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
  completedPage = 1,
  completedHasNextPage = false,
  initialFocusedTournamentId = null,
  initialResultsTournamentId = null,
  initialReturnTo = null,
  signInRequiredTournament = null
}) {
  const router = useRouter();
  const [active, setActive] = useState(activeTournaments);
  const [completed, setCompleted] = useState(completedTournaments);
  const [completedHasNext, setCompletedHasNext] = useState(completedHasNextPage);
  const [completedLoading, setCompletedLoading] = useState(false);
  const completedOffsetRef = useRef(completedTournaments.length);
  const [focusedTournamentId, setFocusedTournamentId] = useState(() => {
    return initialFocusedTournamentId || readStoredFocusedTournamentId() || null;
  });
  const [resultsTournament, setResultsTournament] = useState(null);
  const [resultsMatches, setResultsMatches] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [postRoundPollCount, setPostRoundPollCount] = useState(0);
  const [mobileOpenSection, setMobileOpenSection] = useState("open");
  const replaceIfChanged = useCallback((href) => {
    if (
      typeof window !== "undefined" &&
      `${window.location.pathname}${window.location.search}` === href
    ) {
      return;
    }

    router.replace(href);
  }, [router]);

  const loadMoreCompleted = useCallback(async () => {
    if (completedLoading || !completedHasNext) return;
    setCompletedLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/tournaments?scope=vote-completed&offset=${completedOffsetRef.current}&limit=12`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "Failed to load more completed brackets.");
      }
      const data = await response.json();
      const nextItems = data.items ?? [];
      const uniqueItems = nextItems.filter((item) => !completed.some((existing) => existing.id === item.id));
      setCompleted((current) => [...current, ...uniqueItems]);
      completedOffsetRef.current += nextItems.length;
      setCompletedHasNext(uniqueItems.length > 0 && Boolean(data.meta?.hasNextPage));
    } catch (loadError) {
      setError(loadError.message || "Failed to load more completed brackets.");
    } finally {
      setCompletedLoading(false);
    }
  }, [completed, completedHasNext, completedLoading]);
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
    .filter(
      (tournament) =>
        tournament.kind !== "parallel_parent" &&
        openMatchesForTournament(tournament).length === 0
    )
    .map((tournament) => tournament.id)
    .sort();
  const waitingTournamentKey = waitingTournamentIds.join(":");
  const shouldReturnToCreate = initialReturnTo === "create";
  const postRoundPollEnabled =
    waitingTournamentIds.length > 0 &&
    postRoundPollCount < 18 &&
    !pendingVoteMatchId &&
    !resultsTournament;
  const isFocusedTournamentWaiting =
    Boolean(focusedTournament) &&
    focusedTournament.kind !== "parallel_parent" &&
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
    if (initialFocusedTournamentId || focusedTournamentId) {
      return;
    }

    const storedTournamentId = readStoredFocusedTournamentId();
    if (!storedTournamentId) {
      return;
    }

    const storedTournament = active.find((tournament) => tournament.id === storedTournamentId);
    if (!storedTournament) {
      writeStoredFocusedTournamentId(null);
      return;
    }

    const hasOpenMatches = openMatchesForTournament(storedTournament).length > 0;
    const isWaiting =
      storedTournament.kind !== "parallel_parent" &&
      waitingTournamentIds.includes(storedTournament.id) &&
      postRoundPollEnabled;

    if (!hasOpenMatches && !isWaiting) {
      writeStoredFocusedTournamentId(null);
      return;
    }

    setFocusedTournamentId(storedTournamentId);
    replaceIfChanged(buildVoteUrl({ tournamentId: storedTournamentId, returnTo: initialReturnTo }));
  }, [
    active,
    focusedTournamentId,
    initialFocusedTournamentId,
    initialReturnTo,
    postRoundPollEnabled,
    replaceIfChanged,
    waitingTournamentIds
  ]);

  useEffect(() => {
    writeStoredFocusedTournamentId(focusedTournamentId || null);
  }, [focusedTournamentId]);

  useEffect(() => {
    if (!focusedTournamentId) {
      return;
    }

    if (focusedTournament) {
      return;
    }

    setFocusedTournamentId(null);
    writeStoredFocusedTournamentId(null);
    replaceIfChanged(buildVoteUrl({ returnTo: initialReturnTo }));
  }, [focusedTournamentId, focusedTournament, replaceIfChanged, initialReturnTo]);

  useEffect(() => {
    if (!focusedTournament) {
      return;
    }

    if (focusedMatch || isFocusedTournamentWaiting || pendingVoteMatchId) {
      return;
    }

    setFocusedTournamentId(null);
    writeStoredFocusedTournamentId(null);
    replaceIfChanged(buildVoteUrl({ returnTo: initialReturnTo }));
  }, [focusedTournament, focusedMatch, isFocusedTournamentWaiting, replaceIfChanged, initialReturnTo]);

  useEffect(() => {
    if (!shouldReturnToCreate || !focusedTournament || focusedMatch || isFocusedTournamentWaiting || pendingVoteMatchId) {
      return;
    }

    replaceIfChanged(buildCreateReturnUrl(focusedTournament.id, "active"));
  }, [
    shouldReturnToCreate,
    focusedTournament,
    focusedMatch,
    isFocusedTournamentWaiting,
    pendingVoteMatchId,
    replaceIfChanged
  ]);

  async function vote(matchId, tournamentId, selectedEntryId) {
    if (pendingVoteMatchId) {
      return;
    }

    setError("");
    setMessage("");
    setTransitionMessage("");
    setPendingVoteMatchId(matchId);
    let voteResult;
    try {
      const voteResponse = await submitMatchVote(matchId, selectedEntryId);
      voteResult = voteResponse.item;
    } catch (error) {
      if (error.status === 400 && error.code === "MATCH_NOT_OPEN") {
        setTransitionMessage("That round closed before your vote was submitted, so it did not count.");
        await refreshTournamentState(tournamentId);
        setMessage("That round already closed. Moving you to the latest bracket state.");
        setPendingVoteMatchId(null);
        return;
      }

      if (error.status === 409 && error.code === "ALREADY_VOTED") {
        setTransitionMessage("");
        await refreshTournamentState(tournamentId);
        setMessage("That vote was already recorded. Moving to the next available matchup.");
        setPendingVoteMatchId(null);
        return;
      }

      setError(error.message || "Failed to record vote.");
      setPendingVoteMatchId(null);
      return;
    }

    if (voteResult?.tournamentStatus === "complete") {
      setTransitionMessage("");
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [
        {
          ...(focusedTournament || {}),
          id: tournamentId,
          status: "complete"
        },
        ...current.filter((tournament) => tournament.id !== tournamentId)
      ]);
      setFocusedTournamentId(null);
      writeStoredFocusedTournamentId(null);
      setPendingVoteMatchId(null);
      router.replace(buildResultsUrl(tournamentId));
      return;
    }

    // The vote endpoint succeeded. Update the one fact the voter just changed
    // locally instead of reloading both the tournament and its entire match list.
    const optimisticTournament = focusedTournament?.id === tournamentId
      ? {
          ...focusedTournament,
          matches: (focusedTournament.matches || []).map((match) => {
            if (match.id !== matchId) {
              return match;
            }

            return {
              ...match,
              userVoteEntryId: selectedEntryId,
              leftVoteCount:
                match.leftEntryId === selectedEntryId
                  ? (match.leftVoteCount || 0) + 1
                  : match.leftVoteCount,
              rightVoteCount:
                match.rightEntryId === selectedEntryId
                  ? (match.rightVoteCount || 0) + 1
                  : match.rightVoteCount
            };
          })
        }
      : null;
    const remainingOpenMatches = optimisticTournament
      ? openMatchesForTournament(optimisticTournament).length
      : 0;

    if (optimisticTournament) {
      setActive((current) =>
        current.map((tournament) =>
          tournament.id === tournamentId ? optimisticTournament : tournament
        )
      );
    }

    // Private brackets advance as soon as the last match in a round receives
    // a vote. The server has already generated that next round by this point;
    // refresh precisely at this transition so we render its first matchup
    // instead of falling into the public-bracket polling state.
    if (
      focusedTournament?.sharingMode === "private" &&
      remainingOpenMatches === 0
    ) {
      await refreshTournamentState(tournamentId);
      setMessage("Vote recorded. Next round ready.");
      setPendingVoteMatchId(null);
      return;
    }

    setFocusedTournamentId(tournamentId);
    setMessage(
      remainingOpenMatches > 0
        ? "Vote recorded. Next matchup ready."
        : "Vote recorded. No open matches remain in this round. Checking for the next round."
    );
    setPendingVoteMatchId(null);
  }

  async function refreshTournamentState(tournamentId) {
    let refreshData;
    try {
      refreshData = await getTournamentWithMatches(tournamentId);
    } catch (error) {
      setError(error.message || "Failed to refresh bracket.");
      return;
    }
    const { matches, tournament: refreshedTournamentData } = refreshData;

    if (refreshedTournamentData.status === "complete") {
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [refreshedTournamentData, ...current]);
      setFocusedTournamentId(null);
      writeStoredFocusedTournamentId(null);
      router.replace(buildResultsUrl(refreshedTournamentData));
      return;
    }

    const refreshedTournament = {
      ...refreshedTournamentData,
      matches
    };
    const remainingOpenMatches = openMatchesForTournament(refreshedTournament).length;

    setActive((current) =>
      current.map((tournament) => (tournament.id === tournamentId ? refreshedTournament : tournament))
    );
    setFocusedTournamentId((currentFocusedTournamentId) => {
      if (currentFocusedTournamentId !== tournamentId) {
        return currentFocusedTournamentId;
      }

      return remainingOpenMatches > 0 ? tournamentId : null;
    });
  }

  function handleSelectTournament(tournament) {
    if (tournament.kind === "parallel_parent") {
      if (tournament.viewerParticipantStatus === "complete") {
        router.push(buildResultsUrl(tournament));
        return;
      }

      const returnToParam = initialReturnTo ? `&returnTo=${initialReturnTo}` : "";
      router.push(`/vote?parallelTournament=${tournament.id}${returnToParam}`);
      return;
    }

    setFocusedTournamentId(tournament.id);
    router.replace(buildVoteUrl({ tournamentId: tournament.id, returnTo: initialReturnTo }));
  }

  function openResultsModal(tournament) {
    router.push(buildResultsUrl(tournament));
  }

  function closeResultsView() {
    setResultsTournament(null);
    setResultsMatches([]);
  }

  if (resultsTournament) {
    return (
      <div className="vote-page">
        <div className="vote-page-messages">
          {error ? (
            <p className="vote-message vote-message-error">{error}</p>
          ) : null}
          {message ? (
            <p className="vote-message vote-message-success">{message}</p>
          ) : null}
        </div>

        {resultsLoading ? (
          <section className="vote-loading-panel">
            <p className="vote-loading-copy">Loading results...</p>
          </section>
        ) : (
          <TournamentResultsPage
            tournament={resultsTournament}
            matches={resultsMatches}
            headerAction={
              <button
                type="button"
                onClick={closeResultsView}
                className="ui-button ui-button-muted"
              >
                Back To Index
              </button>
            }
          />
        )}
      </div>
    );
  }

  return (
    <div className="vote-page">
      <div className="vote-page-messages">
        {error ? (
          <p className="vote-message vote-message-error">{error}</p>
        ) : null}
        {message ? (
          <p className="vote-message vote-message-success">{message}</p>
          ) : null}
        {signInRequiredTournament ? (
          <section className="vote-callout-panel">
            <CompactRailHeader
              kicker="Sign-In Required"
              title={signInRequiredTournament.title}
            />
            <div className="vote-callout-body">
              <p className="vote-callout-copy">
                This public bracket is visible, but voting in it requires a signed-in account.
              </p>
              <div className="vote-callout-actions">
                <Link href="/api/auth/signin" className="ui-button ui-button-primary">
                  Sign In To Vote
                </Link>
                <Link
                  href={buildResultsUrl(signInRequiredTournament)}
                  className="ui-button ui-button-muted"
                >
                  View Results
                </Link>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <div className="vote-mobile-sections lg:hidden">
        <section className="vote-rail">
          <CompactRailHeader
            as="button"
            type="button"
            onClick={() => setMobileOpenSection((current) => (current === "open" ? null : "open"))}
            className="compact-rail-header-button"
            aria-expanded={mobileOpenSection === "open"}
            title={<>Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span></>}
          />
          {mobileOpenSection === "open" ? (
            <TournamentListSection
              tournaments={openActiveTournaments}
              emptyTitle="No Open Matches"
              emptySubtitle="Nothing is waiting on a vote."
              onSelectTournament={handleSelectTournament}
            />
          ) : null}
        </section>

        <section className="vote-rail">
          <CompactRailHeader
            as="button"
            type="button"
            onClick={() =>
              setMobileOpenSection((current) => (current === "completed" ? null : "completed"))
            }
            className="compact-rail-header-button"
            aria-expanded={mobileOpenSection === "completed"}
            title={<>Completed <span className="compact-rail-header-count">({completed.length})</span></>}
          />
          {mobileOpenSection === "completed" ? (
            <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} hasNextPage={completedHasNext} loading={completedLoading} onLoadMore={loadMoreCompleted} />
          ) : null}
        </section>
      </div>

      <div className="vote-desktop-sections hidden lg:flex">
        <section className="vote-rail">
          <CompactRailHeader
            title={<>Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span></>}
          />
          <TournamentListSection
            tournaments={openActiveTournaments}
            emptyTitle="No Open Matches"
            emptySubtitle="Nothing is waiting on a vote."
            onSelectTournament={handleSelectTournament}
          />
        </section>

        <section className="vote-rail">
          <CompactRailHeader
            title={<>Completed <span className="compact-rail-header-count">({completed.length})</span></>}
          />
          <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} hasNextPage={completedHasNext} loading={completedLoading} onLoadMore={loadMoreCompleted} />
        </section>
      </div>

      {focusedTournament && focusedMatch ? (
        <div className="vote-modal-overlay">
          <div className="vote-modal-shell vote-match-modal-shell">
            <div className="vote-match-modal-header">
              <div>
                <p className="vote-kicker">{formatVoteHeader(focusedMatch, focusedTournament)}</p>
                <h2 className="vote-match-modal-title display-face">{focusedTournament.title}</h2>
                {currentRoundProgress.total > 0 ? (
                  <div className="vote-match-progress">
                    <div className="vote-match-progress-bar">
                      <div
                        className="vote-match-progress-fill"
                        style={{ width: `${currentRoundProgress.percent}%` }}
                      />
                    </div>
                    <p className="vote-match-progress-count">
                      {currentRoundProgress.completed}/{currentRoundProgress.total}
                    </p>
                  </div>
                ) : (
                  <p className="vote-match-open-count">
                    {focusedMatches.length} open {focusedMatches.length === 1 ? "match" : "matches"} remain
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setFocusedTournamentId(null);
                  writeStoredFocusedTournamentId(null);
                  router.replace(buildVoteUrl({ returnTo: initialReturnTo }));
                }}
                className="vote-modal-close display-face"
              >
                Close
              </button>
            </div>
            {transitionMessage ? (
              <div className="vote-transition-bar">
                <p className="vote-transition-copy">{transitionMessage}</p>
              </div>
            ) : null}

            <div className="vote-matchup-grid">
              <CandidateVoteCard
                name={focusedMatch.leftName}
                description={focusedMatch.leftDescription}
                tags={focusedMatch.leftTags}
                imageUrl={focusedMatch.leftImageUrl}
                disabled={pendingVoteMatchId === focusedMatch.id}
                onVote={() => vote(focusedMatch.id, focusedTournament.id, focusedMatch.leftEntryId)}
                side="left"
              />
              <div className="vote-match-vs-column">
                <div className="vote-match-vs-badge">
                  <p className="vote-match-vs-text display-face">Vs</p>
                </div>
              </div>
              <CandidateVoteCard
                name={focusedMatch.rightName}
                description={focusedMatch.rightDescription}
                tags={focusedMatch.rightTags}
                imageUrl={focusedMatch.rightImageUrl}
                disabled={pendingVoteMatchId === focusedMatch.id}
                onVote={() => vote(focusedMatch.id, focusedTournament.id, focusedMatch.rightEntryId)}
                side="right"
              />
            </div>
          </div>
        </div>
      ) : null}

      {focusedTournament && isFocusedTournamentWaiting ? (
        <div className="vote-modal-overlay">
          <div className="vote-modal-shell vote-waiting-modal-shell">
            <div className="vote-match-modal-header">
              <div>
                <p className="vote-kicker">Round Complete</p>
                <h2 className="vote-match-modal-title display-face">{focusedTournament.title}</h2>
                <p className="vote-match-open-count">Waiting for the next round to open</p>
              </div>
            </div>
            <div className="vote-waiting-body">
              {transitionMessage ? (
                <p className="vote-transition-copy">{transitionMessage}</p>
              ) : null}
              <p className="vote-callout-copy">
                Your current round is done. This page will keep checking for the next matchup and
                update automatically when it opens.
              </p>
              <div className="vote-waiting-stats">
                <div className="vote-waiting-stat">
                  <p className="vote-waiting-stat-label">Polling</p>
                  <p className="vote-waiting-stat-value display-face">Every 10 seconds</p>
                </div>
                <div className="vote-waiting-stat">
                  <p className="vote-waiting-stat-label">Checks Remaining</p>
                  <p className="vote-waiting-stat-value display-face">{Math.max(18 - postRoundPollCount, 0)}</p>
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
  description,
  tags,
  imageUrl,
  onVote,
  disabled = false,
  side = "left"
}) {
  return (
    <button
      type="button"
      onClick={onVote}
      disabled={disabled}
      className={`vote-candidate-card vote-candidate-card-${side}`}
    >
      {imageUrl ? (
        <div className="vote-candidate-image-shell">
          <BackdropRemoteImage
            src={imageUrl}
            alt={name}
            className="vote-candidate-backdrop-host"
            backdropClassName="vote-candidate-backdrop"
            imageClassName="vote-candidate-image"
            undersizedImageClassName="vote-candidate-image vote-candidate-image-undersized"
            foregroundWrapperClassName="vote-candidate-image-frame"
            minimumSourceWidth={180}
            minimumSourceHeight={180}
          />
        </div>
      ) : null}
      <div className={`vote-candidate-copy ${imageUrl ? "" : "vote-candidate-copy-no-image"}`}>
        <p className="vote-candidate-name display-face">{name}</p>
        {Array.isArray(tags) && tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="border border-[var(--line)] bg-[var(--panel-3)] px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-[var(--accent-3)]"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {description ? (
          <p className="vote-candidate-description">{description}</p>
        ) : null}
      </div>
    </button>
  );
}

function TournamentListSection({ tournaments, emptyTitle, emptySubtitle, onSelectTournament }) {
  if (tournaments.length === 0) {
    return (
      <div className="py-4">
        <div className="border border-[var(--line-strong)] p-5">
          <p className="display-face text-lg font-black text-[var(--muted)]">{emptyTitle}</p>
          {emptySubtitle ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{emptySubtitle}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="vote-card-grid">
      {tournaments.map((tournament) => {
        const openMatches = openMatchesForTournament(tournament);
        const viewerCompletedParallel = tournament.kind === "parallel_parent" && tournament.viewerParticipantStatus === "complete";
        const canOpen = viewerCompletedParallel || openMatches.length > 0;

        return (
          <button key={tournament.id} type="button" onClick={() => onSelectTournament(tournament)} disabled={!canOpen} className="group flex min-h-44 w-full flex-col items-start justify-start border border-[var(--line)] bg-[rgba(255,255,255,0.025)] p-5 text-left transition hover:border-[var(--accent-3)] hover:bg-[rgba(45,211,201,0.06)] disabled:cursor-not-allowed disabled:opacity-55">
            <h3 className="display-face text-xl font-black leading-tight transition group-hover:text-[var(--accent-3)]">{tournament.title}</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              {tournament.kind === "parallel_parent" ? `${tournament.completedParticipantCount ?? 0}/${tournament.participantCount ?? 0} complete` : `${openMatches.length} open ${openMatches.length === 1 ? "match" : "matches"}`}
              {tournament.sourcePoolName ? ` · ${tournament.sourcePoolName}` : ""}
            </p>
            <span className="display-face mt-auto pt-5 text-sm font-black uppercase tracking-[0.14em] text-[var(--accent-2)]">{viewerCompletedParallel ? "View results" : canOpen ? "Vote now" : "Waiting for the next round"}</span>
          </button>
        );
      })}
    </div>
  );
}

function CompletedListSection({ tournaments, onOpenResults, hasNextPage = false, loading = false, onLoadMore }) {
  if (tournaments.length === 0) {
    return <div className="py-4"><div className="border border-[var(--line-strong)] p-5"><p className="display-face text-lg font-black text-[var(--muted)]">No completed brackets</p></div></div>;
  }

  return (
    <div className="vote-card-grid">
      {tournaments.map((tournament) => (
        <CompletedBracketCard
          key={tournament.id}
          tournament={tournament}
          type="button"
          onClick={() => onOpenResults(tournament)}
        />
      ))}
      {hasNextPage ? <CompletedLoadMore loading={loading} onLoadMore={onLoadMore} pageKey={tournaments.length} /> : null}
    </div>
  );
}

function CompletedLoadMore({ loading, onLoadMore, pageKey }) {
  const sentinelRef = useInfiniteScroll({
    enabled: true,
    loading,
    pageKey,
    onLoadMore
  });

  return <div ref={sentinelRef} className="col-span-full flex justify-center border-t border-[var(--line)] pt-5"><span className="sr-only">Loading more completed brackets</span></div>;
}


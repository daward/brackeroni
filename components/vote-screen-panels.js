"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

function buildCreateReturnUrl(tournamentId, stage = "active") {
  return `/create?stage=${stage}&tournament=${tournamentId}`;
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
  initialFocusedTournamentId = null,
  initialResultsTournamentId = null,
  initialReturnTo = null,
  signInRequiredTournament = null
}) {
  const router = useRouter();
  const [active, setActive] = useState(activeTournaments);
  const [completed, setCompleted] = useState(completedTournaments);
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
    !resultsTournament &&
    !shouldReturnToCreate;
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
    router.replace(buildVoteUrl({ tournamentId: storedTournamentId, returnTo: initialReturnTo }));
  }, [
    active,
    focusedTournamentId,
    initialFocusedTournamentId,
    initialReturnTo,
    postRoundPollEnabled,
    router,
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
    router.replace(buildVoteUrl({ returnTo: initialReturnTo }));
  }, [focusedTournamentId, focusedTournament, router, initialReturnTo]);

  useEffect(() => {
    if (!focusedTournament) {
      return;
    }

    if (focusedMatch || isFocusedTournamentWaiting) {
      return;
    }

    setFocusedTournamentId(null);
    writeStoredFocusedTournamentId(null);
    router.replace(buildVoteUrl({ returnTo: initialReturnTo }));
  }, [focusedTournament, focusedMatch, isFocusedTournamentWaiting, router, initialReturnTo]);

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

    try {
      await submitMatchVote(matchId, selectedEntryId);
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

    const { matches, tournament: refreshedTournamentData } = await getTournamentWithMatches(tournamentId);

    if (refreshedTournamentData.status === "complete") {
      setTransitionMessage("");
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

  async function openResultsModal(tournament) {
    if (tournament.kind === "parallel_parent") {
      router.push(buildResultsUrl(tournament));
      return;
    }

    setError("");
    setMessage("");
    setResultsTournament(tournament);
    setResultsMatches([]);
    setResultsLoading(true);

    try {
      const { matches, tournament: refreshedTournament } = await getTournamentWithMatches(tournament.id);
      setResultsTournament(refreshedTournament);
      setResultsMatches(matches);
    } catch (error) {
      setError(error.message || "Failed to load bracket results.");
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
            <div className="vote-rail-header">
              <p className="vote-kicker">Sign-In Required</p>
              <h2 className="vote-rail-title display-face">{signInRequiredTournament.title}</h2>
            </div>
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
          <button
            type="button"
            onClick={() => setMobileOpenSection((current) => (current === "open" ? null : "open"))}
            className="vote-rail-header vote-rail-header-button"
            aria-expanded={mobileOpenSection === "open"}
          >
            <h2 className="vote-rail-title display-face">
              Vote Now <span className="vote-rail-count">({openMatchCount} open matches)</span>
            </h2>
          </button>
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
          <button
            type="button"
            onClick={() =>
              setMobileOpenSection((current) => (current === "completed" ? null : "completed"))
            }
            className="vote-rail-header vote-rail-header-button"
            aria-expanded={mobileOpenSection === "completed"}
          >
            <h2 className="vote-rail-title display-face">
              Completed <span className="vote-rail-count">({completed.length})</span>
            </h2>
          </button>
          {mobileOpenSection === "completed" ? (
            <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} />
          ) : null}
        </section>
      </div>

      <div className="vote-desktop-grid hidden lg:grid">
        <section className="vote-rail">
          <div className="vote-rail-header">
            <h2 className="vote-rail-title display-face">
              Vote Now <span className="vote-rail-count">({openMatchCount} open matches)</span>
            </h2>
          </div>
          <TournamentListSection
            tournaments={openActiveTournaments}
            emptyTitle="No Open Matches"
            emptySubtitle="Nothing is waiting on a vote."
            onSelectTournament={handleSelectTournament}
          />
        </section>

        <section className="vote-rail">
          <div className="vote-rail-header">
            <h2 className="vote-rail-title display-face">
              Completed <span className="vote-rail-count">({completed.length})</span>
            </h2>
          </div>
          <CompletedListSection tournaments={completed} onOpenResults={openResultsModal} />
        </section>
      </div>

      {focusedTournament && focusedMatch ? (
        <div className="vote-modal-overlay">
          <div className="vote-modal-shell vote-match-modal-shell">
            <div className="vote-match-modal-header">
              <div>
                <p className="vote-kicker">{formatRoundLabel(focusedMatch, focusedTournament)}</p>
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

function TournamentListSection({
  tournaments,
  emptyTitle,
  emptySubtitle,
  onSelectTournament
}) {
  if (tournaments.length === 0) {
    return (
      <div className="vote-list-empty-wrap">
        <div className="vote-list-empty-panel">
          <p className="vote-list-empty-title display-face">{emptyTitle}</p>
          {emptySubtitle ? (
            <p className="vote-list-empty-subtitle">{emptySubtitle}</p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {tournaments.map((tournament) => {
        const openMatches = openMatchesForTournament(tournament);
        const viewerCompletedParallel =
          tournament.kind === "parallel_parent" &&
          tournament.viewerParticipantStatus === "complete";

        return (
          <div
            key={tournament.id}
            className="vote-list-item"
          >
            <div className="vote-list-item-header">
              <div>
                <h3 className="vote-list-item-title display-face">{tournament.title}</h3>
                <p className="vote-list-item-meta">
                  {tournament.sharingMode.replace("_", " ")} | {tournament.entryCount} entries |{" "}
                  {tournament.kind === "parallel_parent"
                    ? `${tournament.completedParticipantCount ?? 0}/${tournament.participantCount ?? 0} complete`
                    : `${openMatches.length} open ${openMatches.length === 1 ? "match" : "matches"}`}{" "}
                  | Pool:{" "}
                  {tournament.sourcePoolName || "Unknown pool"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSelectTournament(tournament)}
                disabled={!viewerCompletedParallel && openMatches.length === 0}
                className="ui-button ui-button-primary"
              >
                {viewerCompletedParallel ? "Results" : "Vote"}
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
    <div className="vote-completed-list">
      {tournaments.length === 0 ? (
        <div className="vote-list-empty-panel">
          <p className="vote-list-empty-title display-face">No Completed Brackets</p>
        </div>
      ) : (
        tournaments.map((tournament) => (
          <button
            key={tournament.id}
            type="button"
            onClick={() => onOpenResults(tournament)}
            className="vote-completed-item"
          >
            <div className="vote-completed-item-body">
              <div>
                <h3 className="vote-completed-title display-face">{tournament.title}</h3>
                {tournament.winnerName ? (
                  <p className="vote-completed-winner display-face">
                    Winner: {tournament.winnerName}
                    {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
                  </p>
                ) : null}
              </div>
              {tournament.winnerImageUrl ? (
                <BackdropRemoteImage
                  src={tournament.winnerImageUrl}
                  alt={tournament.winnerName || tournament.title}
                  className="vote-completed-image"
                  imageClassName="object-cover object-center"
                  undersizedImageClassName="object-contain p-2"
                  minimumSourceWidth={96}
                  minimumSourceHeight={96}
                />
              ) : null}
            </div>
          </button>
        ))
      )}
    </div>
  );
}

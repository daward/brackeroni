"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompactRailHeader } from "@/components/shared";
import { getTournamentWithMatches, submitMatchVote } from "@/lib/client-api/voting";
import { CompletedListSection } from "./completed-list-section";
import { TournamentListSection } from "./tournament-list-section";
import type { VoteScreenPanelsProps, VoteTournament } from "./voting-internal-types";
import { getErrorMessage } from "./voting-internal-types";
import { getCurrentRoundProgress, openMatchesForTournament } from "./vote-match-state";
import { VoteMatchModal } from "./vote-match-modal";
import { buildCreateReturnUrl, buildResultsUrl, buildVoteUrl } from "./vote-routing";
import { readStoredFocusedTournamentId, writeStoredFocusedTournamentId } from "./vote-storage";
import { VoteWaitingModal } from "./vote-waiting-modal";

export function VoteScreenPanels({
  activeTournaments,
  completedTournaments,
  completedHasNextPage = false,
  initialFocusedTournamentId = null,
  initialReturnTo = null,
  signInRequiredTournament = null,
}: VoteScreenPanelsProps) {
  const router = useRouter();
  const [active, setActive] = useState<VoteTournament[]>(activeTournaments);
  const [completed, setCompleted] = useState<VoteTournament[]>(completedTournaments);
  const [completedHasNext, setCompletedHasNext] = useState(completedHasNextPage);
  const [completedLoading, setCompletedLoading] = useState(false);
  const completedOffsetRef = useRef(completedTournaments.length);
  const [focusedTournamentId, setFocusedTournamentId] = useState<string | null>(() => {
    return initialFocusedTournamentId || readStoredFocusedTournamentId() || null;
  });
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [postRoundPollCount, setPostRoundPollCount] = useState(0);
  const [mobileOpenSection, setMobileOpenSection] = useState<"open" | "completed" | null>("open");
  const replaceIfChanged = useCallback(
    (href: string) => {
      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` === href) {
        return;
      }

      router.replace(href);
    },
    [router],
  );

  const loadMoreCompleted = useCallback(async () => {
    if (completedLoading || !completedHasNext) return;
    setCompletedLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/tournaments?scope=vote-completed&offset=${completedOffsetRef.current}&limit=12`, {
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "Failed to load more completed brackets.");
      }
      const data = await response.json();
      const nextItems = data.items ?? [];
      const uniqueItems = nextItems.filter((item: VoteTournament) => !completed.some((existing) => existing.id === item.id));
      setCompleted((current) => [...current, ...uniqueItems]);
      completedOffsetRef.current += nextItems.length;
      setCompletedHasNext(uniqueItems.length > 0 && Boolean(data.meta?.hasNextPage));
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load more completed brackets."));
    } finally {
      setCompletedLoading(false);
    }
  }, [completed, completedHasNext, completedLoading]);

  const focusedTournament = active.find((tournament) => tournament.id === focusedTournamentId) ?? null;
  const openActiveTournaments = active.filter((tournament) => openMatchesForTournament(tournament).length > 0);
  const openMatchCount = openActiveTournaments.reduce((count, tournament) => {
    return count + openMatchesForTournament(tournament).length;
  }, 0);
  const focusedMatches = focusedTournament ? openMatchesForTournament(focusedTournament) : [];
  const focusedMatch = focusedMatches[0] ?? null;
  const currentRoundProgress = getCurrentRoundProgress(focusedTournament, focusedMatch);
  const waitingTournamentIds = active
    .filter((tournament) => tournament.kind !== "parallel_parent" && openMatchesForTournament(tournament).length === 0)
    .map((tournament) => tournament.id)
    .sort();
  const waitingTournamentKey = waitingTournamentIds.join(":");
  const shouldReturnToCreate = initialReturnTo === "create";
  const postRoundPollEnabled = waitingTournamentIds.length > 0 && postRoundPollCount < 18 && !pendingVoteMatchId;
  const isFocusedTournamentWaiting =
    focusedTournament !== null &&
    focusedTournament.kind !== "parallel_parent" &&
    !focusedMatch &&
    waitingTournamentIds.includes(focusedTournament.id) &&
    postRoundPollEnabled;

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
    waitingTournamentIds,
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
    replaceIfChanged,
  ]);

  async function vote(matchId: string, tournamentId: string, selectedEntryId: string | null | undefined) {
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
      const voteError = error as { status?: number; code?: string; message?: string };
      if (voteError.status === 400 && voteError.code === "MATCH_NOT_OPEN") {
        setTransitionMessage("That round closed before your vote was submitted, so it did not count.");
        await refreshTournamentState(tournamentId);
        setMessage("That round already closed. Moving you to the latest bracket state.");
        setPendingVoteMatchId(null);
        return;
      }

      if (voteError.status === 409 && voteError.code === "ALREADY_VOTED") {
        setTransitionMessage("");
        await refreshTournamentState(tournamentId);
        setMessage("That vote was already recorded. Moving to the next available matchup.");
        setPendingVoteMatchId(null);
        return;
      }

      setError(voteError.message || "Failed to record vote.");
      setPendingVoteMatchId(null);
      return;
    }

    if (voteResult?.tournamentStatus === "complete") {
      setTransitionMessage("");
      setActive((current) => current.filter((tournament) => tournament.id !== tournamentId));
      setCompleted((current) => [
        {
          ...(focusedTournament || { title: "Completed bracket", createdAt: new Date().toISOString() }),
          id: tournamentId,
          status: "complete",
        } as VoteTournament,
        ...current.filter((tournament) => tournament.id !== tournamentId),
      ]);
      setFocusedTournamentId(null);
      writeStoredFocusedTournamentId(null);
      setPendingVoteMatchId(null);
      router.replace(buildResultsUrl(tournamentId));
      return;
    }

    const optimisticTournament =
      focusedTournament?.id === tournamentId
        ? {
            ...focusedTournament,
            matches: (focusedTournament.matches || []).map((match) => {
              if (match.id !== matchId) {
                return match;
              }

              return {
                ...match,
                userVoteEntryId: selectedEntryId,
                leftVoteCount: match.leftEntryId === selectedEntryId ? (match.leftVoteCount || 0) + 1 : match.leftVoteCount,
                rightVoteCount: match.rightEntryId === selectedEntryId ? (match.rightVoteCount || 0) + 1 : match.rightVoteCount,
              };
            }),
          }
        : null;
    const remainingOpenMatches = optimisticTournament ? openMatchesForTournament(optimisticTournament).length : 0;

    if (optimisticTournament) {
      setActive((current) => current.map((tournament) => (tournament.id === tournamentId ? optimisticTournament : tournament)));
    }

    if (focusedTournament?.sharingMode === "private" && remainingOpenMatches === 0) {
      await refreshTournamentState(tournamentId);
      setMessage("Vote recorded. Next round ready.");
      setPendingVoteMatchId(null);
      return;
    }

    setFocusedTournamentId(tournamentId);
    setMessage(
      remainingOpenMatches > 0
        ? "Vote recorded. Next matchup ready."
        : "Vote recorded. No open matches remain in this round. Checking for the next round.",
    );
    setPendingVoteMatchId(null);
  }

  async function refreshTournamentState(tournamentId: string) {
    let refreshData;
    try {
      refreshData = await getTournamentWithMatches(tournamentId);
    } catch (error) {
      setError(getErrorMessage(error, "Failed to refresh bracket."));
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
      matches,
    };
    const remainingOpenMatches = openMatchesForTournament(refreshedTournament);

    setActive((current) => current.map((tournament) => (tournament.id === tournamentId ? refreshedTournament : tournament)));
    setFocusedTournamentId((currentFocusedTournamentId) => {
      if (currentFocusedTournamentId !== tournamentId) {
        return currentFocusedTournamentId;
      }

      return remainingOpenMatches.length > 0 ? tournamentId : null;
    });
  }

  function handleSelectTournament(tournament: VoteTournament) {
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

  function openResultsModal(tournament: VoteTournament) {
    router.push(buildResultsUrl(tournament));
  }

  return (
    <div className="vote-page">
      <div className="vote-page-messages">
        {error ? <p className="vote-message vote-message-error">{error}</p> : null}
        {message ? <p className="vote-message vote-message-success">{message}</p> : null}
        {signInRequiredTournament ? (
          <section className="vote-callout-panel">
            <CompactRailHeader kicker="Sign-In Required" title={signInRequiredTournament.title} />
            <div className="vote-callout-body">
              <p className="vote-callout-copy">This public bracket is visible, but voting in it requires a signed-in account.</p>
              <div className="vote-callout-actions">
                <Link href="/api/auth/signin" className="ui-button ui-button-primary">
                  Sign In To Vote
                </Link>
                <Link href={buildResultsUrl(signInRequiredTournament)} className="ui-button ui-button-muted">
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
            title={
              <>
                Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span>
              </>
            }
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
            onClick={() => setMobileOpenSection((current) => (current === "completed" ? null : "completed"))}
            className="compact-rail-header-button"
            aria-expanded={mobileOpenSection === "completed"}
            title={
              <>
                Completed <span className="compact-rail-header-count">({completed.length})</span>
              </>
            }
          />
          {mobileOpenSection === "completed" ? (
            <CompletedListSection
              tournaments={completed}
              onOpenResults={openResultsModal}
              hasNextPage={completedHasNext}
              loading={completedLoading}
              onLoadMore={loadMoreCompleted}
            />
          ) : null}
        </section>
      </div>

      <div className="vote-desktop-sections hidden lg:flex">
        <section className="vote-rail">
          <CompactRailHeader
            title={
              <>
                Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span>
              </>
            }
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
            title={
              <>
                Completed <span className="compact-rail-header-count">({completed.length})</span>
              </>
            }
          />
          <CompletedListSection
            tournaments={completed}
            onOpenResults={openResultsModal}
            hasNextPage={completedHasNext}
            loading={completedLoading}
            onLoadMore={loadMoreCompleted}
          />
        </section>
      </div>

      {focusedTournament && focusedMatch ? (
        <VoteMatchModal
          tournament={focusedTournament}
          match={focusedMatch}
          focusedMatches={focusedMatches}
          currentRoundProgress={currentRoundProgress}
          pendingVoteMatchId={pendingVoteMatchId}
          transitionMessage={transitionMessage}
          onClose={() => {
            setFocusedTournamentId(null);
            writeStoredFocusedTournamentId(null);
            router.replace(buildVoteUrl({ returnTo: initialReturnTo }));
          }}
          onVote={vote}
        />
      ) : null}

      {focusedTournament && isFocusedTournamentWaiting ? (
        <VoteWaitingModal
          tournament={focusedTournament}
          transitionMessage={transitionMessage}
          postRoundPollCount={postRoundPollCount}
        />
      ) : null}
    </div>
  );
}

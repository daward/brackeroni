"use client";

import type { Dispatch, SetStateAction } from "react";
import { getTournamentWithMatches, submitMatchVote } from "@/lib/client-api/voting";
import { openMatchesForTournament } from "./vote-match-state";
import { buildResultsUrl, buildVoteUrl } from "./vote-routing";
import { writeStoredFocusedTournamentId } from "./vote-storage";
import type { VoteTournament } from "./voting-internal-types";
import { getErrorMessage } from "./voting-internal-types";

type VoteScreenRouter = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

type UseVoteScreenActionsProps = {
  focusedTournament: VoteTournament | null;
  initialReturnTo: string | null;
  pendingVoteMatchId: string | null;
  router: VoteScreenRouter;
  setActive: Dispatch<SetStateAction<VoteTournament[]>>;
  setCompleted: Dispatch<SetStateAction<VoteTournament[]>>;
  setError: Dispatch<SetStateAction<string>>;
  setFocusedTournamentId: Dispatch<SetStateAction<string | null>>;
  setMessage: Dispatch<SetStateAction<string>>;
  setPendingVoteMatchId: Dispatch<SetStateAction<string | null>>;
  setTransitionMessage: Dispatch<SetStateAction<string>>;
};

export function useVoteScreenActions({
  focusedTournament,
  initialReturnTo,
  pendingVoteMatchId,
  router,
  setActive,
  setCompleted,
  setError,
  setFocusedTournamentId,
  setMessage,
  setPendingVoteMatchId,
  setTransitionMessage,
}: UseVoteScreenActionsProps) {
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

  return {
    handleSelectTournament,
    openResultsModal,
    refreshTournamentState,
    vote,
  };
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { openMatchesForTournament } from "./vote-match-state";
import { buildCreateReturnUrl, buildVoteUrl } from "./vote-routing";
import { readStoredFocusedTournamentId, writeStoredFocusedTournamentId } from "./vote-storage";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";

type UseVoteFocusRoutingProps = {
  active: VoteTournament[];
  focusedMatch: VoteMatch | null;
  focusedTournament: VoteTournament | null;
  focusedTournamentId: string | null;
  initialFocusedTournamentId: string | null;
  initialReturnTo: string | null;
  pendingVoteMatchId: string | null;
  refreshTournamentState: (tournamentId: string) => Promise<void>;
  replaceIfChanged: (href: string) => void;
  setFocusedTournamentId: (tournamentId: string | null) => void;
};

export function useVoteFocusRouting({
  active,
  focusedMatch,
  focusedTournament,
  focusedTournamentId,
  initialFocusedTournamentId,
  initialReturnTo,
  pendingVoteMatchId,
  refreshTournamentState,
  replaceIfChanged,
  setFocusedTournamentId,
}: UseVoteFocusRoutingProps) {
  const [postRoundPollCount, setPostRoundPollCount] = useState(0);
  const waitingTournamentIds = useMemo(
    () =>
      active
        .filter((tournament) => tournament.kind !== "parallel_parent" && openMatchesForTournament(tournament).length === 0)
        .map((tournament) => tournament.id)
        .sort(),
    [active],
  );
  const waitingTournamentKey = waitingTournamentIds.join(":");
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
    const isWaiting = storedTournament.kind !== "parallel_parent" && waitingTournamentIds.includes(storedTournament.id) && postRoundPollEnabled;

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
    if (initialReturnTo !== "create" || !focusedTournament || focusedMatch || isFocusedTournamentWaiting || pendingVoteMatchId) {
      return;
    }

    replaceIfChanged(buildCreateReturnUrl(focusedTournament.id, "active"));
  }, [initialReturnTo, focusedTournament, focusedMatch, isFocusedTournamentWaiting, pendingVoteMatchId, replaceIfChanged]);

  return {
    isFocusedTournamentWaiting,
    postRoundPollCount,
  };
}

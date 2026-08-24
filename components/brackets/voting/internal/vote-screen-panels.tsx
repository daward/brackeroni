"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useCompletedVoteTournaments } from "./use-completed-vote-tournaments";
import type { VoteScreenPanelsProps, VoteTournament } from "./voting-internal-types";
import { getCurrentRoundProgress, openMatchesForTournament } from "./vote-match-state";
import { VoteMatchModal } from "./vote-match-modal";
import { buildVoteUrl } from "./vote-routing";
import { VoteSignInCallout } from "./vote-sign-in-callout";
import { readStoredFocusedTournamentId, writeStoredFocusedTournamentId } from "./vote-storage";
import { VoteTournamentRails } from "./vote-tournament-rails";
import type { VoteMobileOpenSection } from "./vote-tournament-rails";
import { VoteWaitingModal } from "./vote-waiting-modal";
import { useVoteFocusRouting } from "./use-vote-focus-routing";
import { useVoteScreenActions } from "./use-vote-screen-actions";

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
  const [focusedTournamentId, setFocusedTournamentId] = useState<string | null>(() => {
    return initialFocusedTournamentId || readStoredFocusedTournamentId() || null;
  });
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [mobileOpenSection, setMobileOpenSection] = useState<VoteMobileOpenSection>("open");
  const { completed, completedHasNext, completedLoading, loadMoreCompleted, setCompleted } =
    useCompletedVoteTournaments({
      initialCompletedTournaments: completedTournaments,
      initialHasNextPage: completedHasNextPage,
      setError,
    });
  const replaceIfChanged = useCallback(
    (href: string) => {
      if (typeof window !== "undefined" && `${window.location.pathname}${window.location.search}` === href) {
        return;
      }

      router.replace(href);
    },
    [router],
  );

  const focusedTournament = active.find((tournament) => tournament.id === focusedTournamentId) ?? null;
  const openActiveTournaments = active.filter((tournament) => openMatchesForTournament(tournament).length > 0);
  const openMatchCount = openActiveTournaments.reduce((count, tournament) => {
    return count + openMatchesForTournament(tournament).length;
  }, 0);
  const focusedMatches = focusedTournament ? openMatchesForTournament(focusedTournament) : [];
  const focusedMatch = focusedMatches[0] ?? null;
  const currentRoundProgress = getCurrentRoundProgress(focusedTournament, focusedMatch);

  const { handleSelectTournament, openResultsModal, refreshTournamentState, vote } = useVoteScreenActions({
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
  });

  const { isFocusedTournamentWaiting, postRoundPollCount } = useVoteFocusRouting({
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
  });

  return (
    <div className="vote-page">
      <div className="vote-page-messages">
        {error ? <p className="vote-message vote-message-error">{error}</p> : null}
        {message ? <p className="vote-message vote-message-success">{message}</p> : null}
        {signInRequiredTournament ? <VoteSignInCallout tournament={signInRequiredTournament} /> : null}
      </div>

      <VoteTournamentRails
        completed={completed}
        completedHasNext={completedHasNext}
        completedLoading={completedLoading}
        mobileOpenSection={mobileOpenSection}
        onLoadMoreCompleted={loadMoreCompleted}
        onOpenResults={openResultsModal}
        onSelectTournament={handleSelectTournament}
        openMatchCount={openMatchCount}
        openTournaments={openActiveTournaments}
        setMobileOpenSection={setMobileOpenSection}
      />

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

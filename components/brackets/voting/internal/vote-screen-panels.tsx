"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { VoteScreenPanelsProps, VoteTournament } from "./voting-internal-types";
import { getCurrentRoundProgress, isVoteTournamentWaiting, openMatchesForTournament, shouldShowInVoteNow } from "./vote-match-state";
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
  initialFocusedMatchId = null,
  initialFocusedTournamentId = null,
  initialOpenVote = false,
  initialReturnTo = null,
  signInRequiredTournament = null,
}: VoteScreenPanelsProps) {
  const router = useRouter();
  const [active, setActive] = useState<VoteTournament[]>(activeTournaments);
  const [focusedTournamentId, setFocusedTournamentId] = useState<string | null>(() => {
    return initialFocusedTournamentId || readStoredFocusedTournamentId() || null;
  });
  const [votingTournamentId, setVotingTournamentId] = useState<string | null>(() => {
    return initialOpenVote || initialReturnTo === "create" ? initialFocusedTournamentId : null;
  });
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [transitionMessage, setTransitionMessage] = useState("");
  const [mobileOpenSection, setMobileOpenSection] = useState<VoteMobileOpenSection>("open");
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
  const votingTournament = active.find((tournament) => tournament.id === votingTournamentId) ?? null;
  const listedActiveTournaments = active.filter((tournament) => shouldShowInVoteNow(tournament, focusedTournamentId));
  const openMatchCount = listedActiveTournaments.reduce((count, tournament) => {
    return count + openMatchesForTournament(tournament).length;
  }, 0);
  const focusedMatches = focusedTournament ? openMatchesForTournament(focusedTournament) : [];
  const focusedMatch = focusedMatches[0] ?? null;
  const votingMatches = votingTournament ? openMatchesForTournament(votingTournament) : [];
  const votingMatch = votingMatches.find((match) => match.id === initialFocusedMatchId) ?? votingMatches[0] ?? null;
  const currentRoundProgress = getCurrentRoundProgress(votingTournament, votingMatch);

  const { handleSelectTournament, refreshTournamentState, vote } = useVoteScreenActions({
    focusedTournament,
    initialReturnTo,
    pendingVoteMatchId,
    router,
    setActive,
    setCompleted: () => {},
    setError,
    setFocusedTournamentId,
    setMessage,
    setPendingVoteMatchId,
    setTransitionMessage,
    setVotingTournamentId,
  });

  const { postRoundPollCount } = useVoteFocusRouting({
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
        mobileOpenSection={mobileOpenSection}
        onSelectTournament={handleSelectTournament}
        openMatchCount={openMatchCount}
        openTournaments={listedActiveTournaments}
        setMobileOpenSection={setMobileOpenSection}
      />

      {votingTournament && votingMatch ? (
        <VoteMatchModal
          tournament={votingTournament}
          match={votingMatch}
          focusedMatches={votingMatches}
          currentRoundProgress={currentRoundProgress}
          pendingVoteMatchId={pendingVoteMatchId}
          transitionMessage={transitionMessage}
          onClose={() => {
            setVotingTournamentId(null);
            setFocusedTournamentId(null);
            writeStoredFocusedTournamentId(null);
            router.replace(buildVoteUrl({ returnTo: initialReturnTo }));
          }}
          onVote={vote}
        />
      ) : null}

      {votingTournament && isVoteTournamentWaiting(votingTournament) ? (
        <VoteWaitingModal
          tournament={votingTournament}
          transitionMessage={transitionMessage}
          postRoundPollCount={postRoundPollCount}
        />
      ) : null}
    </div>
  );
}

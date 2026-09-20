"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getTournamentWithMatches, submitMatchVote } from "@/lib/client-api/voting";
import { getCurrentRoundProgress, openMatchesForTournament } from "./vote-match-state";
import { VoteMatchModal } from "./vote-match-modal";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";
import { getErrorMessage } from "./voting-internal-types";

const POLL_INTERVAL_MS = 10_000;
const MAX_POLL_COUNT = 18;

type FriendsBracketVotePageProps = {
  initialMatches: VoteMatch[];
  initialTournament: VoteTournament;
};

function composeTournament(tournament: VoteTournament, matches: VoteMatch[]): VoteTournament {
  return {
    ...tournament,
    matches,
    viewerHasVotes: tournament.viewerHasVotes || matches.some((match) => Boolean(match.userVoteEntryId)),
  };
}

function getCurrentRoundMatches(tournament: VoteTournament) {
  const matches = tournament.matches || [];
  const activeRoundNumber =
    tournament.activeRoundNumber ??
    matches
      .map((match) => Number(match.roundNumber) || 0)
      .filter(Boolean)
      .sort((left, right) => right - left)[0] ??
    null;

  if (!activeRoundNumber) {
    return [];
  }

  return matches.filter((match) => Number(match.roundNumber) === activeRoundNumber && match.leftEntryId && match.rightEntryId);
}

function getRoundStatus(tournament: VoteTournament) {
  const roundMatches = getCurrentRoundMatches(tournament);
  const closedCount = roundMatches.filter((match) => match.status === "closed" || match.status === "auto_resolved" || Boolean(match.winnerEntryId)).length;

  return {
    closedCount,
    openCount: Math.max(roundMatches.length - closedCount, 0),
    roundLabel: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Current round",
    totalCount: roundMatches.length,
  };
}

export function FriendsBracketVotePage({ initialMatches, initialTournament }: FriendsBracketVotePageProps) {
  const [tournament, setTournament] = useState(() => composeTournament(initialTournament, initialMatches));
  const [isVoteOpen, setIsVoteOpen] = useState(() => openMatchesForTournament(composeTournament(initialTournament, initialMatches)).length > 0);
  const [pendingVoteMatchId, setPendingVoteMatchId] = useState<string | null>(null);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pollCount, setPollCount] = useState(0);
  const [pollingActive, setPollingActive] = useState(true);
  const [userClosedVoting, setUserClosedVoting] = useState(false);

  const openMatches = useMemo(() => openMatchesForTournament(tournament), [tournament]);
  const votingMatch = openMatches[0] ?? null;
  const isWaiting = tournament.status === "active" && openMatches.length === 0;
  const pollingExpired = isWaiting && pollCount >= MAX_POLL_COUNT;
  const checksRemaining = Math.max(MAX_POLL_COUNT - pollCount, 0);
  const roundStatus = getRoundStatus(tournament);
  const currentRoundProgress = getCurrentRoundProgress(tournament, votingMatch);

  const refreshBracketState = useCallback(async () => {
    let refreshData;

    try {
      refreshData = await getTournamentWithMatches(tournament.id);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError, "Failed to refresh bracket."));
      return null;
    }

    const refreshedTournament = composeTournament(refreshData.tournament, refreshData.matches);
    const refreshedOpenMatches = openMatchesForTournament(refreshedTournament);

    setTournament(refreshedTournament);
    if (refreshedOpenMatches.length > 0) {
      setPollingActive(false);
      setPollCount(0);
      setUserClosedVoting(false);
      setIsVoteOpen(true);
      setMessage("The next matchup is ready.");
    }

    return refreshedTournament;
  }, [tournament.id]);

  useEffect(() => {
    if (!isWaiting || !pollingActive || pollingExpired) {
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      await refreshBracketState();
      setPollCount((current) => current + 1);
    }, POLL_INTERVAL_MS);

    return () => window.clearTimeout(timer);
  }, [isWaiting, pollingActive, pollingExpired, pollCount, refreshBracketState]);

  useEffect(() => {
    if (openMatches.length === 0 || userClosedVoting) {
      return;
    }

    setIsVoteOpen(true);
  }, [openMatches.length, userClosedVoting]);

  async function handleVote(matchId: string, tournamentId: string, selectedEntryId: string | null | undefined) {
    if (pendingVoteMatchId) {
      return;
    }

    setError("");
    setMessage("");
    setTransitionMessage("");
    setPendingVoteMatchId(matchId);

    try {
      await submitMatchVote(matchId, selectedEntryId);
      const refreshedTournament = await refreshBracketState();
      const remainingOpenMatches = refreshedTournament ? openMatchesForTournament(refreshedTournament).length : 0;

      if (remainingOpenMatches > 0) {
        setMessage("Vote recorded. Next matchup ready.");
      } else {
        setIsVoteOpen(false);
        setPollingActive(true);
        setPollCount(0);
        setMessage("Vote recorded. Waiting for the next round to open.");
      }
    } catch (voteError) {
      const typedVoteError = voteError as { status?: number; code?: string; message?: string };
      if (typedVoteError.status === 400 && typedVoteError.code === "MATCH_NOT_OPEN") {
        setTransitionMessage("That round closed before your vote was submitted, so it did not count.");
        await refreshBracketState();
        setMessage("That round already closed. Waiting for the latest bracket state.");
      } else if (typedVoteError.status === 409 && typedVoteError.code === "ALREADY_VOTED") {
        await refreshBracketState();
        setMessage("That vote was already recorded. Moving to the next available matchup.");
      } else {
        setError(typedVoteError.message || "Failed to record vote.");
      }
    } finally {
      setPendingVoteMatchId(null);
    }
  }

  async function handleRefresh() {
    setError("");
    setMessage("");
    setPollingActive(true);
    setPollCount(0);
    await refreshBracketState();
  }

  return (
    <div className="friends-vote-page">
      <header className="friends-vote-header">
        <div>
          <p className="vote-kicker">Friends Bracket</p>
          <h1 className="friends-vote-title display-face">{tournament.title}</h1>
        </div>
        <Link href="/vote" className="ui-button ui-button-secondary">
          Other brackets
        </Link>
      </header>

      <section className="friends-vote-status">
        {error ? <p className="vote-message vote-message-error">{error}</p> : null}
        {message ? <p className="vote-message vote-message-success">{message}</p> : null}

        {tournament.status === "complete" ? (
          <div className="friends-vote-waiting">
            <p className="vote-kicker">Complete</p>
            <h2 className="friends-vote-status-title display-face">This bracket is finished.</h2>
            <Link href={`/results/${tournament.id}`} className="ui-button ui-button-primary">
              View results
            </Link>
          </div>
        ) : null}

        {tournament.status === "active" && openMatches.length > 0 ? (
          <div className="friends-vote-waiting">
            <p className="vote-kicker">Ready</p>
            <h2 className="friends-vote-status-title display-face">You have matchups to vote on.</h2>
            <button type="button" className="ui-button ui-button-primary" onClick={() => {
              setUserClosedVoting(false);
              setIsVoteOpen(true);
            }}>
              Vote now
            </button>
          </div>
        ) : null}

        {isWaiting ? (
          <div className="friends-vote-waiting">
            <p className="vote-kicker">Waiting Room</p>
            <h2 className="friends-vote-status-title display-face">Waiting for the next round to open.</h2>
            <p className="friends-vote-copy">
              You are done for now. This page will check for a little while, then pause until you ask it to check again.
            </p>
            <div className="vote-waiting-stats friends-vote-stats">
              <div className="vote-waiting-stat">
                <p className="vote-waiting-stat-label">{roundStatus.roundLabel}</p>
                <p className="vote-waiting-stat-value display-face">
                  {roundStatus.closedCount}/{roundStatus.totalCount || 0} closed
                </p>
              </div>
              <div className="vote-waiting-stat">
                <p className="vote-waiting-stat-label">Still open</p>
                <p className="vote-waiting-stat-value display-face">{roundStatus.openCount}</p>
              </div>
              <div className="vote-waiting-stat">
                <p className="vote-waiting-stat-label">Checks remaining</p>
                <p className="vote-waiting-stat-value display-face">{checksRemaining}</p>
              </div>
            </div>
            {pollingExpired ? (
              <button type="button" className="ui-button ui-button-primary" onClick={handleRefresh}>
                Check again
              </button>
            ) : (
              <p className="friends-vote-polling-note">
                Checking every 10 seconds.
              </p>
            )}
          </div>
        ) : null}
      </section>

      {isVoteOpen && votingMatch ? (
        <VoteMatchModal
          tournament={tournament}
          match={votingMatch}
          focusedMatches={openMatches}
          currentRoundProgress={currentRoundProgress}
          pendingVoteMatchId={pendingVoteMatchId}
          transitionMessage={transitionMessage}
          onClose={() => {
            setUserClosedVoting(true);
            setIsVoteOpen(false);
          }}
          onVote={handleVote}
        />
      ) : null}
    </div>
  );
}

"use client";

import { getCurrentRoundProgress, openMatchesForTournament, VoteMatchModal } from "@/components/brackets/voting/client";
import type { VoteMatch, VoteTournament } from "@/components/brackets/voting/client";
import type { Bracket, BracketMatch } from "@/lib/brackets/types";

type StatusInlineVotingProps = {
  tournament: Bracket;
  matches: BracketMatch[];
  isActionPending: (actionKey: string) => boolean;
  onClose: () => void;
  onVote: (tournamentId: string, matchId: string, selectedEntryId: string) => void;
};

export function StatusInlineVoting({ tournament, matches, isActionPending, onClose, onVote }: StatusInlineVotingProps) {
  const voteTournament: VoteTournament = {
    ...tournament,
    matches: matches.map(normalizeVoteMatch),
  };
  const focusedMatches = openMatchesForTournament(voteTournament);
  const match = focusedMatches[0] || null;

  if (!match) {
    return null;
  }

  return (
    <VoteMatchModal
      tournament={voteTournament}
      match={match}
      focusedMatches={focusedMatches}
      currentRoundProgress={getCurrentRoundProgress(voteTournament, match)}
      pendingVoteMatchId={isActionPending(`vote-match:${match.id}`) ? match.id : null}
      transitionMessage=""
      onClose={onClose}
      onVote={(matchId, tournamentId, selectedEntryId) => {
        if (selectedEntryId) {
          onVote(tournamentId, matchId, selectedEntryId);
        }
      }}
    />
  );
}

function normalizeVoteMatch(match: BracketMatch): VoteMatch {
  return {
    ...match,
    leftEntryId: match.left?.id ?? null,
    rightEntryId: match.right?.id ?? null,
    leftName: match.left?.name ?? null,
    rightName: match.right?.name ?? null,
    leftImageUrl: match.left?.imageUrl ?? null,
    rightImageUrl: match.right?.imageUrl ?? null,
    leftVoteCount: match.left?.voteCount ?? null,
    rightVoteCount: match.right?.voteCount ?? null,
  };
}

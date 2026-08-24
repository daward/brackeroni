import type { WorkspaceInvite, WorkspaceMatch, WorkspaceTournament } from "./workspace-internal-types";

export function getLiveBracketStat(
  tournament: WorkspaceTournament,
  invitees: WorkspaceInvite[] = [],
  matches: WorkspaceMatch[] = [],
) {
  if (tournament.kind === "parallel_parent") {
    const complete = tournament.completedParticipantCount ?? 0;
    const total = tournament.participantCount ?? 0;
    return {
      kicker: "Parallel",
      detail: total > 0 ? `${complete} of ${total} finished` : "Waiting for participants",
    };
  }

  if (tournament.advancementMode === "manual_winner") {
    const unresolvedCount = matches.filter((match) => match.status === "open" && !match.winnerEntryId).length;
    return {
      kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Manual Results",
      detail: unresolvedCount > 0 ? `${unresolvedCount} winners still to enter` : "All winners entered",
    };
  }

  const openMatches = tournament.activeRoundOpenMatchCount ?? 0;
  if (tournament.sharingMode === "with_friends" && invitees.length > 0) {
    const waitingCount = invitees.filter((invite) => {
      const openMatchCount = invite.openMatchCount ?? 0;
      const votesCast = invite.votesCast ?? 0;
      return openMatchCount > 0 && votesCast < openMatchCount;
    }).length;

    return {
      kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Voting",
      detail: waitingCount > 0 ? `${waitingCount} voters still voting` : openMatches > 0 ? `${openMatches} matchups open` : "Round ready to close",
    };
  }

  return {
    kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Live",
    detail: openMatches > 0 ? `${openMatches} matchups open` : "Round ready to close",
  };
}

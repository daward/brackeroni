import type { VoteTournament } from "./voting-internal-types";
import { isVoteTournamentWaiting, openMatchesForTournament } from "./vote-match-state";

type TournamentListSectionProps = {
  tournaments: VoteTournament[];
  currentUserId?: string | null;
  emptyTitle: string;
  emptySubtitle?: string;
  onSelectTournament: (tournament: VoteTournament) => void;
};

function getAuthorLabel(tournament: VoteTournament) {
  const author = tournament.creatorName || tournament.creatorEmail;

  return author ? `By ${author}` : null;
}

function getActionLabel({
  canOpen,
  hasOpenVotes,
  isOwnerBracket,
  ownerCanCloseRound,
  viewerCompletedParallel,
  viewerWaiting,
}: {
  canOpen: boolean;
  hasOpenVotes: boolean;
  isOwnerBracket: boolean;
  ownerCanCloseRound: boolean;
  viewerCompletedParallel: boolean;
  viewerWaiting: boolean;
}) {
  if (hasOpenVotes) {
    return "Vote now";
  }

  if (isOwnerBracket) {
    if (ownerCanCloseRound) {
      return "Close round";
    }

    return "Manage bracket";
  }

  if (viewerCompletedParallel) {
    return "View results";
  }

  if (viewerWaiting) {
    return "Waiting for reveal";
  }

  return canOpen ? "Vote now" : "Waiting for the next round";
}

export function TournamentListSection({
  tournaments,
  currentUserId = null,
  emptyTitle,
  emptySubtitle,
  onSelectTournament,
}: TournamentListSectionProps) {
  if (tournaments.length === 0) {
    return (
      <div className="vote-empty-state">
        <p className="vote-empty-title display-face">{emptyTitle}</p>
        {emptySubtitle ? <p className="vote-empty-copy">{emptySubtitle}</p> : null}
      </div>
    );
  }

  return (
    <div className="vote-card-grid">
      {tournaments.map((tournament) => {
        const openMatches = openMatchesForTournament(tournament);
        const hasOpenVotes = openMatches.length > 0;
        const isOwnerBracket = tournament.creatorUserId === currentUserId;
        const ownerCanCloseRound = isOwnerBracket && tournament.sharingMode === "with_friends" && Boolean(tournament.allParticipantVotesReady);
        const viewerCompletedParallel = tournament.kind === "parallel_parent" && tournament.viewerParticipantStatus === "complete";
        const viewerWaiting = isVoteTournamentWaiting(tournament);
        const canOpen = hasOpenVotes || isOwnerBracket || viewerCompletedParallel || viewerWaiting;
        const authorLabel = getAuthorLabel(tournament);
        const actionLabel = getActionLabel({
          canOpen,
          hasOpenVotes,
          isOwnerBracket,
          ownerCanCloseRound,
          viewerCompletedParallel,
          viewerWaiting,
        });
        const waitingClass = viewerWaiting && !isOwnerBracket ? " vote-tournament-choice-waiting" : "";

        return (
          <button
            key={tournament.id}
            type="button"
            onClick={() => onSelectTournament(tournament)}
            disabled={!canOpen}
            className={`object-list-card vote-tournament-choice${waitingClass}`}
          >
            <h3 className="object-list-card-title display-face vote-tournament-choice-title">{tournament.title}</h3>
            {authorLabel ? <p className="object-list-card-copy vote-tournament-choice-meta">{authorLabel}</p> : null}
            <span className="object-list-card-action display-face">
              {actionLabel}
            </span>
          </button>
        );
      })}
    </div>
  );
}

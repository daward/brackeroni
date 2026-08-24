import type { VoteTournament } from "./voting-internal-types";
import { openMatchesForTournament } from "./vote-match-state";

type TournamentListSectionProps = {
  tournaments: VoteTournament[];
  emptyTitle: string;
  emptySubtitle?: string;
  onSelectTournament: (tournament: VoteTournament) => void;
};

export function TournamentListSection({
  tournaments,
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
        const viewerCompletedParallel = tournament.kind === "parallel_parent" && tournament.viewerParticipantStatus === "complete";
        const canOpen = viewerCompletedParallel || openMatches.length > 0;
        const matchCountLabel = `${openMatches.length} open ${openMatches.length === 1 ? "match" : "matches"}`;
        const sourcePoolLabel = tournament.sourcePoolName ? ` · ${tournament.sourcePoolName}` : "";

        return (
          <button
            key={tournament.id}
            type="button"
            onClick={() => onSelectTournament(tournament)}
            disabled={!canOpen}
            className="object-list-card vote-tournament-choice"
          >
            <h3 className="object-list-card-title display-face vote-tournament-choice-title">{tournament.title}</h3>
            <p className="object-list-card-copy vote-tournament-choice-meta">
              {tournament.kind === "parallel_parent"
                ? `${tournament.completedParticipantCount ?? 0}/${tournament.participantCount ?? 0} complete`
                : matchCountLabel}
              {sourcePoolLabel}
            </p>
            <span className="object-list-card-action display-face">
              {viewerCompletedParallel ? "View results" : canOpen ? "Vote now" : "Waiting for the next round"}
            </span>
          </button>
        );
      })}
    </div>
  );
}

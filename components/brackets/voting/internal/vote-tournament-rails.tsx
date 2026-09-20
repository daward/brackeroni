import { TournamentListSection } from "./tournament-list-section";
import type { VoteTournament } from "./voting-internal-types";

export type VoteMobileOpenSection = "open" | null;

type VoteTournamentRailsProps = {
  currentUserId: string | null;
  onSelectTournament: (tournament: VoteTournament) => void;
  openTournaments: VoteTournament[];
};

export function VoteTournamentRails({
  currentUserId,
  onSelectTournament,
  openTournaments,
}: VoteTournamentRailsProps) {
  return (
    <section className="vote-rail">
      <TournamentListSection
        tournaments={openTournaments}
        currentUserId={currentUserId}
        emptyTitle="No Open Matches"
        emptySubtitle="Nothing is waiting on a vote."
        onSelectTournament={onSelectTournament}
      />
    </section>
  );
}

import { CompletedBracketCard } from "@/components/brackets/shared";
import { InfiniteScrollControl } from "@/components/shared";
import type { VoteTournament } from "./voting-internal-types";

type CompletedListSectionProps = {
  tournaments: VoteTournament[];
  onOpenResults: (tournament: VoteTournament) => void;
  hasNextPage?: boolean;
  loading?: boolean;
  onLoadMore: () => void;
};

export function CompletedListSection({
  tournaments,
  onOpenResults,
  hasNextPage = false,
  loading = false,
  onLoadMore,
}: CompletedListSectionProps) {
  if (tournaments.length === 0) {
    return (
      <div className="vote-empty-state">
        <p className="vote-empty-title display-face">No completed brackets</p>
      </div>
    );
  }

  return (
    <div className="vote-card-grid">
      {tournaments.map((tournament) => (
        <CompletedBracketCard key={tournament.id} tournament={tournament} type="button" onClick={() => onOpenResults(tournament)} />
      ))}
      {hasNextPage ? (
        <InfiniteScrollControl
          enabled
          loading={loading}
          onLoadMore={onLoadMore}
          pageKey={tournaments.length}
          className="vote-completed-load-more"
          loadingLabel="Loading more completed brackets"
        />
      ) : null}
    </div>
  );
}

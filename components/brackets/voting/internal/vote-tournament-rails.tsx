import type { Dispatch, SetStateAction } from "react";
import { CompactRailHeader } from "@/components/shared";
import { CompletedListSection } from "./completed-list-section";
import { TournamentListSection } from "./tournament-list-section";
import type { VoteTournament } from "./voting-internal-types";

export type VoteMobileOpenSection = "open" | "completed" | null;

type VoteTournamentRailsProps = {
  completed: VoteTournament[];
  completedHasNext: boolean;
  completedLoading: boolean;
  mobileOpenSection: VoteMobileOpenSection;
  onLoadMoreCompleted: () => void;
  onOpenResults: (tournament: VoteTournament) => void;
  onSelectTournament: (tournament: VoteTournament) => void;
  openMatchCount: number;
  openTournaments: VoteTournament[];
  setMobileOpenSection: Dispatch<SetStateAction<VoteMobileOpenSection>>;
};

export function VoteTournamentRails({
  completed,
  completedHasNext,
  completedLoading,
  mobileOpenSection,
  onLoadMoreCompleted,
  onOpenResults,
  onSelectTournament,
  openMatchCount,
  openTournaments,
  setMobileOpenSection,
}: VoteTournamentRailsProps) {
  return (
    <>
      <div className="vote-mobile-sections lg:hidden">
        <section className="vote-rail">
          <CompactRailHeader
            as="button"
            type="button"
            onClick={() => setMobileOpenSection((current) => (current === "open" ? null : "open"))}
            className="compact-rail-header-button"
            aria-expanded={mobileOpenSection === "open"}
            title={
              <>
                Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span>
              </>
            }
          />
          {mobileOpenSection === "open" ? (
            <TournamentListSection
              tournaments={openTournaments}
              emptyTitle="No Open Matches"
              emptySubtitle="Nothing is waiting on a vote."
              onSelectTournament={onSelectTournament}
            />
          ) : null}
        </section>

        <section className="vote-rail">
          <CompactRailHeader
            as="button"
            type="button"
            onClick={() => setMobileOpenSection((current) => (current === "completed" ? null : "completed"))}
            className="compact-rail-header-button"
            aria-expanded={mobileOpenSection === "completed"}
            title={
              <>
                Completed <span className="compact-rail-header-count">({completed.length})</span>
              </>
            }
          />
          {mobileOpenSection === "completed" ? (
            <CompletedListSection
              tournaments={completed}
              onOpenResults={onOpenResults}
              hasNextPage={completedHasNext}
              loading={completedLoading}
              onLoadMore={onLoadMoreCompleted}
            />
          ) : null}
        </section>
      </div>

      <div className="vote-desktop-sections hidden lg:flex">
        <section className="vote-rail">
          <CompactRailHeader
            title={
              <>
                Vote Now <span className="compact-rail-header-count">({openMatchCount} open matches)</span>
              </>
            }
          />
          <TournamentListSection
            tournaments={openTournaments}
            emptyTitle="No Open Matches"
            emptySubtitle="Nothing is waiting on a vote."
            onSelectTournament={onSelectTournament}
          />
        </section>

        <section className="vote-rail">
          <CompactRailHeader
            title={
              <>
                Completed <span className="compact-rail-header-count">({completed.length})</span>
              </>
            }
          />
          <CompletedListSection
            tournaments={completed}
            onOpenResults={onOpenResults}
            hasNextPage={completedHasNext}
            loading={completedLoading}
            onLoadMore={onLoadMoreCompleted}
          />
        </section>
      </div>
    </>
  );
}

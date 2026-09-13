import type { Dispatch, SetStateAction } from "react";
import { CompactRailHeader } from "@/components/shared";
import { TournamentListSection } from "./tournament-list-section";
import type { VoteTournament } from "./voting-internal-types";

export type VoteMobileOpenSection = "open" | null;

type VoteTournamentRailsProps = {
  mobileOpenSection: VoteMobileOpenSection;
  onSelectTournament: (tournament: VoteTournament) => void;
  openMatchCount: number;
  openTournaments: VoteTournament[];
  setMobileOpenSection: Dispatch<SetStateAction<VoteMobileOpenSection>>;
};

export function VoteTournamentRails({
  mobileOpenSection,
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
      </div>
    </>
  );
}

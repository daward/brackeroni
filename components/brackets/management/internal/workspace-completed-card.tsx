"use client";

import { CompletedBracketCard } from "@/components/brackets/shared";
import type { WorkspaceTournament } from "./workspace-internal-types";
import { TournamentCardMenu } from "./tournament-card-menu";

type WorkspaceCompletedCardProps = {
  tournament: WorkspaceTournament;
  menuIsOpen: boolean;
  isActionPending: (actionKey: string) => boolean;
  onToggleMenu: () => void;
  onRerunTournament: (tournamentId: string) => void;
  onArchiveTournament: (tournamentId: string, title: string) => void;
};

export function WorkspaceCompletedCard({
  tournament,
  menuIsOpen,
  isActionPending,
  onToggleMenu,
  onRerunTournament,
  onArchiveTournament,
}: WorkspaceCompletedCardProps) {
  const winner = tournament.winner
    ? `${tournament.winner.name} (Seed ${tournament.winner.seed})`
    : "No winner recorded";

  return (
    <div className="workspace-grid-card">
      <CompletedBracketCard tournament={tournament} as="a" href={`/results/${tournament.id}`} winnerLabel={winner} railClassName="pr-14" />
      <TournamentCardMenu
        label={`Actions for ${tournament.title}`}
        isOpen={menuIsOpen}
        onToggle={onToggleMenu}
      >
        <button
          type="button"
          disabled={isActionPending(`rerun-tournament:${tournament.id}`)}
          onClick={() => onRerunTournament(tournament.id)}
          className="ui-button ui-button-accent workspace-card-menu-action"
        >
          {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Run again"}
        </button>
        <button
          type="button"
          disabled={isActionPending(`archive-tournament:${tournament.id}`)}
          onClick={() => onArchiveTournament(tournament.id, tournament.title)}
          className="ui-button ui-button-muted workspace-card-menu-action"
        >
          Archive
        </button>
      </TournamentCardMenu>
    </div>
  );
}

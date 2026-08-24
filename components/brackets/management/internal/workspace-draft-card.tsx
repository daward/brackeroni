"use client";

import { useRouter } from "next/navigation";
import type { BracketPoolOption } from "../types";
import type { WorkspacePoolDetail, WorkspaceTournament } from "./workspace-internal-types";
import { TournamentCardMenu } from "./tournament-card-menu";

type WorkspaceDraftCardProps = {
  tournament: WorkspaceTournament;
  pool: BracketPoolOption | WorkspacePoolDetail | null;
  candidateCount: number;
  canStart: boolean;
  menuIsOpen: boolean;
  isActionPending: (actionKey: string) => boolean;
  onToggleMenu: () => void;
  onStartTournament: (tournamentId: string) => void;
  onArchiveTournament: (tournamentId: string, title: string) => void;
};

export function WorkspaceDraftCard({
  tournament,
  pool,
  candidateCount,
  canStart,
  menuIsOpen,
  isActionPending,
  onToggleMenu,
  onStartTournament,
  onArchiveTournament,
}: WorkspaceDraftCardProps) {
  const router = useRouter();

  return (
    <div className="workspace-grid-card">
      <button
        type="button"
        onClick={() => router.push(`/brackets/${tournament.id}/configuration`)}
        className="workspace-draft-card-button"
      >
        <h3 className="workspace-draft-card-title display-face">{tournament.title}</h3>
        <p className="workspace-grid-card-copy">
          {pool ? `${pool.name} - ${candidateCount} candidates` : "Choose a pool in setup to add contenders."}
        </p>
      </button>
      <button
        type="button"
        disabled={isActionPending(`start-tournament:${tournament.id}`)}
        onClick={() => {
          if (canStart) {
            onStartTournament(tournament.id);
            return;
          }

          router.push(`/brackets/${tournament.id}/configuration`);
        }}
        className="workspace-draft-card-action display-face"
      >
        {canStart ? "Start bracket ->" : "Set up bracket ->"}
      </button>
      <TournamentCardMenu
        label={`Actions for ${tournament.title}`}
        isOpen={menuIsOpen}
        onToggle={onToggleMenu}
      >
        <button
          type="button"
          disabled={!canStart || isActionPending(`start-tournament:${tournament.id}`)}
          onClick={() => onStartTournament(tournament.id)}
          className="ui-button ui-button-primary workspace-card-menu-action"
        >
          Start bracket
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

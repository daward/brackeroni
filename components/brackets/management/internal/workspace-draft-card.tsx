"use client";

import { useRouter } from "next/navigation";
import type { PoolDetail } from "@/lib/pools/types";
import type { BracketPoolOption } from "../types";
import type { WorkspaceTournament } from "./workspace-internal-types";
import { TournamentCardMenu } from "./tournament-card-menu";

type WorkspaceDraftCardProps = {
  tournament: WorkspaceTournament;
  pool: BracketPoolOption | PoolDetail | null;
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
  const startPending = isActionPending(`start-tournament:${tournament.id}`);

  function handlePrimaryAction() {
    if (canStart) {
      onStartTournament(tournament.id);
      return;
    }

    router.push(`/brackets/${tournament.id}/configuration`);
  }

  return (
    <div className="workspace-grid-card">
      <button type="button" disabled={canStart && startPending} onClick={handlePrimaryAction} className="object-list-card workspace-draft-card-button">
        <h3 className="object-list-card-title display-face">{tournament.title}</h3>
        <p className="object-list-card-copy">{pool ? `${pool.name} - ${candidateCount} candidates` : "Choose a pool in setup to add contenders."}</p>
        <span className="object-list-card-action">{canStart ? (startPending ? "Starting" : "Start bracket ->") : "Finish setup ->"}</span>
      </button>
      <TournamentCardMenu label={`Actions for ${tournament.title}`} isOpen={menuIsOpen} onToggle={onToggleMenu}>
        <button type="button" onClick={() => router.push(`/brackets/${tournament.id}/configuration`)} className="ui-button ui-button-muted workspace-card-menu-action">
          Edit draft
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

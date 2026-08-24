"use client";

import type { LiveBracketSelectorProps } from "./live-bracket-selector-types";
import { getLiveBracketStat } from "./live-bracket-stat";

export function LiveBracketRail({
  tournaments,
  tournamentInvites,
  tournamentMatches,
  selectedTournamentId,
  onSelectTournament,
  className = "",
}: LiveBracketSelectorProps) {
  return (
    <div className={`workspace-live-rail ${className}`}>
      <div className="workspace-live-rail-list">
        {tournaments.map((tournament) => {
          const isSelected = tournament.id === selectedTournamentId;
          const invitees = tournamentInvites[tournament.id] || [];
          const matches = tournamentMatches[tournament.id] || [];
          const stat = getLiveBracketStat(tournament, invitees, matches);

          return (
            <button
              key={tournament.id}
              type="button"
              onClick={() => onSelectTournament(tournament.id)}
              className={`workspace-live-rail-item ${isSelected ? "workspace-live-rail-item-selected" : ""}`}
            >
              <p className="workspace-live-rail-title display-face">{tournament.title}</p>
              <p className="workspace-live-rail-kicker">{stat.kicker}</p>
              <p className="workspace-live-rail-detail">{stat.detail}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

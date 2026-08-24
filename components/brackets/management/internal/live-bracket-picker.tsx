"use client";

import { useState } from "react";
import type { LiveBracketSelectorProps } from "./live-bracket-selector-types";
import { getLiveBracketStat } from "./live-bracket-stat";

export function LiveBracketPicker({
  tournaments,
  tournamentInvites,
  tournamentMatches,
  selectedTournamentId,
  onSelectTournament,
}: LiveBracketSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTournament = tournaments.find((tournament) => tournament.id === selectedTournamentId) || tournaments[0];
  const selectedStat = getLiveBracketStat(
    selectedTournament,
    tournamentInvites[selectedTournament.id] || [],
    tournamentMatches[selectedTournament.id] || [],
  );

  return (
    <div className="workspace-live-picker">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`live-bracket-picker-trigger ui-field ${isOpen ? "workspace-live-picker-trigger-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="workspace-live-picker-label">
          {selectedTournament.title} - {selectedStat.detail}
        </span>
        <span aria-hidden="true" className="workspace-live-picker-caret">
          ^
        </span>
      </button>
      {isOpen ? (
        <div role="listbox" className="workspace-live-picker-menu">
          {tournaments.map((tournament) => {
            const stat = getLiveBracketStat(tournament, tournamentInvites[tournament.id] || [], tournamentMatches[tournament.id] || []);
            const isSelected = tournament.id === selectedTournament.id;

            return (
              <button
                key={tournament.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectTournament(tournament.id);
                  setIsOpen(false);
                }}
                className={`workspace-live-picker-option ${isSelected ? "workspace-live-picker-option-selected" : ""}`}
              >
                {tournament.title} - {stat.detail}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

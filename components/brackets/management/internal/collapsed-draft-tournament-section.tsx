"use client";

import { TournamentActionGroup, TournamentMetaRow } from "./tournament-management";
import type { CollapsedDraftTournamentSectionProps } from "../types";
import styles from "./management.module.css";

export function CollapsedDraftTournamentSection({
  tournament,
  isPublishedTournament,
  canStartBracket,
  describeTournamentAudienceMode,
  formatBracketRuleLabel,
  isActionPending,
  onEditDraft,
  onStartTournament,
}: CollapsedDraftTournamentSectionProps) {
  return (
    <div className={styles.collapsedDraft}>
      <TournamentMetaRow
        separator="slash"
        className={styles.collapsedMeta}
        items={[
          describeTournamentAudienceMode(tournament),
          formatBracketRuleLabel(tournament.playStyle || "fixed_bracket"),
          formatBracketRuleLabel(tournament.resultMode || "winner_only"),
          `${tournament.entryCount} entries`,
        ]}
      />
      <TournamentActionGroup
        layout="row"
        className="lg:justify-start"
        actions={[
          !isPublishedTournament
            ? {
                key: `edit-draft:${tournament.id}`,
                label: "Edit Draft",
                onClick: () => onEditDraft(tournament.id),
                className: "ui-button ui-button-accent",
              }
            : null,
          {
            key: `start:${tournament.id}`,
            label: isActionPending(`start-tournament:${tournament.id}`) ? "Starting" : "Start Bracket",
            onClick: () => onStartTournament(tournament.id),
            disabled: !canStartBracket || isActionPending(`start-tournament:${tournament.id}`),
            className: "ui-button ui-button-primary",
          },
        ]}
      />
    </div>
  );
}

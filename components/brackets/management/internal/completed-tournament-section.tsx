"use client";

import { TournamentActionGroup } from "./tournament-action-group";
import { TournamentMetaRow } from "./tournament-meta-row";
import type { CompletedTournamentSectionProps } from "../types";
import styles from "./management.module.css";

export function CompletedTournamentSection({
  bracket,
  hasSourcePool,
  formatBracketRuleLabel,
  isActionPending,
  onRerunTournament,
  onArchiveTournament,
}: CompletedTournamentSectionProps) {
  const resultsHref = bracket.kind === "parallel_parent" && bracket.viewerBracketId ? `/results/${bracket.id}` : `/results/${bracket.id}`;

  return (
    <div className={styles.completedSection}>
      <div className={styles.completedContent}>
        {bracket.winner ? (
          <p className="completed-bracket-winner">
            Winner: {bracket.winner.name} (Seed {bracket.winner.seed})
          </p>
        ) : null}
        {hasSourcePool ? (
          <TournamentMetaRow separator="slash" className={styles.resultsMeta} items={[formatBracketRuleLabel(bracket.resultMode), `${bracket.entryCount} entries`]} />
        ) : null}
      </div>
      <TournamentActionGroup
        layout="row"
        actions={[
          {
            key: `complete-results:${bracket.id}`,
            href: resultsHref,
            label: "Results",
            className: "ui-button ui-button-accent",
          },
          {
            key: `complete-rerun:${bracket.id}`,
            label: isActionPending(`rerun-tournament:${bracket.id}`) ? "Creating" : "Run Again",
            onClick: () => onRerunTournament(bracket.id),
            disabled: isActionPending(`rerun-tournament:${bracket.id}`),
            className: "ui-button ui-button-accent",
          },
          {
            key: `complete-archive:${bracket.id}`,
            label: isActionPending(`archive-tournament:${bracket.id}`) ? "Archiving" : "Archive",
            onClick: () => onArchiveTournament(bracket.id, bracket.title),
            disabled: isActionPending(`archive-tournament:${bracket.id}`),
            className: "ui-button ui-button-muted",
          },
        ]}
      />
    </div>
  );
}

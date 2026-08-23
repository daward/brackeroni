"use client";

import { TournamentActionGroup, TournamentMetaRow } from "./tournament-management";
import type { CompletedTournamentSectionProps } from "../types";
import styles from "./management.module.css";

export function CompletedTournamentSection({
  tournament,
  hasSourcePool,
  formatBracketRuleLabel,
  isActionPending,
  onRerunTournament,
  onArchiveTournament,
}: CompletedTournamentSectionProps) {
  const resultsHref = tournament.kind === "parallel_parent" && tournament.viewerTournamentId ? `/results/${tournament.id}` : `/results/${tournament.id}`;

  return (
    <div className={styles.completedSection}>
      <div className={styles.completedContent}>
        {tournament.winnerName ? (
          <p className="completed-bracket-winner">
            Winner: {tournament.winnerName}
            {tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}
          </p>
        ) : null}
        {hasSourcePool ? (
          <TournamentMetaRow separator="slash" className={styles.resultsMeta} items={[formatBracketRuleLabel(tournament.resultMode), `${tournament.entryCount} entries`]} />
        ) : null}
      </div>
      <TournamentActionGroup
        layout="row"
        actions={[
          {
            key: `complete-results:${tournament.id}`,
            href: resultsHref,
            label: "Results",
            className: "ui-button ui-button-accent",
          },
          {
            key: `complete-rerun:${tournament.id}`,
            label: isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Run Again",
            onClick: () => onRerunTournament(tournament.id),
            disabled: isActionPending(`rerun-tournament:${tournament.id}`),
            className: "ui-button ui-button-accent",
          },
          {
            key: `complete-archive:${tournament.id}`,
            label: isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive",
            onClick: () => onArchiveTournament(tournament.id, tournament.title),
            disabled: isActionPending(`archive-tournament:${tournament.id}`),
            className: "ui-button ui-button-muted",
          },
        ]}
      />
    </div>
  );
}

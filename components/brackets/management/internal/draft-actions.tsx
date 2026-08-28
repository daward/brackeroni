"use client";

import type { Bracket } from "@/lib/brackets/types";
import type { DraftActionsProps } from "../types";
import styles from "./management.module.css";

export function DraftActions({
  tournament,
  actions: { canStartBracket, isActionPending, onArchiveTournament, onStartTournament },
}: {
  tournament: Bracket;
  actions: DraftActionsProps;
}) {
  const startPending = isActionPending(`start-tournament:${tournament.id}`);
  const archivePending = isActionPending(`archive-tournament:${tournament.id}`);

  return (
    <div className={styles.draftActions}>
      <div />
      <div className={styles.draftActionButtons}>
        <button type="button" onClick={onStartTournament} disabled={!canStartBracket || startPending} className="ui-button ui-button-primary">
          {startPending ? "Starting" : "Start Bracket"}
        </button>
        <button type="button" onClick={onArchiveTournament} disabled={archivePending} className="ui-button ui-button-muted">
          {archivePending ? "Archiving" : "Archive"}
        </button>
      </div>
    </div>
  );
}

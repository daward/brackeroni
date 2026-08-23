"use client";

import type { ManualResultQueueProps } from "../types";
import styles from "./status.module.css";

export function ManualResultQueue({ tournament, matches, isActionPending, onSetManualMatchWinner }: ManualResultQueueProps) {
  return (
    <div className={styles.manualQueue}>
      {matches.length > 0 ? (
        matches.map((match) => (
          <div key={match.id} className={styles.manualMatch}>
            <button
              type="button"
              onClick={() => onSetManualMatchWinner(tournament.id, match.id, match.winnerEntryId === match.leftEntryId ? null : match.leftEntryId)}
              disabled={isActionPending(`set-match-winner:${match.id}`)}
              className={`${styles.manualCandidate} ${match.winnerEntryId === match.leftEntryId ? styles.manualCandidateSelected : ""}`}
            >
              <p className={styles.manualCandidateName}>{match.leftName}</p>
              <p className={styles.manualCandidateSeed}>Seed {match.leftSeed}</p>
            </button>
            <button
              type="button"
              onClick={() => onSetManualMatchWinner(tournament.id, match.id, match.winnerEntryId === match.rightEntryId ? null : match.rightEntryId)}
              disabled={isActionPending(`set-match-winner:${match.id}`)}
              className={`${styles.manualCandidate} ${match.winnerEntryId === match.rightEntryId ? styles.manualCandidateSelected : ""}`}
            >
              <p className={styles.manualCandidateName}>{match.rightName}</p>
              <p className={styles.manualCandidateSeed}>Seed {match.rightSeed}</p>
            </button>
          </div>
        ))
      ) : (
        <p className={styles.manualEmpty}>No open matches in this round.</p>
      )}
    </div>
  );
}

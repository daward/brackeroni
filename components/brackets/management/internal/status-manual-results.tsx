"use client";

import type { ManualResultQueueProps } from "../types";
import styles from "./status.module.css";

export function ManualResultQueue({ tournament, matches, isActionPending, onSetManualMatchWinner }: ManualResultQueueProps) {
  return (
    <div className={styles.manualQueue}>
      {matches.length > 0 ? (
        matches.map((match) => {
          const left = match.left;
          const right = match.right;
          if (!left || !right) return null;

          return (
            <div key={match.id} className={styles.manualMatch}>
              <button
                type="button"
                onClick={() => onSetManualMatchWinner(tournament.id, match.id, match.winnerEntryId === left.id ? null : left.id)}
                disabled={isActionPending(`set-match-winner:${match.id}`)}
                className={`${styles.manualCandidate} ${match.winnerEntryId === left.id ? styles.manualCandidateSelected : ""}`}
              >
                <p className={styles.manualCandidateName}>{left.name}</p>
                <p className={styles.manualCandidateSeed}>Seed {left.seed}</p>
              </button>
              <button
                type="button"
                onClick={() => onSetManualMatchWinner(tournament.id, match.id, match.winnerEntryId === right.id ? null : right.id)}
                disabled={isActionPending(`set-match-winner:${match.id}`)}
                className={`${styles.manualCandidate} ${match.winnerEntryId === right.id ? styles.manualCandidateSelected : ""}`}
              >
                <p className={styles.manualCandidateName}>{right.name}</p>
                <p className={styles.manualCandidateSeed}>Seed {right.seed}</p>
              </button>
            </div>
          );
        })
      ) : (
        <p className={styles.manualEmpty}>No open matches in this round.</p>
      )}
    </div>
  );
}

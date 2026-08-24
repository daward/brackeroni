"use client";

import type { SeedingAutosaveState } from "../types";
import styles from "./seeding-save-status.module.css";

type SeedingSaveStatusProps = {
  state: SeedingAutosaveState;
  error: string;
  onClose: () => void;
};

function getLabel(state: SeedingAutosaveState) {
  const labels = {
    saving: "Saving...",
    pending: "Unsaved changes",
    invalid: "Unsaved: fix invalid seeding changes",
    error: "Save failed",
    idle: "Saved",
  };
  return labels[state];
}

function getTone(state: SeedingAutosaveState) {
  if (state === "error") return styles.labelError;
  if (state === "invalid" || state === "pending") return styles.labelMuted;
  return styles.labelIdle;
}

export function SeedingSaveStatus({ state, error, onClose }: SeedingSaveStatusProps) {
  return (
    <div className={styles.status}>
      <div className={styles.content}>
        <p className={`${styles.label} ${getTone(state)}`}>{getLabel(state)}</p>
        {state === "error" && error ? <p className={styles.error}>{error}</p> : null}
      </div>
      <button type="button" onClick={onClose} className="ui-button ui-button-muted">
        Cancel
      </button>
    </div>
  );
}

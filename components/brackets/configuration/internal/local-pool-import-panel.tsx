"use client";

import styles from "./local-pool-import-panel.module.css";

type LocalPoolImportPanelProps = {
  importText: string;
  onImportTextChange: (value: string) => void;
  onImportCandidates: () => void;
  onCancel: () => void;
};

export function LocalPoolImportPanel({ importText, onImportTextChange, onImportCandidates, onCancel }: LocalPoolImportPanelProps) {
  return (
    <div className={styles.panel}>
      <label className={styles.field}>
        <span className="ui-section-kicker">Paste candidates</span>
        <textarea
          value={importText}
          onChange={(event) => onImportTextChange(event.target.value)}
          rows={6}
          placeholder="One contender per line"
          className={`ui-field ui-field-panel ${styles.textarea}`}
        />
      </label>
      <div className={styles.actions}>
        <button type="button" onClick={onImportCandidates} className="ui-button ui-button-primary">
          Add candidates
        </button>
        <button type="button" onClick={onCancel} className="ui-button ui-button-muted">
          Cancel
        </button>
      </div>
    </div>
  );
}

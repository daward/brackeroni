"use client";

import type { SeedingAutosaveState } from "../types";

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
  if (state === "error") return "text-[var(--accent-2)]";
  if (state === "invalid" || state === "pending") return "text-[var(--muted)]";
  return "text-[var(--accent-3)]";
}

export function SeedingSaveStatus({ state, error, onClose }: SeedingSaveStatusProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
      <div className="min-w-0 flex-1">
        <p className={`text-xs uppercase tracking-[0.14em] ${getTone(state)}`}>{getLabel(state)}</p>
        {state === "error" && error ? <p className="mt-2 text-sm leading-5 text-[var(--accent-2)]">{error}</p> : null}
      </div>
      <button type="button" onClick={onClose} className="ui-button ui-button-muted">
        Cancel
      </button>
    </div>
  );
}

"use client";

import {
  ALL_RESULT_MODES,
  formatResultModeLabel,
  isParallelResultMode
} from "@/lib/bracket-modes";

export function BracketStyleField({
  value,
  onChange,
  className,
  labelClassName = "flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]"
}) {
  return (
    <div className="space-y-2">
      <div className={labelClassName}>
        <span>Bracket Style</span>
        <button
          type="button"
          title="Fixed Bracket keeps the original tree. Reseed reorders survivors each round."
          className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
        >
          ?
        </button>
      </div>
      <select
        aria-label="Bracket Style"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        <option value="fixed_bracket">Fixed Bracket</option>
        <option value="reseed">Reseed</option>
      </select>
    </div>
  );
}

export function ResultModeField({
  value,
  onChange,
  className,
  isParallelParent = false,
  labelClassName = "flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]",
  helpTitle = "Winner Only crowns a champion. Full Ranking keeps going until every place is set. Partially Ranked locks in the top half, then orders the rest by performance. Fast Full Rank uses swiss-style rounds to reduce drag. Parallel modes give each participant a personal bracket and aggregate the final ranks."
}) {
  const modes = isParallelParent
    ? ALL_RESULT_MODES.filter((mode) => isParallelResultMode(mode))
    : ALL_RESULT_MODES;

  return (
    <div className="space-y-2">
      <div className={labelClassName}>
        <span>Result Mode</span>
        <button
          type="button"
          title={helpTitle}
          className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
        >
          ?
        </button>
      </div>
      <select
        aria-label="Result Mode"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      >
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {formatResultModeLabel(mode)}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ParallelResultModeNotice({ resultMode }) {
  if (!isParallelResultMode(resultMode)) {
    return null;
  }

  return (
    <div className="sm:col-span-2">
      <p className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-xs leading-6 text-[var(--muted)]">
        {resultMode === "parallel_partial_ranking"
          ? "Each participant completes a personal bracket that locks in the top half, then orders the rest by performance. Final results are aggregated from those completed rankings."
          : "Each participant completes a personal full-ranking bracket from this pool. Final results are aggregated from those completed rankings."}
      </p>
    </div>
  );
}

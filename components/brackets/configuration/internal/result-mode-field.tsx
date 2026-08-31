"use client";

import { ALL_RESULT_MODES, formatResultModeLabel, isParallelResultMode } from "@/lib/brackets/engine/result-modes";
import type { BracketResultMode } from "@/lib/brackets/types";
import type { ResultModeFieldProps } from "../types";
import styles from "./config-field.module.css";

const DEFAULT_HELP_TITLE = [
  "Winner Only crowns a champion.",
  "Full Ranking keeps going until every place is set.",
  "Partially Ranked locks in the top half, then orders the rest by performance.",
  "Fast Full Rank uses swiss-style rounds to reduce drag.",
  "Parallel modes give each participant a personal bracket and aggregate the final ranks.",
].join(" ");

export function ResultModeField({ value, onChange, className, isParallelParent = false, labelClassName = styles.label, helpTitle = DEFAULT_HELP_TITLE }: ResultModeFieldProps) {
  const modes = (isParallelParent ? ALL_RESULT_MODES.filter((mode) => isParallelResultMode(mode)) : ALL_RESULT_MODES) as BracketResultMode[];

  return (
    <div className="space-y-2">
      <div className={labelClassName}>
        <span>Result Mode</span>
        <button type="button" title={helpTitle} className={styles.helpButton}>
          ?
        </button>
      </div>
      <select aria-label="Result Mode" value={value} onChange={(event) => onChange(event.target.value as BracketResultMode)} className={className}>
        {modes.map((mode) => (
          <option key={mode} value={mode}>
            {formatResultModeLabel(mode)}
          </option>
        ))}
      </select>
    </div>
  );
}

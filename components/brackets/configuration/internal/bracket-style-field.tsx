"use client";

import type { BracketPlayStyle } from "@/lib/brackets/types";
import type { BracketStyleFieldProps } from "../types";
import styles from "./config-field.module.css";

export function BracketStyleField({ value, onChange, className, labelClassName = styles.label }: BracketStyleFieldProps) {
  return (
    <div className="space-y-2">
      <div className={labelClassName}>
        <span>Bracket Style</span>
        <button type="button" title="Fixed Bracket keeps the original tree. Reseed reorders survivors each round." className={styles.helpButton}>
          ?
        </button>
      </div>
      <select aria-label="Bracket Style" value={value} onChange={(event) => onChange(event.target.value as BracketPlayStyle)} className={className}>
        <option value="fixed_bracket">Fixed Bracket</option>
        <option value="reseed">Reseed</option>
      </select>
    </div>
  );
}

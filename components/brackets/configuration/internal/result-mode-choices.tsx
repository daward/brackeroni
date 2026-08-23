"use client";

import { Trophy } from "lucide-react";
import { ContentCard } from "@/components/shared";
import type { ResultMode } from "../types";
import styles from "./wizard-choice.module.css";
import { WIZARD_RESULT_MODE_DETAILS, WIZARD_RESULT_MODE_ICONS } from "./wizard-result-modes";

type ResultModeTileProps = {
  mode: ResultMode;
  title: string;
  detail: {
    description: string;
    note: string;
  };
  selected: boolean;
  onSelect: (mode: ResultMode) => void;
  disabled?: boolean;
};

function getResultModeTitle(mode: ResultMode) {
  const titles: Partial<Record<ResultMode, string>> = {
    full_ranking: "Traditional bracket",
    fast_full_rank: "Faster rounds",
    parallel_full_ranking: "Independent rankings",
    partial_ranking: "Rank the top half",
  };
  return titles[mode] ?? "Traditional bracket";
}

function ResultModeTile({ mode, title, detail, selected, onSelect, disabled = false }: ResultModeTileProps) {
  const Icon = WIZARD_RESULT_MODE_ICONS[mode] || Trophy;
  return (
    <ContentCard
      as="button"
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={() => onSelect(mode)}
      interactive
      selected={selected}
      className={styles.resultModeTile}
    >
      <span className={styles.titleRow}>
        <Icon aria-hidden="true" size={18} strokeWidth={2} className={styles.icon} />
        <span className={`display-face ${styles.title}`}>{title}</span>
      </span>
      <span className={`ui-copy ${styles.description}`}>{detail.description}</span>
      <span className={`ui-copy ${styles.description} ${styles.resultModeNote}`}>{detail.note}</span>
    </ContentCard>
  );
}

export function ResultModeChoices({ value, onChange }: { value: ResultMode; onChange: (mode: ResultMode) => void }) {
  const isRanking = value !== "winner_only";
  const chooseRanking = () => onChange(isRanking ? value : "full_ranking");

  return (
    <div className="space-y-6">
      <div className={styles.versusGrid}>
        <ResultModeTile
          mode="winner_only"
          title="One winner"
          detail={{
            description: "A familiar knockout bracket that ends when one champion remains.",
            note: "Best when only the final pick matters.",
          }}
          selected={!isRanking}
          onSelect={onChange}
        />
        <div className={styles.versusDivider}>
          <span className={`display-face ${styles.versusBadge}`}>VS</span>
        </div>
        <ResultModeTile
          mode="full_ranking"
          title="A ranking"
          detail={{
            description: "Order contenders beyond first place, from the whole field or only its leaders.",
            note: "Choose this when the result should be more than a champion.",
          }}
          selected={isRanking}
          onSelect={chooseRanking}
        />
      </div>
      <div className={`${styles.rankingDetails} ${isRanking ? styles.rankingDetailsActive : styles.rankingDetailsInactive}`} aria-disabled={!isRanking}>
        <p className={`display-face ${styles.rankingHeading}`}>How should the ranking work?</p>
        <div className={styles.rankingGrid}>
          {(["full_ranking", "fast_full_rank", "parallel_full_ranking", "partial_ranking"] as ResultMode[]).map((mode) => (
            <ResultModeTile
              key={mode}
              mode={mode}
              title={getResultModeTitle(mode)}
              detail={WIZARD_RESULT_MODE_DETAILS[mode]}
              selected={value === mode}
              onSelect={onChange}
              disabled={!isRanking}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

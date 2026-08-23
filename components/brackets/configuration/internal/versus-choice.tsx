"use client";

import { Fragment } from "react";
import { ContentCard } from "@/components/shared";
import type { WizardChoice } from "./wizard-choice-types";
import styles from "./wizard-choice.module.css";

type VersusChoiceProps = {
  value: string;
  choices: WizardChoice[];
  onChange: (value: string) => void;
};

export function VersusChoice({ value, choices, onChange }: VersusChoiceProps) {
  return (
    <div className={styles.versusGrid}>
      {choices.map((choice, index) => (
        <Fragment key={choice.value}>
          {index > 0 ? (
            <div className={styles.versusDivider}>
              <span className={`display-face ${styles.versusBadge}`}>VS</span>
            </div>
          ) : null}
          <ContentCard
            as="button"
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            interactive
            selected={value === choice.value}
            className={styles.card}
          >
            <span className={`display-face ${styles.title}`}>{choice.title}</span>
            <span className={`${styles.description} ${styles.compactDescription}`}>{choice.description}</span>
          </ContentCard>
        </Fragment>
      ))}
    </div>
  );
}

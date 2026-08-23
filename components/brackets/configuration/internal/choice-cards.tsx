"use client";

import { ContentCard } from "@/components/shared";
import type { WizardChoice } from "./wizard-choice-types";
import styles from "./wizard-choice.module.css";

type ChoiceCardsProps = {
  value: string;
  choices: WizardChoice[];
  onChange: (value: string) => void;
};

export function ChoiceCards({ value, choices, onChange }: ChoiceCardsProps) {
  return (
    <div className={styles.choiceGrid}>
      {choices.map((choice) => {
        const Icon = choice.icon;
        return (
          <ContentCard
            as="button"
            key={choice.value}
            type="button"
            aria-pressed={value === choice.value}
            onClick={() => onChange(choice.value)}
            interactive
            selected={value === choice.value}
            className={`${styles.card} ${styles.tallCard}`}
          >
            <span className={styles.titleRow}>
              {Icon ? <Icon aria-hidden="true" size={18} strokeWidth={2} className={styles.icon} /> : null}
              <span className={`display-face ${styles.title}`}>{choice.title}</span>
            </span>
            <span className={`ui-copy ${styles.description}`}>{choice.description}</span>
          </ContentCard>
        );
      })}
    </div>
  );
}

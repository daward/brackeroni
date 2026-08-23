"use client";

import type { ComponentType } from "react";
import styles from "./wizard-review-item.module.css";

type Icon = ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
type WizardReviewItemProps = {
  icon: Icon;
  label: string;
  value: string;
  detail?: string;
};

export function WizardReviewItem({ icon: Icon, label, value, detail }: WizardReviewItemProps) {
  return (
    <div className={styles.item}>
      <span className={styles.labelRow}>
        <Icon aria-hidden="true" size={17} strokeWidth={2} />
        <span className="ui-section-kicker">{label}</span>
      </span>
      <p className={`display-face ${styles.value}`}>{value}</p>
      {detail ? <p className={`ui-copy ${styles.detail}`}>{detail}</p> : null}
    </div>
  );
}

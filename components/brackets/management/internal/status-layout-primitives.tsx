"use client";

import type { ReactNode } from "react";
import styles from "./status.module.css";

type LiveAccordionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

type LiveSummaryCardProps = {
  kicker: string;
  body: string;
  actions?: ReactNode;
};

export function LiveAccordion({ title, defaultOpen = false, children }: LiveAccordionProps) {
  return (
    <details className={styles.accordion} open={defaultOpen}>
      <summary className={styles.accordionSummary}>{title}</summary>
      <div className={styles.accordionContent}>{children}</div>
    </details>
  );
}

export function LiveSummaryCard({ kicker, body, actions = null }: LiveSummaryCardProps) {
  return (
    <div className={styles.summary}>
      <div className={styles.summaryContent}>
        <p className={styles.summaryKicker}>{kicker}</p>
        <p className={styles.summaryBody}>{body}</p>
      </div>
      {actions ? <div className={styles.summaryActions}>{actions}</div> : null}
    </div>
  );
}

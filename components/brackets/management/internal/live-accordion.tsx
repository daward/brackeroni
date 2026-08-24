"use client";

import type { ReactNode } from "react";
import styles from "./status.module.css";

type LiveAccordionProps = {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function LiveAccordion({ title, defaultOpen = false, children }: LiveAccordionProps) {
  return (
    <details className={styles.accordion} open={defaultOpen}>
      <summary className={styles.accordionSummary}>{title}</summary>
      <div className={styles.accordionContent}>{children}</div>
    </details>
  );
}

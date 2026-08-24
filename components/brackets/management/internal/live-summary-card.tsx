import type { ReactNode } from "react";
import styles from "./status.module.css";

type LiveSummaryCardProps = {
  kicker: string;
  body: string;
  actions?: ReactNode;
};

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

export function StatusPill({ children }: StatusPillProps) {
  const status = String(children || "").toLowerCase();
  const toneClass =
    status === "active"
      ? styles.active
      : status === "complete"
        ? styles.complete
        : styles.default;

  return (
    <span className={styles.pill}>
      <span className={`${styles.indicator} ${toneClass}`} aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}
import type { StatusPillProps } from "../types";
import styles from "./status-pill.module.css";

import type { LiveInfoRowProps } from "./status-participation-types";
import styles from "./status.module.css";

export function LiveInfoRow({ title, meta = null, action = null }: LiveInfoRowProps) {
  return (
    <div className={styles.infoRow}>
      <div className={styles.infoContent}>
        <p className={styles.infoTitle}>{title}</p>
        {meta ? <p className={styles.infoMeta}>{meta}</p> : null}
      </div>
      {action ? <div className={styles.infoAction}>{action}</div> : null}
    </div>
  );
}

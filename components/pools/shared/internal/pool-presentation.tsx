import styles from "./pool-presentation.module.css";
import type { PoolPublishWarningProps } from "../types";

export function PoolPublishWarning({ visibility }: PoolPublishWarningProps) {
  if (visibility === "private") {
    return null;
  }

  return (
    <p className={styles.publishWarning}>
      Publishing locks this pool. After it is published, only an admin can change its contents or
      settings.
    </p>
  );
}

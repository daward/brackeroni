import styles from "./toast-messages.module.css";
import type { ToastMessagesProps } from "../types";

export function ToastMessages({ errorMessage, successMessage }: ToastMessagesProps) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <div className={styles.viewport} aria-live="polite" aria-atomic="true">
      {errorMessage ? <p role="alert" className={`${styles.message} ${styles.error}`}>{errorMessage}</p> : null}
      {successMessage ? <p role="status" className={`${styles.message} ${styles.success}`}>{successMessage}</p> : null}
    </div>
  );
}

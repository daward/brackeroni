"use client";

import { useEffect, useRef } from "react";
import styles from "./status.module.css";

type StatusDialogProps = {
  id: string;
  title: string;
  body: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
};

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function StatusDialog({ id, title, body, confirmLabel, onClose, onConfirm }: StatusDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    const focusable = panelRef.current?.querySelector<HTMLElement>(focusableSelector);
    focusable?.focus();

    return () => returnFocusRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") return;
    const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? []);
    if (focusable.length === 0) {
      event.preventDefault();
      panelRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={styles.dialogBackdrop} onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        aria-describedby={`${id}-body`}
        tabIndex={-1}
        className={styles.dialogPanel}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <p id={id} className={styles.dialogTitle}>
          {title}
        </p>
        <p id={`${id}-body`} className={styles.dialogBody}>
          {body}
        </p>
        <div className={styles.dialogActions}>
          {onConfirm ? (
            <button type="button" onClick={onClose} className="ui-button ui-button-muted">
              Cancel
            </button>
          ) : null}
          <button type="button" onClick={onConfirm || onClose} className={onConfirm ? "ui-button ui-button-primary" : "ui-button ui-button-accent"}>
            {confirmLabel || "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { StatusDialog } from "./status-dialog";
import styles from "./status.module.css";
import type { StatusActionRowProps } from "../types";

export function StatusActionRow({ actions }: StatusActionRowProps) {
  const [openReasonKey, setOpenReasonKey] = useState<string | null>(null);
  const openReasonAction = actions.find((action) => action.disabled && action.key === openReasonKey);

  return (
    <>
      <div className={styles.actionRow}>
        {actions.map((action) => {
          if (action.render) {
            return (
              <div key={action.key} className={styles.actionSlot}>
                {action.render()}
              </div>
            );
          }

          const className = `${action.className || "ui-button ui-button-muted"} ${styles.actionButton}`;

          if (action.disabled) {
            return (
              <button
                key={action.key}
                type="button"
                aria-haspopup="dialog"
                aria-label={action.disabledReason || action.label}
                onClick={() => setOpenReasonKey(action.key)}
                className={className}
              >
                {action.label}
              </button>
            );
          }

          if (action.href) {
            return (
              <a key={action.key} href={action.href} className={className}>
                {action.label}
              </a>
            );
          }

          return (
            <button key={action.key} type="button" onClick={action.onClick} className={className}>
              {action.label}
            </button>
          );
        })}
      </div>
      {openReasonAction ? (
        <StatusDialog
          id={`disabled-action-title-${openReasonAction.key}`}
          title={openReasonAction.label || "Action unavailable"}
          body={openReasonAction.disabledReason || "This action is not available right now."}
          onClose={() => setOpenReasonKey(null)}
        />
      ) : null}
    </>
  );
}

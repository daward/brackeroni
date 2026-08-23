"use client";

import styles from "./status.module.css";
import { StatusDialog } from "./status-dialog";
import { useState } from "react";
import type { CloseVotingButtonProps, StatusActionRowProps } from "../types";

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

export function CloseVotingButton({
  label = "Close Voting",
  className,
  disabled = false,
  disabledReason = "",
  title,
  body,
  confirmLabel = "Close Voting",
  onConfirm,
}: CloseVotingButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dialogTitle = disabled ? label : title;
  const dialogBody = disabled ? disabledReason || "This action is not available right now." : body;

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={disabled ? disabledReason || label : undefined}
        onClick={() => setIsOpen(true)}
        className={`${className} ${styles.closeVotingButton}`}
      >
        {label}
      </button>
      {isOpen ? (
        <StatusDialog
          id={disabled ? "close-voting-disabled-title" : "close-voting-title"}
          title={dialogTitle}
          body={dialogBody}
          confirmLabel={disabled ? "Close" : confirmLabel}
          onClose={() => setIsOpen(false)}
          onConfirm={
            disabled
              ? undefined
              : () => {
                  setIsOpen(false);
                  onConfirm();
                }
          }
        />
      ) : null}
    </>
  );
}

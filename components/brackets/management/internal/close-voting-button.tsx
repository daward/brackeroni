"use client";

import { useState } from "react";
import { StatusDialog } from "./status-dialog";
import styles from "./status.module.css";
import type { CloseVotingButtonProps } from "../types";

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

"use client";

import { useState, type ChangeEvent } from "react";
import { isGeneratedPoolSourceDescription } from "@/lib/pools/source-description";
import type { PoolDraft } from "@/lib/pools/types";
import styles from "./pool-detail-header.module.css";

type PoolDescriptionProps = {
  draft: PoolDraft;
  sourceUrl?: string | null;
  readOnly: boolean;
  onDraftChange: (draft: PoolDraft) => void;
  onDraftCommit: (draft: PoolDraft) => void;
};

export function PoolDescription({ draft, sourceUrl, readOnly, onDraftChange, onDraftCommit }: PoolDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const description = draft.description || "";

  if (isGeneratedPoolSourceDescription(description, sourceUrl)) return null;
  if (readOnly && !description) return null;

  if (isEditing && !readOnly) {
    return (
      <textarea
        autoFocus
        value={description}
        rows={2}
        placeholder="Add a short description"
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onDraftChange({ ...draft, description: event.target.value })}
        onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => {
          onDraftCommit({ ...draft, description: event.target.value });
          setIsEditing(false);
        }}
        className={styles.descriptionInput}
      />
    );
  }

  if (readOnly) return <p className={`${styles.description} ui-copy`}>{description}</p>;

  return (
    <button type="button" onClick={() => setIsEditing(true)} className={`${styles.descriptionButton} ${description ? styles.descriptionButtonFilled : ""} ui-copy`}>
      {description || "Add a short description"}
    </button>
  );
}

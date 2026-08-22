"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { describePoolVisibility } from "@/lib/pools/visibility";
import { isGeneratedPoolSourceDescription } from "@/lib/pools/source-description";
import { PoolSourceInfo, PoolVisibilityPicker } from "@/components/pools/shared";
import { InlineTitleField } from "@/components/shared";
import type { PoolDetail, PoolDraft } from "@/lib/pools/types";
import styles from "./pool-detail-header.module.css";

type PoolDescriptionProps = {
  draft: PoolDraft;
  sourceUrl?: string | null;
  readOnly: boolean;
  onDraftChange: (draft: PoolDraft) => void;
  onDraftCommit: (draft: PoolDraft) => void;
};

function PoolDescription({ draft, sourceUrl, readOnly, onDraftChange, onDraftCommit }: PoolDescriptionProps) {
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
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`${styles.descriptionButton} ${description ? styles.descriptionButtonFilled : ""} ui-copy`}
    >
      {description || "Add a short description"}
    </button>
  );
}

type PoolDetailHeaderProps = {
  pool: PoolDetail;
  draft: PoolDraft;
  readOnly: boolean;
  onDraftChange: (draft: PoolDraft) => void;
  onDraftCommit: (draft: PoolDraft) => void;
  children: ReactNode;
};

export function PoolDetailHeader({ pool, draft, readOnly, onDraftChange, onDraftCommit, children }: PoolDetailHeaderProps) {
  const commit = (patch: Partial<PoolDraft>) => onDraftCommit({ ...draft, ...patch });

  return (
    <header className={styles.header}>
      <div className={styles.main}>
        <div className={styles.titleRow}>
          <Link href="/pools" className={styles.poolsLink}>Pools</Link>
          <span aria-hidden="true" className={styles.slash}>/</span>
          {readOnly ? (
            <h1 className={`${styles.title} display-face`}>{pool.name}</h1>
          ) : (
            <InlineTitleField
              heading
              value={draft.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => onDraftChange({ ...draft, name: event.target.value })}
              onBlur={(event: ChangeEvent<HTMLInputElement>) => commit({ name: event.target.value })}
            />
          )}
          <div className={styles.metadata}>
            <span className={styles.candidateCount}>
              {pool.candidateCount} {pool.candidateCount === 1 ? "candidate" : "candidates"}
            </span>
            <span aria-hidden="true">·</span>
            {readOnly ? <span>{describePoolVisibility(pool.visibility)}</span> : (
              <PoolVisibilityPicker compact value={draft.visibility} onChange={(visibility) => commit({ visibility })} />
            )}
            <PoolSourceInfo sourceUrl={pool.importSourceUrl} sourceTitle={pool.importSourceTitle} />
          </div>
        </div>
        <PoolDescription draft={draft} sourceUrl={pool.importSourceUrl} readOnly={readOnly} onDraftChange={onDraftChange} onDraftCommit={onDraftCommit} />
      </div>
      <div className={styles.actions}>{children}</div>
    </header>
  );
}

"use client";

import { useState, type ChangeEvent } from "react";
import { describePoolVisibility } from "@/lib/pools/visibility";
import { isGeneratedPoolSourceDescription } from "@/lib/pools/source-description";
import { InlineTitleField } from "@/components/shared";
import type { PoolManagementPanelProps, PoolVisibilityPickerProps } from "../types";
import type { PoolDraft, PoolVisibility } from "@/lib/pools/types";
import styles from "./pool-management-panel.module.css";

const VISIBILITY_OPTIONS: Array<{ value: PoolVisibility; label: string; description: string }> = [
  { value: "private", label: "Private Draft", description: "Only you can see and edit this pool." },
  { value: "public_listed", label: "Publish", description: "Anyone can find this pool." },
  { value: "public_unlisted", label: "Publish unlisted", description: "Only people with the link can find it." },
];

export function PoolVisibilityPicker({ value, onChange, compact = false }: PoolVisibilityPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = VISIBILITY_OPTIONS.find((option) => option.value === value) || VISIBILITY_OPTIONS[0];

  return (
    <div className={`${styles.visibilityPicker} ${compact ? styles.visibilityPickerCompact : ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`${styles.visibilityTrigger} ${compact ? styles.visibilityTriggerCompact : ""}`}
      >
        <span>{selected.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className={`${styles.visibilityIcon} ${isOpen ? styles.visibilityIconOpen : ""}`}>
          <path d="m4 7 6 6 6-6" />
        </svg>
      </button>
      {isOpen ? (
        <div role="listbox" className={`${styles.visibilityOptions} ${compact ? styles.visibilityOptionsCompact : ""}`}>
          {VISIBILITY_OPTIONS.map((option) => {
            const isSelected = option.value === selected.value;

            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`${styles.visibilityOption} ${isSelected ? styles.visibilityOptionSelected : ""}`}
              >
                <span className={`${styles.visibilityOptionLabel} display-face`}>{option.label}</span>
                <span className={`${styles.visibilityOptionDescription} ui-copy`}>{option.description}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The common editable pool experience used by the Pools workspace and
 * bracket setup. Behaviour is supplied by each host; hierarchy is not.
 */
export function PoolManagementPanel({
  pool,
  draft,
  readOnly = false,
  presentation = {},
  onDraftChange,
  onDraftCommit,
  actionRail = null,
  actionBar = null,
  children,
  className = "",
}: PoolManagementPanelProps) {
  const showTitle = presentation.title?.show ?? true;
  const titlePlaceholder = presentation.title?.placeholder ?? "";
  const showSummary = presentation.summary?.show ?? true;
  const showVisibility = presentation.summary?.visibility ?? true;
  const compactDetails = presentation.details?.compact ?? false;
  const showDetailsRule = presentation.details?.showRule ?? true;
  const showPanelRule = presentation.showPanelRule ?? true;
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  const buildDraft = (next: Partial<PoolDraft>): PoolDraft => ({
    name: draft?.name ?? pool?.name ?? "",
    description: draft?.description ?? pool?.description ?? "",
    visibility: draft?.visibility ?? pool?.visibility ?? "private",
    ...next,
  });
  const patch = (next: Partial<PoolDraft>) => onDraftChange?.(buildDraft(next));
  const commit = (next: Partial<PoolDraft>) => {
    const nextDraft = buildDraft(next);
    onDraftChange?.(nextDraft);
    onDraftCommit?.(nextDraft);
  };
  const shouldShowDescription = !isGeneratedPoolSourceDescription(draft?.description ?? pool?.description, pool?.importSourceUrl);

  return (
    <section className={`${styles.panel} ${showPanelRule ? "" : styles.panelWithoutRule} ${className}`.trim()}>
      {pool ? (
        <div className={styles.layout}>
          <div className={styles.main}>
            {showTitle ? (
              <InlineTitleField
                value={draft?.name ?? pool.name}
                placeholder={titlePlaceholder}
                onChange={(event: ChangeEvent<HTMLInputElement>) => patch({ name: event.target.value })}
                onBlur={(event: ChangeEvent<HTMLInputElement>) => commit({ name: event.target.value })}
              />
            ) : null}
            {showSummary ? (
              <>
                <p className={styles.candidateCount}>{pool.candidateCount} candidates</p>
                {showVisibility ? (
                  <p className={styles.visibilitySummary}>
                    {describePoolVisibility(pool.visibility)}
                    {readOnly ? " · locked" : ""}
                  </p>
                ) : null}
              </>
            ) : null}
            {compactDetails && shouldShowDescription ? (
              <div className={`${styles.compactDetails} ${showDetailsRule ? styles.compactDetailsWithRule : ""}`}>
                <div className={styles.detailsContent}>
                  {isDescriptionEditing && !readOnly ? (
                    <textarea
                      autoFocus
                      value={draft?.description ?? ""}
                      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch({ description: event.target.value })}
                      onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => {
                        commit({ description: event.target.value });
                        setIsDescriptionEditing(false);
                      }}
                      rows={2}
                      placeholder="Add a pool description"
                      className={styles.compactDescriptionInput}
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setIsDescriptionEditing(true)}
                      className={`${styles.descriptionButton} ${draft?.description ? styles.descriptionButtonFilled : ""} ui-copy`}
                    >
                      {draft?.description || "Add a short description"}
                    </button>
                  )}
                </div>
                {!readOnly && showVisibility ? <PoolVisibilityPicker compact value={draft?.visibility ?? "private"} onChange={(visibility) => commit({ visibility })} /> : null}
              </div>
            ) : !compactDetails ? (
              <div>
                <textarea
                  value={draft?.description ?? ""}
                  disabled={readOnly}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => patch({ description: event.target.value })}
                  onBlur={(event: ChangeEvent<HTMLTextAreaElement>) => commit({ description: event.target.value })}
                  rows={2}
                  placeholder="Pool description"
                  className={styles.descriptionInput}
                />
                {!readOnly && showVisibility ? <PoolVisibilityPicker value={draft?.visibility ?? "private"} onChange={(visibility) => commit({ visibility })} /> : null}
              </div>
            ) : null}
            {actionBar ? <div className={styles.actionBar}>{actionBar}</div> : null}
          </div>
          {actionRail ? <div className={styles.actionRail}>{actionRail}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

"use client";

import { useState } from "react";
import { describePoolVisibility, InlineTitleField } from "@/components/create-panel-helpers";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private Draft", description: "Only you can see and edit this pool." },
  { value: "public_listed", label: "Publish", description: "Anyone can find this pool." },
  { value: "public_unlisted", label: "Publish unlisted", description: "Only people with the link can find it." }
];

export function PoolVisibilityPicker({ value, onChange, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = VISIBILITY_OPTIONS.find((option) => option.value === value) || VISIBILITY_OPTIONS[0];

  return (
    <div className={`relative ${compact ? "mt-0" : "mt-3 max-w-sm"}`}>
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex ${compact ? "w-auto gap-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]" : "w-full border border-[var(--line)] bg-transparent px-3 py-3 text-sm text-[var(--ink)] hover:border-[var(--accent-3)] focus-visible:border-[var(--accent-3)]"} items-center justify-between text-left outline-none transition hover:text-[var(--accent-3)] focus-visible:text-[var(--accent-3)]`}
      >
        <span>{selected.label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className={`h-4 w-4 shrink-0 fill-none stroke-current stroke-2 transition ${isOpen ? "rotate-180" : ""}`}>
          <path d="m4 7 6 6 6-6" />
        </svg>
      </button>
      {isOpen ? (
        <div role="listbox" className={`absolute z-30 mt-2 border border-[var(--line-strong)] bg-[var(--panel)] p-1 shadow-[0_16px_30px_rgba(0,0,0,0.35)] ${compact ? "right-0 w-64" : "w-full"}`}>
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
                className={`block w-full px-3 py-2.5 text-left transition ${isSelected ? "bg-[rgba(52,211,196,0.09)] text-[var(--accent-3)]" : "text-[var(--ink)] hover:bg-[rgba(255,255,255,0.04)]"}`}
              >
                <span className="display-face block text-sm font-black">{option.label}</span>
                <span className="ui-copy mt-1 block text-xs leading-5 text-[var(--muted)]">{option.description}</span>
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
  titlePlaceholder = "",
  showVisibility = true,
  showTitle = true,
  showSummary = true,
  compactDetails = false,
  onDraftChange,
  onDraftCommit,
  actionRail = null,
  actionBar = null,
  children,
  className = ""
}) {
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);

  const buildDraft = (next) => ({
    name: draft?.name ?? pool?.name ?? "",
    description: draft?.description ?? pool?.description ?? "",
    visibility: draft?.visibility ?? pool?.visibility ?? "private",
    ...next
  });
  const patch = (next) => onDraftChange?.(buildDraft(next));
  const commit = (next) => {
    const nextDraft = buildDraft(next);
    onDraftChange?.(nextDraft);
    onDraftCommit?.(nextDraft);
  };

  return (
    <section className={`pool-management-panel ${className}`}>
      {pool ? (
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            {showTitle ? (
              <InlineTitleField
                value={draft?.name ?? pool.name}
                placeholder={titlePlaceholder}
                onChange={(event) => patch({ name: event.target.value })}
              onBlur={(event) => commit({ name: event.target.value })}
              />
            ) : null}
            {showSummary ? (
              <>
                <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                  {pool.candidateCount} candidates
                </p>
                {showVisibility ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                    {describePoolVisibility(pool.visibility)}{readOnly ? " · locked" : ""}
                  </p>
                ) : null}
              </>
            ) : null}
            {pool.importSourceUrl ? (
              <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                Imported from <span className="text-[var(--ink)]">{pool.importSourceTitle || pool.importSourceUrl}</span>
              </p>
            ) : null}            {compactDetails ? (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2 border-t border-[var(--line)] pt-3">
                <div className="min-w-0 flex-1">
                  {isDescriptionEditing && !readOnly ? (
                    <textarea
                      autoFocus
                      value={draft?.description ?? ""}
                      onChange={(event) => patch({ description: event.target.value })}
                      onBlur={(event) => {
                        commit({ description: event.target.value });
                        setIsDescriptionEditing(false);
                      }}
                      rows={2}
                      placeholder="Add a pool description"
                      className="block w-full border border-[var(--accent-3)] bg-transparent px-3 py-2 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                    />
                  ) : (
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() => setIsDescriptionEditing(true)}
                      className={`ui-copy block max-w-3xl text-left text-sm leading-6 transition ${draft?.description ? "text-[var(--muted)] hover:text-[var(--ink)]" : "text-[var(--muted)] hover:text-[var(--accent-3)]"} disabled:cursor-default`}
                    >
                      {draft?.description || "Add a short description"}
                    </button>
                  )}
                </div>
                {!readOnly && showVisibility ? (
                  <PoolVisibilityPicker
                    compact
                    value={draft?.visibility ?? "private"}
                    onChange={(visibility) => commit({ visibility })}
                  />
                ) : null}
              </div>
            ) : (
              <div>
                <textarea
                  value={draft?.description ?? ""}
                  disabled={readOnly}
                  onChange={(event) => patch({ description: event.target.value })}
                  onBlur={(event) => commit({ description: event.target.value })}
                  rows={2}
                  placeholder="Pool description"
                  className="mt-3 block w-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                />
                {!readOnly && showVisibility ? (
                  <PoolVisibilityPicker
                    value={draft?.visibility ?? "private"}
                    onChange={(visibility) => commit({ visibility })}
                  />
                ) : null}
              </div>
            )}
            {actionBar ? <div className="mt-4 flex flex-wrap justify-end gap-2">{actionBar}</div> : null}
          </div>
          {actionRail ? <div className="flex w-36 shrink-0 flex-col items-stretch gap-2">{actionRail}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
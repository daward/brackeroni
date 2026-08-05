"use client";

import { describePoolVisibility, InlineTitleField } from "@/components/create-panel-helpers";

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
  onDraftChange,
  actionRail = null,
  children,
  className = ""
}) {
  const patch = (next) => onDraftChange?.({
    name: draft?.name ?? pool?.name ?? "",
    description: draft?.description ?? pool?.description ?? "",
    visibility: draft?.visibility ?? pool?.visibility ?? "private",
    ...next
  });

  return (
    <section className={`pool-management-panel ${className}`}>
      {pool ? (
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <InlineTitleField value={draft?.name ?? pool.name} placeholder={titlePlaceholder} onChange={(event) => patch({ name: event.target.value })} />
            <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">{pool.candidateCount} candidates</p>
            {showVisibility ? <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">{describePoolVisibility(pool.visibility)}{readOnly ? " • locked" : ""}</p> : null}
            {pool.importSourceUrl ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">Imported from <span className="text-[var(--ink)]">{pool.importSourceTitle || pool.importSourceUrl}</span></p> : null}
            <textarea value={draft?.description ?? ""} disabled={readOnly} onChange={(event) => patch({ description: event.target.value })} rows={2} placeholder="Pool description" className="mt-3 block w-full border border-[var(--line)] bg-[var(--panel-2)] px-3 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]" />
            {!readOnly && showVisibility ? <select value={draft?.visibility ?? "private"} onChange={(event) => patch({ visibility: event.target.value })} className="mt-3 block w-full max-w-sm border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"><option value="private">Private Draft</option><option value="public_listed">Publish</option><option value="public_unlisted">Publish Unlisted</option></select> : null}
          </div>
          {actionRail ? <div className="flex w-36 shrink-0 flex-col items-stretch gap-2">{actionRail}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

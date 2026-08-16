"use client";

import Link from "next/link";
import { describePoolVisibility } from "@/components/pools/shared/pool-presentation";
import { InlineTitleField } from "@/components/shared/inline-title-field";
import { PoolVisibilityPicker } from "@/components/pools/shared/pool-management-panel";
import { PoolSourceInfo } from "@/components/pools/shared/pool-source-info";

export function PoolDetailHeader({ pool, draft, readOnly, onDraftChange, onDraftCommit, children }) {
  const commit = (patch) => onDraftCommit({ ...draft, ...patch });
  return <header className="grid gap-4 py-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-3"><Link href="/pools" className="inline-flex shrink-0 font-sans text-sm font-medium uppercase tracking-[0.12em] text-[var(--accent-3)] underline decoration-[rgba(52,211,196,0.4)] underline-offset-4 transition hover:text-[var(--accent-2)] hover:decoration-[var(--accent-2)]">Pools</Link><span aria-hidden="true" className="text-[var(--muted)]">/</span>{readOnly ? <h1 className="display-face min-w-0 text-[30px] font-black leading-none text-[var(--ink)]">{pool.name}</h1> : <InlineTitleField heading value={draft.name} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} onBlur={(event) => commit({ name: event.target.value })} />}<div className="col-start-3 mt-1 flex flex-wrap items-center gap-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]"><span className="text-[var(--accent-3)]">{pool.candidateCount} candidates</span><span aria-hidden="true">·</span>{readOnly ? <span>{describePoolVisibility(pool.visibility)}</span> : <PoolVisibilityPicker compact value={draft.visibility} onChange={(visibility) => commit({ visibility })} />}<PoolSourceInfo sourceUrl={pool.importSourceUrl} sourceTitle={pool.importSourceTitle} /></div></div></div><div className="flex flex-wrap items-center justify-end gap-2">{children}</div></header>;
}

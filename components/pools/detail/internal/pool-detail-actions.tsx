"use client";

import { useState } from "react";
import { getPoolDetailMenuState } from "@/lib/pools/detail-menu";
import type { PoolDetail } from "@/lib/pools/types";
import type { MergePoolOption } from "./use-pool-detail-actions";
import styles from "./pool-detail-actions.module.css";

type MenuActionProps = {
  label: string;
  meta?: string | number | null;
  disabled?: boolean;
  onClick: () => void;
};

function MenuAction({ label, meta, disabled = false, onClick }: MenuActionProps) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} className={styles.action}>
      <span className={`${styles.actionLabel} display-face`}>{label}</span>
      {meta ? <span aria-hidden="true" className={styles.actionMeta}>{meta}</span> : null}
    </button>
  );
}

type MergePoolListProps = {
  pools: MergePoolOption[];
  isMerging: boolean;
  onSelect: (poolId: string) => void;
};

function MergePoolList({ pools, isMerging, onSelect }: MergePoolListProps) {
  if (!pools.length) return <p className={styles.emptyMerge}>No other pools are available.</p>;

  return (
    <div className={styles.mergeList}>
      <p className={styles.mergeHeading}>Merge into this pool</p>
      {pools.map((pool) => (
        <button key={pool.id} type="button" disabled={isMerging} onClick={() => onSelect(pool.id)} className={styles.mergeOption}>
          <span className={`${styles.mergeName} display-face`}>{pool.name}</span>
          <span className={styles.mergeCount}>{pool.candidateCount ?? 0}</span>
        </button>
      ))}
    </div>
  );
}

type PoolDetailActionsProps = {
  pool: PoolDetail;
  readOnly: boolean;
  isPending: (action: string) => boolean;
  isMergeOpen: boolean;
  mergePools: MergePoolOption[];
  onViewTags: () => void;
  onCopyLink: () => void;
  onImport: () => void;
  onEnrich: () => void;
  onFillMissingImages: () => void;
  onOpenMerge: () => void;
  onMerge: (poolId: string) => void;
  onArchive: () => void;
};

export function PoolDetailActions({
  pool,
  readOnly,
  isPending,
  isMergeOpen,
  mergePools,
  onViewTags,
  onCopyLink,
  onImport,
  onEnrich,
  onFillMissingImages,
  onOpenMerge,
  onMerge,
  onArchive
}: PoolDetailActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menu = getPoolDetailMenuState({ pool, readOnly, isPending });
  const isLoadingMergePools = isPending("load-merge-pools");
  const isMerging = isPending("merge-pool");
  const closeAfter = (action: () => void) => () => {
    action();
    setIsOpen(false);
  };

  return (
    <div className={styles.container}>
      <button type="button" aria-label="More pool actions" aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((current) => !current)} className={styles.trigger}>⋮</button>
      {isOpen ? <div role="menu" className={styles.menu}>
        <MenuAction label="View tags" meta={menu.tagCount || null} disabled={menu.tagCount === 0} onClick={closeAfter(onViewTags)} />
        <MenuAction label="Copy pool link" meta={menu.canCopyLink ? "Share" : "Draft"} disabled={!menu.canCopyLink} onClick={closeAfter(onCopyLink)} />
        <MenuAction label="Import candidates" meta="Add" disabled={!menu.canImport} onClick={closeAfter(onImport)} />
        <MenuAction label="Enrich from links" meta={isPending("enrich-candidates") ? "Enriching" : menu.sourceCandidateCount || "None"} disabled={!menu.canEnrich} onClick={closeAfter(onEnrich)} />
        <MenuAction label="Fill missing images" meta={isPending("auto-fill-images") ? "Filling" : menu.missingImageCount || "None"} disabled={!menu.canFillImages} onClick={closeAfter(onFillMissingImages)} />
        <MenuAction label="Merge another pool" meta={isLoadingMergePools ? "Loading" : isMerging ? "Merging" : "Pick"} disabled={!menu.canMerge} onClick={onOpenMerge} />
        {isMergeOpen ? <MergePoolList pools={mergePools} isMerging={isMerging} onSelect={onMerge} /> : null}
        <div className={styles.archive}><MenuAction label="Archive pool" meta={isPending("archive-pool") ? "Archiving" : "Hide"} disabled={!menu.canArchive} onClick={onArchive} /></div>
      </div> : null}
    </div>
  );
}

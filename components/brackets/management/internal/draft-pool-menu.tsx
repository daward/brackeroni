"use client";

import type { DraftPoolProps } from "../types";
import styles from "./draft.module.css";

type DraftPoolMenuProps = {
  pools: DraftPoolProps["pools"];
  selectedPoolId: string;
  isDisabled: boolean;
  isCreatePending: boolean;
  onCreatePool: () => void;
  onSelectPool: (poolId: string) => void;
  showCurrentPool: boolean;
};

export function DraftPoolMenu({ pools, selectedPoolId, isDisabled, isCreatePending, onCreatePool, onSelectPool, showCurrentPool }: DraftPoolMenuProps) {
  return (
    <div className={styles.poolMenu}>
      <div className={styles.poolMenuList}>
        <button type="button" onClick={onCreatePool} disabled={isDisabled || isCreatePending} className={`${styles.poolMenuItem} ${styles.poolMenuCreate}`}>
          <span>
            <span className={styles.poolMenuName}>{isCreatePending ? "Creating Pool" : "New Pool"}</span>
            <span className={styles.poolMenuMeta}>Create a fresh pool for this bracket</span>
          </span>
        </button>
        {pools.map((pool) => (
          <button
            key={pool.id}
            type="button"
            onClick={() => onSelectPool(pool.id)}
            className={`${styles.poolMenuItem} ${showCurrentPool && pool.id === selectedPoolId ? styles.poolMenuCurrent : ""}`}
          >
            <span>
              <span className={styles.poolMenuName}>{pool.name}</span>
              <span className={styles.poolMenuMeta}>{pool.candidateCount} candidates</span>
            </span>
            {showCurrentPool && pool.id === selectedPoolId ? <span className={styles.poolMenuCurrentLabel}>Current</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

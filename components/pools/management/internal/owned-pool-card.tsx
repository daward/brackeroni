import { describePoolVisibility } from "@/lib/pools/visibility";
import type { OwnedPoolSummary } from "./types";
import styles from "./pool-management.module.css";

type OwnedPoolCardProps = {
  pool: OwnedPoolSummary;
  cardRef: (node: HTMLElement | null) => void;
  onOpen: (poolId: string) => void;
};

export function OwnedPoolCard({ pool, cardRef, onOpen }: OwnedPoolCardProps) {
  return (
    <article ref={cardRef} className={styles.poolCard}>
      <button type="button" onClick={() => onOpen(pool.id)} className={styles.poolButton}>
        <span className={styles.poolTitle}>{pool.name}</span>
        <span className={styles.poolMeta}>
          <span className={styles.poolCount}>{pool.candidateCount} candidates</span>
          <span aria-hidden="true">/</span>
          <span>{describePoolVisibility(pool.visibility)}</span>
        </span>
        {pool.description ? <span className={styles.poolDescription}>{pool.description}</span> : null}
      </button>
    </article>
  );
}

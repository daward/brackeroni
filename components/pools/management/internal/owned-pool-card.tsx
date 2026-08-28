import { describePoolVisibility } from "@/components/pools/shared";
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
      <button type="button" onClick={() => onOpen(pool.id)} className={`object-list-card ${styles.poolButton}`}>
        <span className="object-list-card-title display-face">{pool.name}</span>
        <span className="object-list-card-meta">
          <span className="object-list-card-meta-accent">{pool.candidateCount} candidates</span>
          <span aria-hidden="true">/</span>
          <span>{describePoolVisibility(pool.visibility)}</span>
        </span>
        {pool.description ? <span className={`object-list-card-copy ${styles.poolDescription}`}>{pool.description}</span> : null}
      </button>
    </article>
  );
}

import { CreateCard, InfiniteScrollControl } from "@/components/shared";
import { OwnedPoolCard } from "./owned-pool-card";
import type { OwnedPoolSummary, PoolPagination } from "./types";
import type { MutableRefObject } from "react";
import styles from "./pool-management.module.css";

type OwnedPoolListProps = {
  pools: OwnedPoolSummary[];
  poolPage: number;
  pagination: PoolPagination;
  loading: boolean;
  actionPending: boolean;
  poolRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onCreatePool: () => void;
  onLoadMorePools: () => void;
  onOpenPool: (poolId: string) => void;
};

export function OwnedPoolList({ pools, poolPage, pagination, loading, actionPending, poolRefs, onCreatePool, onLoadMorePools, onOpenPool }: OwnedPoolListProps) {
  return (
    <section className={styles.section} aria-label="Your pools">
      <div className={styles.grid}>
        <CreateCard
          type="button"
          onClick={onCreatePool}
          disabled={actionPending}
          icon="+"
          title="Add a pool"
          description="Start a new candidate set."
          className={styles.createCard}
        />
        {pools.map((pool) => (
          <OwnedPoolCard
            key={pool.id}
            pool={pool}
            cardRef={(node) => {
              poolRefs.current[pool.id] = node;
            }}
            onOpen={onOpenPool}
          />
        ))}
      </div>
      <button type="button" onClick={onCreatePool} disabled={actionPending} aria-label="Add a pool" className={styles.mobileCreateButton}>
        +
      </button>
      {pagination.hasNextPage ? (
        <InfiniteScrollControl enabled loading={loading} pageKey={poolPage} onLoadMore={onLoadMorePools} className={styles.loadMore} loadingLabel="Loading pools" />
      ) : null}
    </section>
  );
}

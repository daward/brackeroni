import { CandidatePoolCard } from "@/components/pools/shared";
import { InfiniteScrollControl } from "@/components/shared";
import type { MouseEvent, ReactNode } from "react";
import type { CandidateCollection, PoolCandidate } from "../types";
import styles from "./candidate-list.module.css";

type Props = {
  collection: CandidateCollection & { emptyMessage: string };
  interaction: {
    readOnly: boolean;
    activeTagFilter: string;
    expandedCandidateId: string | null;
    removingCandidateId: string | null;
    onCandidateActivate: (candidate: PoolCandidate) => void;
    onRemoveCandidate: (candidate: PoolCandidate) => void;
  };
  children: ReactNode;
};

export function CandidateList({ collection, interaction, children }: Props) {
  const { candidates, hasNextPage, isLoadingMore, loadMore } = collection;
  const { readOnly, activeTagFilter, expandedCandidateId, removingCandidateId, onCandidateActivate, onRemoveCandidate } = interaction;

  return (
    <div>
      <div className={styles.grid}>
        {children}
        {candidates.length === 0 && (readOnly || activeTagFilter) ? (
          <div className={styles.emptyState}>
            <span className="ui-copy">{activeTagFilter ? `No candidates match the "${activeTagFilter}" tag.` : collection.emptyMessage}</span>
          </div>
        ) : (
          candidates.map((candidate) => (
            <CandidatePoolCard
              key={candidate.id}
              candidate={candidate}
              readOnly={readOnly}
              expanded={readOnly && expandedCandidateId === candidate.id}
              removing={removingCandidateId === candidate.id}
              onActivate={() => onCandidateActivate(candidate)}
              onRemove={(event: MouseEvent) => {
                event.stopPropagation();
                onRemoveCandidate(candidate);
              }}
            />
          ))
        )}
      </div>
      {hasNextPage ? (
        <InfiniteScrollControl
          enabled
          loading={isLoadingMore}
          pageKey={candidates.length}
          onLoadMore={() => loadMore?.()}
          className={styles.loadMore}
          loadingLabel="Loading more candidates"
        />
      ) : null}
    </div>
  );
}

import { Children, type MouseEvent, type ReactNode } from "react";
import { CandidatePoolCard } from "@/components/pools/shared";
import { InfiniteScrollControl } from "@/components/shared";
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
  const hasActions = Children.count(children) > 0;

  return (
    <div>
      {hasActions ? <div className={styles.actions}>{children}</div> : null}
      <div className={styles.grid}>
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

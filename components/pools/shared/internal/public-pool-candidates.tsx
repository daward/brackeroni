"use client";

import { useCallback, useRef, useState } from "react";
import { CandidateTagList } from "./candidate-tag-list";
import { InfiniteScrollControl, ResilientRemoteImage } from "@/components/shared";
import styles from "./public-pool-candidates.module.css";
import type { PublicPoolCandidatesProps } from "../types";
import type { PoolCandidate } from "@/lib/pools/types";

type CandidatePageResponse = {
  items?: PoolCandidate[];
  meta?: { hasNextPage?: boolean };
};

export function PublicPoolCandidates({
  poolId,
  initialCandidates,
  initialPagination
}: PublicPoolCandidatesProps) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [hasNextPage, setHasNextPage] = useState(Boolean(initialPagination?.hasNextPage));
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initialCandidates.length);
  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;
    setLoading(true);
    try {
      const response = await fetch(
        `/api/pools/${poolId}/candidates?limit=24&offset=${offsetRef.current}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Failed to load candidates.");
      const data = (await response.json()) as CandidatePageResponse;
      const items = data.items ?? [];
      setCandidates((current) => [
        ...current,
        ...items.filter((item) => !current.some((candidate) => candidate.id === item.id))
      ]);
      offsetRef.current += items.length;
      setHasNextPage(Boolean(data.meta?.hasNextPage) && items.length > 0);
    } finally {
      setLoading(false);
    }
  }, [hasNextPage, loading, poolId]);

  return (
    <>
      <div className={styles.grid}>
        {candidates.map((candidate) => (
          <article key={candidate.id} className={styles.card}>
            {candidate.imageUrl ? (
              <ResilientRemoteImage src={candidate.imageUrl} alt={candidate.name} className={styles.image} />
            ) : null}
            <div className={styles.content}>
              <p className={`${styles.name} display-face`}>{candidate.name}</p>
              <CandidateTagList tags={candidate.tags} className={styles.tags} />
              {candidate.description ? (
                <p className={styles.description}>{candidate.description}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {hasNextPage ? (
        <InfiniteScrollControl
          enabled={hasNextPage}
          loading={loading}
          pageKey={candidates.length}
          onLoadMore={loadMore}
          className={styles.loadMoreSentinel}
          loadingLabel="Loading more candidates"
        />
      ) : null}
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useInfiniteScroll } from "@/components/shared";
import { listPools } from "@/lib/client-api/create-workspace";
import type { PoolSelectionOption } from "@/lib/pools/types";

const PAGE_SIZE = 24;

export function useWizardPools(initialPools: PoolSelectionOption[], enabled: boolean, onError: (message: string) => void) {
  const [pools, setPools] = useState<PoolSelectionOption[]>(initialPools);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialPools.length >= PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  useEffect(() => {
    setPools((current) => {
      const ids = new Set(current.map((pool) => pool.id));
      const additions = initialPools.filter((pool) => !ids.has(pool.id));
      return additions.length ? [...current, ...additions] : current;
    });
  }, [initialPools]);
  async function loadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const data = await listPools({ limit: PAGE_SIZE, offset: page * PAGE_SIZE });
      const additions = data.items || [];
      setPools((current) => {
        const ids = new Set(current.map((pool) => pool.id));
        return [...current, ...additions.filter((pool: PoolSelectionOption) => !ids.has(pool.id))];
      });
      setPage((current) => current + 1);
      setHasMore(Boolean(data.meta?.hasNextPage));
    } catch {
      onError("We couldn't load more pools. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  }
  const loadSentinelRef = useInfiniteScroll({ enabled: enabled && hasMore, loading: loadingMore, pageKey: page, onLoadMore: loadMore });
  return { pools, hasMore, loadingMore, loadSentinelRef };
}

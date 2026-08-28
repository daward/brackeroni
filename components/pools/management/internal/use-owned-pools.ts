"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { listPools } from "@/lib/client-api/create-workspace";
import { sortManagedPools } from "@/components/pools/shared";
import type { OwnedPoolSummary, PoolPagination } from "./types";

const POOL_PAGE_SIZE = 24;

type UseOwnedPoolsOptions = {
  onError: (message: string) => void;
};

export function useOwnedPools({ onError }: UseOwnedPoolsOptions) {
  const [pools, setPools] = useState<OwnedPoolSummary[]>([]);
  const [poolPage, setPoolPage] = useState(1);
  const [pagination, setPagination] = useState<PoolPagination>({
    page: 1,
    pageSize: POOL_PAGE_SIZE,
    totalCount: 0,
    hasNextPage: false,
  });
  const [isPending, startTransition] = useTransition();

  const loadPools = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const poolData = await listPools({
        limit: POOL_PAGE_SIZE,
        offset: (poolPage - 1) * POOL_PAGE_SIZE,
      });
      const listedPools = sortManagedPools((poolData.items ?? []) as OwnedPoolSummary[]);
      const totalCount = Number(poolData.meta?.totalCount ?? listedPools.length);
      const totalPages = Math.max(1, Math.ceil(totalCount / POOL_PAGE_SIZE));

      setPagination({
        page: Math.min(poolPage, totalPages),
        pageSize: POOL_PAGE_SIZE,
        totalCount,
        hasNextPage: Boolean(poolData.meta?.hasNextPage),
      });

      if (poolPage > totalPages) {
        setPoolPage(totalPages);
        return;
      }

      if (force || poolPage === 1) {
        setPools(listedPools);
        return;
      }

      setPools((current) => sortManagedPools([...current, ...listedPools.filter((pool) => !current.some((existing) => existing.id === pool.id))]) as OwnedPoolSummary[]);
    },
    [poolPage],
  );

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadPools();
      } catch (error) {
        onError(error instanceof Error ? error.message : "Failed to load pools.");
      }
    });
  }, [loadPools, onError]);

  return {
    isPending,
    loadPools,
    pagination,
    poolPage,
    pools,
    setPoolPage,
  };
}

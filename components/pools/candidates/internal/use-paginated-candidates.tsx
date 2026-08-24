"use client";

import { useCallback } from "react";
import { usePaginatedCollection } from "@/components/shared";
import type { CandidateCollection, CandidatePaginationSource } from "../types";

export function usePaginatedCandidates({ poolId, candidates, pagination }: CandidatePaginationSource): CandidateCollection {
  const loadPage = useCallback(
    async ({ offset }: { offset: number }) => {
      const response = await fetch(`/api/pools/${poolId}/candidates?limit=24&offset=${offset}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load candidates.");
      }

      const data = await response.json();
      return { items: data.items ?? [], hasNextPage: Boolean(data.meta?.hasNextPage) };
    },
    [poolId],
  );
  const collection = usePaginatedCollection({
    resourceKey: poolId,
    initialItems: candidates,
    initialPagination: pagination,
    loadPage,
  });

  return {
    candidates: collection.items,
    hasNextPage: collection.hasNextPage,
    isLoadingMore: collection.isLoadingMore,
    loadMore: collection.loadMore,
  };
}

"use client";

import { useCallback } from "react";
import { usePaginatedCollection } from "@/components/shared";
import type { VoteTournament } from "./voting-internal-types";
import { getErrorMessage } from "./voting-internal-types";

type UseCompletedVoteTournamentsProps = {
  initialCompletedTournaments: VoteTournament[];
  initialHasNextPage: boolean;
  setError: (message: string) => void;
};

export function useCompletedVoteTournaments({
  initialCompletedTournaments,
  initialHasNextPage,
  setError,
}: UseCompletedVoteTournamentsProps) {
  const loadCompletedPage = useCallback(async ({ offset }: { offset: number }) => {
    setError("");
    try {
      const response = await fetch(`/api/tournaments?scope=vote-completed&offset=${offset}&limit=12`, {
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || "Failed to load more completed brackets.");
      }

      const data = await response.json();
      return {
        items: data.items ?? [],
        hasNextPage: Boolean(data.meta?.hasNextPage),
      };
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Failed to load more completed brackets."));
      return {
        items: [],
        hasNextPage: false,
      };
    }
  }, [setError]);

  const collection = usePaginatedCollection<VoteTournament>({
    resourceKey: "vote-completed",
    initialItems: initialCompletedTournaments,
    initialPagination: { hasNextPage: initialHasNextPage },
    loadPage: loadCompletedPage,
  });

  return {
    completed: collection.items,
    completedHasNext: collection.hasNextPage,
    completedLoading: collection.isLoadingMore,
    loadMoreCompleted: collection.loadMore,
    setCompleted: collection.setItems,
  };
}

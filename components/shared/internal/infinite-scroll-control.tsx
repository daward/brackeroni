"use client";

import { useInfiniteScroll } from "./use-infinite-scroll";
import type { InfiniteScrollControlProps } from "../types";

export function InfiniteScrollControl({
  enabled,
  loading,
  pageKey,
  onLoadMore,
  className = "",
  loadingLabel = "Loading more items",
  rootMargin = "0px"
}: InfiniteScrollControlProps) {
  const sentinelRef = useInfiniteScroll({ enabled, loading, pageKey, onLoadMore, rootMargin });

  return (
    <div ref={sentinelRef} className={className} aria-live="polite">
      {loading ? <span className="sr-only">{loadingLabel}</span> : null}
    </div>
  );
}

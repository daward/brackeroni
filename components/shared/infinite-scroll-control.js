"use client";

import { useInfiniteScroll } from "@/components/shared/use-infinite-scroll";

export function InfiniteScrollControl({
  enabled,
  loading,
  pageKey,
  onLoadMore,
  className = "",
  loadingLabel = "Loading more items",
  rootMargin = "0px"
}) {
  const sentinelRef = useInfiniteScroll({ enabled, loading, pageKey, onLoadMore, rootMargin });

  return (
    <div ref={sentinelRef} className={className} aria-live="polite">
      {loading ? <span className="sr-only">{loadingLabel}</span> : null}
    </div>
  );
}

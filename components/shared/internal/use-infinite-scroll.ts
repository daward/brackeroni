"use client";

import { useEffect, useRef } from "react";
import type { InfiniteScrollOptions } from "../types";

// Requests once for each rendered page after the sentinel leaves and re-enters
// view. Initial layout and browser scroll restoration never trigger pagination.
export function useInfiniteScroll({ enabled, loading, pageKey, onLoadMore, rootMargin = "320px 0px" }: InfiniteScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const requestedPageKeyRef = useRef<string | number | null>(null);
  const hasLeftViewportRef = useRef(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!enabled || loading || !sentinel || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) {
        hasLeftViewportRef.current = true;
        return;
      }

      if (!hasLeftViewportRef.current || requestedPageKeyRef.current === pageKey) {
        return;
      }

      requestedPageKeyRef.current = pageKey;
      onLoadMore();
    }, { rootMargin });

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, loading, onLoadMore, pageKey, rootMargin]);

  return sentinelRef;
}

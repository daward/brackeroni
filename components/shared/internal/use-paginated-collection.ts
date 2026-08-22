"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { appendUniqueItems, getItemId, reconcileInitialPage } from "@/lib/pagination/collection";
import type { PaginatedCollection, PaginatedCollectionOptions } from "../types";

/**
 * Shared offset-pagination state. Resource adapters provide the transport;
 * components receive one consistent collection contract.
 */
export function usePaginatedCollection<T>({
  resourceKey,
  initialItems,
  initialPagination,
  loadPage,
  getId = getItemId as (item: T) => string | null | undefined
}: PaginatedCollectionOptions<T>): PaginatedCollection<T> {
  const [items, setItems] = useState(initialItems);
  const [hasNextPage, setHasNextPage] = useState(Boolean(initialPagination?.hasNextPage));
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const resourceKeyRef = useRef(resourceKey);
  const initialIdsRef = useRef<Set<string>>(new Set(initialItems.map(getId).filter((id): id is string => Boolean(id))));
  const nextOffsetRef = useRef(initialItems.length);
  const loadingRef = useRef(false);

  useEffect(() => {
    const nextInitialIds = new Set(initialItems.map(getId).filter((id): id is string => Boolean(id)));

    if (resourceKeyRef.current !== resourceKey) {
      resourceKeyRef.current = resourceKey;
      initialIdsRef.current = nextInitialIds;
      nextOffsetRef.current = initialItems.length;
      setItems(initialItems);
      setHasNextPage(Boolean(initialPagination?.hasNextPage));
      return;
    }

    setItems((current) => {
      const reconciled = reconcileInitialPage(current, initialIdsRef.current, initialItems, getId);
      // Every displayed record sits before the next offset. Recompute it after
      // mutations so deleting a first-page item cannot create a skipped slot.
      nextOffsetRef.current = reconciled.length;
      return reconciled;
    });
    initialIdsRef.current = nextInitialIds;
    setHasNextPage(Boolean(initialPagination?.hasNextPage));
  }, [getId, initialItems, initialPagination?.hasNextPage, resourceKey]);

  const loadMore = useCallback(async () => {
    if (!resourceKey || loadingRef.current || !hasNextPage) return;

    loadingRef.current = true;
    setIsLoadingMore(true);
    try {
      const page = await loadPage({ offset: nextOffsetRef.current });
      const nextItems = page.items ?? [];
      nextOffsetRef.current += nextItems.length;
      setItems((current) => appendUniqueItems(current, nextItems, getId));
      setHasNextPage(Boolean(page.hasNextPage) && nextItems.length > 0);
    } finally {
      loadingRef.current = false;
      setIsLoadingMore(false);
    }
  }, [getId, hasNextPage, loadPage, resourceKey]);

  return { items, hasNextPage, isLoadingMore, loadMore };
}

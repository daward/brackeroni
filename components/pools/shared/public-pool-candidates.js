"use client";

import { useCallback, useRef, useState } from "react";
import { CandidateTagList } from "@/components/pools/shared/candidate-tag-list";
import { InfiniteScrollControl } from "@/components/shared/infinite-scroll-control";

export function PublicPoolCandidates({ poolId, initialCandidates, initialPagination }) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [hasNextPage, setHasNextPage] = useState(Boolean(initialPagination?.hasNextPage));
  const [loading, setLoading] = useState(false);
  const offsetRef = useRef(initialCandidates.length);
  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/pools/${poolId}/candidates?limit=24&offset=${offsetRef.current}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load candidates.");
      const data = await response.json();
      const items = data.items ?? [];
      setCandidates((current) => [...current, ...items.filter((item) => !current.some((candidate) => candidate.id === item.id))]);
      offsetRef.current += items.length;
      setHasNextPage(Boolean(data.meta?.hasNextPage) && items.length > 0);
    } finally { setLoading(false); }
  }, [hasNextPage, loading, poolId]);
  return <><div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">{candidates.map((candidate) => <div key={candidate.id} className="overflow-hidden border border-[var(--line)] bg-[var(--panel-2)]">{candidate.imageUrl ? <img src={candidate.imageUrl} alt={candidate.name} className="h-40 w-full object-cover" /> : null}<div className="px-4 py-4"><p className="display-face text-lg font-black">{candidate.name}</p><CandidateTagList tags={candidate.tags} className="mt-2" />{candidate.description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{candidate.description}</p> : null}</div></div>)}</div>{hasNextPage ? <InfiniteScrollControl enabled={hasNextPage} loading={loading} pageKey={candidates.length} onLoadMore={loadMore} className="h-px" loadingLabel="Loading more candidates" /> : null}</>;
}

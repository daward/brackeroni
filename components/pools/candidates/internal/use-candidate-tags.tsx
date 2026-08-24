"use client";

import { useEffect, useMemo, useState } from "react";
import { filterCandidatesByTag, getCandidateTagSummary } from "@/lib/candidate-tags";
import type { PoolCandidate } from "../types";

type Props = { candidates: PoolCandidate[]; openDrawerRequest?: boolean; onDrawerRequestHandled?: () => void };

export function useCandidateTags({ candidates, openDrawerRequest, onDrawerRequestHandled }: Props) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("");
  const [lowValueThreshold, setLowValueThreshold] = useState("1");
  const sortedTags = useMemo(() => getCandidateTagSummary(candidates), [candidates]);
  const tagCounts = useMemo(() => Object.fromEntries(sortedTags), [sortedTags]);
  const activeTagFilter = activeFilter && tagCounts[activeFilter] ? activeFilter : "";
  const visibleCandidates = useMemo(() => filterCandidatesByTag(candidates, activeTagFilter), [activeTagFilter, candidates]);

  useEffect(() => {
    if (!openDrawerRequest) {
      return;
    }

    setIsDrawerOpen(true);
    onDrawerRequestHandled?.();
  }, [onDrawerRequestHandled, openDrawerRequest]);

  return {
    activeTagFilter,
    isDrawerOpen,
    lowValueThreshold,
    setActiveFilter,
    setIsDrawerOpen,
    setLowValueThreshold,
    sortedTags,
    tagCounts,
    visibleCandidates,
  };
}

import type { PoolDetail } from "../types";

type PoolDetailMenuOptions = {
  pool: Pick<PoolDetail, "visibility" | "candidates"> | null | undefined;
  readOnly: boolean;
  isPending: (action: string) => boolean;
};

export function getPoolDetailMenuState({ pool, readOnly, isPending }: PoolDetailMenuOptions) {
  const candidates = pool?.candidates || [];
  const tagCount = new Set(candidates.flatMap((candidate) => candidate.tags || [])).size;
  const sourceCandidateCount = candidates.filter((candidate) => candidate.sourceUrl).length;
  const missingImageCount = candidates.filter((candidate) => !candidate.imageUrl).length;

  return {
    tagCount,
    sourceCandidateCount,
    missingImageCount,
    canCopyLink: pool?.visibility !== "private",
    canImport: !readOnly,
    canEnrich: !readOnly && sourceCandidateCount > 0 && !isPending("enrich-candidates"),
    canFillImages: !readOnly && missingImageCount > 0 && !isPending("auto-fill-images"),
    canMerge: !readOnly && !isPending("load-merge-pools") && !isPending("merge-pool"),
    canArchive: !readOnly && !isPending("archive-pool")
  };
}

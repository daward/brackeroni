"use client";

import { useCallback, useState } from "react";
import { isStrongSuggestedImageMatch } from "@/lib/pools/image-suggestions";
import type { ImageSuggestion, PoolCandidate } from "@/components/pools/candidates";
import type { PoolDetail } from "@/lib/pools/types";
import {
  archivePool,
  enrichPoolCandidatesFromSourceUrls,
  listPools,
  mergePoolIntoPool,
  removeLowValueTagsFromPoolCandidates,
  removeTagFromPoolCandidates,
  suggestImages,
  updateCandidateInPool
} from "@/lib/client-api/create-workspace";

export type MergePoolOption = {
  id: string;
  name: string;
  candidateCount?: number;
};

type PoolMutationResponse = {
  item: PoolDetail;
  meta?: {
    enrichedCount?: number;
    failedCount?: number;
    processedCount?: number;
    remainingCount?: number;
    removedTagCount?: number;
    skippedCount?: number;
  };
};

type PoolDetailActionOptions = {
  pool: PoolDetail;
  onArchive: () => void;
  onImportFallback: () => void;
  replacePool: (pool: PoolDetail | null | undefined) => void;
  updateCandidate: (candidateId: string, patch: Partial<PoolCandidate>) => void;
  begin: (action: string) => void;
  end: (action: string) => void;
  isPending: (action: string) => boolean;
  setErrorMessage: (message: string) => void;
  setSuccessMessage: (message: string) => void;
};

function getErrorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

/** Pool-level mutations kept separate from the main detail composition hook. */
export function usePoolDetailActions({ pool, onArchive, onImportFallback, replacePool, updateCandidate, begin, end, isPending, setErrorMessage, setSuccessMessage }: PoolDetailActionOptions) {
  const [mergePools, setMergePools] = useState<MergePoolOption[]>([]);
  const [isMergeOpen, setIsMergeOpen] = useState(false);

  const applyPoolResponse = useCallback(async (request: () => Promise<PoolMutationResponse>, successMessage: (data: PoolMutationResponse) => string) => {
    try {
      const data = await request();
      replacePool(data.item);
      setSuccessMessage(successMessage(data));
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to update pool."));
    }
  }, [replacePool, setErrorMessage, setSuccessMessage]);

  const removeTag = useCallback(async (tag: string) => {
    if (!window.confirm(`Remove the tag "${tag}" from every candidate in this pool?`)) return;
    await applyPoolResponse(() => removeTagFromPoolCandidates(pool.id, tag), () => `Removed "${tag}" from this pool.`);
  }, [applyPoolResponse, pool.id]);

  const removeLowValueTags = useCallback(async (threshold: number) => {
    if (!window.confirm(`Remove every tag used by ${threshold} candidate${threshold === 1 ? "" : "s"} or fewer?`)) return;
    await applyPoolResponse(
      () => removeLowValueTagsFromPoolCandidates(pool.id, threshold),
      (data) => data.meta?.removedTagCount ? `Removed ${data.meta.removedTagCount} low-value tags.` : "No tags matched that threshold."
    );
  }, [applyPoolResponse, pool.id]);

  const enrichCandidates = useCallback(async () => {
    const action = "enrich-candidates";
    if (isPending(action)) return null;
    begin(action);
    try {
      let shouldContinue = true;
      let lastData: PoolMutationResponse | null = null;
      while (shouldContinue) {
        const data: PoolMutationResponse = await enrichPoolCandidatesFromSourceUrls(pool.id);
        lastData = data;
        replacePool(data.item);
        const { processedCount: processed = 0, remainingCount: remaining = 0, enrichedCount: enriched = 0, skippedCount: skipped = 0, failedCount: failed = 0 } = data.meta || {};
        setSuccessMessage(`Processed ${processed}; enriched ${enriched}. ${skipped} skipped.${failed ? ` ${failed} failed.` : ""}${remaining ? ` ${remaining} remain.` : ""}`);
        shouldContinue = remaining > 0 && processed > 0 && window.confirm(`${processed} candidates processed. ${remaining} remain.\n\nContinue from where this pass left off?`);
      }
      return lastData;
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to enrich candidates from source URLs."));
      return null;
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool.id, replacePool, setErrorMessage, setSuccessMessage]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pools/${pool.id}`);
      setSuccessMessage("Pool link copied.");
    } catch {
      setErrorMessage("Could not copy the pool link.");
    }
  }, [pool.id, setErrorMessage, setSuccessMessage]);

  const continueImport = useCallback(() => {
    if (pool.importSourceUrl) {
      try {
        const url = new URL(pool.importSourceUrl);
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
        hashParams.set("brackeroni-continue-pool", pool.id);
        hashParams.set("brackeroni-continue-name", pool.name);
        url.hash = hashParams.toString();
        window.open(url.toString(), "_blank");
        return;
      } catch {}
    }
    onImportFallback();
  }, [onImportFallback, pool.id, pool.importSourceUrl, pool.name]);

  const openMerge = useCallback(async () => {
    if (isMergeOpen) {
      setIsMergeOpen(false);
      return;
    }
    const action = "load-merge-pools";
    if (isPending(action)) return;
    begin(action);
    try {
      const data: { items?: MergePoolOption[] } = await listPools({ limit: 48 });
      setMergePools((data.items || []).filter((item) => item.id !== pool.id));
      setIsMergeOpen(true);
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to load pools to merge."));
    } finally {
      end(action);
    }
  }, [begin, end, isMergeOpen, isPending, pool.id, setErrorMessage]);

  const mergePool = useCallback(async (sourcePoolId: string) => {
    const action = "merge-pool";
    if (!sourcePoolId || isPending(action)) return;
    begin(action);
    try {
      const data: PoolMutationResponse = await mergePoolIntoPool(pool.id, sourcePoolId);
      replacePool(data.item);
      setIsMergeOpen(false);
      setSuccessMessage("Pool merged.");
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to merge pool."));
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool.id, replacePool, setErrorMessage, setSuccessMessage]);

  const autoFillMissingImages = useCallback(async () => {
    const candidates = pool.candidates.filter((candidate) => !candidate.imageUrl);
    if (!candidates.length) {
      setSuccessMessage("This pool already has images for every candidate.");
      return;
    }
    const action = "auto-fill-images";
    if (isPending(action)) return;
    begin(action);
    let applied = 0;
    let skipped = 0;
    let failed = 0;
    try {
      for (const candidate of candidates) {
        try {
          const data: { items?: ImageSuggestion[] } = await suggestImages(candidate.name);
          const suggestion = (data.items || []).find((item) => isStrongSuggestedImageMatch(candidate.name, item));
          if (!suggestion?.imageUrl) {
            skipped += 1;
            continue;
          }
          const updated = await updateCandidateInPool(pool.id, candidate.id, { imageUrl: suggestion.imageUrl });
          updateCandidate(candidate.id, updated.item);
          applied += 1;
        } catch {
          failed += 1;
        }
      }
      setSuccessMessage(`Filled ${applied} missing image${applied === 1 ? "" : "s"}. ${skipped} skipped.${failed ? ` ${failed} failed.` : ""}`);
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool.candidates, pool.id, setSuccessMessage, updateCandidate]);

  const archive = useCallback(async () => {
    if (!window.confirm(`Archive "${pool.name}"?\n\nThis hides it from your pools, but keeps its data and history.`)) return;
    const action = "archive-pool";
    if (isPending(action)) return;
    begin(action);
    try {
      await archivePool(pool.id);
      onArchive();
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to archive pool."));
    } finally {
      end(action);
    }
  }, [begin, end, isPending, onArchive, pool.id, pool.name, setErrorMessage]);

  return { archive, autoFillMissingImages, continueImport, copyLink, enrichCandidates, isMergeOpen, mergePool, mergePools, openMerge, removeLowValueTags, removeTag };
}

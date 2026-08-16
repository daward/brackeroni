"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { isStrongSuggestedImageMatch } from "@/lib/pools/image-suggestions";
import { usePaginatedCandidates } from "@/components/pools/candidates/use-paginated-candidates";
import { getAutomaticImageSuggestionQuery } from "@/lib/pool-detail/image-suggestions";
import {
  archivePool,
  createCandidateInPool,
  enrichPoolCandidatesFromSourceUrls,
  getPool,
  listPools,
  mergePoolIntoPool,
  removeCandidateFromPool,
  removeLowValueTagsFromPoolCandidates,
  removeTagFromPoolCandidates,
  suggestImages,
  updateCandidateInPool,
  updatePool
} from "@/lib/client-api/create-workspace";

const emptyCandidateDraft = {
  name: "",
  description: "",
  imageUrl: "",
  tagsText: ""
};

function candidateToDraft(candidate) {
  return {
    name: candidate?.name || "",
    description: candidate?.description || "",
    imageUrl: candidate?.imageUrl || "",
    tagsText: (candidate?.tags || []).join(", ")
  };
}

export function usePoolDetail({ initialPool, onArchive, onImportFallback }) {
  const [pool, setPool] = useState(initialPool);
  const [poolDraft, setPoolDraft] = useState(() => ({
    name: initialPool.name,
    description: initialPool.description || "",
    visibility: initialPool.visibility || "private"
  }));
  const [candidateDraft, setCandidateDraft] = useState(emptyCandidateDraft);
  const [candidateEditor, setCandidateEditor] = useState(null);
  const [imageSuggestions, setImageSuggestions] = useState([]);
  const [isImageSuggestionLoading, setIsImageSuggestionLoading] = useState(false);
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState("");
  const [mergePools, setMergePools] = useState([]);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const candidateCollection = usePaginatedCandidates({
    poolId: pool.id,
    candidates: pool.candidates,
    pagination: pool.candidatePagination
  });

  const isPending = useCallback(
    (action) => Boolean(pendingActions[action]),
    [pendingActions]
  );
  const begin = useCallback((action) => {
    setPendingActions((current) => ({ ...current, [action]: true }));
  }, []);
  const end = useCallback((action) => {
    setPendingActions((current) => ({ ...current, [action]: false }));
  }, []);
  const replacePool = useCallback((nextPool) => {
    if (!nextPool?.id) return;
    setPool(nextPool);
    setPoolDraft({
      name: nextPool.name,
      description: nextPool.description || "",
      visibility: nextPool.visibility || "private"
    });
  }, []);

  const refreshPool = useCallback(async () => {
    const data = await getPool(initialPool.id, { candidateLimit: 24 });
    replacePool(data.item);
    return data.item;
  }, [initialPool.id, replacePool]);

  useEffect(() => {
    refreshPool().catch((error) => setErrorMessage(error.message || "Failed to load pool."));
  }, [refreshPool]);

  useEffect(() => {
    if (!successMessage && !errorMessage) return undefined;
    const timer = window.setTimeout(() => {
      setSuccessMessage("");
      setErrorMessage("");
    }, successMessage ? 2200 : 4200);
    return () => window.clearTimeout(timer);
  }, [errorMessage, successMessage]);

  const savePool = useCallback(async (draftOverride) => {
    const draft = draftOverride || poolDraft;
    const name = draft.name?.trim();
    const description = draft.description?.trim() || "";
    const visibility = draft.visibility || pool.visibility || "private";
    if (!name) {
      setPoolDraft((current) => ({ ...current, name: pool.name }));
      return;
    }
    if (name === pool.name && description === (pool.description || "") && visibility === pool.visibility) return;

    const action = "save-pool";
    if (isPending(action)) return;
    begin(action);
    setErrorMessage("");
    try {
      const data = await updatePool(pool.id, { name, description: description || null, visibility });
      replacePool(data.item);
      setSuccessMessage("Pool updated.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update pool.");
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool, poolDraft, replacePool]);

  const updateCandidate = useCallback((candidateId, patch) => {
    setPool((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, ...patch } : candidate
      )
    }));
  }, []);

  const createCandidate = useCallback(async () => {
    const action = "create-candidate";
    if (isPending(action)) return;
    begin(action);
    setErrorMessage("");
    try {
      const data = await createCandidateInPool(pool.id, {
        name: candidateDraft.name,
        description: candidateDraft.description || null,
        imageUrl: candidateDraft.imageUrl || null,
        tags: parseCandidateTagText(candidateDraft.tagsText)
      });
      replacePool(data.item);
      setCandidateDraft(emptyCandidateDraft);
      setCandidateEditor(null);
      setImageSuggestions([]);
      setSuccessMessage("Candidate created.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to create candidate.");
    } finally {
      end(action);
    }
  }, [begin, candidateDraft, end, isPending, pool.id, replacePool]);

  const saveCandidate = useCallback(async () => {
    if (!candidateEditor?.id) return;
    const action = "save-candidate";
    if (isPending(action)) return;
    begin(action);
    setErrorMessage("");
    try {
      const data = await updateCandidateInPool(pool.id, candidateEditor.id, {
        name: candidateDraft.name,
        description: candidateDraft.description || null,
        imageUrl: candidateDraft.imageUrl || null,
        tags: parseCandidateTagText(candidateDraft.tagsText)
      });
      updateCandidate(candidateEditor.id, data.item);
      setCandidateEditor(null);
      setSuccessMessage("Candidate updated.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to update candidate.");
    } finally {
      end(action);
    }
  }, [begin, candidateDraft, candidateEditor, end, isPending, pool.id, updateCandidate]);

  const removeCandidate = useCallback(async (candidate) => {
    const action = `remove-candidate:${candidate.id}`;
    if (isPending(action)) return;
    begin(action);
    setErrorMessage("");
    try {
      await removeCandidateFromPool(pool.id, candidate.id);
      setPool((current) => ({
        ...current,
        candidateCount: Math.max(current.candidateCount - 1, 0),
        candidates: current.candidates.filter((item) => item.id !== candidate.id)
      }));
      if (candidateEditor?.id === candidate.id) setCandidateEditor(null);
      setSuccessMessage("Candidate removed.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to remove candidate.");
    } finally {
      end(action);
    }
  }, [begin, candidateEditor?.id, end, isPending, pool.id]);

  const suggestCandidateImages = useCallback(async ({ force = false } = {}) => {
    const query = candidateDraft.name.trim();
    if (query.length < 2 || isImageSuggestionLoading || (!force && imageSuggestionQuery === query)) return;
    setIsImageSuggestionLoading(true);
    try {
      const data = await suggestImages(query);
      setImageSuggestions(data.items || []);
      setImageSuggestionQuery(query);
    } catch (error) {
      setErrorMessage(error.message || "Failed to fetch image suggestions.");
    } finally {
      setIsImageSuggestionLoading(false);
    }
  }, [candidateDraft.name, imageSuggestionQuery, isImageSuggestionLoading]);

  useEffect(() => {
    const query = getAutomaticImageSuggestionQuery({
      candidateId: candidateEditor?.id,
      candidateName: candidateDraft.name,
      completedQuery: imageSuggestionQuery,
      isLoading: isImageSuggestionLoading
    });

    if (!query) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      suggestCandidateImages();
    }, 300);

    return () => window.clearTimeout(timer);
  }, [candidateDraft.name, candidateEditor?.id, imageSuggestionQuery, isImageSuggestionLoading, suggestCandidateImages]);

  const applyPoolResponse = useCallback(async (request, successMessage) => {
    try {
      const data = await request();
      replacePool(data.item);
      setSuccessMessage(successMessage(data));
    } catch (error) {
      setErrorMessage(error.message || "Failed to update pool.");
    }
  }, [replacePool]);

  const removeTag = useCallback(async (tag) => {
    if (!window.confirm(`Remove the tag "${tag}" from every candidate in this pool?`)) return;
    await applyPoolResponse(
      () => removeTagFromPoolCandidates(pool.id, tag),
      () => `Removed "${tag}" from this pool.`
    );
  }, [applyPoolResponse, pool.id]);

  const removeLowValueTags = useCallback(async (threshold) => {
    if (!window.confirm(`Remove every tag used by ${threshold} candidate${threshold === 1 ? "" : "s"} or fewer?`)) return;
    await applyPoolResponse(
      () => removeLowValueTagsFromPoolCandidates(pool.id, threshold),
      (data) => data.meta?.removedTagCount ? `Removed ${data.meta.removedTagCount} low-value tags.` : "No tags matched that threshold."
    );
  }, [applyPoolResponse, pool.id]);

  const enrichCandidates = useCallback(async () => {
    const action = "enrich-candidates";
    if (isPending(action)) return;
    begin(action);
    try {
      let shouldContinue = true;
      let lastData = null;
      while (shouldContinue) {
        const data = await enrichPoolCandidatesFromSourceUrls(pool.id);
        lastData = data;
        replacePool(data.item);
        const processed = data.meta?.processedCount || 0;
        const remaining = data.meta?.remainingCount || 0;
        const enriched = data.meta?.enrichedCount || 0;
        const skipped = data.meta?.skippedCount || 0;
        const failed = data.meta?.failedCount || 0;
        setSuccessMessage(`Processed ${processed}; enriched ${enriched}. ${skipped} skipped.${failed ? ` ${failed} failed.` : ""}${remaining ? ` ${remaining} remain.` : ""}`);
        shouldContinue = remaining > 0 && processed > 0 && window.confirm(
          `${processed} candidates processed. ${remaining} remain.\n\nContinue from where this pass left off?`
        );
      }
      return lastData;
    } catch (error) {
      setErrorMessage(error.message || "Failed to enrich candidates from source URLs.");
      return null;
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool.id, replacePool]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/pools/${pool.id}`);
      setSuccessMessage("Pool link copied.");
    } catch {
      setErrorMessage("Could not copy the pool link.");
    }
  }, [pool.id]);

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
      const data = await listPools({ limit: 48 });
      setMergePools((data.items || []).filter((item) => item.id !== pool.id));
      setIsMergeOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load pools to merge.");
    } finally {
      end(action);
    }
  }, [begin, end, isMergeOpen, isPending, pool.id]);

  const mergePool = useCallback(async (sourcePoolId) => {
    const action = "merge-pool";
    if (!sourcePoolId || isPending(action)) return;
    begin(action);
    try {
      const data = await mergePoolIntoPool(pool.id, sourcePoolId);
      replacePool(data.item);
      setIsMergeOpen(false);
      setSuccessMessage("Pool merged.");
    } catch (error) {
      setErrorMessage(error.message || "Failed to merge pool.");
    } finally {
      end(action);
    }
  }, [begin, end, isPending, pool.id, replacePool]);

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
          const data = await suggestImages(candidate.name);
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
  }, [begin, end, isPending, pool.candidates, pool.id, updateCandidate]);

  const archive = useCallback(async () => {
    if (!window.confirm(`Archive "${pool.name}"?\n\nThis hides it from your pools, but keeps its data and history.`)) return;
    const action = "archive-pool";
    if (isPending(action)) return;
    begin(action);
    try {
      await archivePool(pool.id);
      onArchive();
    } catch (error) {
      setErrorMessage(error.message || "Failed to archive pool.");
    } finally {
      end(action);
    }
  }, [begin, end, isPending, onArchive, pool.id, pool.name]);

  return {
    archive,
    autoFillMissingImages,
    candidateDraft,
    candidateCollection,
    candidateEditor,
    continueImport,
    copyLink,
    createCandidate,
    enrichCandidates,
    errorMessage,
    imageSuggestions,
    isImageSuggestionLoading,
    isMergeOpen,
    isPending,
    mergePool,
    mergePools,
    openMerge,
    openCandidateCreator: () => { setCandidateDraft(emptyCandidateDraft); setCandidateEditor({ id: null }); setImageSuggestions([]); setImageSuggestionQuery(""); },
    openCandidateEditor: (candidate) => { setCandidateDraft(candidateToDraft(candidate)); setCandidateEditor({ id: candidate.id }); setImageSuggestions([]); setImageSuggestionQuery(""); },
    pool,
    poolDraft,
    removeCandidate,
    removeLowValueTags,
    removeTag,
    saveCandidate,
    savePool,
    setCandidateDraft,
    setCandidateEditor,
    setImageSuggestions,
    setPoolDraft,
    successMessage,
    suggestCandidateImages
  };
}

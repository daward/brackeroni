"use client";

import { useCallback, useEffect, useState } from "react";
import { parseCandidateTagText } from "@/lib/candidate-tags";
import { usePaginatedCandidates } from "@/components/pools/candidates";
import type { CandidateDraft, PoolCandidate } from "@/components/pools/candidates";
import type { PoolDetail, PoolDraft } from "@/lib/pools/types";
import { createCandidateInPool, getPool, removeCandidateFromPool, updateCandidateInPool, updatePool } from "@/lib/client-api/create-workspace";
import { usePoolDetailStatus } from "./use-pool-detail-status";
import { useCandidateImageSuggestions } from "./use-candidate-image-suggestions";
import { useCandidateEditorState } from "./use-candidate-editor-state";
import { usePoolDetailActions } from "./use-pool-detail-actions";

type UsePoolDetailOptions = {
  initialPool: PoolDetail;
  onArchive: () => void;
  onImportFallback: () => void;
};

function getErrorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const loadPool = getPool as (poolId: string, options?: { candidateLimit?: number | null; candidateOffset?: number }) => Promise<{ item: PoolDetail }>;

export function usePoolDetail({ initialPool, onArchive, onImportFallback }: UsePoolDetailOptions) {
  const [pool, setPool] = useState<PoolDetail>(initialPool);
  const [poolDraft, setPoolDraft] = useState<PoolDraft>(() => ({
    name: initialPool.name,
    description: initialPool.description || "",
    visibility: initialPool.visibility || "private",
  }));
  const editorState = useCandidateEditorState();
  const { candidateDraft, candidateEditor, setCandidateDraft, setCandidateEditor } = editorState;
  const { begin, end, errorMessage, isPending, setErrorMessage, setSuccessMessage, successMessage } = usePoolDetailStatus();
  const { imageSuggestions, isImageSuggestionLoading, resetImageSuggestions, suggestCandidateImages } = useCandidateImageSuggestions({
    candidateId: candidateEditor?.id,
    candidateName: candidateDraft.name,
    onError: setErrorMessage,
  });
  const openCandidateCreator = useCallback(() => {
    editorState.openCandidateCreator();
    resetImageSuggestions();
  }, [editorState, resetImageSuggestions]);
  const openCandidateEditor = useCallback(
    (candidate: PoolCandidate) => {
      editorState.openCandidateEditor(candidate);
      resetImageSuggestions();
    },
    [editorState, resetImageSuggestions],
  );
  const candidateCollection = usePaginatedCandidates({
    poolId: pool.id,
    candidates: pool.candidates,
    pagination: pool.candidatePagination,
  });

  const replacePool = useCallback((nextPool: PoolDetail | null | undefined) => {
    if (!nextPool?.id) return;
    setPool(nextPool);
    setPoolDraft({
      name: nextPool.name,
      description: nextPool.description || "",
      visibility: nextPool.visibility || "private",
    });
  }, []);

  const refreshPool = useCallback(async () => {
    const data = await loadPool(initialPool.id, { candidateLimit: 24 });
    replacePool(data.item);
    return data.item;
  }, [initialPool.id, replacePool]);

  useEffect(() => {
    refreshPool().catch((error) => setErrorMessage(error.message || "Failed to load pool."));
  }, [refreshPool]);

  const savePool = useCallback(
    async (draftOverride?: PoolDraft) => {
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
        setErrorMessage(getErrorText(error, "Failed to update pool."));
      } finally {
        end(action);
      }
    },
    [begin, end, isPending, pool, poolDraft, replacePool],
  );

  const updateCandidate = useCallback((candidateId: string, patch: Partial<PoolCandidate>) => {
    setPool((current) => ({
      ...current,
      candidates: current.candidates.map((candidate) => (candidate.id === candidateId ? { ...candidate, ...patch } : candidate)),
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
        tags: parseCandidateTagText(candidateDraft.tagsText),
      });
      replacePool(data.item);
      setCandidateDraft({ name: "", description: "", imageUrl: "", tagsText: "" });
      setCandidateEditor(null);
      resetImageSuggestions();
      setSuccessMessage("Candidate created.");
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to create candidate."));
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
        tags: parseCandidateTagText(candidateDraft.tagsText),
      });
      updateCandidate(candidateEditor.id, data.item);
      setCandidateEditor(null);
      setSuccessMessage("Candidate updated.");
    } catch (error) {
      setErrorMessage(getErrorText(error, "Failed to update candidate."));
    } finally {
      end(action);
    }
  }, [begin, candidateDraft, candidateEditor, end, isPending, pool.id, updateCandidate]);

  const removeCandidate = useCallback(
    async (candidate: PoolCandidate) => {
      const action = `remove-candidate:${candidate.id}`;
      if (isPending(action)) return;
      begin(action);
      setErrorMessage("");
      try {
        await removeCandidateFromPool(pool.id, candidate.id);
        setPool((current) => ({
          ...current,
          candidateCount: Math.max(current.candidateCount - 1, 0),
          candidates: current.candidates.filter((item) => item.id !== candidate.id),
        }));
        if (candidateEditor?.id === candidate.id) setCandidateEditor(null);
        setSuccessMessage("Candidate removed.");
      } catch (error) {
        setErrorMessage(getErrorText(error, "Failed to remove candidate."));
      } finally {
        end(action);
      }
    },
    [begin, candidateEditor?.id, end, isPending, pool.id],
  );

  const poolActions = usePoolDetailActions({
    pool,
    onArchive,
    onImportFallback,
    replacePool,
    updateCandidate,
    begin,
    end,
    isPending,
    setErrorMessage,
    setSuccessMessage,
  });

  return {
    ...poolActions,
    candidateDraft,
    candidateCollection,
    candidateEditor,
    createCandidate,
    errorMessage,
    imageSuggestions,
    isImageSuggestionLoading,
    isPending,
    openCandidateCreator,
    openCandidateEditor,
    pool,
    poolDraft,
    removeCandidate,
    saveCandidate,
    savePool,
    setCandidateDraft,
    setCandidateEditor,
    setPoolDraft,
    successMessage,
    suggestCandidateImages,
  };
}

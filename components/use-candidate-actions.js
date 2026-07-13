"use client";

import { useEffect } from "react";
import {
  isStrongSuggestedImageMatch,
  sortManagedPools
} from "@/components/create-panel-helpers";

export function useCandidateActions({
  candidateDrafts,
  setCandidateDrafts,
  candidateEditor,
  setCandidateEditor,
  imageSuggestions,
  setImageSuggestions,
  imageSuggestionLoading,
  setImageSuggestionLoading,
  imageSuggestionQuery,
  setImageSuggestionQuery,
  poolDetails,
  setPoolDetails,
  setPools,
  setExpandedPoolId,
  tournaments,
  emptyCandidateForm,
  isActionPending,
  beginAction,
  endAction,
  setErrorMessage,
  setSuccessMessage,
  loadWorkspace,
  setOpenPoolActionsMenuId,
  setOpenPoolMergeMenuId
}) {
  async function handleSuggestImages(poolId, requestedName) {
    const candidateName = (requestedName ?? candidateDrafts[poolId]?.name ?? "").trim();

    if (candidateName.length < 2) {
      setErrorMessage("Give the candidate a name before asking for image suggestions.");
      return;
    }

    setErrorMessage("");
    setImageSuggestionLoading((current) => ({
      ...current,
      [poolId]: true
    }));

    try {
      const response = await fetch(`/api/image-suggestions?q=${encodeURIComponent(candidateName)}`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to fetch image suggestions.");
        return;
      }

      setImageSuggestions((current) => ({
        ...current,
        [poolId]: data.items ?? []
      }));
      setImageSuggestionQuery((current) => ({
        ...current,
        [poolId]: candidateName
      }));
    } catch {
      setErrorMessage("Failed to fetch image suggestions.");
    } finally {
      setImageSuggestionLoading((current) => ({
        ...current,
        [poolId]: false
      }));
    }
  }

  useEffect(() => {
    const timers = Object.entries(candidateDrafts).map(([poolId, draft]) => {
      const candidateName = (draft?.name || "").trim();

      if (
        candidateName.length < 2 ||
        imageSuggestionLoading[poolId] ||
        imageSuggestionQuery[poolId] === candidateName
      ) {
        return null;
      }

      return setTimeout(() => {
        handleSuggestImages(poolId, candidateName);
      }, 1200);
    });

    return () => {
      for (const timer of timers) {
        if (timer) {
          clearTimeout(timer);
        }
      }
    };
  }, [candidateDrafts, imageSuggestionLoading, imageSuggestionQuery]);

  function selectSuggestedImage(poolId, imageUrl) {
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        ...(current[poolId] || emptyCandidateForm),
        imageUrl
      }
    }));
  }

  function updateCandidateDraft(poolId, field, value) {
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        ...(current[poolId] || emptyCandidateForm),
        [field]: value
      }
    }));
  }

  function openCandidateEditor(poolId, candidate) {
    setExpandedPoolId(poolId);
    setCandidateEditor({
      candidateId: candidate.id,
      poolId
    });
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: {
        name: candidate.name || "",
        description: candidate.description || "",
        imageUrl: candidate.imageUrl || ""
      }
    }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openCandidateCreator(poolId) {
    setExpandedPoolId(poolId);
    setCandidateEditor({
      candidateId: null,
      poolId
    });
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
    setImageSuggestions((current) => ({
      ...current,
      [poolId]: []
    }));
    setImageSuggestionQuery((current) => ({
      ...current,
      [poolId]: ""
    }));
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeCandidateEditor(poolId) {
    setCandidateEditor((current) => (current?.poolId === poolId ? null : current));
    setCandidateDrafts((current) => ({
      ...current,
      [poolId]: emptyCandidateForm
    }));
  }

  async function syncLinkedDraftBrackets(poolId, patch) {
    const linkedDraftBrackets = tournaments.filter(
      (tournament) => tournament.status === "draft" && tournament.sourcePoolId === poolId
    );

    await Promise.all(
      linkedDraftBrackets.map(async (tournament) => {
        await fetch(`/api/tournaments/${tournament.id}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify(patch)
        });
      })
    );
  }

  async function handleCreateCandidateInPool(poolId) {
    const actionKey = `create-candidate:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const draft = candidateDrafts[poolId] || emptyCandidateForm;

      const candidateResponse = await fetch(`/api/pools/${poolId}/candidates`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          imageUrl: draft.imageUrl || null
        })
      });

      const candidateData = await candidateResponse.json();
      if (!candidateResponse.ok) {
        setErrorMessage(candidateData.error?.message || "Failed to create candidate.");
        return;
      }

      await syncLinkedDraftBrackets(poolId, { syncWithPool: true });

      setCandidateDrafts((current) => ({
        ...current,
        [poolId]: emptyCandidateForm
      }));
      if (candidateEditor?.poolId === poolId) {
        setCandidateEditor(null);
      }
      setImageSuggestions((current) => ({
        ...current,
        [poolId]: []
      }));
      setImageSuggestionQuery((current) => ({
        ...current,
        [poolId]: ""
      }));
      setExpandedPoolId(poolId);
      setSuccessMessage("Candidate created inside pool.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRemoveCandidateFromPool(poolId, candidate) {
    const actionKey = `remove-candidate:${poolId}:${candidate.id}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");
    const scrollTopBeforeRemoval =
      typeof window !== "undefined"
        ? window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0
        : 0;

    try {
      const response = await fetch(`/api/pools/${poolId}/candidates/${candidate.id}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to remove candidate from pool.");
        return;
      }

      await syncLinkedDraftBrackets(poolId, { sourcePoolId: poolId });

      if (candidateEditor?.poolId === poolId && candidateEditor.candidateId === candidate.id) {
        closeCandidateEditor(poolId);
      }

      setPools((current) =>
        sortManagedPools(
          current.map((pool) =>
            pool.id === poolId
              ? {
                  ...pool,
                  candidateCount: Math.max((pool.candidateCount || 0) - 1, 0)
                }
              : pool
          )
        )
      );
      setPoolDetails((current) => {
        const pool = current[poolId];

        if (!pool) {
          return current;
        }

        return {
          ...current,
          [poolId]: {
            ...pool,
            candidateCount: Math.max((pool.candidateCount || 0) - 1, 0),
            candidates: (pool.candidates || []).filter((entry) => entry.id !== candidate.id)
          }
        };
      });

      setSuccessMessage("Candidate removed from pool.");
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          window.scrollTo({ top: scrollTopBeforeRemoval, behavior: "auto" });
          window.requestAnimationFrame(() => {
            window.scrollTo({ top: scrollTopBeforeRemoval, behavior: "auto" });
          });
        });
      }
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCandidateEditSubmit(poolId) {
    if (!candidateEditor || candidateEditor.poolId !== poolId || !candidateEditor.candidateId) {
      return;
    }

    const actionKey = `save-candidate:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const draft = candidateDrafts[poolId] || emptyCandidateForm;

      const response = await fetch(`/api/pools/${poolId}/candidates/${candidateEditor.candidateId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description || null,
          imageUrl: draft.imageUrl || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update candidate.");
        return;
      }

      closeCandidateEditor(poolId);
      setSuccessMessage("Candidate updated.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleAutoFillMissingImages(pool) {
    const actionKey = `auto-fill-images:${pool.id}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const candidates = poolDetails[pool.id]?.candidates || [];
    const missingImageCandidates = candidates.filter((candidate) => !candidate.imageUrl);

    if (missingImageCandidates.length === 0) {
      setSuccessMessage("This pool already has images for every candidate.");
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    let appliedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    try {
      for (const candidate of missingImageCandidates) {
        try {
          const response = await fetch(
            `/api/image-suggestions?q=${encodeURIComponent(candidate.name)}`,
            {
              cache: "no-store"
            }
          );
          const data = await response.json();

          if (!response.ok) {
            failedCount += 1;
            continue;
          }

          const bestSuggestion = (data.items || []).find((item) =>
            isStrongSuggestedImageMatch(candidate.name, item)
          );

          if (!bestSuggestion?.imageUrl) {
            skippedCount += 1;
            continue;
          }

          const saveResponse = await fetch(`/api/pools/${pool.id}/candidates/${candidate.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              imageUrl: bestSuggestion.imageUrl
            })
          });

          if (!saveResponse.ok) {
            failedCount += 1;
            continue;
          }

          appliedCount += 1;
        } catch {
          failedCount += 1;
        }
      }

      if (appliedCount > 0) {
        await loadWorkspace();
      }

      setSuccessMessage(
        `Filled ${appliedCount} missing image${appliedCount === 1 ? "" : "s"}. ` +
          `${skippedCount} skipped.${failedCount > 0 ? ` ${failedCount} failed.` : ""}`
      );
      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
    } finally {
      endAction(actionKey);
    }
  }

  return {
    closeCandidateEditor,
    handleAutoFillMissingImages,
    handleCandidateEditSubmit,
    handleCreateCandidateInPool,
    handleRemoveCandidateFromPool,
    handleSuggestImages,
    openCandidateCreator,
    openCandidateEditor,
    selectSuggestedImage,
    updateCandidateDraft
  };
}

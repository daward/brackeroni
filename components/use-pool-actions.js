"use client";

import { buildPoolImportPrompt } from "@/components/create-panel-helpers";
import {
  archivePool,
  createPool,
  enrichPoolCandidatesFromSourceUrls,
  mergePoolIntoPool,
  removeLowValueTagsFromPoolCandidates,
  removeTagFromPoolCandidates,
  updatePool,
  updateTournament
} from "@/lib/client-api/create-workspace";

export function usePoolActions({
  router,
  poolForm,
  setPoolForm,
  poolImportForm,
  setPoolImportForm,
  setIsPoolModalOpen,
  setIsPoolImportModalOpen,
  emptyPoolForm,
  emptyPoolImportForm,
  editingPool,
  setEditingPool,
  poolEditForm,
  setPoolEditForm,
  expandedPoolId,
  setExpandedPoolId,
  pools,
  poolInlineDrafts,
  setPoolInlineDrafts,
  setWorkspaceView,
  setOpenPoolActionsMenuId,
  setOpenPoolMergeMenuId,
  isActionPending,
  beginAction,
  endAction,
  setErrorMessage,
  setSuccessMessage,
  loadWorkspace
}) {
  async function handlePoolSubmit(event) {
    event.preventDefault();
    if (isActionPending("create-pool")) {
      return;
    }

    beginAction("create-pool");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createPool({
        name: poolForm.name,
        description: poolForm.description || null,
        visibility: poolForm.visibility
      });

      setPoolForm(emptyPoolForm);
      setExpandedPoolId(data.item?.id ?? null);
      setIsPoolModalOpen(false);
      setSuccessMessage("Pool created.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create pool.");
    } finally {
      endAction("create-pool");
    }
  }

  function closePoolImportModal() {
    setIsPoolImportModalOpen(false);
    setPoolImportForm(emptyPoolImportForm);
  }

  async function handlePoolImportSubmit(event) {
    event.preventDefault();
    const actionKey = "import-pool";

    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createPool({
        name: poolImportForm.name,
        description: poolImportForm.description || null,
        visibility: poolImportForm.visibility,
        source: {
          type: "extract",
          prompt: buildPoolImportPrompt(poolImportForm.name),
          text: poolImportForm.text
        }
      });

      setExpandedPoolId(data.item?.id ?? null);
      closePoolImportModal();
      setSuccessMessage("Pool imported.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to import pool.");
    } finally {
      endAction(actionKey);
    }
  }

  async function createPoolRecord({
    name = "Untitled Pool",
    description = null,
    attachedTournamentId = null,
    switchToPools = false
  } = {}) {
    const actionKey = attachedTournamentId
      ? `create-pool-for-tournament:${attachedTournamentId}`
      : "create-pool";

    if (isActionPending(actionKey)) {
      return null;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createPool({
        name,
        description,
        visibility: "private"
      });

      const createdPool = data.item;

      if (attachedTournamentId) {
        await updateTournament(attachedTournamentId, {
          sourcePoolId: createdPool.id
        });
      }

      setPoolInlineDrafts((current) => ({
        ...current,
        [createdPool.id]: {
          name: createdPool.name,
          description: createdPool.description || ""
        }
      }));
      setExpandedPoolId(createdPool.id);

      if (switchToPools) {
        setWorkspaceView("pools");
      }

      setSuccessMessage(attachedTournamentId ? "New pool created and linked to bracket." : "Pool created.");
      await loadWorkspace();
      return createdPool;
    } catch (error) {
      setErrorMessage(error.message || "Failed to create pool.");
      return null;
    } finally {
      endAction(actionKey);
    }
  }

  async function handleMergePool(poolId, sourcePoolId) {
    if (!sourcePoolId) {
      setErrorMessage("Choose a source pool to merge.");
      return;
    }

    const actionKey = `merge-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await mergePoolIntoPool(poolId, sourcePoolId);

      setOpenPoolMergeMenuId(null);
      setOpenPoolActionsMenuId(null);
      setSuccessMessage("Pool merged.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to merge pools.");
    } finally {
      endAction(actionKey);
    }
  }

  function openPoolEditor(pool) {
    setEditingPool(pool);
    setPoolEditForm({
      name: pool.name || "",
      description: pool.description || "",
      visibility: pool.visibility || "private"
    });
  }

  async function savePoolInline(poolId) {
    const draft = poolInlineDrafts[poolId];
    const pool = pools.find((entry) => entry.id === poolId);

    if (!draft || !pool) {
      return;
    }

    const nextName = draft.name?.trim();
    const nextDescription = draft.description?.trim() || "";
    const nextVisibility = draft.visibility || pool.visibility || "private";

    if (!nextName) {
      setPoolInlineDrafts((current) => ({
        ...current,
        [poolId]: {
          ...draft,
          name: pool.name
        }
      }));
      return;
    }

    if (
      nextName === pool.name &&
      nextDescription === (pool.description || "") &&
      nextVisibility === (pool.visibility || "private")
    ) {
      return;
    }

    const actionKey = `update-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await updatePool(poolId, {
        name: nextName,
        description: nextDescription || null,
        visibility: nextVisibility
      });

      setPoolInlineDrafts((current) => ({
        ...current,
        [poolId]: {
          name: data.item?.name ?? nextName,
          description: data.item?.description ?? nextDescription,
          visibility: data.item?.visibility ?? nextVisibility
        }
      }));
      setSuccessMessage("Pool updated.");
      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update pool.");
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCopyPoolLink(poolId) {
    setErrorMessage("");
    setSuccessMessage("");

    const shareUrl = `${window.location.origin}/pools/${poolId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      setSuccessMessage("Pool link copied.");
    } catch {
      setErrorMessage("Could not copy the pool link.");
    }
  }

  function handleImportCandidatesIntoPool(pool) {
    setOpenPoolActionsMenuId(null);
    setOpenPoolMergeMenuId(null);
    if (pool.importSourceUrl) {
      try {
        const url = new URL(pool.importSourceUrl);
        const hashParams = new URLSearchParams(
          url.hash.startsWith("#") ? url.hash.slice(1) : url.hash
        );
        hashParams.set("brackeroni-continue-pool", pool.id);
        hashParams.set("brackeroni-continue-name", pool.name);
        url.hash = hashParams.toString();
        window.open(url.toString(), "_blank");
        return;
      } catch {}
    }

    router.push(
      `/tools/import?poolId=${encodeURIComponent(pool.id)}&poolName=${encodeURIComponent(pool.name)}`
    );
  }

  async function handlePoolEditSubmit(event) {
    event.preventDefault();

    if (!editingPool) {
      return;
    }

    if (isActionPending("save-pool")) {
      return;
    }

    beginAction("save-pool");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updatePool(editingPool.id, {
        name: poolEditForm.name,
        description: poolEditForm.description || null,
        visibility: poolEditForm.visibility
      });

      setEditingPool(null);
      setPoolEditForm(emptyPoolForm);
      setSuccessMessage("Pool updated.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update pool.");
    } finally {
      endAction("save-pool");
    }
  }

  async function handleArchivePool(poolId, name) {
    const confirmed = window.confirm(
      `Archive "${name}"?\n\nThis will hide it from the main views, but keep its data and history.`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `archive-pool:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await archivePool(poolId);

      if (expandedPoolId === poolId) {
        setExpandedPoolId(null);
      }

      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      setSuccessMessage("Pool archived.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to archive pool.");
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRemoveTagFromPool(poolId, tag) {
    const normalizedTag = String(tag || "").trim();

    if (!normalizedTag) {
      return;
    }

    const confirmed = window.confirm(
      `Remove the tag "${normalizedTag}" from every candidate in this pool?`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `remove-pool-tag:${poolId}:${normalizedTag.toLowerCase()}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await removeTagFromPoolCandidates(poolId, normalizedTag);
      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      setSuccessMessage(`Removed "${normalizedTag}" from this pool.`);
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to remove tag from pool.");
    } finally {
      endAction(actionKey);
    }
  }

  async function handleEnrichPoolCandidatesFromSourceUrls(poolId) {
    const actionKey = `enrich-pool-candidates:${poolId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let shouldContinue = true;
      let lastData = null;

      while (shouldContinue) {
        const data = await enrichPoolCandidatesFromSourceUrls(poolId);
        lastData = data;
        setOpenPoolActionsMenuId(null);
        setOpenPoolMergeMenuId(null);

        const processedCount = data.meta?.processedCount || 0;
        const remainingCount = data.meta?.remainingCount || 0;
        const enrichedCount = data.meta?.enrichedCount || 0;
        const skippedCount = data.meta?.skippedCount || 0;
        const failedCount = data.meta?.failedCount || 0;

        setSuccessMessage(
          `Processed ${processedCount} candidate${
            processedCount === 1 ? "" : "s"
          }. Enriched ${enrichedCount} candidate${
            enrichedCount === 1 ? "" : "s"
          }. ${skippedCount} skipped.${failedCount > 0 ? ` ${failedCount} failed.` : ""}${
            remainingCount > 0
              ? ` ${remainingCount} candidate${remainingCount === 1 ? "" : "s"} still remain.`
              : ""
          }`
        );

        if (remainingCount <= 0 || processedCount <= 0) {
          shouldContinue = false;
          break;
        }

        shouldContinue = window.confirm(
          `Enrichment processed ${processedCount} candidates.\n\n${remainingCount} candidate${
            remainingCount === 1 ? "" : "s"
          } remain.\n\nContinue from where this pass left off?`
        );
      }

      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to enrich candidates from source URLs.");
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRemoveLowValueTagsFromPool(poolId, maxCandidateCount) {
    const threshold = Number(maxCandidateCount);

    if (!Number.isInteger(threshold) || threshold < 1) {
      setErrorMessage("Choose a valid minimum candidate count.");
      return;
    }

    const confirmed = window.confirm(
      `Remove every tag used by ${threshold} candidate${threshold === 1 ? "" : "s"} or fewer in this pool?`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `remove-low-value-tags:${poolId}:${threshold}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await removeLowValueTagsFromPoolCandidates(poolId, threshold);
      const removedTagCount = data.meta?.removedTagCount || 0;
      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      setSuccessMessage(
        removedTagCount > 0
          ? `Removed ${removedTagCount} low-value tag${removedTagCount === 1 ? "" : "s"}.`
          : "No tags matched that threshold."
      );
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to remove low-value tags from pool.");
    } finally {
      endAction(actionKey);
    }
  }

  return {
    closePoolImportModal,
    createPoolRecord,
    handleArchivePool,
    handleCopyPoolLink,
    handleEnrichPoolCandidatesFromSourceUrls,
    handleImportCandidatesIntoPool,
    handleMergePool,
    handleRemoveLowValueTagsFromPool,
    handleRemoveTagFromPool,
    handlePoolEditSubmit,
    handlePoolImportSubmit,
    handlePoolSubmit,
    openPoolEditor,
    savePoolInline
  };
}

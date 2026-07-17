"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SeedingModal } from "@/components/seeding-modal";
import {
  BracketStyleField,
  ParallelResultModeNotice,
  ResultModeField
} from "@/components/bracket-config-fields";
import { PoolWorkspaceSection } from "@/components/pool-workspace-section";
import {
  getTournamentAudienceMode,
  getTournamentAudiencePatch,
  PoolPublishWarning,
  TournamentPublishWarning
} from "@/components/create-panel-helpers";
import { TournamentWorkspaceSection } from "@/components/tournament-workspace-section";
import { useCandidateActions } from "@/components/use-candidate-actions";
import { useCreateWorkspaceData } from "@/components/use-create-workspace-data";
import { usePoolActions } from "@/components/use-pool-actions";
import { useSeedingActions } from "@/components/use-seeding-actions";
import { useTournamentActions } from "@/components/use-tournament-actions";
import { useTournamentSharingActions } from "@/components/use-tournament-sharing-actions";
import {
  usesBracketStyleForResultMode
} from "@/lib/bracket-modes";
import {
  favoritePool,
} from "@/lib/client-api/create-workspace";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: "",
  tagsText: ""
};

const emptyPoolForm = {
  name: "",
  description: "",
  visibility: "private"
};

const emptyPoolImportForm = {
  name: "",
  description: "",
  visibility: "private",
  text: ""
};

const emptyTournamentForm = {
  title: "",
  sourcePoolId: "",
  sharingMode: "private",
  visibility: "private",
  votingAccess: "signed_in_only",
  playStyle: "fixed_bracket",
  resultMode: "winner_only",
  tieBreakMode: "higher_seed_wins"
};

export function CreatePanels() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedPoolId, setExpandedPoolId] = useState(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isPoolImportModalOpen, setIsPoolImportModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [poolEditForm, setPoolEditForm] = useState(emptyPoolForm);
  const [candidateEditor, setCandidateEditor] = useState(null);
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [imageSuggestions, setImageSuggestions] = useState({});
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState({});
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState({});
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [poolImportForm, setPoolImportForm] = useState(emptyPoolImportForm);
  const [tournamentForm, setTournamentForm] = useState(emptyTournamentForm);
  const [poolInlineDrafts, setPoolInlineDrafts] = useState({});
  const [openPoolActionsMenuId, setOpenPoolActionsMenuId] = useState(null);
  const [openPoolMergeMenuId, setOpenPoolMergeMenuId] = useState(null);
  const [tournamentInlineDrafts, setTournamentInlineDrafts] = useState({});
  const [workspaceView, setWorkspaceView] = useState("tournaments");
  const [tournamentStageView, setTournamentStageView] = useState("draft");
  const [expandedDraftTournamentId, setExpandedDraftTournamentId] = useState("all");
  const [managedEntrantsTournamentId, setManagedEntrantsTournamentId] = useState(null);
  const [poolMenuTournamentId, setPoolMenuTournamentId] = useState(null);
  const [editingTournamentTitleId, setEditingTournamentTitleId] = useState(null);
  const [expandedBracketRules, setExpandedBracketRules] = useState({});
  const [recentlySavedBrackets, setRecentlySavedBrackets] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState({});
  const [isTransitionPending, startTransition] = useTransition();
  const tournamentCardRefs = useRef({});
  const poolCardRefs = useRef({});
  const actionSearchParamsHandledRef = useRef({
    favoritePoolId: null,
    makeBracketFromPoolId: null,
    newBracketPreset: null
  });
  const poolSearchScrollHandledRef = useRef(null);

  const {
    isWorkspacePending,
    loadFriendsTournamentMeta,
    loadWorkspace,
    poolDetails,
    pools,
    removeCandidateFromWorkspace,
    replaceTournamentInWorkspace,
    setTournamentShareLink,
    tournamentInvites,
    tournaments,
    tournamentShareLinks
  } = useCreateWorkspaceData({
    setErrorMessage,
    setExpandedPoolId
  });
  const isPending = isTransitionPending || isWorkspacePending;

  function beginAction(actionKey) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: true
    }));
  }

  function endAction(actionKey) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: false
    }));
  }

  function isActionPending(actionKey) {
    return Boolean(pendingActions[actionKey]);
  }

  const {
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
  } = useCandidateActions({
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
    removeCandidateFromWorkspace,
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
  });

  const {
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
  } = usePoolActions({
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
  });

  const {
    closeSeedingEditor,
    draggingEntryId,
    handleSeedDrop,
    handleSeedingSubmit,
    openSeedingEditor,
    savingSeeding,
    seedingEntries,
    seedingLoading,
    seedingTournament,
    setDraggingEntryId
  } = useSeedingActions({
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace
  });

  const {
    handleCopyShareLink,
    handleEnsureShareLink
  } = useTournamentSharingActions({
    tournaments,
    tournamentShareLinks,
    setTournamentShareLink,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage
  });

  const {
    createDraftBracket,
    createDraftBracketFromPool,
    handleArchiveTournament,
    handleCloseCurrentRound,
    handleRerunTournament,
    handleStartTournament,
    handleSyncTournamentWithPool,
    handleTournamentSubmit,
    updateTournamentInline
  } = useTournamentActions({
    router,
    tournamentForm,
    setTournamentForm,
    emptyTournamentForm,
    setIsTournamentModalOpen,
    tournaments,
    tournamentInlineDrafts,
    setTournamentInlineDrafts,
    setWorkspaceView,
    setTournamentStageView,
    setExpandedDraftTournamentId,
    setEditingTournamentTitleId,
    setRecentlySavedBrackets,
    replaceTournamentInWorkspace,
    tournamentCardRefs,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace
  });

  useEffect(() => {
    if (expandedPoolId && !pools.some((pool) => pool.id === expandedPoolId)) {
      setExpandedPoolId(null);
    }

    if (openPoolActionsMenuId && !pools.some((pool) => pool.id === openPoolActionsMenuId)) {
      setOpenPoolActionsMenuId(null);
    }

    if (openPoolMergeMenuId && !pools.some((pool) => pool.id === openPoolMergeMenuId)) {
      setOpenPoolMergeMenuId(null);
    }

    if (editingPool && !pools.some((pool) => pool.id === editingPool.id)) {
      setEditingPool(null);
    }
  }, [editingPool, expandedPoolId, openPoolActionsMenuId, openPoolMergeMenuId, pools]);

  useEffect(() => {
    if (editingTournamentTitleId && !tournaments.some((tournament) => tournament.id === editingTournamentTitleId)) {
      setEditingTournamentTitleId(null);
    }

    if (
      managedEntrantsTournamentId &&
      !tournaments.some((tournament) => tournament.id === managedEntrantsTournamentId)
    ) {
      setManagedEntrantsTournamentId(null);
    }

    if (poolMenuTournamentId && !tournaments.some((tournament) => tournament.id === poolMenuTournamentId)) {
      setPoolMenuTournamentId(null);
    }

    if (
      expandedDraftTournamentId !== "all" &&
      !tournaments.some((tournament) => tournament.id === expandedDraftTournamentId)
    ) {
      setExpandedDraftTournamentId("all");
    }
  }, [editingTournamentTitleId, expandedDraftTournamentId, managedEntrantsTournamentId, poolMenuTournamentId, tournaments]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setSuccessMessage("");
    }, 2200);

    return () => clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timer = setTimeout(() => {
      setErrorMessage("");
    }, 4200);

    return () => clearTimeout(timer);
  }, [errorMessage]);

  useEffect(() => {
    const friendsMetaCount = tournaments.filter(
      (tournament) =>
        tournament.sharingMode === "with_friends" &&
        (tournament.status === "draft" || tournament.status === "active")
    ).length;

    if (workspaceView !== "tournaments" || friendsMetaCount === 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      loadFriendsTournamentMeta(tournaments).catch(() => {
        // Keep the existing screen stable; the standard flash state handles explicit actions.
      });
    }, 10000);

    return () => clearInterval(timer);
  }, [workspaceView, tournaments]);

  useEffect(() => {
    const requestedView = searchParams?.get("view");

    if (requestedView === "pools" || requestedView === "tournaments") {
      setWorkspaceView(requestedView);
    }
  }, [searchParams]);

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    const missingLinks = tournaments.filter(
      (tournament) =>
        (tournament.status === "draft" || tournament.status === "active") &&
        tournament.sharingMode === "with_friends" &&
        !tournamentShareLinks[tournament.id]?.some((item) => item.active) &&
        !isActionPending(`share-link:${tournament.id}`)
    );

    if (missingLinks.length === 0) {
      return;
    }

    missingLinks.forEach((tournament) => {
      handleEnsureShareLink(tournament.id, { silent: true }).catch(() => {
        // Error handling stays in the action path.
      });
    });
  }, [workspaceView, tournaments, tournamentShareLinks]);

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    const requestedStage = searchParams?.get("stage");
    const requestedTournamentId = searchParams?.get("tournament");

    if (requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete") {
      setTournamentStageView(requestedStage);
    }

    if (!requestedTournamentId) {
      return;
    }

    const requestedTournament = tournaments.find((tournament) => tournament.id === requestedTournamentId);
    if (!requestedTournament) {
      return;
    }

    if (requestedTournament.status === "draft") {
      setTournamentStageView("draft");
      setExpandedDraftTournamentId(requestedTournament.id);
    } else if (requestedTournament.status === "active") {
      setTournamentStageView("active");
    } else if (requestedTournament.status === "complete") {
      setTournamentStageView("complete");
    }

    const timer = setTimeout(() => {
      tournamentCardRefs.current[requestedTournament.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [workspaceView, tournaments, searchParams]);

  useEffect(() => {
    if (workspaceView !== "pools") {
      return;
    }

    const requestedPoolId = searchParams?.get("pool");
    if (!requestedPoolId) {
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === requestedPoolId);
    if (!requestedPool) {
      return;
    }

    setExpandedPoolId(requestedPool.id);

    if (poolSearchScrollHandledRef.current === requestedPool.id) {
      return;
    }

    poolSearchScrollHandledRef.current = requestedPool.id;

    const timer = setTimeout(() => {
      poolCardRefs.current[requestedPool.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [workspaceView, pools, searchParams]);

  useEffect(() => {
    const requestedFavoritePoolId = searchParams?.get("favoritePool");

    if (!requestedFavoritePoolId) {
      return;
    }

    if (actionSearchParamsHandledRef.current.favoritePoolId === requestedFavoritePoolId) {
      return;
    }

    actionSearchParamsHandledRef.current.favoritePoolId = requestedFavoritePoolId;
    beginAction(`favorite-pool:${requestedFavoritePoolId}`);
    setErrorMessage("");
    setSuccessMessage("");

    startTransition(async () => {
      try {
        const data = await favoritePool(requestedFavoritePoolId);

        await loadWorkspace();
        setWorkspaceView("pools");
        setExpandedPoolId(data.item.id);
        setSuccessMessage(`Added ${data.item.name} to your pools.`);
        router.replace(`/create?view=pools&pool=${data.item.id}`);
      } catch (error) {
        actionSearchParamsHandledRef.current.favoritePoolId = null;
        setErrorMessage(error.message || "Failed to add pool to favorites.");
      } finally {
        endAction(`favorite-pool:${requestedFavoritePoolId}`);
      }
    });
  }, [router, searchParams, startTransition]);

  useEffect(() => {
    const requestedPoolId = searchParams?.get("makeBracketFromPool");

    if (!requestedPoolId || pools.length === 0) {
      return;
    }

    if (actionSearchParamsHandledRef.current.makeBracketFromPoolId === requestedPoolId) {
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === requestedPoolId);
    if (!requestedPool) {
      return;
    }

    actionSearchParamsHandledRef.current.makeBracketFromPoolId = requestedPoolId;

    startTransition(async () => {
      const createdBracket = await createDraftBracketFromPool(requestedPool);

      if (!createdBracket?.id) {
        actionSearchParamsHandledRef.current.makeBracketFromPoolId = null;
        return;
      }

      router.replace(`/create?view=tournaments&stage=draft&tournament=${createdBracket.id}`);
    });
  }, [pools, router, searchParams, startTransition]);

  useEffect(() => {
    const shouldOpenNewBracket = searchParams?.get("newBracket");

    if (!shouldOpenNewBracket) {
      return;
    }

    const presetKey = [
      shouldOpenNewBracket,
      searchParams?.get("sharingMode") || "",
      searchParams?.get("visibility") || "",
      searchParams?.get("resultMode") || ""
    ].join("|");

    if (actionSearchParamsHandledRef.current.newBracketPreset === presetKey) {
      return;
    }

    actionSearchParamsHandledRef.current.newBracketPreset = presetKey;

    setWorkspaceView("tournaments");
    setTournamentStageView("draft");
    setExpandedDraftTournamentId("all");
    setTournamentForm((current) => ({
      ...current,
      sharingMode: searchParams?.get("sharingMode") || current.sharingMode,
      visibility: searchParams?.get("visibility") || current.visibility,
      resultMode: searchParams?.get("resultMode") || current.resultMode
    }));
    setIsTournamentModalOpen(true);
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <FlashMessages errorMessage={errorMessage} successMessage={successMessage} />

      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid gap-px border-b border-[var(--line)] bg-[var(--line)] md:grid-cols-2">
          <button
            type="button"
            onClick={() => setWorkspaceView("tournaments")}
            className={`px-5 py-4 text-left transition ${
              workspaceView === "tournaments"
                ? "border-l-4 border-[var(--accent-2)] bg-[var(--panel)] md:border-b-2 md:border-l-0"
                : "border-l-4 border-transparent bg-[var(--panel)] hover:bg-[var(--panel-2)] md:border-b-2"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Brackets ({tournaments.length})</p>
            <p
              className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"
            >
              Build brackets and manage rounds
            </p>
          </button>
          <button
            type="button"
            onClick={() => setWorkspaceView("pools")}
            className={`px-5 py-4 text-left transition ${
              workspaceView === "pools"
                ? "border-l-4 border-[var(--accent-2)] bg-[var(--panel)] md:border-b-2 md:border-l-0"
                : "border-l-4 border-transparent bg-[var(--panel)] hover:bg-[var(--panel-2)] md:border-b-2"
            }`}
          >
            <p className="display-face text-lg font-black uppercase">Pools ({pools.length})</p>
            <p
              className="mt-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]"
            >
              Build and edit candidate sets
            </p>
          </button>
        </div>
      </section>

      {workspaceView === "pools" ? (
        <PoolWorkspaceSection
          pools={pools}
          poolDetails={poolDetails}
          expandedPoolId={expandedPoolId}
          poolInlineDrafts={poolInlineDrafts}
          candidateDrafts={candidateDrafts}
          candidateEditor={candidateEditor}
          imageSuggestions={imageSuggestions}
          imageSuggestionLoading={imageSuggestionLoading}
          openPoolActionsMenuId={openPoolActionsMenuId}
          openPoolMergeMenuId={openPoolMergeMenuId}
          emptyCandidateForm={emptyCandidateForm}
          isActionPending={isActionPending}
          onCreatePool={() => createPoolRecord()}
          onOpenImport={() => setIsPoolImportModalOpen(true)}
          onCreateBracketFromPool={createDraftBracketFromPool}
          onSavePool={savePoolInline}
          onPatchPoolDraft={(poolId, patch) =>
            setPoolInlineDrafts((current) => ({
              ...current,
              [poolId]: patch
            }))
          }
          onSetExpandedPoolId={setExpandedPoolId}
          onSetOpenPoolActionsMenuId={setOpenPoolActionsMenuId}
          onSetOpenPoolMergeMenuId={setOpenPoolMergeMenuId}
          onCopyPoolLink={handleCopyPoolLink}
          onAutoFillMissingImages={handleAutoFillMissingImages}
          onEnrichPoolCandidatesFromSourceUrls={handleEnrichPoolCandidatesFromSourceUrls}
          onMergePool={handleMergePool}
          onRemoveLowValueTagsFromPool={handleRemoveLowValueTagsFromPool}
          onRemoveTagFromPool={handleRemoveTagFromPool}
          onArchivePool={handleArchivePool}
          updateCandidateDraft={updateCandidateDraft}
          openCandidateCreator={openCandidateCreator}
          handleImportCandidatesIntoPool={handleImportCandidatesIntoPool}
          handleCandidateEditSubmit={handleCandidateEditSubmit}
          handleCreateCandidateInPool={handleCreateCandidateInPool}
          closeCandidateEditor={closeCandidateEditor}
          handleSuggestImages={handleSuggestImages}
          selectSuggestedImage={selectSuggestedImage}
          openCandidateEditor={openCandidateEditor}
          handleRemoveCandidateFromPool={handleRemoveCandidateFromPool}
          poolCardRefs={poolCardRefs}
        />
      ) : null}

      {workspaceView === "tournaments" ? (
        <TournamentWorkspaceSection
          tournaments={tournaments}
          tournamentStageView={tournamentStageView}
          setTournamentStageView={setTournamentStageView}
          tournamentInlineDrafts={tournamentInlineDrafts}
          setTournamentInlineDrafts={setTournamentInlineDrafts}
          expandedDraftTournamentId={expandedDraftTournamentId}
          setExpandedDraftTournamentId={setExpandedDraftTournamentId}
          managedEntrantsTournamentId={managedEntrantsTournamentId}
          setManagedEntrantsTournamentId={setManagedEntrantsTournamentId}
          poolMenuTournamentId={poolMenuTournamentId}
          setPoolMenuTournamentId={setPoolMenuTournamentId}
          editingTournamentTitleId={editingTournamentTitleId}
          setEditingTournamentTitleId={setEditingTournamentTitleId}
          expandedBracketRules={expandedBracketRules}
          setExpandedBracketRules={setExpandedBracketRules}
          recentlySavedBrackets={recentlySavedBrackets}
          tournamentInvites={tournamentInvites}
          tournamentShareLinks={tournamentShareLinks}
          tournamentCardRefs={tournamentCardRefs}
          pools={pools}
          poolDetails={poolDetails}
          candidateDrafts={candidateDrafts}
          candidateEditor={candidateEditor}
          imageSuggestions={imageSuggestions}
          imageSuggestionLoading={imageSuggestionLoading}
          emptyCandidateForm={emptyCandidateForm}
          isActionPending={isActionPending}
          createDraftBracket={createDraftBracket}
          createPoolRecord={createPoolRecord}
          handleSyncTournamentWithPool={handleSyncTournamentWithPool}
          openSeedingEditor={openSeedingEditor}
          updateCandidateDraft={updateCandidateDraft}
          openCandidateCreator={openCandidateCreator}
          handleImportCandidatesIntoPool={handleImportCandidatesIntoPool}
          handleCandidateEditSubmit={handleCandidateEditSubmit}
          handleCreateCandidateInPool={handleCreateCandidateInPool}
          closeCandidateEditor={closeCandidateEditor}
          handleSuggestImages={handleSuggestImages}
          selectSuggestedImage={selectSuggestedImage}
          openCandidateEditor={openCandidateEditor}
          handleRemoveCandidateFromPool={handleRemoveCandidateFromPool}
          handleCopyShareLink={handleCopyShareLink}
          handleStartTournament={handleStartTournament}
          handleArchiveTournament={handleArchiveTournament}
          updateTournamentInline={updateTournamentInline}
          handleCloseCurrentRound={handleCloseCurrentRound}
          handleRerunTournament={handleRerunTournament}
        />
      ) : null}

      {isPoolModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">New Pool</h2>
              <button
                type="button"
                onClick={() => {
                  setIsPoolModalOpen(false);
                  setPoolForm(emptyPoolForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handlePoolSubmit}>
                <input
                  value={poolForm.name}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolForm.description}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Pool description"
                  rows={3}
                  className="ui-field ui-field-modal"
                />
                <select
                  value={poolForm.visibility}
                  onChange={(event) =>
                    setPoolForm((current) => ({ ...current, visibility: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolForm.visibility} />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending || isActionPending("create-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("create-pool") ? "Adding" : "Add Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPoolModalOpen(false);
                      setPoolForm(emptyPoolForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isPoolImportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                  Import Pool
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  Paste source text and seed a pool with extracted candidates
                </p>
              </div>
              <button
                type="button"
                onClick={closePoolImportModal}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-4" onSubmit={handlePoolImportSubmit}>
                <input
                  value={poolImportForm.name}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolImportForm.description}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder="Pool description"
                  rows={2}
                  className="ui-field ui-field-modal"
                />
                <select
                  value={poolImportForm.visibility}
                  onChange={(event) =>
                    setPoolImportForm((current) => ({
                      ...current,
                      visibility: event.target.value
                    }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolImportForm.visibility} />
                <div className="space-y-2">
                  <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                    Source Text
                  </p>
                  <textarea
                    value={poolImportForm.text}
                    onChange={(event) =>
                      setPoolImportForm((current) => ({ ...current, text: event.target.value }))
                    }
                    placeholder="Paste the source text, notes, article excerpt, or scraped content here."
                    rows={14}
                    className="ui-field ui-field-modal"
                  />
                  <p className="text-xs leading-5 text-[var(--muted)]">
                    The importer will extract distinct candidate names from this text and create
                    a seeded pool.
                  </p>
                </div>
                <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3">
                  <p className="text-sm leading-6 text-[var(--muted)]">
                    Or use a bookmarklet to build a pool from a web page.{" "}
                    <Link href="/tools/import" className="text-[var(--accent-3)] underline">
                      Set up page import
                    </Link>
                    .
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isPending || isActionPending("import-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("import-pool") ? "Importing" : "Build Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={closePoolImportModal}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isTournamentModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-2xl border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                New Bracket
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsTournamentModalOpen(false);
                  setTournamentForm(emptyTournamentForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handleTournamentSubmit}>
                <input
                  value={tournamentForm.title}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="Bracket title"
                  className="ui-field ui-field-modal"
                />
                <select
                  value={tournamentForm.sourcePoolId}
                  onChange={(event) =>
                    setTournamentForm((current) => ({ ...current, sourcePoolId: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="">Choose source pool</option>
                  {pools.map((pool) => (
                    <option key={pool.id} value={pool.id}>
                      {pool.name}
                    </option>
                  ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="block space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Bracket Access
                    </p>
                    <select
                      aria-label="Bracket Access"
                      value={getTournamentAudienceMode(tournamentForm)}
                      onChange={(event) => {
                        const audiencePatch = getTournamentAudiencePatch(event.target.value);
                        setTournamentForm((current) => ({
                          ...current,
                          ...audiencePatch
                        }));
                      }}
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="private">Private</option>
                      <option value="with_friends">Friends</option>
                      <option value="public_listed">Public</option>
                      <option value="public_unlisted">Public Unlisted</option>
                    </select>
                  </div>
                  <div className="block">
                    <select
                      aria-label="Voting Access"
                      value={tournamentForm.votingAccess}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          votingAccess: event.target.value
                        }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="signed_in_only">Signed-In Voting</option>
                      <option value="anyone">Anyone Can Vote</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <TournamentPublishWarning visibility={tournamentForm.visibility} />
                  </div>
                  {usesBracketStyleForResultMode(tournamentForm.resultMode) ? (
                  <BracketStyleField
                    value={tournamentForm.playStyle}
                    onChange={(playStyle) =>
                      setTournamentForm((current) => ({ ...current, playStyle }))
                    }
                    className="ui-field ui-field-modal ui-field-select"
                  />
                  ) : null}
                  <ResultModeField
                    value={tournamentForm.resultMode}
                    onChange={(resultMode) =>
                      setTournamentForm((current) => ({ ...current, resultMode }))
                    }
                    className="ui-field ui-field-modal ui-field-select"
                  />
                  <ParallelResultModeNotice resultMode={tournamentForm.resultMode} />
                  <div className="block space-y-2">
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      <span className="pointer-events-none">Tie Break</span>
                      <button
                        type="button"
                        title="Decides who advances if a round is closed without a clear vote winner."
                        className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
                      >
                        ?
                      </button>
                    </div>
                    <select
                      aria-label="Tie Break"
                      value={tournamentForm.tieBreakMode}
                      onChange={(event) =>
                        setTournamentForm((current) => ({
                          ...current,
                          tieBreakMode: event.target.value
                        }))
                      }
                      className="ui-field ui-field-modal ui-field-select"
                    >
                      <option value="higher_seed_wins">Higher Seed Wins</option>
                      <option value="random">Random</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={
                      isPending ||
                      isActionPending("create-tournament") ||
                      isActionPending("create-parallel-tournament")
                    }
                    className="ui-button ui-button-primary"
                  >
                    {isActionPending("create-tournament") || isActionPending("create-parallel-tournament")
                      ? "Creating"
                      : "Create Bracket"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTournamentModalOpen(false);
                      setTournamentForm(emptyTournamentForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {editingPool ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg border border-[var(--line)] bg-[var(--panel)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
                Edit Pool
              </h2>
              <button
                type="button"
                onClick={() => {
                  setEditingPool(null);
                  setPoolEditForm(emptyPoolForm);
                }}
                className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
              >
                Close
              </button>
            </div>
            <div className="px-5 py-5">
              <form className="space-y-3" onSubmit={handlePoolEditSubmit}>
                <input
                  value={poolEditForm.name}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Pool name"
                  className="ui-field ui-field-modal"
                />
                <textarea
                  value={poolEditForm.description}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({
                      ...current,
                      description: event.target.value
                    }))
                  }
                  placeholder="Pool description"
                  rows={3}
                  className="ui-field ui-field-modal"
                />
                <select
                  value={poolEditForm.visibility}
                  onChange={(event) =>
                    setPoolEditForm((current) => ({ ...current, visibility: event.target.value }))
                  }
                  className="ui-field ui-field-modal ui-field-select"
                >
                  <option value="private">Private Draft</option>
                  <option value="public_listed">Publish</option>
                  <option value="public_unlisted">Publish Unlisted</option>
                </select>
                <PoolPublishWarning visibility={poolEditForm.visibility} />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isActionPending("save-pool")}
                    className="ui-button ui-button-accent-fill"
                  >
                    {isActionPending("save-pool") ? "Saving" : "Save Pool"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPool(null);
                      setPoolEditForm(emptyPoolForm);
                    }}
                    className="ui-button ui-button-muted"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      <SeedingModal
        tournament={seedingTournament}
        entries={seedingEntries}
        loading={seedingLoading}
        saving={savingSeeding}
        draggingEntryId={draggingEntryId}
        onClose={closeSeedingEditor}
        onSubmit={handleSeedingSubmit}
        onDragStart={setDraggingEntryId}
        onDragEnd={() => setDraggingEntryId(null)}
        onDrop={handleSeedDrop}
      />

    </div>
  );
}

function FlashMessages({ errorMessage, successMessage }) {
  if (!errorMessage && !successMessage) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 sm:left-auto sm:right-4 sm:w-full sm:max-w-sm">
      {errorMessage ? (
        <p className="pointer-events-auto border border-[var(--accent)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-2)] shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="pointer-events-auto border border-[var(--accent-3)] bg-[var(--panel-3)] px-4 py-3 text-sm text-[var(--accent-3)] shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
          {successMessage}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BracketCreationWizard } from "@/components/brackets/configuration/bracket-creation-wizard";
import { SeedingModal } from "@/components/brackets/configuration/seeding-modal";
import { PoolWorkspaceSection } from "@/components/workspace/pool-workspace-section";
import {
  getTournamentAudienceMode,
  getTournamentAudiencePatch,
  TournamentPublishWarning
} from "@/components/brackets/shared/bracket-presentation";
import { PoolPublishWarning } from "@/components/pools/shared/pool-presentation";
import { TournamentWorkspaceSection } from "@/components/workspace/tournament-workspace-section";
import { useCandidateActions } from "@/components/workspace/use-candidate-actions";
import { useCreateWorkspaceData } from "@/components/workspace/use-create-workspace-data";
import { usePoolActions } from "@/components/workspace/use-pool-actions";
import { useSeedingActions } from "@/components/brackets/configuration/use-seeding-actions";
import { useTournamentActions } from "@/components/workspace/use-tournament-actions";
import { useTournamentSharingActions } from "@/components/workspace/use-tournament-sharing-actions";
import { useWorkspaceNavigation } from "@/components/workspace/use-workspace-navigation";
import { useWorkspaceRouteSelection } from "@/components/workspace/use-workspace-route-selection";
import { useWorkspaceShareLink } from "@/components/workspace/use-workspace-share-link";
import { useWorkspaceRouteActions } from "@/components/workspace/use-workspace-route-actions";
import { useWorkspacePoolHydration } from "@/components/workspace/use-workspace-pool-hydration";
import { useWorkspaceBracketHydration } from "@/components/workspace/use-workspace-bracket-hydration";
import { WorkspaceSectionTabs } from "@/components/navigation/workspace-section-tabs";
import {
  createPool
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

export function CreatePanels({ workspaceView: routeWorkspaceView = "tournaments", initialPoolId = null, initialPool = null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedPoolId, setExpandedPoolId] = useState(initialPoolId);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isPoolImportModalOpen, setIsPoolImportModalOpen] = useState(false);
  const [isBracketWizardOpen, setIsBracketWizardOpen] = useState(false);
  const [isBracketWizardCreating, setIsBracketWizardCreating] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [poolEditForm, setPoolEditForm] = useState(emptyPoolForm);
  const [candidateEditor, setCandidateEditor] = useState(null);
  const [candidateDrafts, setCandidateDrafts] = useState({});
  const [imageSuggestions, setImageSuggestions] = useState({});
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState({});
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState({});
  const [poolForm, setPoolForm] = useState(emptyPoolForm);
  const [poolImportForm, setPoolImportForm] = useState(emptyPoolImportForm);
  const [poolInlineDrafts, setPoolInlineDrafts] = useState({});
  const [openPoolActionsMenuId, setOpenPoolActionsMenuId] = useState(null);
  const [openPoolMergeMenuId, setOpenPoolMergeMenuId] = useState(null);
  const [tournamentInlineDrafts, setTournamentInlineDrafts] = useState({});
  const workspaceView = routeWorkspaceView;
  const [tournamentStageView, setTournamentStageViewState] = useState(() => {
    const requestedStage = searchParams?.get("stage");
    return requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete"
      ? requestedStage
      : "draft";
  });
  const [selectedLiveTournamentId, setSelectedLiveTournamentId] = useState(null);
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

  const {
    isWorkspacePending,
    loadWorkspace,
    ensurePoolDetails,
    ensurePoolInWorkspace,
    ensureTournamentWorkspaceDetails,
    poolDetails,
    tournamentPage,
    tournamentPagination,
    tournamentStatusCounts,
    poolPage,
    poolPagination,
    pools,
    refreshTournamentMatches,
    removeCandidateFromWorkspace,
    replaceCandidateInWorkspace,
    replacePoolInWorkspace,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    setPoolPage,
    setTournamentPage,
    setTournamentShareLink,
    tournamentInvites,
    tournamentMatches,
    tournaments,
    tournamentShareLinks
  } = useCreateWorkspaceData({
    setErrorMessage,
    setExpandedPoolId,
    workspaceView,
    tournamentStage: tournamentStageView,
    initialPool
  });
  const isPending = isTransitionPending || isWorkspacePending;
  const { openPool, setTournamentStageView, setWorkspaceView } = useWorkspaceNavigation({
    router,
    setTournamentPage,
    setTournamentStageViewState
  });
  useWorkspaceRouteSelection({
    ensurePoolInWorkspace,
    initialPoolId,
    openPool,
    poolCardRefs,
    pools,
    searchParams,
    setErrorMessage,
    setExpandedDraftTournamentId,
    setExpandedPoolId,
    setTournamentStageViewState,
    tournamentCardRefs,
    tournaments,
    workspaceView
  });

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
    tournamentPage,
    tournamentPagination,
    tournamentStatusCounts,
    removeCandidateFromWorkspace,
    replaceCandidateInWorkspace,
    replacePoolInWorkspace,
    setExpandedPoolId: openPool,
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
    setExpandedPoolId: openPool,
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
    addSeedingSubBracket,
    closeSeedingEditor,
    createSubBracketAndMoveEntry,
    draggingEntryId,
    handleSeedDropIntoGroup,
    handleSeedDrop,
    handleSeedingSubmit,
    moveEntryIntoGroup,
    openSeedingEditor,
    removeFromPlayInAtIndex,
    removeSeedingSubBracket,
    seedingAutosaveState,
    seedingSaveError,
    savingSeeding,
    seedingEntries,
    seedingGroups,
    seedingLoading,
    seedingMoveTargets,
    seedingTournament,
    renameSeedingSubBracket,
    setDraggingEntryId,
    toggleSeedingSubBracket,
    togglePlayInAtIndex
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
    setPoolPage,
    setTournamentPage,
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
    handleOpenNextRound,
    handleRerunTournament,
    handleSetManualMatchWinner,
    handleStartTournament,
    handleSyncTournamentWithPool,
    updateTournamentInline
  } = useTournamentActions({
    router,
    tournaments,
    tournamentInlineDrafts,
    setTournamentInlineDrafts,
    setWorkspaceView,
    setTournamentStageView,
    setExpandedDraftTournamentId,
    setEditingTournamentTitleId,
    setRecentlySavedBrackets,
    refreshTournamentMatches,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    tournamentCardRefs,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace
  });
  useWorkspaceRouteActions({
    beginAction,
    createDraftBracket,
    createDraftBracketFromPool,
    createPoolRecord,
    endAction,
    loadWorkspace,
    openPool,
    openSeedingEditor,
    pools,
    router,
    searchParams,
    setErrorMessage,
    setExpandedDraftTournamentId,
    setSuccessMessage,
    setTournamentStageView,
    setWorkspaceView,
    startTransition,
    tournaments
  });
  useWorkspacePoolHydration({
    ensurePoolDetails,
    expandedPoolId,
    setErrorMessage,
    workspaceView
  });
  useWorkspaceBracketHydration({
    ensurePoolDetails,
    ensureTournamentWorkspaceDetails,
    expandedDraftTournamentId,
    selectedLiveTournamentId,
    setErrorMessage,
    tournamentInlineDrafts,
    tournamentStageView,
    tournaments,
    workspaceView
  });
  useWorkspaceShareLink({
    expandedDraftTournamentId,
    handleEnsureShareLink,
    isActionPending,
    selectedLiveTournamentId,
    tournamentShareLinks,
    tournamentStageView,
    tournaments,
    workspaceView
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












  async function handleCreateBracketFromWizard({
    title,
    source,
    playStyle,
    resultMode,
    advancementMode,
    tieBreakMode,
    seedingMode,
    seedCandidateIds,
    audienceMode
  }) {
    if (isBracketWizardCreating) {
      return null;
    }

    setIsBracketWizardCreating(true);

    try {
      const pool = source.type === "existing"
        ? source.pool
        : (await createPool({
            name: source.name,
            description: null,
            visibility: "private",
            source: {
              type: "items",
              items: source.candidates.map(({ name, description, imageUrl, tags }) => ({
                name,
                description,
                imageUrl,
                tags
              }))
            }
          })).item;

      const audience = audienceMode === "friends"
        ? { sharingMode: "with_friends", visibility: "private", votingAccess: "signed_in_only" }
        : audienceMode === "public"
          ? { sharingMode: "private", visibility: "public_listed", votingAccess: "anyone" }
          : { sharingMode: "private", visibility: "private", votingAccess: "signed_in_only" };
      const bracket = await createDraftBracket({
        title: title || `${pool.name} Bracket`,
        sourcePoolId: pool.id,
        playStyle,
        resultMode,
        advancementMode,
        tieBreakMode,
        seedCandidateIds: seedingMode === "custom" ? seedCandidateIds : undefined,
        ...audience
      });

      if (bracket) {
        setIsBracketWizardOpen(false);
      }

      return bracket;
    } catch (error) {
      setErrorMessage(error.message || "Failed to create bracket.");
      return null;
    } finally {
      setIsBracketWizardCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <FlashMessages errorMessage={errorMessage} successMessage={successMessage} />

      <WorkspaceSectionTabs activeView={workspaceView} />

      {workspaceView === "pools" ? (
        <PoolWorkspaceSection
          pools={pools}
          poolDetails={poolDetails}
          poolPage={poolPage}
          isLoadingPools={isWorkspacePending}
          poolPagination={poolPagination}
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
          onCreateBracketFromPool={(pool) => router.push(`/brackets/configuration?poolId=${pool.id}&step=structure`)}
          onUsePoolForBracket={searchParams?.get("fromBracketSetup") === "1" ? (pool) => router.push(`/brackets/configuration?poolId=${pool.id}`) : null}
          onSavePool={savePoolInline}
          onPatchPoolDraft={(poolId, patch) =>
            setPoolInlineDrafts((current) => ({
              ...current,
              [poolId]: patch
            }))
          }
          onCommitPoolDraft={(poolId, draft) => {
            setPoolInlineDrafts((current) => ({
              ...current,
              [poolId]: draft
            }));
            return savePoolInline(poolId, draft);
          }}
          onLoadMorePools={() => setPoolPage((current) => current + 1)}
          onSetExpandedPoolId={openPool}
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
          tournamentPage={tournamentPage}
          tournamentPagination={tournamentPagination}
          tournamentStatusCounts={tournamentStatusCounts}
          setTournamentPage={setTournamentPage}
          isLoadingBrackets={isWorkspacePending}
          setTournamentStageView={setTournamentStageView}
          selectedLiveTournamentId={selectedLiveTournamentId}
          setSelectedLiveTournamentId={setSelectedLiveTournamentId}
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
          onOpenBracketWizard={() => router.push("/brackets/configuration")}
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
          handleOpenNextRound={handleOpenNextRound}
          handleRerunTournament={handleRerunTournament}
          handleSetManualMatchWinner={handleSetManualMatchWinner}
          tournamentMatches={tournamentMatches}
        />
      ) : null}

      {isBracketWizardOpen ? (
        <BracketCreationWizard
          pools={pools}
          creating={isBracketWizardCreating}
          onCancel={() => setIsBracketWizardOpen(false)}
          onCreate={handleCreateBracketFromWizard}
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
        groups={seedingGroups}
        loading={seedingLoading}
        moveTargets={seedingMoveTargets}
        autosaveState={seedingAutosaveState}
        autosaveError={seedingSaveError}
        saving={savingSeeding}
        draggingEntryId={draggingEntryId}
        onAddSubBracket={addSeedingSubBracket}
        onCreateSubBracketAndMoveEntry={createSubBracketAndMoveEntry}
        onTogglePlayInAtIndex={togglePlayInAtIndex}
        onRemoveFromPlayInAtIndex={removeFromPlayInAtIndex}
        onRemoveSubBracket={removeSeedingSubBracket}
        onClose={closeSeedingEditor}
        onSubmit={handleSeedingSubmit}
        onDragStart={setDraggingEntryId}
        onDragEnd={() => setDraggingEntryId(null)}
        onDrop={handleSeedDrop}
        onDropIntoGroup={handleSeedDropIntoGroup}
        onMoveEntryIntoGroup={moveEntryIntoGroup}
        onRenameSubBracket={renameSeedingSubBracket}
        onToggleSubBracket={toggleSeedingSubBracket}
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








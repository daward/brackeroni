"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { BracketCreationWizard, SeedingModal, useSeedingActions } from "@/components/brackets/configuration";
import { getTournamentAudienceMode, getTournamentAudiencePatch } from "./presentation";
import { TournamentPublishWarning } from "@/components/brackets/shared";
import { usePoolCandidateActions } from "@/components/pools/shared";
import { WorkspaceSectionTabs } from "@/components/navigation/workspace-section-tabs";
import { ToastMessages } from "@/components/shared";
import { createPool } from "@/lib/client-api/create-workspace";
import type { BracketCreationInput } from "@/components/brackets/configuration";
import type { BracketSharingMode, BracketVisibility } from "@/lib/brackets/types";
import type { PoolSelectionOption } from "@/lib/pools/types";
import { TournamentWorkspaceSection } from "./tournament-workspace-section";
import { useBracketManagementData } from "./use-bracket-management-data";
import { useBracketManagementHydration } from "./use-bracket-management-hydration";
import { useBracketManagementNavigation } from "./use-bracket-management-navigation";
import { useBracketPoolActions } from "./use-bracket-pool-actions";
import { useBracketRouteActions } from "./use-bracket-route-actions";
import { useBracketRouteSelection } from "./use-bracket-route-selection";
import { useBracketShareLink } from "./use-bracket-share-link";
import { useTournamentActions } from "./use-tournament-actions";
import { useTournamentSharingActions } from "./use-tournament-sharing-actions";
import type {
  ActionState,
  BracketStageView,
  CandidateDrafts,
  CandidateEditorState,
  ImageSuggestionLoadingState,
  ImageSuggestionState,
  PoolInlineDrafts,
  TournamentDrafts,
} from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: "",
  tagsText: "",
};

export function BracketManagementWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isBracketWizardOpen, setIsBracketWizardOpen] = useState(false);
  const [isBracketWizardCreating, setIsBracketWizardCreating] = useState(false);
  const [candidateEditor, setCandidateEditor] = useState<CandidateEditorState>(null);
  const [candidateDrafts, setCandidateDrafts] = useState<CandidateDrafts>({});
  const [imageSuggestions, setImageSuggestions] = useState<ImageSuggestionState>({});
  const [imageSuggestionLoading, setImageSuggestionLoading] = useState<ImageSuggestionLoadingState>({});
  const [imageSuggestionQuery, setImageSuggestionQuery] = useState<Record<string, string>>({});
  const [poolInlineDrafts, setPoolInlineDrafts] = useState<PoolInlineDrafts>({});
  const [openPoolActionsMenuId, setOpenPoolActionsMenuId] = useState<string | null>(null);
  const [openPoolMergeMenuId, setOpenPoolMergeMenuId] = useState<string | null>(null);
  const [tournamentInlineDrafts, setTournamentInlineDrafts] = useState<TournamentDrafts>({});
  const [tournamentStageView, setTournamentStageViewState] = useState<BracketStageView>(() => {
    const requestedStage = searchParams?.get("stage");
    return requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete" ? requestedStage : "draft";
  });
  const [selectedLiveTournamentId, setSelectedLiveTournamentId] = useState<string | null>(null);
  const [expandedDraftTournamentId, setExpandedDraftTournamentId] = useState<string | "all" | null>("all");
  const [managedEntrantsTournamentId, setManagedEntrantsTournamentId] = useState<string | null>(null);
  const [poolMenuTournamentId, setPoolMenuTournamentId] = useState<string | null>(null);
  const [editingTournamentTitleId, setEditingTournamentTitleId] = useState<string | null>(null);
  const [expandedBracketRules, setExpandedBracketRules] = useState<Record<string, boolean>>({});
  const [recentlySavedBrackets, setRecentlySavedBrackets] = useState<Record<string, boolean>>({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState<ActionState>({});
  const [isTransitionPending, startTransition] = useTransition();
  const tournamentCardRefs = useRef({});

  const {
    isWorkspacePending,
    loadWorkspace,
    ensurePoolDetails,
    ensureTournamentWorkspaceDetails,
    poolDetails,
    tournamentPage,
    tournamentPagination,
    tournamentStatusCounts,
    pools,
    refreshTournamentMatches,
    removeCandidateFromWorkspace,
    replaceCandidateInWorkspace,
    replacePoolInWorkspace,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    showCachedTournamentStage,
    setTournamentPage,
    setTournamentShareLink,
    tournamentInvites,
    tournamentMatches,
    tournaments,
    loadedTournamentStage,
    tournamentShareLinks,
  } = useBracketManagementData({
    setErrorMessage,
    tournamentStage: tournamentStageView,
  });
  const isPending = isTransitionPending || isWorkspacePending;
  const { openPool, setTournamentStageView, setWorkspaceView } = useBracketManagementNavigation({
    router,
    setTournamentPage,
    setTournamentStageViewState,
    showCachedTournamentStage,
  });
  useBracketRouteSelection({
    searchParams,
    setExpandedDraftTournamentId,
    setTournamentStageViewState,
    tournamentCardRefs,
    tournaments,
  });

  function beginAction(actionKey: string) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: true,
    }));
  }

  function endAction(actionKey: string) {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: false,
    }));
  }

  function isActionPending(actionKey: string) {
    return Boolean(pendingActions[actionKey]);
  }

  const {
    closeCandidateEditor,
    handleCandidateEditSubmit,
    handleCreateCandidateInPool,
    handleRemoveCandidateFromPool,
    handleSuggestImages,
    openCandidateCreator,
    openCandidateEditor,
    selectSuggestedImage,
    updateCandidateDraft,
  } = usePoolCandidateActions({
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
    setOpenPoolActionsMenuId,
    setOpenPoolMergeMenuId,
  });

  const { createPoolRecord, handleImportCandidatesIntoPool } = useBracketPoolActions({
    router,
    setPoolInlineDrafts,
    setWorkspaceView,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace,
  });
  const {
    addSeedingSubBracket,
    closeSeedingEditor,
    createSubBracketAndMoveEntry,
    draggingEntryId,
    handleSeedDropIntoGroup,
    handleSeedingSubmit,
    moveEntryIntoGroup,
    openSeedingEditor,
    removeFromPlayInAtIndex,
    removeSeedingSubBracket,
    seedingAutosaveState,
    seedingSaveError,
    seedingGroups,
    seedingLoading,
    seedingMoveTargets,
    seedingTournament,
    renameSeedingSubBracket,
    setDraggingEntryId,
    toggleSeedingSubBracket,
    togglePlayInAtIndex,
  } = useSeedingActions({
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace,
  });

  const { handleCopyShareLink, handleEnsureShareLink } = useTournamentSharingActions({
    tournaments,
    tournamentShareLinks,
    setTournamentShareLink,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage,
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
    updateTournamentInline,
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
    loadWorkspace,
  });
  useBracketRouteActions({
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
    tournaments,
  });
  useBracketManagementHydration({
    ensurePoolDetails,
    ensureTournamentWorkspaceDetails,
    expandedDraftTournamentId,
    selectedLiveTournamentId,
    setErrorMessage,
    tournamentInlineDrafts,
    tournamentStageView,
    tournaments,
  });
  useBracketShareLink({
    expandedDraftTournamentId,
    handleEnsureShareLink,
    isActionPending,
    selectedLiveTournamentId,
    tournamentShareLinks,
    tournamentStageView,
    tournaments,
  });

  useEffect(() => {
    if (openPoolActionsMenuId && !pools.some((pool) => pool.id === openPoolActionsMenuId)) {
      setOpenPoolActionsMenuId(null);
    }

    if (openPoolMergeMenuId && !pools.some((pool) => pool.id === openPoolMergeMenuId)) {
      setOpenPoolMergeMenuId(null);
    }
  }, [openPoolActionsMenuId, openPoolMergeMenuId, pools]);

  useEffect(() => {
    if (editingTournamentTitleId && !tournaments.some((tournament) => tournament.id === editingTournamentTitleId)) {
      setEditingTournamentTitleId(null);
    }

    if (managedEntrantsTournamentId && !tournaments.some((tournament) => tournament.id === managedEntrantsTournamentId)) {
      setManagedEntrantsTournamentId(null);
    }

    if (poolMenuTournamentId && !tournaments.some((tournament) => tournament.id === poolMenuTournamentId)) {
      setPoolMenuTournamentId(null);
    }

    if (expandedDraftTournamentId !== "all" && !tournaments.some((tournament) => tournament.id === expandedDraftTournamentId)) {
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
    audienceMode,
  }: BracketCreationInput) {
    if (isBracketWizardCreating) {
      return null;
    }

    setIsBracketWizardCreating(true);

    try {
      const pool =
        source.type === "existing"
          ? source.pool
          : (
              await createPool({
                name: source.name,
                description: null,
                visibility: "private",
                source: {
                  type: "items",
                  items: source.candidates.map(({ name, description, imageUrl, tags }) => ({
                    name,
                    description,
                    imageUrl,
                    tags,
                  })),
                },
              })
            ).item;

      const audience: { sharingMode: BracketSharingMode; visibility: BracketVisibility; votingAccess: string } =
        audienceMode === "friends"
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
        ...audience,
      });

      if (bracket) {
        setIsBracketWizardOpen(false);
      }

      return bracket;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create bracket."));
      return null;
    } finally {
      setIsBracketWizardCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <ToastMessages errorMessage={errorMessage} successMessage={successMessage} />

      <WorkspaceSectionTabs activeView="tournaments" />

      <TournamentWorkspaceSection
        tournaments={tournaments}
        tournamentStageView={tournamentStageView}
        loadedTournamentStage={loadedTournamentStage}
        tournamentPage={tournamentPage}
        tournamentPagination={tournamentPagination}
        tournamentStatusCounts={tournamentStatusCounts}
        setTournamentPage={setTournamentPage}
        isLoadingBrackets={isWorkspacePending}
        setTournamentStageView={setTournamentStageView}
        selectedLiveTournamentId={selectedLiveTournamentId}
        setSelectedLiveTournamentId={setSelectedLiveTournamentId}
        recentlySavedBrackets={recentlySavedBrackets}
        tournamentInvites={tournamentInvites}
        tournamentShareLinks={tournamentShareLinks}
        pools={pools as PoolSelectionOption[]}
        poolDetails={poolDetails}
        isActionPending={isActionPending}
        onOpenBracketWizard={() => router.push("/brackets/configuration")}
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

      {isBracketWizardOpen ? (
        <BracketCreationWizard pools={pools} creating={isBracketWizardCreating} onCancel={() => setIsBracketWizardOpen(false)} onCreate={handleCreateBracketFromWizard} />
      ) : null}

      <SeedingModal
        tournament={seedingTournament}
        groups={seedingGroups}
        loading={seedingLoading}
        moveTargets={seedingMoveTargets}
        autosaveState={seedingAutosaveState}
        autosaveError={seedingSaveError}
        draggingEntryId={draggingEntryId}
        onAddSubBracket={addSeedingSubBracket}
        onCreateSubBracketAndMoveEntry={createSubBracketAndMoveEntry}
        onTogglePlayInAtIndex={togglePlayInAtIndex}
        onRemoveFromPlayInAtIndex={removeFromPlayInAtIndex}
        onRemoveSubBracket={removeSeedingSubBracket}
        onClose={closeSeedingEditor}
        onSubmit={() => handleSeedingSubmit({ preventDefault() {} })}
        onDragStart={setDraggingEntryId}
        onDragEnd={() => setDraggingEntryId(null)}
        onDropIntoGroup={handleSeedDropIntoGroup}
        onMoveEntryIntoGroup={(entryId, group, insertIndex) => {
          if (entryId) {
            moveEntryIntoGroup(entryId, group, insertIndex);
          }
        }}
        onRenameSubBracket={renameSeedingSubBracket}
        onToggleSubBracket={toggleSeedingSubBracket}
      />
    </div>
  );
}

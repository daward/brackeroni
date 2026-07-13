"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { SectionCard } from "@/components/section-card";
import { SeedingModal } from "@/components/seeding-modal";
import {
  BracketStyleField,
  ParallelResultModeNotice,
  ResultModeField
} from "@/components/bracket-config-fields";
import { ExpandedDraftTournamentSection } from "@/components/expanded-draft-tournament-section";
import { PoolWorkspaceSection } from "@/components/pool-workspace-section";
import {
  buildDirectBracketSharePath,
  buildPoolImportPrompt,
  canCopyBracketLink,
  describeTournamentAudienceMode,
  describeTournamentVisibility,
  formatBracketDate,
  formatBracketRuleLabel,
  getTournamentAudienceMode,
  getTournamentAudiencePatch,
  InlineTitleField,
  isPublicBracketVisibility,
  normalizeParallelBracketItem,
  PoolPublishWarning,
  sortManagedBrackets,
  sortManagedPools,
  TournamentPublishWarning
} from "@/components/create-panel-helpers";
import {
  TournamentMetaRow
} from "@/components/tournament-management";
import { TournamentManagementCard } from "@/components/tournament-management-card";
import {
  ActiveParallelTournamentSection,
  ActiveStandardTournamentSection,
  CollapsedDraftTournamentSection,
  CompletedTournamentSection
} from "@/components/tournament-status-sections";
import { useCandidateActions } from "@/components/use-candidate-actions";
import {
  isParallelResultMode,
  usesBracketStyleForResultMode
} from "@/lib/bracket-modes";

const emptyCandidateForm = {
  name: "",
  description: "",
  imageUrl: ""
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
  const [pools, setPools] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [poolDetails, setPoolDetails] = useState({});
  const [expandedPoolId, setExpandedPoolId] = useState(null);
  const [isPoolModalOpen, setIsPoolModalOpen] = useState(false);
  const [isPoolImportModalOpen, setIsPoolImportModalOpen] = useState(false);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);
  const [editingPool, setEditingPool] = useState(null);
  const [poolEditForm, setPoolEditForm] = useState(emptyPoolForm);
  const [seedingTournament, setSeedingTournament] = useState(null);
  const [seedingEntries, setSeedingEntries] = useState([]);
  const [seedingLoading, setSeedingLoading] = useState(false);
  const [savingSeeding, setSavingSeeding] = useState(false);
  const [draggingEntryId, setDraggingEntryId] = useState(null);
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
  const [tournamentInvites, setTournamentInvites] = useState({});
  const [tournamentShareLinks, setTournamentShareLinks] = useState({});
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState({});
  const [isPending, startTransition] = useTransition();
  const tournamentCardRefs = useRef({});
  const poolCardRefs = useRef({});
  const actionSearchParamsHandledRef = useRef({
    favoritePoolId: null,
    makeBracketFromPoolId: null
  });
  const poolSearchScrollHandledRef = useRef(null);

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
  });

  async function loadFriendsTournamentMeta(nextTournaments) {
    const withFriendsTournaments = (nextTournaments ?? []).filter(
      (tournament) =>
        tournament.sharingMode === "with_friends" &&
        (tournament.status === "draft" || tournament.status === "active")
    );

    const inviteEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind !== "parallel_parent")
        .map(async (tournament) => {
        const response = await fetch(`/api/tournaments/${tournament.id}/invites`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error(`Failed to load invitees for ${tournament.title}.`);
        }

        const data = await response.json();
        return [tournament.id, data.items ?? []];
      })
    );

    const parallelEntries = await Promise.all(
      withFriendsTournaments
        .filter((tournament) => tournament.kind === "parallel_parent")
        .map(async (tournament) => {
          const response = await fetch(`/api/parallel-tournaments/${tournament.id}`, {
            cache: "no-store"
          });

          if (!response.ok) {
            throw new Error(`Failed to load participants for ${tournament.title}.`);
          }

          const data = await response.json();
          return [tournament.id, data.item?.participants ?? []];
        })
    );

    const linkEntries = await Promise.all(
      withFriendsTournaments
        .filter(
          (tournament) => tournament.status === "draft" || tournament.status === "active"
        )
        .map(async (tournament) => {
          const response = await fetch(
            tournament.kind === "parallel_parent"
              ? `/api/parallel-tournaments/${tournament.id}/links`
              : `/api/tournaments/${tournament.id}/links`,
            {
              cache: "no-store"
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to load share links for ${tournament.title}.`);
          }

          const data = await response.json();
          return [tournament.id, data.items ?? []];
        })
    );

    setTournamentInvites(Object.fromEntries([...inviteEntries, ...parallelEntries]));
    setTournamentShareLinks(Object.fromEntries(linkEntries));
  }

  async function loadWorkspace() {
    const [poolResponse, tournamentResponse, parallelTournamentResponse] = await Promise.all([
      fetch("/api/pools", { cache: "no-store" }),
      fetch("/api/tournaments", { cache: "no-store" }),
      fetch("/api/parallel-tournaments", { cache: "no-store" }).catch(() => null)
    ]);

    if (!poolResponse.ok || !tournamentResponse.ok) {
      throw new Error("Failed to load create workspace.");
    }

    const poolData = await poolResponse.json();
    const tournamentData = await tournamentResponse.json();
    const parallelTournamentData =
      parallelTournamentResponse && parallelTournamentResponse.ok
        ? await parallelTournamentResponse.json()
        : { items: [] };
    const normalizedTournaments = sortManagedBrackets([
      ...(tournamentData.items ?? []).map((item) => ({ ...item, kind: "standard" })),
      ...(parallelTournamentData.items ?? []).map(normalizeParallelBracketItem)
    ]);

    setPools(sortManagedPools(poolData.items ?? []));
    setTournaments(normalizedTournaments);
    setExpandedPoolId((current) => {
      const sortedPools = sortManagedPools(poolData.items ?? []);

      if (!sortedPools.length) {
        return null;
      }

      if (current && sortedPools.some((pool) => pool.id === current)) {
        return current;
      }

      return null;
    });

    const detailEntries = await Promise.all(
      sortManagedPools(poolData.items ?? []).map(async (pool) => {
        const response = await fetch(`/api/pools/${pool.id}`, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load pool ${pool.name}.`);
        }

        const data = await response.json();
        return [pool.id, data.item];
      })
    );

    setPoolDetails(Object.fromEntries(detailEntries));
    await loadFriendsTournamentMeta(normalizedTournaments);
  }

  useEffect(() => {
    startTransition(async () => {
      try {
        await loadWorkspace();
      } catch (error) {
        setErrorMessage(error.message);
      }
    });
  }, []);

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
        const response = await fetch(`/api/pools/${requestedFavoritePoolId}/favorites`, {
          method: "POST"
        });
        const data = await response.json();

        if (!response.ok) {
          actionSearchParamsHandledRef.current.favoritePoolId = null;
          setErrorMessage(data.error?.message || "Failed to add pool to favorites.");
          return;
        }

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

  async function handlePoolSubmit(event) {
    event.preventDefault();
    if (isActionPending("create-pool")) {
      return;
    }

    beginAction("create-pool");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolForm.name,
          description: poolForm.description || null,
          visibility: poolForm.visibility
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create pool.");
        return;
      }

      setPoolForm(emptyPoolForm);
      setExpandedPoolId(data.item?.id ?? null);
      setIsPoolModalOpen(false);
      setSuccessMessage("Pool created.");
      await loadWorkspace();
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
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolImportForm.name,
          description: poolImportForm.description || null,
          visibility: poolImportForm.visibility,
          source: {
            type: "extract",
            prompt: buildPoolImportPrompt(poolImportForm.name),
            text: poolImportForm.text
          }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to import pool.");
        return;
      }

      setExpandedPoolId(data.item?.id ?? null);
      closePoolImportModal();
      setSuccessMessage("Pool imported.");
      await loadWorkspace();
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
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name,
          description,
          visibility: "private"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create pool.");
        return null;
      }

      const createdPool = data.item;

      if (attachedTournamentId) {
        const attachResponse = await fetch(`/api/tournaments/${attachedTournamentId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            sourcePoolId: createdPool.id
          })
        });
        const attachData = await attachResponse.json();

        if (!attachResponse.ok) {
          setErrorMessage(attachData.error?.message || "Failed to attach pool to bracket.");
          return null;
        }
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
    } finally {
      endAction(actionKey);
    }
  }

  async function createDraftBracket() {
    if (isActionPending("create-tournament")) {
      return;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: "Untitled Bracket",
          description: null,
          sourcePoolId: null,
          sharingMode: "private",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create bracket.");
        return;
      }

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: {
          title: data.item.title,
          sourcePoolId: data.item.sourcePoolId || "",
          sharingMode: data.item.sharingMode,
          playStyle: data.item.playStyle,
          resultMode: data.item.resultMode,
          tieBreakMode: data.item.tieBreakMode
        }
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage("Draft bracket created.");
      await loadWorkspace();
    } finally {
      endAction("create-tournament");
    }
  }

  async function createDraftBracketFromPool(pool) {
    if (isActionPending("create-tournament")) {
      return null;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title: `${pool.name} Bracket`,
          description: null,
          sourcePoolId: pool.id,
          sharingMode: "private",
          playStyle: "fixed_bracket",
          resultMode: "winner_only",
          tieBreakMode: "higher_seed_wins"
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create bracket from pool.");
        return null;
      }

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: {
          title: data.item.title,
          sourcePoolId: data.item.sourcePoolId || "",
          sharingMode: data.item.sharingMode,
          playStyle: data.item.playStyle,
          resultMode: data.item.resultMode,
          tieBreakMode: data.item.tieBreakMode
        }
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage(`Draft bracket created from ${pool.name}.`);
      await loadWorkspace();
      return data.item;
    } finally {
      endAction("create-tournament");
    }
  }

  async function handleTournamentSubmit(event) {
    event.preventDefault();
    const isParallelMode = isParallelResultMode(tournamentForm.resultMode);
    const actionKey = isParallelMode ? "create-parallel-tournament" : "create-tournament";

    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(isParallelMode ? "/api/parallel-tournaments" : "/api/tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          ...tournamentForm,
          ...(isParallelMode
            ? {
                resultMode: tournamentForm.resultMode,
                tieBreakMode: tournamentForm.tieBreakMode
              }
            : {
                playStyle: tournamentForm.playStyle,
                resultMode: tournamentForm.resultMode
              }),
          description: null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(
          data.error?.message ||
            (isParallelMode ? "Failed to create parallel bracket." : "Failed to create bracket.")
        );
        return;
      }

      setTournamentForm(emptyTournamentForm);
      setIsTournamentModalOpen(false);
      if (isParallelMode) {
        setWorkspaceView("tournaments");
        setTournamentStageView("draft");
        setExpandedDraftTournamentId(data.item.id);
        setEditingTournamentTitleId(null);
        setSuccessMessage("Draft bracket created.");
        await loadWorkspace();
        return;
      }

      setSuccessMessage("Draft bracket created.");
      await loadWorkspace();
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
      const response = await fetch(`/api/pools/${poolId}/imports`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ sourcePoolId })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to merge pools.");
        return;
      }

      setOpenPoolMergeMenuId(null);
      setOpenPoolActionsMenuId(null);
      setSuccessMessage("Pool merged.");
      await loadWorkspace();
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

  async function updateTournamentInline(tournamentId, patch, { silent = true } = {}) {
    const actionKey = `update-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const isParallelParent = tournament?.kind === "parallel_parent";

    beginAction(actionKey);
    setErrorMessage("");

    try {
      const response = await fetch(
        isParallelParent
          ? `/api/parallel-tournaments/${tournamentId}`
          : `/api/tournaments/${tournamentId}`,
        {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(patch)
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update bracket.");
        return;
      }

      setRecentlySavedBrackets((current) => ({
        ...current,
        [tournamentId]: true
      }));
      setTimeout(() => {
        setRecentlySavedBrackets((current) => {
          const next = { ...current };
          delete next[tournamentId];
          return next;
        });
      }, 1800);

      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function convertTournamentDraftToParallel(
    tournament,
    { actionKey = null, startAfterCreate = false } = {}
  ) {
    const draft = tournamentInlineDrafts[tournament.id] ?? tournament;
    const title = draft.title?.trim() || tournament.title?.trim() || "";
    const sourcePoolId = draft.sourcePoolId || tournament.sourcePoolId || "";

    if (!title) {
      setErrorMessage("Parallel brackets need a title.");
      return false;
    }

    if (!sourcePoolId) {
      setErrorMessage("Pick a pool before creating this parallel bracket.");
      return false;
    }

    const effectiveActionKey = actionKey || `convert-tournament:${tournament.id}`;
    if (isActionPending(effectiveActionKey)) {
      return false;
    }

    if (!actionKey) {
      beginAction(effectiveActionKey);
    }
    setErrorMessage("");

    try {
      const createResponse = await fetch("/api/parallel-tournaments", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          title,
          description: draft.description ?? tournament.description ?? "",
          sourcePoolId,
          sharingMode: draft.sharingMode || tournament.sharingMode || "private",
          visibility: draft.visibility || tournament.visibility || "private",
          votingAccess: draft.votingAccess || tournament.votingAccess || "signed_in_only",
          resultMode: draft.resultMode || tournament.resultMode || "parallel_full_ranking",
          tieBreakMode: draft.tieBreakMode || tournament.tieBreakMode || "higher_seed_wins"
        })
      });
      const createData = await createResponse.json();

      if (!createResponse.ok) {
        setErrorMessage(createData.error?.message || "Failed to create parallel bracket.");
        return false;
      }

      const createdParallelId = createData.item?.id;

      if (startAfterCreate && createdParallelId) {
        const startResponse = await fetch(`/api/parallel-tournaments/${createdParallelId}`, {
          method: "PATCH",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            status: "active"
          })
        });
        const startData = await startResponse.json();

        if (!startResponse.ok) {
          setErrorMessage(startData.error?.message || "Failed to start parallel bracket.");
          return false;
        }
      }

      await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE"
      });

      setSuccessMessage(startAfterCreate ? "Parallel bracket started." : "Parallel bracket created.");
      setWorkspaceView("tournaments");
      setTournamentStageView(startAfterCreate ? "active" : "draft");
      setExpandedDraftTournamentId(createData.item.id);
      setEditingTournamentTitleId(null);
      await loadWorkspace();
      return true;
    } finally {
      if (!actionKey) {
        endAction(effectiveActionKey);
      }
    }
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
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: nextName,
          description: nextDescription || null,
          visibility: nextVisibility
        })
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update pool.");
        return;
      }

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
    } finally {
      endAction(actionKey);
    }
  }

  async function handleStartTournament(tournamentId) {
    const actionKey = `start-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const bracketDraft = tournament
      ? (tournamentInlineDrafts[tournamentId] ?? {
          title: tournament.title,
          sourcePoolId: tournament.sourcePoolId || "",
          sharingMode: tournament.sharingMode,
          playStyle: tournament.playStyle,
          resultMode: tournament.resultMode,
          tieBreakMode: tournament.tieBreakMode
        })
      : null;

    if (tournament && isParallelResultMode(bracketDraft?.resultMode) && tournament.kind !== "parallel_parent") {
      beginAction(actionKey);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        const converted = await convertTournamentDraftToParallel(tournament, {
          actionKey,
          startAfterCreate: true
        });
      if (converted) {
        setExpandedDraftTournamentId(null);
      }
      } finally {
        endAction(actionKey);
      }
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        tournament?.kind === "parallel_parent"
          ? `/api/parallel-tournaments/${tournamentId}`
          : `/api/tournaments/${tournamentId}`,
        {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          status: "active"
        })
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to start bracket.");
        return;
      }

      setTournamentStageView("active");
      setExpandedDraftTournamentId(null);
      if (data.item) {
        const nextTournament =
          tournament?.kind === "parallel_parent"
            ? normalizeParallelBracketItem(data.item)
            : { ...data.item, kind: "standard" };
        setTournaments((current) =>
          current.map((tournament) => (tournament.id === tournamentId ? nextTournament : tournament))
        );
      }
      setSuccessMessage("Bracket started.");
      await loadWorkspace();
      setTimeout(() => {
        tournamentCardRefs.current[tournamentId]?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    } finally {
      endAction(actionKey);
    }
  }

  async function handleEnsureShareLink(tournamentId, { rotate = false, silent = false } = {}) {
    const actionKey = rotate ? `rotate-link:${tournamentId}` : `share-link:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return null;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const isParallelParent = tournament?.kind === "parallel_parent";

    beginAction(actionKey);
    if (!silent) {
      setErrorMessage("");
      setSuccessMessage("");
    }

    try {
      const response = await fetch(
        isParallelParent
          ? `/api/parallel-tournaments/${tournamentId}/links`
          : `/api/tournaments/${tournamentId}/links`,
        {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify(rotate ? { rotate: true } : {})
        }
      );
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to prepare share link.");
        return null;
      }

      setTournamentShareLinks((current) => ({
        ...current,
        [tournamentId]: [data.item]
      }));
      if (!silent) {
        setSuccessMessage(rotate ? "Share link refreshed." : "Share link ready.");
      }
      return data.item;
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCopyShareLink(tournamentId) {
    setErrorMessage("");
    setSuccessMessage("");

    const tournament = tournaments.find((entry) => entry.id === tournamentId);

    if (tournament && isPublicBracketVisibility(tournament.visibility)) {
      const shareUrl = `${window.location.origin}${buildDirectBracketSharePath(tournament)}`;

      try {
        await navigator.clipboard.writeText(shareUrl);
        setSuccessMessage("Bracket link copied.");
      } catch {
        setErrorMessage("Could not copy the bracket link.");
      }

      return;
    }

    let link = tournamentShareLinks[tournamentId]?.find((item) => item.active);
    if (!link) {
      link = await handleEnsureShareLink(tournamentId);
    }

    if (!link) {
      return;
    }

    const shareUrl = `${window.location.origin}/join/${link.token}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setSuccessMessage("Share link copied.");
    } catch {
      setErrorMessage("Could not copy the share link.");
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

  async function handleSyncTournamentWithPool(tournamentId) {
    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    if (tournament?.kind === "parallel_parent") {
      setSuccessMessage("Parallel brackets read directly from their pool. No sync needed.");
      return;
    }

    const actionKey = `sync-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          syncWithPool: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to sync bracket with pool.");
        return;
      }

      const addedEntryCount = data.meta?.addedEntryCount ?? 0;
      setSuccessMessage(
        addedEntryCount > 0
          ? `Bracket synced with pool. Added ${addedEntryCount} candidate${
              addedEntryCount === 1 ? "" : "s"
            }.`
          : "Bracket synced with pool. No new candidates were added."
      );
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRerunTournament(tournamentId) {
    const actionKey = `rerun-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/rerun-drafts`, {
        method: "POST"
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to create rerun.");
        return;
      }

      const rerunId = data.item?.id || null;
      setWorkspaceView("tournaments");
      setTournamentStageView("draft");
      if (rerunId) {
        setExpandedDraftTournamentId(rerunId);
        setEditingTournamentTitleId(null);
      }
      setSuccessMessage("Rerun draft created.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function openSeedingEditor(tournament) {
    setErrorMessage("");
    setSuccessMessage("");
    setSeedingLoading(true);
    setSeedingTournament(tournament);
    setSeedingEntries([]);

    try {
      const response = await fetch(`/api/tournaments/${tournament.id}/entries`, {
        cache: "no-store"
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to load bracket seeding.");
        setSeedingTournament(null);
        return;
      }

      setSeedingEntries(data.items ?? []);
    } catch {
      setErrorMessage("Failed to load bracket seeding.");
      setSeedingTournament(null);
    } finally {
      setSeedingLoading(false);
    }
  }

  function moveSeedEntry(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setSeedingEntries((current) => {
      if (fromIndex >= current.length || toIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleSeedDrop(targetIndex) {
    if (!draggingEntryId) {
      return;
    }

    const fromIndex = seedingEntries.findIndex((entry) => entry.id === draggingEntryId);
    moveSeedEntry(fromIndex, targetIndex);
    setDraggingEntryId(null);
  }

  async function handleSeedingSubmit(event) {
    event.preventDefault();

    if (!seedingTournament) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setSavingSeeding(true);

    try {
      const response = await fetch(`/api/tournaments/${seedingTournament.id}/entries`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          entryIds: seedingEntries.map((entry) => entry.id)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to save bracket seeding.");
        return;
      }

      setSeedingEntries(data.items ?? []);
      setSeedingTournament(null);
      setSuccessMessage("Seeding updated.");
      await loadWorkspace();
    } catch {
      setErrorMessage("Failed to save bracket seeding.");
    } finally {
      setSavingSeeding(false);
      setDraggingEntryId(null);
    }
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
      const response = await fetch(`/api/pools/${editingPool.id}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          name: poolEditForm.name,
          description: poolEditForm.description || null,
          visibility: poolEditForm.visibility
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to update pool.");
        return;
      }

      setEditingPool(null);
      setPoolEditForm(emptyPoolForm);
      setSuccessMessage("Pool updated.");
      await loadWorkspace();
    } finally {
      endAction("save-pool");
    }
  }

  async function handleArchiveTournament(tournamentId, title) {
    const confirmed = window.confirm(
      `Archive "${title}"?\n\nThis will hide it from the main views, but keep its data and history.`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `archive-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const isParallelParent = tournament?.kind === "parallel_parent";

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        isParallelParent
          ? `/api/parallel-tournaments/${tournamentId}`
          : `/api/tournaments/${tournamentId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to archive bracket.");
        return;
      }

      setSuccessMessage("Bracket archived.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
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
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE"
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to archive pool.");
        return;
      }

      if (expandedPoolId === poolId) {
        setExpandedPoolId(null);
      }

      setOpenPoolActionsMenuId(null);
      setOpenPoolMergeMenuId(null);
      setSuccessMessage("Pool archived.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCloseCurrentRound(tournamentId) {
    const actionKey = `close-round:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          closeCurrentRound: true
        })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMessage(data.error?.message || "Failed to close the current round.");
        return;
      }

      if (data.item?.status === "complete") {
        router.replace(`/results/${tournamentId}`);
        return;
      }

      setSuccessMessage("Round closed and bracket advanced.");
      await loadWorkspace();
    } finally {
      endAction(actionKey);
    }
  }

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
          onMergePool={handleMergePool}
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
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "draft",
                label: "Drafts",
                count: tournaments.filter((tournament) => tournament.status === "draft").length
              },
              {
                key: "active",
                label: "Live",
                count: tournaments.filter((tournament) => tournament.status === "active").length
              },
              {
                key: "complete",
                label: "Completed",
                count: tournaments.filter((tournament) => tournament.status === "complete").length
              }
            ].map((view) => {
              const isActiveView = tournamentStageView === view.key;

              return (
                <button
                  key={view.key}
                  type="button"
                  onClick={() => setTournamentStageView(view.key)}
                  className={`ui-button ${isActiveView ? "ui-button-primary" : "ui-button-muted"}`}
                >
                  {view.label} ({view.count})
                </button>
              );
            })}
          </div>
          <SectionCard>
            <div className="space-y-0">
              {(() => {
                const firstDraftTournamentId =
                  tournaments.find((entry) => entry.status === "draft")?.id ?? null;
                const visibleTournaments = tournaments.filter((tournament) => {
                  if (tournamentStageView === "draft") {
                    return tournament.status === "draft";
                  }

                  if (tournamentStageView === "active") {
                    return tournament.status === "active";
                  }

                  return tournament.status === "complete";
                });
                const activeTournamentFocusId =
                  editingTournamentTitleId ??
                  (expandedDraftTournamentId !== "all" ? expandedDraftTournamentId : null);
                const shouldDimOtherTournaments = Boolean(activeTournamentFocusId);

                if (visibleTournaments.length === 0) {
                  return (
                    <div className="p-5">
                      {tournamentStageView === "draft" ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-[var(--muted)]">No draft brackets yet.</p>
                          <button
                            type="button"
                            onClick={() => createDraftBracket()}
                            disabled={isActionPending("create-tournament")}
                            className="ui-button ui-button-compact ui-button-primary"
                          >
                            Add Bracket
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted)]">
                          {tournamentStageView === "active"
                            ? "No live brackets."
                            : "No completed brackets."}
                        </p>
                      )}
                    </div>
                  );
                }

                return (
                  <>
                    {tournamentStageView === "draft" ? (
                      <div className="flex justify-end border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4">
                        <button
                          type="button"
                          onClick={() => createDraftBracket()}
                          disabled={isActionPending("create-tournament")}
                          className="ui-button ui-button-compact ui-button-primary"
                        >
                          Add Bracket
                        </button>
                      </div>
                    ) : null}
                    {visibleTournaments.map((tournament) => {
                const bracketDraft = tournamentInlineDrafts[tournament.id] || {
                  title: tournament.title,
                  sourcePoolId: tournament.sourcePoolId || "",
                  sharingMode: tournament.sharingMode,
                  playStyle: tournament.playStyle,
                  resultMode: tournament.resultMode,
                  tieBreakMode: tournament.tieBreakMode
                };
                const trimmedBracketTitle = (bracketDraft.title || "").trim();
                const hasBracketName =
                  trimmedBracketTitle.length > 0 && trimmedBracketTitle !== "Untitled Bracket";
                const hasSourcePool = Boolean(bracketDraft.sourcePoolId);
                const linkedPool = hasSourcePool
                  ? pools.find((pool) => pool.id === bracketDraft.sourcePoolId)
                  : null;
                const linkedPoolCandidates = hasSourcePool
                  ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || [])
                  : [];
                const selectedPoolCandidateCount = hasSourcePool
                  ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || []).length
                  : 0;
                const isParallelParent = tournament.kind === "parallel_parent";
                const activeShareLink =
                  tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
                const invitees = tournamentInvites[tournament.id] || [];
                const activeRoundVoteGoal = tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
                const completedInviteCount = invitees.filter(
                  (invite) => activeRoundVoteGoal > 0 && invite.votesCast >= activeRoundVoteGoal
                ).length;
                const creatorVotesCast = Math.max(activeRoundVoteGoal - (tournament.openVoteCount ?? 0), 0);
                const creatorIsDone = activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
                const rulesExpanded = Boolean(expandedBracketRules[tournament.id]);
                const isEditingTournamentTitle = editingTournamentTitleId === tournament.id;
                const isDraftExpanded =
                  tournament.status !== "draft"
                    ? true
                    : expandedDraftTournamentId === "all"
                      ? tournament.id === firstDraftTournamentId
                      : expandedDraftTournamentId === tournament.id;
                const isMutedTournament =
                  shouldDimOtherTournaments && activeTournamentFocusId !== tournament.id;
                const isManagingEntrants = managedEntrantsTournamentId === tournament.id;
                const isPoolMenuOpen = poolMenuTournamentId === tournament.id;
                const isPublishedTournament =
                  tournament.status !== "draft" && tournament.visibility !== "private";
                const canStartBracket =
                  hasBracketName &&
                  hasSourcePool &&
                  Math.max(tournament.entryCount ?? 0, selectedPoolCandidateCount) > 0;
                const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;
                const viewerParallelBracketComplete =
                  isParallelParent && tournament.viewerParticipantStatus === "complete";
                const primaryParallelActionHref = viewerParallelBracketComplete
                  ? `/results/${tournament.id}`
                  : `/vote?parallelTournament=${tournament.id}&returnTo=create`;
                const primaryParallelActionLabel = viewerParallelBracketComplete ? "Results" : "Vote";

                return (
                <TournamentManagementCard
                  key={tournament.id}
                  tournament={tournament}
                  cardRef={(node) => {
                    if (node) {
                      tournamentCardRefs.current[tournament.id] = node;
                    } else {
                      delete tournamentCardRefs.current[tournament.id];
                    }
                  }}
                  isMuted={isMutedTournament}
                  statusLabel={recentlySavedBrackets[tournament.id] ? "Saved" : tournament.status}
                  audienceLabel={describeTournamentAudienceMode(tournament)}
                  completedLabel={
                    tournament.status === "complete" && tournament.completedAt
                      ? formatBracketDate(tournament.completedAt)
                      : null
                  }
                  title={
                    tournament.status === "draft" && isDraftExpanded && isEditingTournamentTitle ? (
                      <InlineTitleField
                        autoFocus
                        value={bracketDraft.title}
                        onChange={(event) =>
                          setTournamentInlineDrafts((current) => ({
                            ...current,
                            [tournament.id]: {
                              ...bracketDraft,
                              title: event.target.value
                            }
                          }))
                        }
                        onBlur={() => {
                          const nextTitle = bracketDraft.title.trim();

                          if (!nextTitle) {
                            setTournamentInlineDrafts((current) => ({
                              ...current,
                              [tournament.id]: {
                                ...bracketDraft,
                                title: tournament.title
                              }
                            }));
                            setEditingTournamentTitleId(null);
                            return;
                          }

                          if (nextTitle !== tournament.title) {
                            updateTournamentInline(tournament.id, { title: nextTitle }, { silent: false });
                          }

                          setEditingTournamentTitleId(null);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }

                          if (event.key === "Escape") {
                            setTournamentInlineDrafts((current) => ({
                              ...current,
                              [tournament.id]: {
                                ...bracketDraft,
                                title: tournament.title
                              }
                            }));
                            setEditingTournamentTitleId(null);
                          }
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (tournament.status === "draft" && !isPublishedTournament) {
                            setExpandedDraftTournamentId(tournament.id);
                            setEditingTournamentTitleId(tournament.id);
                          }
                        }}
                        className={`-mx-3 block w-[calc(100%+1.5rem)] border border-transparent bg-transparent px-3 py-2 text-left ${
                          tournament.status === "draft"
                            ? "transition hover:border-[var(--line)] hover:bg-[var(--panel)]"
                            : ""
                        }`}
                      >
                        <span
                          style={{
                            fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
                            fontSize: "24px",
                            fontWeight: 900,
                            lineHeight: 1
                          }}
                        >
                          {tournament.title}
                        </span>
                      </button>
                    )
                  }
                >
                  {tournament.status === "draft" ? (
                    isDraftExpanded ? (
                      <ExpandedDraftTournamentSection
                        tournament={tournament}
                        bracketDraft={bracketDraft}
                        pools={pools}
                        linkedPool={linkedPool}
                        linkedPoolCandidates={linkedPoolCandidates}
                        trimmedBracketTitle={trimmedBracketTitle}
                        hasSourcePool={hasSourcePool}
                        isPublishedTournament={isPublishedTournament}
                        isParallelParent={isParallelParent}
                        rulesExpanded={rulesExpanded}
                        isManagingEntrants={isManagingEntrants}
                        isPoolMenuOpen={isPoolMenuOpen}
                        activeShareLink={activeShareLink}
                        invitees={invitees}
                        canStartBracket={canStartBracket}
                        candidateDraft={candidateDrafts[bracketDraft.sourcePoolId] || emptyCandidateForm}
                        isCandidateEditorOpen={candidateEditor?.poolId === bracketDraft.sourcePoolId}
                        isEditingCandidate={
                          candidateEditor?.poolId === bracketDraft.sourcePoolId &&
                          Boolean(candidateEditor?.candidateId)
                        }
                        imageSuggestions={imageSuggestions[bracketDraft.sourcePoolId] || []}
                        imageSuggestionLoading={Boolean(imageSuggestionLoading[bracketDraft.sourcePoolId])}
                        removingCandidateId={
                          linkedPoolCandidates.find((candidate) =>
                            isActionPending(`remove-candidate:${bracketDraft.sourcePoolId}:${candidate.id}`)
                          )?.id || null
                        }
                        isActionPending={isActionPending}
                        onPatchDraft={(patch) =>
                          setTournamentInlineDrafts((current) => ({
                            ...current,
                            [tournament.id]: {
                              ...bracketDraft,
                              ...patch
                            }
                          }))
                        }
                        onPersistTournamentPatch={(patch) =>
                          updateTournamentInline(tournament.id, patch, { silent: false })
                        }
                        onToggleRules={() =>
                          setExpandedBracketRules((current) => ({
                            ...current,
                            [tournament.id]: !rulesExpanded
                          }))
                        }
                        onToggleManageEntrants={(forceOpen) =>
                          setManagedEntrantsTournamentId((current) =>
                            forceOpen ? tournament.id : current === tournament.id ? null : tournament.id
                          )
                        }
                        onTogglePoolMenu={() =>
                          setPoolMenuTournamentId((current) =>
                            current === tournament.id ? null : tournament.id
                          )
                        }
                        onClosePoolMenu={() => setPoolMenuTournamentId(null)}
                        onCreatePool={createPoolRecord}
                        onSyncWithPool={() => handleSyncTournamentWithPool(tournament.id)}
                        onOpenSeedingEditor={() => openSeedingEditor(tournament)}
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
                        onCopyShareLink={() => handleCopyShareLink(tournament.id)}
                        onStartTournament={() => handleStartTournament(tournament.id)}
                        onArchiveTournament={() => handleArchiveTournament(tournament.id, tournament.title)}
                      />
                    ) : (
                      <CollapsedDraftTournamentSection
                        tournament={tournament}
                        isPublishedTournament={isPublishedTournament}
                        canStartBracket={canStartBracket}
                        describeTournamentAudienceMode={describeTournamentAudienceMode}
                        formatBracketRuleLabel={formatBracketRuleLabel}
                        isActionPending={isActionPending}
                        onEditDraft={setExpandedDraftTournamentId}
                        onStartTournament={handleStartTournament}
                      />
                    )
                  ) : tournament.status === "active" ? (
                    isParallelParent ? (
                    <ActiveParallelTournamentSection
                      tournament={tournament}
                      primaryActionHref={primaryParallelActionHref}
                      primaryActionLabel={primaryParallelActionLabel}
                      activeShareLink={activeShareLink}
                      invitees={invitees}
                      canCopyBracketLink={canCopyBracketLink}
                      describeTournamentAudienceMode={describeTournamentAudienceMode}
                      formatBracketRuleLabel={formatBracketRuleLabel}
                      isActionPending={isActionPending}
                      onCopyShareLink={handleCopyShareLink}
                      onCloseBracket={(tournamentId) =>
                        updateTournamentInline(tournamentId, { status: "complete" }, { silent: false })
                      }
                      onArchiveTournament={handleArchiveTournament}
                    />
                    ) : (
                    <ActiveStandardTournamentSection
                      tournament={tournament}
                      hasOpenVotes={hasOpenVotes}
                      activeRoundVoteGoal={activeRoundVoteGoal}
                      creatorVotesCast={creatorVotesCast}
                      creatorIsDone={creatorIsDone}
                      activeShareLink={activeShareLink}
                      invitees={invitees}
                      canCopyBracketLink={canCopyBracketLink}
                      describeTournamentAudienceMode={describeTournamentAudienceMode}
                      formatBracketRuleLabel={formatBracketRuleLabel}
                      isActionPending={isActionPending}
                      onCloseCurrentRound={handleCloseCurrentRound}
                      onCopyShareLink={handleCopyShareLink}
                      onRerunTournament={handleRerunTournament}
                      onArchiveTournament={handleArchiveTournament}
                    />
                    )
                  ) : tournament.status === "complete" ? (
                    <CompletedTournamentSection
                      tournament={tournament}
                      activeShareLink={activeShareLink}
                      hasSourcePool={hasSourcePool}
                      canCopyBracketLink={canCopyBracketLink}
                      describeTournamentAudienceMode={describeTournamentAudienceMode}
                      formatBracketRuleLabel={formatBracketRuleLabel}
                      isActionPending={isActionPending}
                      onCopyShareLink={handleCopyShareLink}
                      onRerunTournament={handleRerunTournament}
                      onArchiveTournament={handleArchiveTournament}
                    />
                  ) : null}
                  {tournament.status !== "complete" && hasSourcePool && !isDraftExpanded ? (
                        <div className="mt-4">
                          <TournamentMetaRow
                            separator="slash"
                            className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]"
                            items={[
                              describeTournamentAudienceMode(tournament),
                              formatBracketRuleLabel(tournament.playStyle),
                              formatBracketRuleLabel(tournament.resultMode),
                              `${tournament.entryCount} entries`
                            ]}
                          />
                        </div>
                  ) : null}
                  </TournamentManagementCard>
                );
                })}
                  </>
                );
              })()}
            </div>
          </SectionCard>
        </div>
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
        onClose={() => {
          setSeedingTournament(null);
          setSeedingEntries([]);
          setDraggingEntryId(null);
        }}
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

"use client";

import type { Dispatch, SetStateAction } from "react";
import { normalizeParallelBracketItem } from "@/lib/brackets/presentation";
import { isParallelResultMode } from "@/lib/bracket-modes";
import type { BracketDraft, BracketPlayStyle, BracketResultMode, BracketTieBreakMode } from "@/lib/brackets/types";
import type { WorkspacePool } from "./workspace-internal-types";
import {
  createParallelTournament,
  createTournament,
  deleteTournament,
  startParallelTournament,
  startTournament,
  updateParallelTournament,
  updateTournament,
} from "@/lib/client-api/create-workspace";
import type {
  ActionMarker,
  LoadWorkspace,
  MessageSetter,
  PendingActionChecker,
  RefreshTournamentMatches,
  ReplaceTournament,
  ReplaceTournamentMatch,
  SetExpandedDraftId,
  SetStageView,
  SetTournamentDrafts,
  SetWorkspaceView,
  TournamentCardRefs,
  TournamentDrafts,
  WorkspaceTournament,
} from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";
import { useTournamentLifecycleActions } from "./use-tournament-lifecycle-actions";

export type DraftBracketOptions = Partial<BracketDraft> & {
  seedCandidateIds?: string[] | null;
};

type UseTournamentActionsProps = {
  router: { replace: (href: string) => void };
  tournaments: WorkspaceTournament[];
  tournamentInlineDrafts: TournamentDrafts;
  setTournamentInlineDrafts: SetTournamentDrafts;
  setWorkspaceView: SetWorkspaceView;
  setTournamentStageView: SetStageView;
  setExpandedDraftTournamentId: SetExpandedDraftId;
  setEditingTournamentTitleId: (value: string | null) => void;
  setRecentlySavedBrackets: Dispatch<SetStateAction<Record<string, boolean>>>;
  refreshTournamentMatches: RefreshTournamentMatches;
  replaceTournamentMatchInWorkspace: ReplaceTournamentMatch;
  replaceTournamentInWorkspace: ReplaceTournament;
  tournamentCardRefs: TournamentCardRefs;
  isActionPending: PendingActionChecker;
  beginAction: ActionMarker;
  endAction: ActionMarker;
  setErrorMessage: MessageSetter;
  setSuccessMessage: MessageSetter;
  loadWorkspace: LoadWorkspace;
};

function draftFromTournament(tournament: WorkspaceTournament): TournamentDrafts[string] {
  return {
    title: tournament.title,
    sourcePoolId: tournament.sourcePoolId || "",
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    playStyle: (tournament.playStyle || "fixed_bracket") as BracketPlayStyle,
    resultMode: (tournament.resultMode || "winner_only") as BracketResultMode,
    tieBreakMode: (tournament.tieBreakMode || "higher_seed_wins") as BracketTieBreakMode,
    advancementMode: tournament.advancementMode || "vote_winner",
  };
}

function inlineDraftFromCreatedTournament(item: WorkspaceTournament): TournamentDrafts[string] {
  return {
    title: item.title,
    sourcePoolId: item.sourcePoolId || "",
    sharingMode: item.sharingMode,
    visibility: item.visibility,
    votingAccess: item.votingAccess,
    playStyle: (item.playStyle || "fixed_bracket") as BracketPlayStyle,
    resultMode: (item.resultMode || "winner_only") as BracketResultMode,
    tieBreakMode: (item.tieBreakMode || "higher_seed_wins") as BracketTieBreakMode,
    advancementMode: item.advancementMode || "vote_winner",
  };
}

function shouldOpenPrivateVoting(tournament: WorkspaceTournament | undefined, draft: TournamentDrafts[string] | null) {
  const sharingMode = draft?.sharingMode || tournament?.sharingMode || "private";
  const visibility = draft?.visibility || tournament?.visibility || "private";
  return sharingMode === "private" && visibility === "private";
}

export function useTournamentActions({
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
}: UseTournamentActionsProps) {
  const lifecycleActions = useTournamentLifecycleActions({
    tournaments,
    setWorkspaceView,
    setTournamentStageView,
    setExpandedDraftTournamentId,
    setEditingTournamentTitleId,
    refreshTournamentMatches,
    replaceTournamentMatchInWorkspace,
    replaceTournamentInWorkspace,
    isActionPending,
    beginAction,
    endAction,
    setErrorMessage,
    setSuccessMessage,
    loadWorkspace,
  });

  async function createDraftBracket(options: DraftBracketOptions = {}) {
    if (isActionPending("create-tournament")) {
      return null;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createTournament({
        title: options.title || "Untitled Bracket",
        description: null,
        sourcePoolId: options.sourcePoolId ?? null,
        sharingMode: options.sharingMode || "private",
        visibility: options.visibility || "private",
        votingAccess: options.votingAccess || "signed_in_only",
        playStyle: options.playStyle || "fixed_bracket",
        resultMode: options.resultMode || "winner_only",
        tieBreakMode: options.tieBreakMode || "higher_seed_wins",
        seedCandidateIds: options.seedCandidateIds,
        advancementMode: options.advancementMode || "vote_winner",
      });

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: inlineDraftFromCreatedTournament(data.item),
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage("Draft bracket created.");
      await loadWorkspace({ force: true });
      return data.item;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create bracket."));
      return null;
    } finally {
      endAction("create-tournament");
    }
  }

  async function createDraftBracketFromPool(pool: WorkspacePool) {
    if (isActionPending("create-tournament")) {
      return null;
    }

    beginAction("create-tournament");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createTournament({
        title: `${pool.name} Bracket`,
        description: null,
        sourcePoolId: pool.id,
        sharingMode: "private",
        playStyle: "fixed_bracket",
        resultMode: "winner_only",
        tieBreakMode: "higher_seed_wins",
        advancementMode: "vote_winner",
      });

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: inlineDraftFromCreatedTournament(data.item),
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage(`Draft bracket created from ${pool.name}.`);
      await loadWorkspace({ force: true });
      return data.item;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create bracket from pool."));
      return null;
    } finally {
      endAction("create-tournament");
    }
  }

  async function updateTournamentInline(tournamentId: string, patch: Partial<BracketDraft>, { silent = true }: { silent?: boolean } = {}) {
    const actionKey = `update-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const isParallelParent = tournament?.kind === "parallel_parent";

    beginAction(actionKey);
    setErrorMessage("");

    try {
      await (isParallelParent ? updateParallelTournament(tournamentId, patch) : updateTournament(tournamentId, patch));

      setRecentlySavedBrackets((current) => ({
        ...current,
        [tournamentId]: true,
      }));
      setTimeout(() => {
        setRecentlySavedBrackets((current) => {
          const next = { ...current };
          delete next[tournamentId];
          return next;
        });
      }, 1800);

      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update bracket."));
    } finally {
      endAction(actionKey);
    }
  }

  async function convertTournamentDraftToParallel(
    tournament: WorkspaceTournament,
    { actionKey = null, startAfterCreate = false }: { actionKey?: string | null; startAfterCreate?: boolean } = {},
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
      const createData = await createParallelTournament({
        title,
        description: draft.description ?? tournament.description ?? "",
        sourcePoolId,
        sharingMode: draft.sharingMode || tournament.sharingMode || "private",
        visibility: draft.visibility || tournament.visibility || "private",
        votingAccess: draft.votingAccess || tournament.votingAccess || "signed_in_only",
        resultMode: draft.resultMode || tournament.resultMode || "parallel_full_ranking",
        tieBreakMode: draft.tieBreakMode || tournament.tieBreakMode || "higher_seed_wins",
      });

      const createdParallelId = createData.item?.id;

      if (startAfterCreate && createdParallelId) {
        await startParallelTournament(createdParallelId);
      }

      await deleteTournament(tournament.id);

      setSuccessMessage(startAfterCreate ? "Parallel bracket started." : "Parallel bracket created.");
      setWorkspaceView("tournaments");
      setTournamentStageView(startAfterCreate ? "active" : "draft");
      setExpandedDraftTournamentId(createData.item.id);
      setEditingTournamentTitleId(null);
      await loadWorkspace({ force: true });
      return true;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create parallel bracket."));
      return false;
    } finally {
      if (!actionKey) {
        endAction(effectiveActionKey);
      }
    }
  }

  async function handleStartTournament(tournamentId: string) {
    const actionKey = `start-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const bracketDraft = tournament ? (tournamentInlineDrafts[tournamentId] ?? draftFromTournament(tournament)) : null;

    if (tournament && isParallelResultMode(bracketDraft?.resultMode) && tournament.kind !== "parallel_parent") {
      beginAction(actionKey);
      setErrorMessage("");
      setSuccessMessage("");
      try {
        const converted = await convertTournamentDraftToParallel(tournament, {
          actionKey,
          startAfterCreate: true,
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
      const data = tournament?.kind === "parallel_parent" ? await startParallelTournament(tournamentId) : await startTournament(tournamentId);
      const shouldRouteToVoting = shouldOpenPrivateVoting(tournament, bracketDraft);

      setTournamentStageView("active");
      setExpandedDraftTournamentId(null);
      if (data.item) {
        const nextTournament = tournament?.kind === "parallel_parent" ? normalizeParallelBracketItem(data.item) : { ...data.item, kind: "standard" };
        replaceTournamentInWorkspace(tournamentId, nextTournament);
      }
      setSuccessMessage("Bracket started.");
      await loadWorkspace({ force: true });
      if (shouldRouteToVoting) {
        const votePath = tournament?.kind === "parallel_parent" ? `/vote?parallelTournament=${tournamentId}&returnTo=create` : `/vote?tournament=${tournamentId}&returnTo=create`;
        router.replace(votePath);
        return;
      }
      setTimeout(() => {
        tournamentCardRefs.current[tournamentId]?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to start bracket."));
    } finally {
      endAction(actionKey);
    }
  }

  return {
    createDraftBracket,
    createDraftBracketFromPool,
    handleStartTournament,
    ...lifecycleActions,
    updateTournamentInline,
  };
}

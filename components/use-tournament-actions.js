"use client";

import { normalizeParallelBracketItem } from "@/components/create-panel-helpers";
import { isParallelResultMode } from "@/lib/bracket-modes";
import {
  archiveParallelTournament,
  archiveTournament,
  closeCurrentTournamentRound,
  createParallelTournament,
  createTournament,
  deleteTournament,
  rerunTournament,
  setTournamentMatchWinner,
  startParallelTournament,
  startTournament,
  syncTournamentWithPool,
  updateParallelTournament,
  updateTournament
} from "@/lib/client-api/create-workspace";

function draftFromTournament(tournament) {
  return {
    title: tournament.title,
    sourcePoolId: tournament.sourcePoolId || "",
    sharingMode: tournament.sharingMode,
    visibility: tournament.visibility,
    votingAccess: tournament.votingAccess,
    playStyle: tournament.playStyle,
    resultMode: tournament.resultMode,
    tieBreakMode: tournament.tieBreakMode,
    advancementMode: tournament.advancementMode || "vote_winner"
  };
}

function inlineDraftFromCreatedTournament(item) {
  return {
    title: item.title,
    sourcePoolId: item.sourcePoolId || "",
    sharingMode: item.sharingMode,
    visibility: item.visibility,
    votingAccess: item.votingAccess,
    playStyle: item.playStyle,
    resultMode: item.resultMode,
    tieBreakMode: item.tieBreakMode,
    advancementMode: item.advancementMode || "vote_winner"
  };
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
  loadWorkspace
}) {
  async function createDraftBracket(options = {}) {
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
        advancementMode: options.advancementMode || "vote_winner"
      });

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: inlineDraftFromCreatedTournament(data.item)
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage("Draft bracket created.");
      await loadWorkspace();
      return data.item;
    } catch (error) {
      setErrorMessage(error.message || "Failed to create bracket.");
      return null;
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
      const data = await createTournament({
        title: `${pool.name} Bracket`,
        description: null,
        sourcePoolId: pool.id,
        sharingMode: "private",
        playStyle: "fixed_bracket",
        resultMode: "winner_only",
        tieBreakMode: "higher_seed_wins",
        advancementMode: "vote_winner"
      });

      setTournamentInlineDrafts((current) => ({
        ...current,
        [data.item.id]: inlineDraftFromCreatedTournament(data.item)
      }));
      setExpandedDraftTournamentId(data.item.id);
      setWorkspaceView("tournaments");
      setSuccessMessage(`Draft bracket created from ${pool.name}.`);
      await loadWorkspace();
      return data.item;
    } catch (error) {
      setErrorMessage(error.message || "Failed to create bracket from pool.");
      return null;
    } finally {
      endAction("create-tournament");
    }
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
      await (isParallelParent
        ? updateParallelTournament(tournamentId, patch)
        : updateTournament(tournamentId, patch));

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
    } catch (error) {
      setErrorMessage(error.message || "Failed to update bracket.");
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
      const createData = await createParallelTournament({
        title,
        description: draft.description ?? tournament.description ?? "",
        sourcePoolId,
        sharingMode: draft.sharingMode || tournament.sharingMode || "private",
        visibility: draft.visibility || tournament.visibility || "private",
        votingAccess: draft.votingAccess || tournament.votingAccess || "signed_in_only",
        resultMode: draft.resultMode || tournament.resultMode || "parallel_full_ranking",
        tieBreakMode: draft.tieBreakMode || tournament.tieBreakMode || "higher_seed_wins"
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
      await loadWorkspace();
      return true;
    } catch (error) {
      setErrorMessage(error.message || "Failed to create parallel bracket.");
      return false;
    } finally {
      if (!actionKey) {
        endAction(effectiveActionKey);
      }
    }
  }

  async function handleStartTournament(tournamentId) {
    const actionKey = `start-tournament:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    const tournament = tournaments.find((entry) => entry.id === tournamentId);
    const bracketDraft = tournament
      ? (tournamentInlineDrafts[tournamentId] ?? draftFromTournament(tournament))
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
      const data =
        tournament?.kind === "parallel_parent"
          ? await startParallelTournament(tournamentId)
          : await startTournament(tournamentId);

      setTournamentStageView("active");
      setExpandedDraftTournamentId(null);
      if (data.item) {
        const nextTournament =
          tournament?.kind === "parallel_parent"
            ? normalizeParallelBracketItem(data.item)
            : { ...data.item, kind: "standard" };
        replaceTournamentInWorkspace(tournamentId, nextTournament);
      }
      setSuccessMessage("Bracket started.");
      await loadWorkspace();
      setTimeout(() => {
        tournamentCardRefs.current[tournamentId]?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 50);
    } catch (error) {
      setErrorMessage(error.message || "Failed to start bracket.");
    } finally {
      endAction(actionKey);
    }
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
      const data = await syncTournamentWithPool(tournamentId);

      const addedEntryCount = data.meta?.addedEntryCount ?? 0;
      setSuccessMessage(
        addedEntryCount > 0
          ? `Bracket synced with pool. Added ${addedEntryCount} candidate${
              addedEntryCount === 1 ? "" : "s"
            }.`
          : "Bracket synced with pool. No new candidates were added."
      );
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to sync bracket with pool.");
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
      const data = await rerunTournament(tournamentId);

      const rerunId = data.item?.id || null;
      setWorkspaceView("tournaments");
      setTournamentStageView("draft");
      if (rerunId) {
        setExpandedDraftTournamentId(rerunId);
        setEditingTournamentTitleId(null);
      }
      setSuccessMessage("Rerun draft created.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to create rerun.");
    } finally {
      endAction(actionKey);
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
      await (isParallelParent ? archiveParallelTournament(tournamentId) : archiveTournament(tournamentId));

      setSuccessMessage("Bracket archived.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to archive bracket.");
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
      const data = await closeCurrentTournamentRound(tournamentId);
      if (data.item) {
        replaceTournamentInWorkspace(tournamentId, data.item);
      }
      await refreshTournamentMatches(tournamentId);
      setSuccessMessage(
        data.item?.status === "complete"
          ? "Bracket complete. Review progress and reveal rounds when ready."
          : "Round closed and bracket advanced."
      );
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to close the current round.");
    } finally {
      endAction(actionKey);
    }
  }

  async function handleSetManualMatchWinner(tournamentId, matchId, winnerEntryId) {
    const actionKey = `set-match-winner:${matchId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await setTournamentMatchWinner(matchId, winnerEntryId);
      replaceTournamentMatchInWorkspace(tournamentId, data.item);
      setSuccessMessage("Winner saved.");
      await loadWorkspace();
    } catch (error) {
      setErrorMessage(error.message || "Failed to update match winner.");
    } finally {
      endAction(actionKey);
    }
  }

  return {
    createDraftBracket,
    createDraftBracketFromPool,
    handleArchiveTournament,
    handleCloseCurrentRound,
    handleRerunTournament,
    handleSetManualMatchWinner,
    handleStartTournament,
    handleSyncTournamentWithPool,
    updateTournamentInline
  };
}

"use client";

import {
  archiveParallelTournament,
  archiveTournament,
  closeCurrentTournamentRound,
  openNextTournamentRound,
  rerunTournament,
  setTournamentMatchWinner,
  syncTournamentWithPool,
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
  SetWorkspaceView,
  WorkspaceTournament,
} from "./workspace-internal-types";
import { normalizeWorkspaceMatch } from "./workspace-data-api";
import { getErrorMessage } from "./workspace-internal-types";

type UseTournamentLifecycleActionsProps = {
  tournaments: WorkspaceTournament[];
  setWorkspaceView: SetWorkspaceView;
  setTournamentStageView: SetStageView;
  setExpandedDraftTournamentId: SetExpandedDraftId;
  setEditingTournamentTitleId: (value: string | null) => void;
  refreshTournamentMatches: RefreshTournamentMatches;
  replaceTournamentMatchInWorkspace: ReplaceTournamentMatch;
  replaceTournamentInWorkspace: ReplaceTournament;
  isActionPending: PendingActionChecker;
  beginAction: ActionMarker;
  endAction: ActionMarker;
  setErrorMessage: MessageSetter;
  setSuccessMessage: MessageSetter;
  loadWorkspace: LoadWorkspace;
};

export function useTournamentLifecycleActions({
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
}: UseTournamentLifecycleActionsProps) {
  async function handleSyncTournamentWithPool(tournamentId: string) {
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
          ? `Bracket synced with pool. Added ${addedEntryCount} candidate${addedEntryCount === 1 ? "" : "s"}.`
          : "Bracket synced with pool. No new candidates were added.",
      );
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to sync bracket with pool."));
    } finally {
      endAction(actionKey);
    }
  }

  async function handleRerunTournament(tournamentId: string) {
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
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create rerun."));
    } finally {
      endAction(actionKey);
    }
  }

  async function handleArchiveTournament(tournamentId: string, title: string) {
    const confirmed = window.confirm(`Archive "${title}"?\n\nThis will hide it from the main views, but keep its data and history.`);

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
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to archive bracket."));
    } finally {
      endAction(actionKey);
    }
  }

  async function handleCloseCurrentRound(tournamentId: string) {
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
      setSuccessMessage(data.item?.status === "complete" ? "Bracket complete. Review progress and reveal rounds when ready." : "Round closed and bracket advanced.");
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to close the current round."));
    } finally {
      endAction(actionKey);
    }
  }

  async function handleOpenNextRound(tournamentId: string) {
    const actionKey = `open-next-round:${tournamentId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await openNextTournamentRound(tournamentId);
      if (data.item) {
        replaceTournamentInWorkspace(tournamentId, data.item);
      }
      await refreshTournamentMatches(tournamentId);
      setSuccessMessage(data.item?.status === "complete" ? "Final results revealed." : "Results revealed and the next round is open.");
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to open the next round."));
    } finally {
      endAction(actionKey);
    }
  }

  async function handleSetManualMatchWinner(tournamentId: string, matchId: string, winnerEntryId: string | null) {
    const actionKey = `set-match-winner:${matchId}`;
    if (isActionPending(actionKey)) {
      return;
    }

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await setTournamentMatchWinner(matchId, winnerEntryId);
      replaceTournamentMatchInWorkspace(tournamentId, normalizeWorkspaceMatch(data.item));
      setSuccessMessage("Winner saved.");
      await loadWorkspace({ force: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to update match winner."));
    } finally {
      endAction(actionKey);
    }
  }

  return {
    handleArchiveTournament,
    handleCloseCurrentRound,
    handleOpenNextRound,
    handleRerunTournament,
    handleSetManualMatchWinner,
    handleSyncTournamentWithPool,
  };
}

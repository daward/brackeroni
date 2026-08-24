"use client";

import type { Dispatch, SetStateAction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { createPool, updateTournament } from "@/lib/client-api/create-workspace";
import type {
  ActionMarker,
  LoadWorkspace,
  MessageSetter,
  PendingActionChecker,
  PoolInlineDrafts,
  SetWorkspaceView,
  WorkspacePool,
} from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";

type CreatePoolRecordInput = {
  name?: string;
  description?: string | null;
  attachedTournamentId?: string | null;
  switchToPools?: boolean;
};

type UseBracketPoolActionsProps = {
  router: AppRouterInstance;
  setPoolInlineDrafts: Dispatch<SetStateAction<PoolInlineDrafts>>;
  setWorkspaceView: SetWorkspaceView;
  isActionPending: PendingActionChecker;
  beginAction: ActionMarker;
  endAction: ActionMarker;
  setErrorMessage: MessageSetter;
  setSuccessMessage: MessageSetter;
  loadWorkspace: LoadWorkspace;
};

export function useBracketPoolActions({
  router,
  setPoolInlineDrafts,
  setWorkspaceView,
  isActionPending,
  beginAction,
  endAction,
  setErrorMessage,
  setSuccessMessage,
  loadWorkspace,
}: UseBracketPoolActionsProps) {
  async function createPoolRecord({ name = "Untitled Pool", description = null, attachedTournamentId = null, switchToPools = false }: CreatePoolRecordInput = {}) {
    const actionKey = attachedTournamentId ? `create-pool-for-tournament:${attachedTournamentId}` : "create-pool";

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
        visibility: "private",
      });
      const createdPool = data.item;

      if (attachedTournamentId) {
        await updateTournament(attachedTournamentId, {
          sourcePoolId: createdPool.id,
        });
      }

      setPoolInlineDrafts((current) => ({
        ...current,
        [createdPool.id]: {
          name: createdPool.name,
          description: createdPool.description || "",
        },
      }));

      if (switchToPools) {
        setWorkspaceView("pools");
      }

      setSuccessMessage(attachedTournamentId ? "New pool created and linked to bracket." : "Pool created.");
      await loadWorkspace({ force: true });
      return createdPool;
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Failed to create pool."));
      return null;
    } finally {
      endAction(actionKey);
    }
  }

  function handleImportCandidatesIntoPool(pool: WorkspacePool) {
    if (pool.importSourceUrl) {
      try {
        const url = new URL(pool.importSourceUrl);
        const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
        hashParams.set("brackeroni-continue-pool", pool.id);
        hashParams.set("brackeroni-continue-name", pool.name);
        url.hash = hashParams.toString();
        window.open(url.toString(), "_blank");
        return;
      } catch {}
    }

    router.push(`/tools/import?poolId=${encodeURIComponent(pool.id)}&poolName=${encodeURIComponent(pool.name)}`);
  }

  return {
    createPoolRecord,
    handleImportCandidatesIntoPool,
  };
}

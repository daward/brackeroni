"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { WorkspaceSectionTabs } from "@/components/navigation/workspace-section-tabs";
import { ToastMessages } from "@/components/shared";
import { createPool } from "@/lib/client-api/create-workspace";
import { normalizePoolNavigationTarget } from "@/lib/create-workspace/pool-navigation";
import { OwnedPoolList } from "./owned-pool-list";
import { useOwnedPools } from "./use-owned-pools";
import type { PoolManagementWorkspaceProps } from "../types";

type PendingActions = Record<string, boolean>;

export function PoolManagementWorkspace({}: PoolManagementWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingActions, setPendingActions] = useState<PendingActions>({});
  const [isTransitionPending, startTransition] = useTransition();
  const poolCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const { isPending: isLoadingPools, loadPools, pagination, poolPage, pools, setPoolPage } = useOwnedPools({ onError: setErrorMessage });
  const isPending = isTransitionPending || isLoadingPools;

  const beginAction = useCallback((actionKey: string) => {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: true,
    }));
  }, []);

  const endAction = useCallback((actionKey: string) => {
    setPendingActions((current) => ({
      ...current,
      [actionKey]: false,
    }));
  }, []);

  const isActionPending = useCallback((actionKey: string) => Boolean(pendingActions[actionKey]), [pendingActions]);

  const openPool = useCallback(
    (nextPoolId: string | null, { history = "push" }: { history?: "push" | "replace" } = {}) => {
      const poolId = normalizePoolNavigationTarget(nextPoolId);

      if (poolId === undefined) {
        console.error("Ignoring invalid pool navigation target.");
        return;
      }

      const href = poolId ? `/pools/${poolId}` : "/pools";
      if (history === "push") {
        router.push(href);
        return;
      }

      router.replace(href);
    },
    [router],
  );

  const createPoolRecord = useCallback(async () => {
    const actionKey = "create-pool";
    if (isActionPending(actionKey)) return null;

    beginAction(actionKey);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const data = await createPool({
        name: "Untitled Pool",
        description: null,
        visibility: "private",
      });
      const createdPool = data.item;

      setSuccessMessage("Pool created.");
      await loadPools({ force: true });
      if (createdPool?.id) router.push(`/pools/${createdPool.id}`);
      return createdPool;
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create pool.");
      return null;
    } finally {
      endAction(actionKey);
    }
  }, [beginAction, endAction, isActionPending, loadPools, router]);

  return (
    <div className="space-y-6">
      <ToastMessages errorMessage={errorMessage} successMessage={successMessage} />
      <WorkspaceSectionTabs activeView="pools" />
      <OwnedPoolList
        pools={pools}
        poolPage={poolPage}
        pagination={pagination}
        loading={isPending}
        actionPending={isActionPending("create-pool")}
        poolRefs={poolCardRefs}
        onCreatePool={() => {
          startTransition(() => {
            void createPoolRecord();
          });
        }}
        onLoadMorePools={() => setPoolPage((current: number) => current + 1)}
        onOpenPool={(poolId) => {
          if (searchParams?.get("fromBracketSetup") === "1") {
            router.push(`/brackets/configuration?poolId=${poolId}`);
            return;
          }

          openPool(poolId);
        }}
      />
    </div>
  );
}

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { normalizePoolNavigationTarget } from "@/lib/create-workspace/pool-navigation";
import type { BracketStageView } from "./workspace-internal-types";

type UseBracketManagementNavigationProps = {
  router: AppRouterInstance;
  setTournamentPage: Dispatch<SetStateAction<number>>;
  setTournamentStageViewState: Dispatch<SetStateAction<BracketStageView>>;
  showCachedTournamentStage?: (stage: BracketStageView) => boolean;
};

export function useBracketManagementNavigation({ router, setTournamentPage, setTournamentStageViewState, showCachedTournamentStage }: UseBracketManagementNavigationProps) {
  const setWorkspaceView = useCallback(
    (nextView: "pools" | "tournaments") => {
      router.push(nextView === "pools" ? "/pools" : "/brackets");
    },
    [router],
  );

  const openPool = useCallback(
    (nextPoolId: string | null | undefined, { history = "push" }: { history?: "push" | "replace" } = {}) => {
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

  const setTournamentStageView = useCallback(
    (nextStage: BracketStageView, { history = "replace" }: { history?: "push" | "replace" } = {}) => {
      showCachedTournamentStage?.(nextStage);
      setTournamentStageViewState(nextStage);
      setTournamentPage(1);
      const href = `/brackets?stage=${encodeURIComponent(nextStage)}`;

      if (history === "push") {
        router.push(href);
        return;
      }

      router.replace(href);
    },
    [router, setTournamentPage, setTournamentStageViewState, showCachedTournamentStage],
  );

  return { openPool, setTournamentStageView, setWorkspaceView };
}

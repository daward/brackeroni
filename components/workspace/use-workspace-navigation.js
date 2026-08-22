import { useCallback } from "react";
import { normalizePoolNavigationTarget } from "@/lib/create-workspace/pool-navigation";

export function useWorkspaceNavigation({ router, setTournamentPage, setTournamentStageViewState, showCachedTournamentStage }) {
  const setWorkspaceView = useCallback((nextView) => {
    router.push(nextView === "pools" ? "/pools" : "/brackets");
  }, [router]);

  const openPool = useCallback((nextPoolId, { history = "push" } = {}) => {
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
  }, [router]);

  const setTournamentStageView = useCallback((nextStage, { history = "replace" } = {}) => {
    showCachedTournamentStage?.(nextStage);
    setTournamentStageViewState(nextStage);
    setTournamentPage(1);
    const href = `/brackets?stage=${encodeURIComponent(nextStage)}`;

    if (history === "push") {
      router.push(href);
      return;
    }

    router.replace(href);
  }, [router, setTournamentPage, setTournamentStageViewState, showCachedTournamentStage]);

  return { openPool, setTournamentStageView, setWorkspaceView };
}

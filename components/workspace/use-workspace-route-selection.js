import { useEffect, useRef } from "react";
import { normalizePoolNavigationTarget } from "@/lib/create-workspace/pool-navigation";

export function useWorkspaceRouteSelection({
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
}) {
  const poolSearchScrollHandledRef = useRef(null);

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    const requestedStage = searchParams?.get("stage");
    const requestedTournamentId = searchParams?.get("tournament");

    if (requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete") {
      setTournamentStageViewState(requestedStage);
    }

    if (!requestedTournamentId) {
      return;
    }

    const requestedTournament = tournaments.find((tournament) => tournament.id === requestedTournamentId);
    if (!requestedTournament) {
      return;
    }

    if (requestedTournament.status === "draft") {
      setTournamentStageViewState("draft");
      setExpandedDraftTournamentId(requestedTournament.id);
    } else if (requestedTournament.status === "active") {
      setTournamentStageViewState("active");
    } else if (requestedTournament.status === "complete") {
      setTournamentStageViewState("complete");
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

    const requestedPoolId = initialPoolId || searchParams?.get("pool");
    if (!requestedPoolId) {
      return;
    }

    const normalizedPoolId = normalizePoolNavigationTarget(requestedPoolId);
    if (!normalizedPoolId) {
      openPool(null, { history: "replace" });
      return;
    }

    const requestedPool = pools.find((pool) => pool.id === normalizedPoolId);
    if (!requestedPool) {
      let cancelled = false;

      ensurePoolInWorkspace(normalizedPoolId)
        .then((pool) => {
          if (!cancelled && pool) {
            setExpandedPoolId(pool.id);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setErrorMessage(error.message || "Failed to load pool.");
          }
        });

      return () => {
        cancelled = true;
      };
    }

    setExpandedPoolId(requestedPool.id);

    // Direct pool routes already enter at the appropriate document position.
    // Avoid a second, smooth page scroll after the route has rendered.
    if (initialPoolId || poolSearchScrollHandledRef.current === requestedPool.id) {
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
  }, [workspaceView, pools, initialPoolId, searchParams, openPool, ensurePoolInWorkspace, setErrorMessage]);
}


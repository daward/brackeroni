import { useEffect } from "react";

export function useWorkspacePoolHydration({
  ensurePoolDetails,
  expandedPoolId,
  setErrorMessage,
  workspaceView
}) {
  useEffect(() => {
    if (workspaceView !== "pools" || !expandedPoolId) {
      return;
    }

    ensurePoolDetails(expandedPoolId).catch((error) => {
      setErrorMessage(error.message || "Failed to load pool.");
    });
  }, [ensurePoolDetails, expandedPoolId, workspaceView]);
}


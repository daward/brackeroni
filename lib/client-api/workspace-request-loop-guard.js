const WORKSPACE_LIST_PATHS = new Set([
  "/api/pools",
  "/api/tournaments",
  "/api/parallel-tournaments"
]);

export function createWorkspaceRequestLoopGuard({
  windowMs = 5000,
  limit = 8,
  now = () => Date.now()
} = {}) {
  const requestTimesByPath = new Map();

  return {
    record(path, method = "GET") {
      if (method !== "GET" || !WORKSPACE_LIST_PATHS.has(path)) {
        return null;
      }

      const currentTime = now();
      const cutoff = currentTime - windowMs;
      const recentRequests = (requestTimesByPath.get(path) || []).filter(
        (requestTime) => requestTime >= cutoff
      );
      recentRequests.push(currentTime);
      requestTimesByPath.set(path, recentRequests);

      if (recentRequests.length <= limit) {
        return null;
      }

      return {
        path,
        count: recentRequests.length,
        windowMs,
        limit
      };
    }
  };
}
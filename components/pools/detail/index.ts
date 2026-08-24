/**
 * Public UI for the pool detail workspace.
 *
 * Import pool detail composition and actions only from this feature root;
 * implementation details remain private to `internal/`.
 */
export { PoolDetailActions } from "./internal/pool-detail-actions";
export { PoolDetailWorkspace } from "./internal/pool-detail-workspace";
export type { PoolDetail, PoolDetailWorkspaceProps } from "./types";

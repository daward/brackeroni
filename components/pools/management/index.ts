/**
 * Public UI for the signed-in pool management workspace.
 *
 * Import owned-pool workspace pages only from this feature root; implementation
 * details remain private to `internal/`.
 */
export { PoolManagementWorkspace } from "./internal/pool-management-workspace";
export type { PoolManagementWorkspaceProps } from "./types";

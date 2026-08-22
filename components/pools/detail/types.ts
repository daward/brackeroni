/**
 * Public contract for the owned-pool detail feature.
 *
 * The feature owns the editing workspace. Hosts provide the initial detail
 * record and should import this type from the feature entry point.
 */
import type { PoolDetail } from "@/lib/pools/types";

export type { PoolDetail } from "@/lib/pools/types";

export type PoolDetailWorkspaceProps = {
  initialPool: PoolDetail;
};

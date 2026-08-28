import type { PoolVisibility } from "@/lib/pools/types";

type PoolMutationPolicyRecord = {
  visibility?: PoolVisibility | string | null;
};

export function isPublicPoolVisibility(visibility: PoolVisibility | string | null | undefined) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function assertPoolMutable(pool: PoolMutationPolicyRecord, isAdmin = false) {
  if (isPublicPoolVisibility(pool.visibility) && !isAdmin) {
    throw new Error("POOL_LOCKED");
  }
}

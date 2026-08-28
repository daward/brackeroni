import type { ManagedPool, PoolVisibility } from "../types";

type SortableManagedPool = ManagedPool & {
  isOwned?: boolean | null;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

const POOL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Orders owned pools first, then most recently changed pools. */
export function sortManagedPools<T extends SortableManagedPool>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    const ownershipOrder = Number(Boolean(right.isOwned)) - Number(Boolean(left.isOwned));
    if (ownershipOrder) return ownershipOrder;

    const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();
    if (leftUpdatedAt !== rightUpdatedAt) return rightUpdatedAt - leftUpdatedAt;

    return left.name.localeCompare(right.name);
  });
}

export function normalizePoolNavigationTarget(value: unknown) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" && POOL_ID_PATTERN.test(value)) {
    return value;
  }

  return undefined;
}

export function isGeneratedPoolSourceDescription(description: string | null | undefined, sourceUrl: string | null | undefined) {
  if (!description || !sourceUrl) {
    return false;
  }

  try {
    return description.trim() === `Imported from ${new URL(sourceUrl).hostname}`;
  } catch {
    return false;
  }
}

/** Human-readable label for a pool's sharing state. */
export function describePoolVisibility(visibility: PoolVisibility | string | null | undefined) {
  if (visibility === "public_listed") return "Published";
  if (visibility === "public_unlisted") return "Published Unlisted";
  return "Private Draft";
}

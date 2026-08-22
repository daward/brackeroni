/** Orders owned pools first, then most recently changed pools. */
export function sortManagedPools(items) {
  return [...items].sort((left, right) => {
    const ownershipOrder = Number(Boolean(right.isOwned)) - Number(Boolean(left.isOwned));
    if (ownershipOrder) return ownershipOrder;

    const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();
    if (leftUpdatedAt !== rightUpdatedAt) return rightUpdatedAt - leftUpdatedAt;

    return left.name.localeCompare(right.name);
  });
}

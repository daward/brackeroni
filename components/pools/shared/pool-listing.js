export function sortManagedPools(items) {
  return [...items].sort((left, right) => {
    const leftOwnedRank = left.isOwned ? 0 : 1;
    const rightOwnedRank = right.isOwned ? 0 : 1;

    if (leftOwnedRank !== rightOwnedRank) {
      return leftOwnedRank - rightOwnedRank;
    }

    const leftUpdatedAt = new Date(left.updatedAt || left.createdAt || 0).getTime();
    const rightUpdatedAt = new Date(right.updatedAt || right.createdAt || 0).getTime();

    if (leftUpdatedAt !== rightUpdatedAt) {
      return rightUpdatedAt - leftUpdatedAt;
    }

    return left.name.localeCompare(right.name);
  });
}

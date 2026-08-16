export function getItemId(item) {
  return item?.id;
}

export function appendUniqueItems(currentItems, nextItems, getId = getItemId) {
  const seenIds = new Set(currentItems.map(getId).filter(Boolean));
  const additions = [];

  for (const item of nextItems) {
    const id = getId(item);
    if (!id || seenIds.has(id)) continue;
    seenIds.add(id);
    additions.push(item);
  }

  return [...currentItems, ...additions];
}

export function reconcileInitialPage(currentItems, previousInitialIds, nextInitialPage, getId = getItemId) {
  const nextInitialIds = new Set(nextInitialPage.map(getId).filter(Boolean));
  const loadedLater = currentItems.filter((item) => {
    const id = getId(item);
    return id && !previousInitialIds.has(id) && !nextInitialIds.has(id);
  });

  return appendUniqueItems(nextInitialPage, loadedLater, getId);
}

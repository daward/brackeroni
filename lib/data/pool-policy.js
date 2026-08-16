export function isPublicPoolVisibility(visibility) {
  return visibility === "public_listed" || visibility === "public_unlisted";
}

export function assertPoolMutable(pool, isAdmin = false) {
  if (isPublicPoolVisibility(pool.visibility) && !isAdmin) {
    throw new Error("POOL_LOCKED");
  }
}

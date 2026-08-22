/** Human-readable label for a pool's sharing state. */
export function describePoolVisibility(visibility) {
  if (visibility === "public_listed") return "Published";
  if (visibility === "public_unlisted") return "Published Unlisted";
  return "Private Draft";
}

/** Published pools keep a static title; editable pools expose an inline title field. */
export function getPoolTitlePresentation(pool) {
  return pool?.isReadOnly ? "static" : "editable";
}

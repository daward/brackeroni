export function getPoolTitlePresentation(pool) {
  return pool?.isReadOnly ? "static" : "editable";
}

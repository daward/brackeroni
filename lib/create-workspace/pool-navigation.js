const POOL_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePoolNavigationTarget(value) {
  if (value === null) {
    return null;
  }

  if (typeof value === "string" && POOL_ID_PATTERN.test(value)) {
    return value;
  }

  return undefined;
}
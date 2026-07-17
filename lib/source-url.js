export function resolveCandidateSourceUrl(sourceUrl, pageUrl = null) {
  const rawSourceUrl = String(sourceUrl || "").trim();

  if (!rawSourceUrl) {
    return null;
  }

  try {
    return new URL(rawSourceUrl).toString();
  } catch {}

  if (!pageUrl) {
    return rawSourceUrl;
  }

  try {
    return new URL(rawSourceUrl, pageUrl).toString();
  } catch {
    return rawSourceUrl;
  }
}

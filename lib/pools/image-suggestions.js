function normalizeImageMatchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isStrongSuggestedImageMatch(candidateName, suggestion) {
  const normalizedCandidateName = normalizeImageMatchText(candidateName);
  const normalizedTitle = normalizeImageMatchText(suggestion?.title);

  if (!normalizedCandidateName || !normalizedTitle) return false;
  if (normalizedTitle === normalizedCandidateName || normalizedTitle.includes(normalizedCandidateName)) return true;

  const nameTokens = normalizedCandidateName.split(/\s+/).filter(Boolean);
  if (nameTokens.length === 0) return false;

  const matchedTokenCount = nameTokens.filter((token) => normalizedTitle.includes(token)).length;
  const isTrustedSource = suggestion?.source === "Wikipedia" || suggestion?.source === "Wikimedia Commons";
  return isTrustedSource && matchedTokenCount === nameTokens.length;
}

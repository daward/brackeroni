type ImageSuggestion = {
  title?: string | null;
  source?: string | null;
};

type AutomaticImageSuggestionQueryOptions = {
  candidateId?: string | null;
  candidateName?: string | null;
  completedQuery?: string | null;
  isLoading?: boolean;
};

function normalizeImageMatchText(value: unknown) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getAutomaticImageSuggestionQuery({
  candidateId,
  candidateName,
  completedQuery,
  isLoading
}: AutomaticImageSuggestionQueryOptions) {
  const query = String(candidateName || "").trim();

  if (!candidateId || query.length < 2 || isLoading || completedQuery === query) {
    return null;
  }

  return query;
}

export function isStrongSuggestedImageMatch(candidateName: string | null | undefined, suggestion: ImageSuggestion | null | undefined) {
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

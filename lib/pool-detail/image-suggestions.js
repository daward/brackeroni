export function getAutomaticImageSuggestionQuery({ candidateId, candidateName, completedQuery, isLoading }) {
  const query = String(candidateName || "").trim();

  if (!candidateId || query.length < 2 || isLoading || completedQuery === query) {
    return null;
  }

  return query;
}

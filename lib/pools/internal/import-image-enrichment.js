import { isStrongSuggestedImageMatch, searchImageSuggestions } from "@/lib/images/suggestions";

const MAX_IMPORT_IMAGE_FILL_COUNT = 80;
const CONTEXT_TOKEN_ALLOWLIST = new Set([
  "face",
  "faces",
  "scan",
  "scans",
  "nhl",
  "brutal",
  "worst",
  "best",
  "ranking",
  "ranked",
  "list",
  "article",
  "hockey",
  "game"
]);

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

export function buildImportImageSearchContext(source, candidate = null) {
  return [
    source?.pageTitle,
    source?.prompt,
    candidate?.sourceTitle,
    candidate?.rationale,
    candidate?.excerpt
  ]
    .filter(Boolean)
    .join(" ");
}

function buildContextualImageQuery(candidate) {
  const name = String(candidate?.name || "").trim();
  const context = [
    candidate?.imageSearchContext,
    candidate?.description,
    ...(Array.isArray(candidate?.tags) ? candidate.tags : [])
  ]
    .filter(Boolean)
    .join(" ");
  const contextTokens = tokenize(context)
    .filter((token) => token.length > 2)
    .filter((token) => CONTEXT_TOKEN_ALLOWLIST.has(token))
    .slice(0, 6);

  if (!name || contextTokens.length === 0) {
    return name;
  }

  return `${name} ${contextTokens.join(" ")}`;
}

function hasContextualMatch(candidateName, query, suggestion) {
  if (!isStrongSuggestedImageMatch(candidateName, suggestion)) {
    return false;
  }

  const nameTokens = new Set(tokenize(candidateName));
  const contextTokens = tokenize(query).filter((token) => !nameTokens.has(token));

  if (contextTokens.length === 0) {
    return true;
  }

  const title = normalizeText(suggestion?.title);
  return contextTokens.some((token) => title.includes(token));
}

export async function fillMissingImportImages(candidates) {
  const items = Array.isArray(candidates) ? candidates : [];
  let checkedCount = 0;

  const enriched = [];

  for (const candidate of items) {
    if (candidate.imageUrl || checkedCount >= MAX_IMPORT_IMAGE_FILL_COUNT) {
      enriched.push(candidate);
      continue;
    }

    checkedCount += 1;

    try {
      const query = buildContextualImageQuery(candidate);
      const suggestions = await searchImageSuggestions(query);
      const bestSuggestion = suggestions.find((suggestion) => hasContextualMatch(candidate.name, query, suggestion));

      enriched.push({
        ...candidate,
        imageUrl: bestSuggestion?.imageUrl || null
      });
    } catch {
      enriched.push(candidate);
    }
  }

  return enriched;
}

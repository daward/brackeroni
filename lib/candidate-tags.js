const MAX_TAG_COUNT = 12;
const MAX_TAG_LENGTH = 120;

export function normalizeCandidateTags(tags) {
  if (!Array.isArray(tags)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const rawTag of tags) {
    const tag = String(rawTag || "").trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);

    if (!tag) {
      continue;
    }

    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(tag);

    if (normalized.length >= MAX_TAG_COUNT) {
      break;
    }
  }

  return normalized;
}

export function parseCandidateTagText(value) {
  return normalizeCandidateTags(String(value || "").split(","));
}

export function formatCandidateTagText(tags) {
  return normalizeCandidateTags(tags).join(", ");
}

export function getCandidateTagSummary(candidates) {
  const counts = new Map();

  for (const candidate of candidates) {
    for (const tag of candidate.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}

export function filterCandidatesByTag(candidates, tag) {
  if (!tag) {
    return candidates;
  }

  return candidates.filter((candidate) => (candidate.tags || []).includes(tag));
}

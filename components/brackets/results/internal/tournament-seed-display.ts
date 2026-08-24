import type { ResultEntry, ResultSeedingStructure } from "../types";
import type { EntrySeedDisplay } from "./tournament-result-types";

function normalizeSeedingStructure(seedingStructure: ResultSeedingStructure = {}) {
  const subBrackets = Array.isArray(seedingStructure.subBrackets)
    ? [...seedingStructure.subBrackets]
        .filter((subBracket) => typeof subBracket?.id === "string" && subBracket.id)
        .sort((left, right) => (left.index ?? 0) - (right.index ?? 0))
    : [];
  const subBracketIds = new Set(subBrackets.map((subBracket) => subBracket.id));
  const entryBrackets = Object.fromEntries(
    Object.entries(seedingStructure.entryBrackets || {}).filter(([entryId, bracketId]) => {
      return typeof entryId === "string" && typeof bracketId === "string" && subBracketIds.has(bracketId);
    }),
  );

  return {
    subBrackets,
    entryBrackets,
  };
}

export function buildEntrySeedDisplay(entries: ResultEntry[], seedingStructure: ResultSeedingStructure = {}) {
  const normalized = normalizeSeedingStructure(seedingStructure);
  const subBracketNameById = new Map(normalized.subBrackets.map((subBracket) => [subBracket.id, subBracket.name || ""]));
  const groups = new Map<string, ResultEntry[]>();

  for (const entry of entries) {
    const bracketId = normalized.entryBrackets[entry.id] || "__root__";
    const bucket = groups.get(bracketId) || [];
    bucket.push(entry);
    groups.set(bracketId, bucket);
  }

  const displayByEntryId = new Map<string, EntrySeedDisplay>();

  for (const [bracketId, groupEntries] of groups.entries()) {
    const sortedEntries = [...groupEntries].sort((left, right) => {
      if ((left.seed ?? 0) !== (right.seed ?? 0)) {
        return (left.seed ?? 0) - (right.seed ?? 0);
      }

      return (left.subSeed ?? 0) - (right.subSeed ?? 0);
    });
    const localSeedBySeed = new Map<number, number>();
    let nextLocalSeed = 1;

    for (const entry of sortedEntries) {
      if (!localSeedBySeed.has(entry.seed)) {
        localSeedBySeed.set(entry.seed, nextLocalSeed);
        nextLocalSeed += 1;
      }

      const localSeed = localSeedBySeed.get(entry.seed) ?? nextLocalSeed;
      const subBracketName = bracketId === "__root__" ? null : subBracketNameById.get(bracketId) || null;
      displayByEntryId.set(entry.id, {
        localSeed,
        subBracketName,
        label: subBracketName ? `Seed ${localSeed} / ${subBracketName}` : `Seed ${localSeed}`,
      });
    }
  }

  return displayByEntryId;
}

export function formatSeedLabel(
  seedDisplayByEntryId: Map<string, EntrySeedDisplay>,
  entryId: string,
  fallbackSeed?: number | null,
) {
  return seedDisplayByEntryId.get(entryId)?.label || `Seed ${fallbackSeed}`;
}

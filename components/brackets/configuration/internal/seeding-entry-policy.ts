import type { SeedingEntryRecord, SeedingPayloadEntry, SeedingStructure, SeedingValidation } from "@/lib/brackets/types";
import type { PoolCandidate } from "@/lib/pools/types";
import { buildSeedingGroups, createSeedingStructure, normalizeSeedingStructure } from "./seeding-draft";

let emptySlotCounter = 0;

type FlatCandidateSeedingEntryRecord = Omit<SeedingEntryRecord, "candidate"> & {
  candidate?: Pick<PoolCandidate, "id" | "name" | "description" | "imageUrl"> | null;
  candidateId?: string | null;
  candidateName?: string | null;
  candidateDescription?: string | null;
  candidateImageUrl?: string | null;
};

export type SeedingEntry = SeedingEntryRecord & {
  isEmptySlot: boolean;
  subSeed: number;
};

export function createEmptySlot(playInSeed: number, playInSlot = 0): SeedingEntry {
  emptySlotCounter += 1;
  return {
    id: `empty-slot-${emptySlotCounter}`,
    seed: playInSeed,
    subSeed: playInSlot,
    finalRank: null,
    candidate: null,
    isEmptySlot: true,
  };
}

function normalizeCandidate(entry: FlatCandidateSeedingEntryRecord): Pick<PoolCandidate, "id" | "name" | "description" | "imageUrl"> | null {
  if (entry.candidate) return entry.candidate;
  if (!entry.candidateName) return null;
  return {
    id: entry.candidateId ?? "",
    name: entry.candidateName,
    description: entry.candidateDescription,
    imageUrl: entry.candidateImageUrl,
  };
}

function normalizeSeedingEntry(entry: FlatCandidateSeedingEntryRecord): SeedingEntryRecord {
  const { candidateId, candidateName, candidateDescription, candidateImageUrl, ...record } = entry;
  return {
    ...record,
    candidate: normalizeCandidate(entry),
  };
}

export function normalizeSeedingEntries(entries: FlatCandidateSeedingEntryRecord[]): SeedingEntry[] {
  return [...entries].map((entry) => ({
    ...normalizeSeedingEntry(entry),
    subSeed: Number(entry.subSeed || 0),
    isEmptySlot: Boolean(entry.isEmptySlot),
  }));
}

export function hydrateSeedingEntries(entries: FlatCandidateSeedingEntryRecord[] | null | undefined): SeedingEntry[] {
  return normalizeSeedingEntries((entries || []).map((entry) => ({ ...entry, isEmptySlot: false })));
}

export function validateSeedingEntries(entries: SeedingEntry[], structure: SeedingStructure = createSeedingStructure()): SeedingValidation {
  const issues: string[] = [];
  const groups = buildSeedingGroups(entries, structure);
  const localPlayInIds = new Set<string>();
  groups.forEach((group) =>
    group.entries.forEach(({ entry, isLocalPlayInSlot }) => {
      if (isLocalPlayInSlot) localPlayInIds.add(entry.id);
    }),
  );
  entries.forEach((entry) => {
    const normalizedSubSeed = Number(entry.subSeed || 0);
    if (entry.isEmptySlot) issues.push("empty-slot");
    if (normalizedSubSeed > 0 && !localPlayInIds.has(entry.id)) issues.push("orphan-play-in", "split-play-in");
    if (!localPlayInIds.has(entry.id) && !entry.isEmptySlot && normalizedSubSeed !== 0) issues.push("invalid-subseed");
  });
  for (const group of groups) {
    for (let index = 0; index < group.entries.length; index += 1) {
      const current = group.entries[index];
      const next = group.entries[index + 1];
      if (!current?.isLocalPlayInSlot) continue;
      if (!next?.isLocalPlayInSlot) {
        issues.push("malformed-play-in");
        continue;
      }
      index += 1;
    }
  }
  return { isValidForSave: issues.length === 0, hasEmptySlot: issues.includes("empty-slot"), issues };
}

export function buildCanonicalSeedingPayload(entries: SeedingEntry[], structure: SeedingStructure): SeedingPayloadEntry[] {
  const groups = buildSeedingGroups(entries, structure);
  const payload: SeedingPayloadEntry[] = [];
  let nextSeed = 1;
  groups.forEach((group) => {
    for (let index = 0; index < group.entries.length; index += 1) {
      const current = group.entries[index];
      const next = group.entries[index + 1];
      if (current.isLocalPlayInSlot && next?.isLocalPlayInSlot) {
        const playableEntries = [current.entry, next.entry].filter((entry) => !entry.isEmptySlot);
        playableEntries.forEach((entry, subSeed) => payload.push({ id: entry.id, seed: nextSeed, subSeed }));
        if (playableEntries.length) nextSeed += 1;
        index += 1;
        continue;
      }
      if (!current || current.entry.isEmptySlot) continue;
      payload.push({ id: current.entry.id, seed: nextSeed, subSeed: 0 });
      nextSeed += 1;
    }
  });
  return payload;
}

export function buildSeedingSnapshot(entries: SeedingEntry[], structure: SeedingStructure): string {
  const normalizedEntries = buildCanonicalSeedingPayload(entries, structure);
  const normalizedStructure = normalizeSeedingStructure(structure, normalizedEntries);
  const sortedEntryBrackets = Object.fromEntries(Object.entries(normalizedStructure.entryBrackets).sort(([leftId], [rightId]) => leftId.localeCompare(rightId)));
  return JSON.stringify({ entries: normalizedEntries, structure: { subBrackets: normalizedStructure.subBrackets, entryBrackets: sortedEntryBrackets } });
}

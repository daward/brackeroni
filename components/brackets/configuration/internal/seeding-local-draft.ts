import type { SeedingEntryRecord, SeedingPayloadEntry, SeedingStructure } from "@/lib/brackets/types";
import { createSeedingStructure } from "./seeding-draft";
import { hydrateSeedingEntries, type SeedingEntry } from "./seeding-entry-policy";

export type LocalSeedingDraft = { snapshot: string; payload: SeedingPayloadEntry[]; structure: SeedingStructure };

function storageTarget(tournamentId: string) {
  if (!tournamentId || typeof window === "undefined") return null;
  return { key: `brackeroni.seeding-draft:${tournamentId}`, storage: window.localStorage };
}

export function readLocalSeedingDraft(tournamentId: string): LocalSeedingDraft | null {
  try {
    const target = storageTarget(tournamentId);
    const raw = target?.storage.getItem(target.key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const draft = parsed as Partial<LocalSeedingDraft>;
    return {
      snapshot: typeof draft.snapshot === "string" ? draft.snapshot : "",
      payload: Array.isArray(draft.payload) ? draft.payload : [],
      structure: draft.structure && typeof draft.structure === "object" ? draft.structure : createSeedingStructure(),
    };
  } catch {
    return null;
  }
}

export function writeLocalSeedingDraft(tournamentId: string, draft: LocalSeedingDraft) {
  try {
    const target = storageTarget(tournamentId);
    target?.storage.setItem(target.key, JSON.stringify(draft));
  } catch {
    /* storage is optional */
  }
}
export function clearLocalSeedingDraft(tournamentId: string) {
  try {
    const target = storageTarget(tournamentId);
    target?.storage.removeItem(target.key);
  } catch {
    /* storage is optional */
  }
}

export function hydrateEntriesFromDraftPayload(serverEntries: SeedingEntryRecord[], draftPayload: SeedingPayloadEntry[]): SeedingEntry[] {
  if (!draftPayload.length) return hydrateSeedingEntries(serverEntries);
  const serverById = new Map(serverEntries.map((entry) => [entry.id, entry]));
  const used = new Set<string>();
  const restored = draftPayload.flatMap((entry) => {
    const server = serverById.get(entry.id);
    if (!server) return [];
    used.add(entry.id);
    const seed = Number.isInteger(entry.seed) ? entry.seed : server.seed;
    const subSeed = Number.isInteger(entry.subSeed) ? entry.subSeed : (server.subSeed ?? 0);
    return [{ ...server, seed, subSeed }];
  });
  return hydrateSeedingEntries([...restored, ...serverEntries.filter((entry) => !used.has(entry.id))]);
}

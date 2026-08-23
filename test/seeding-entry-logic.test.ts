import { describe, expect, it } from "vitest";
import { buildSeedingGroups, createSeedingStructure } from "../lib/brackets/seeding-draft";
import { buildCanonicalSeedingPayload, createEmptySlot, validateSeedingEntries } from "../lib/brackets/seeding-entry-policy";
const entry = (id: string, seed: number) => ({
  id,
  seed,
  subSeed: 0,
  finalRank: null,
  candidateId: id,
  candidateName: id,
  candidateDescription: "",
  candidateImageUrl: null,
  isEmptySlot: false,
});
describe("seeding entry policy", () => {
  it("accepts paired play-ins and rejects orphaned entries", () => {
    const paired = [entry("a", 1), { ...entry("b", 2), seed: 1, subSeed: 1 }];
    expect(validateSeedingEntries(paired).isValidForSave).toBe(true);
    expect(validateSeedingEntries([entry("a", 1), { ...entry("b", 2), subSeed: 1 }]).isValidForSave).toBe(false);
  });
  it("marks empty slots invalid and excludes them from canonical saves", () => {
    const entries = [entry("a", 1), createEmptySlot(1, 1)];
    expect(validateSeedingEntries(entries).hasEmptySlot).toBe(true);
    expect(buildCanonicalSeedingPayload(entries, createSeedingStructure())).toEqual([{ id: "a", seed: 1, subSeed: 0 }]);
  });
  it("does not render play-ins across bracket boundaries", () => {
    const groups = buildSeedingGroups([entry("a", 1), { ...entry("b", 2), seed: 1, subSeed: 1 }], {
      subBrackets: [{ id: "east", index: 0, name: "East" }],
      entryBrackets: { a: "east" },
    });
    expect(groups[0]?.entries[0]?.isLocalPlayInSlot).toBe(false);
  });
});

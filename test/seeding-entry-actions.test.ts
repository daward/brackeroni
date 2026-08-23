import { describe, expect, it } from "vitest";
import { moveEntryToIndex, removeFromPlayInEntries, togglePlayInEntries } from "../lib/brackets/seeding-entry-actions";
import { createEmptySlot } from "../lib/brackets/seeding-entry-policy";

const entry = (id: string, seed: number) => ({
  id,
  seed,
  subSeed: 0,
  finalRank: null,
  candidateId: id,
  candidateName: id,
  candidateDescription: null,
  candidateImageUrl: null,
  isEmptySlot: false,
});

describe("seeding entry actions", () => {
  it("creates a play-in pair at the first entry seed", () => {
    expect(togglePlayInEntries([entry("a", 1), entry("b", 2)], "a", "b").map(({ id, seed, subSeed }) => ({ id, seed, subSeed }))).toEqual([
      { id: "a", seed: 1, subSeed: 0 },
      { id: "b", seed: 1, subSeed: 1 },
    ]);
  });

  it("replaces an empty slot while retaining its seed", () => {
    expect(moveEntryToIndex([entry("a", 1), createEmptySlot(2)], 0, 1).map(({ id, seed }) => ({ id, seed }))).toEqual([{ id: "a", seed: 2 }]);
  });

  it("removes a play-in pair without retaining the temporary empty slot", () => {
    const entries = togglePlayInEntries([entry("a", 1), entry("b", 2)], "a", "b");
    expect(
      removeFromPlayInEntries(entries, "a", "b")
        .filter((item) => !item.isEmptySlot)
        .map(({ id, seed, subSeed }) => ({ id, seed, subSeed })),
    ).toEqual([
      { id: "b", seed: 1, subSeed: 1 },
      { id: "a", seed: 1, subSeed: 0 },
    ]);
  });
});

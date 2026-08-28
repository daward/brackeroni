import { describe, expect, it } from "vitest";
import { buildSeedingSnapshot, validateSeedingEntries } from "@/components/brackets/configuration";

describe("seeding response fallback", () => {
  it("distinguishes dropped bracket assignments in snapshots", () => {
    const entries = [
      { id: "a", seed: 1, subSeed: 0, isEmptySlot: false },
      { id: "b", seed: 2, subSeed: 0, isEmptySlot: false },
    ];

    expect(buildSeedingSnapshot(entries, { subBrackets: [{ id: "west", index: 0, name: "West" }], entryBrackets: { a: "west" } })).not.toBe(
      buildSeedingSnapshot(entries, { subBrackets: [{ id: "west", index: 0, name: "West" }], entryBrackets: {} }),
    );
  });

  it("reports invalid empty-slot saves", () => {
    expect(validateSeedingEntries([{ id: "p1", seed: 1, subSeed: 0, isEmptySlot: true }]).isValidForSave).toBe(false);
  });
});

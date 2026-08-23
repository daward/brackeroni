import { describe, expect, it } from "vitest";
import { assignEntryToGroup, buildMoveTargets, buildSeedingGroups, normalizeSeedingStructure, updateSubBracketName } from "../lib/brackets/seeding-draft";
const entry = (id: string, seed: number) => ({ id, seed, subSeed: 0, isEmptySlot: false });
describe("seeding draft policy", () => {
  it("normalizes legacy structures", () => {
    const result = normalizeSeedingStructure({ subBracketNames: { a: "West", b: "East" }, emptySubBrackets: ["b"], groupOrder: ["a", "b"], entryGroups: { e1: "a" } }, [
      entry("e1", 1),
    ]);
    expect(result).toEqual({
      subBrackets: [
        { id: "a", index: 0, name: "West" },
        { id: "b", index: 1, name: "East" },
      ],
      entryBrackets: { e1: "a" },
    });
  });
  it("uses the insertion position for empty sub-brackets", () => {
    const groups = buildSeedingGroups([entry("e1", 1), entry("e2", 2)], {
      subBrackets: [
        { id: "a", index: 0, name: "A" },
        { id: "b", index: 1, name: "B" },
      ],
      entryBrackets: { e1: "a" },
    });
    expect(buildMoveTargets(groups).find((target) => target.id === "b")?.insertIndex).toBe(1);
  });
  it("assigns and unassigns entries without changing other entries", () => {
    const entries = [entry("e1", 1), entry("e2", 2)];
    const structure = {
      subBrackets: [
        { id: "a", index: 0, name: "A" },
        { id: "b", index: 1, name: "B" },
      ],
      entryBrackets: { e1: "a" },
    };
    expect(assignEntryToGroup(structure, entries, "e2", "b").entryBrackets).toEqual({ e1: "a", e2: "b" });
    expect(assignEntryToGroup(structure, entries, "e1", "__root__").entryBrackets).toEqual({});
  });
  it("preserves editable empty names and drops invalid assignments", () => {
    expect(updateSubBracketName({ subBrackets: [{ id: "a", index: 0, name: "Old" }], entryBrackets: {} }, "a", "").subBrackets[0]?.name).toBe("");
    expect(normalizeSeedingStructure({ subBrackets: [{ id: "a", index: 0, name: "A" }], entryBrackets: { missing: "a" } }, [entry("e1", 1)]).entryBrackets).toEqual({});
  });
  it("keeps play-ins inside a sub-bracket and hides detached empty slots", () => {
    const detached = buildSeedingGroups([{ ...entry("e1", 1), isEmptySlot: true }, entry("e2", 2)], { subBrackets: [], entryBrackets: {} });
    expect(detached[0]?.entries.map((item) => item.entry.id)).toEqual(["e2"]);
    const split = buildSeedingGroups([entry("e1", 1), { ...entry("e2", 1), subSeed: 1 }], { subBrackets: [{ id: "east", index: 0, name: "East" }], entryBrackets: { e1: "east" } });
    expect(split[0]?.entries[0]?.isLocalPlayInSlot).toBe(false);
  });
});

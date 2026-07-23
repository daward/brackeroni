import test from "node:test";
import assert from "node:assert/strict";

import { __seedingTestUtils } from "../components/use-seeding-actions.js";

function entry(id, seed) {
  return {
    id,
    seed,
    subSeed: 0,
    finalRank: null,
    candidateId: id,
    candidateName: id,
    candidateDescription: "",
    candidateImageUrl: null,
    isEmptySlot: false
  };
}

test("toggle play-in creates a valid paired seed", () => {
  const initial = [entry("a", 1), entry("b", 2), entry("c", 3)];
  const next = __seedingTestUtils.togglePlayInAtIndexEntries(initial, 0);

  assert.equal(next[0].seed, 1);
  assert.equal(next[1].seed, 1);
  assert.equal(next[0].subSeed, 0);
  assert.equal(next[1].subSeed, 1);
  assert.equal(__seedingTestUtils.validateSeedingEntries(next).isValidForSave, true);
});

test("remove from play-in leaves local empty slot and marks draft invalid", () => {
  const initial = __seedingTestUtils.togglePlayInAtIndexEntries([entry("a", 1), entry("b", 2)], 0);
  const next = __seedingTestUtils.removeFromPlayInAtIndexEntries(initial, 0);

  assert.equal(next.length, 3);
  assert.equal(next[0].isEmptySlot, true);
  assert.equal(next[1].id, "b");
  assert.equal(next[2].id, "a");
  assert.equal(__seedingTestUtils.validateSeedingEntries(next).isValidForSave, false);
});

test("removing an existing empty-side play-in leaves the remaining real candidate", () => {
  const initial = __seedingTestUtils.togglePlayInAtIndexEntries([entry("a", 1), entry("b", 2)], 0);
  const withEmptySlot = [
    __seedingTestUtils.createEmptySlot(1, 0),
    { ...initial[1] }
  ];
  const collapsed = __seedingTestUtils.removeFromPlayInAtIndexEntries(withEmptySlot, 1);

  assert.equal(collapsed.length, 1);
  assert.equal(collapsed[0].id, "b");
  assert.equal(collapsed[0].subSeed, 0);
  assert.equal(__seedingTestUtils.validateSeedingEntries(collapsed).isValidForSave, true);
});

test("moving a normal entry into an empty slot fills it as play-in", () => {
  const withEmptySlot = [
    entry("a", 1),
    __seedingTestUtils.createEmptySlot(1, 1),
    entry("b", 2),
    entry("c", 3)
  ];
  const moved = __seedingTestUtils.moveEntryToIndex(withEmptySlot, 3, 1);

  assert.equal(moved[0].seed, moved[1].seed);
  assert.equal(moved[0].subSeed, 0);
  assert.equal(moved[1].subSeed, 1);
});

test("validator catches orphan play-in and non-zero subseed outside play-ins", () => {
  const badEntries = [
    { ...entry("a", 1), subSeed: 0 },
    { ...entry("b", 2), subSeed: 1 }
  ];

  const validation = __seedingTestUtils.validateSeedingEntries(badEntries);

  assert.equal(validation.isValidForSave, false);
  assert.equal(validation.issues.includes("invalid-subseed"), true);
});

test("validator rejects play-ins split across sub-brackets", () => {
  const pair = __seedingTestUtils.togglePlayInAtIndexEntries([entry("a", 1), entry("b", 2)], 0);
  const validation = __seedingTestUtils.validateSeedingEntries(pair, {
    subBrackets: [{ id: "east", index: 0, name: "East" }],
    entryBrackets: {
      a: "east"
    }
  });

  assert.equal(validation.isValidForSave, false);
  assert.equal(validation.issues.includes("split-play-in"), true);
});

import test from "node:test";
import assert from "node:assert/strict";

import { __seedingTestUtils } from "../components/use-seeding-actions.js";

test("save snapshot changes when a bracket assignment is dropped", () => {
  const entries = [
    { id: "a", seed: 1, subSeed: 0 },
    { id: "b", seed: 2, subSeed: 0 }
  ];
  const localStructure = {
    subBrackets: [{ id: "west", index: 0, name: "West" }],
    entryBrackets: { a: "west" }
  };
  const persistedStructure = {
    subBrackets: [{ id: "west", index: 0, name: "West" }],
    entryBrackets: {}
  };

  const localSnapshot = __seedingTestUtils.buildSeedingSnapshot(entries, localStructure);
  const persistedSnapshot = __seedingTestUtils.buildSeedingSnapshot(entries, persistedStructure);

  assert.notEqual(persistedSnapshot, localSnapshot);
});

test("save snapshot is stable across sub-bracket ordering differences", () => {
  const entries = [
    { id: "a", seed: 1, subSeed: 0 },
    { id: "b", seed: 2, subSeed: 0 }
  ];
  const localStructure = {
    subBrackets: [
      { id: "east", index: 1, name: "East" },
      { id: "west", index: 0, name: "West" }
    ],
    entryBrackets: { b: "east", a: "west" }
  };
  const serverStructure = {
    subBrackets: [
      { id: "west", index: 0, name: "West" },
      { id: "east", index: 1, name: "East" }
    ],
    entryBrackets: { a: "west", b: "east" }
  };

  const localSnapshot = __seedingTestUtils.buildSeedingSnapshot(entries, localStructure);
  const serverSnapshot = __seedingTestUtils.buildSeedingSnapshot(entries, serverStructure);

  assert.equal(serverSnapshot, localSnapshot);
});

test("play-in validator still detects invalid empty slot state", () => {
  const entries = [
    {
      id: "p1",
      seed: 1,
      subSeed: 0,
      isEmptySlot: true
    }
  ];

  const validation = __seedingTestUtils.validateSeedingEntries(entries);

  assert.equal(validation.isValidForSave, false);
  assert.equal(validation.hasEmptySlot, true);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  assignEntryToGroup,
  buildMoveTargets,
  buildSeedingGroups,
  normalizeSeedingStructure,
  updateSubBracketName
} from "../components/seeding-draft.js";

function entry(id, seed) {
  return {
    id,
    seed,
    subSeed: 0,
    isEmptySlot: false
  };
}

test("normalizeSeedingStructure converts legacy group shape to canonical sub-brackets", () => {
  const entries = [entry("e1", 1), entry("e2", 2)];
  const legacyStructure = {
    subBracketNames: {
      "group-a": "West",
      "group-b": "East"
    },
    collapsedGroups: {
      "group-b": true
    },
    emptySubBrackets: ["group-b"],
    groupOrder: ["group-a", "group-b"],
    entryGroups: {
      e1: "group-a"
    }
  };

  const normalized = normalizeSeedingStructure(legacyStructure, entries);

  assert.deepEqual(normalized.subBrackets, [
    { id: "group-a", index: 0, name: "West" },
    { id: "group-b", index: 1, name: "East" }
  ]);
  assert.deepEqual(normalized.entryBrackets, { e1: "group-a" });
});

test("move targets for empty sub-brackets use computed start index", () => {
  const entries = [entry("e1", 1), entry("e2", 2), entry("e3", 3)];
  const structure = {
    subBrackets: [
      { id: "group-a", index: 0, name: "A" },
      { id: "group-b", index: 1, name: "B" }
    ],
    entryBrackets: {
      e1: "group-a"
    }
  };

  const groups = buildSeedingGroups(entries, structure);
  const targets = buildMoveTargets(groups);
  const emptyGroupTarget = targets.find((target) => target.id === "group-b");

  assert.ok(emptyGroupTarget);
  assert.equal(emptyGroupTarget.insertIndex, 1);
});

test("assignEntryToGroup mutates only the targeted entry bracket", () => {
  const entries = [entry("e1", 1), entry("e2", 2), entry("e3", 3)];
  const structure = {
    subBrackets: [
      { id: "group-a", index: 0, name: "A" },
      { id: "group-b", index: 1, name: "B" }
    ],
    entryBrackets: {
      e1: "group-a",
      e2: "group-a"
    }
  };

  const next = assignEntryToGroup(structure, entries, "e3", "group-b");

  assert.equal(next.entryBrackets.e1, "group-a");
  assert.equal(next.entryBrackets.e2, "group-a");
  assert.equal(next.entryBrackets.e3, "group-b");
});

test("assignEntryToGroup to root removes bracket assignment", () => {
  const entries = [entry("e1", 1), entry("e2", 2)];
  const structure = {
    subBrackets: [{ id: "group-a", index: 0, name: "A" }],
    entryBrackets: {
      e1: "group-a"
    }
  };

  const next = assignEntryToGroup(structure, entries, "e1", "__root__");

  assert.equal(Object.prototype.hasOwnProperty.call(next.entryBrackets, "e1"), false);
});

test("updateSubBracketName updates the targeted canonical sub-bracket", () => {
  const structure = {
    subBrackets: [{ id: "group-z", index: 0, name: "Old" }],
    entryBrackets: {}
  };

  const renamed = updateSubBracketName(structure, "group-z", "West");

  assert.deepEqual(renamed.subBrackets, [{ id: "group-z", index: 0, name: "West" }]);
});

test("normalizeSeedingStructure drops invalid bracket assignments while preserving defined brackets", () => {
  const entries = [entry("e1", 1), entry("e2", 2)];
  const structure = {
    subBrackets: [
      { id: "group-a", index: 0, name: "West" },
      { id: "group-b", index: 1, name: "East" }
    ],
    entryBrackets: {
      e1: "group-a",
      missing: "group-b"
    }
  };

  const pruned = normalizeSeedingStructure(structure, entries);

  assert.deepEqual(pruned.subBrackets, structure.subBrackets);
  assert.deepEqual(pruned.entryBrackets, { e1: "group-a" });
});

test("detached empty slot rows are hidden from the group display", () => {
  const entries = [
    { ...entry("e1", 1), isEmptySlot: true, subSeed: 0 },
    entry("e2", 2)
  ];
  const groups = buildSeedingGroups(entries, createStructure());

  assert.equal(groups[0].entries.length, 1);
  assert.equal(groups[0].entries[0].entry.id, "e2");
  assert.equal(groups[0].entries[0].displaySeed, 1);
});

test("play-ins do not render across sub-bracket boundaries", () => {
  const entries = [
    { ...entry("e1", 5), subSeed: 0 },
    { ...entry("e2", 5), subSeed: 1 }
  ];
  const groups = buildSeedingGroups(entries, {
    subBrackets: [{ id: "east", index: 0, name: "East" }],
    entryBrackets: {
      e1: "east"
    }
  });

  assert.equal(groups[0].entries[0].isLocalPlayInSlot, false);
  assert.equal(groups[1].entries[0].isLocalPlayInSlot, false);
});

test("empty slot stays in the same sub-bracket as its play-in mate", () => {
  const entries = [
    { ...entry("e1", 1), isEmptySlot: true, subSeed: 0 },
    { ...entry("e2", 1), subSeed: 1 },
    entry("e3", 2)
  ];
  const groups = buildSeedingGroups(entries, {
    subBrackets: [{ id: "east", index: 0, name: "East" }],
    entryBrackets: {
      e2: "east"
    }
  });

  assert.equal(groups[0].entries.length, 2);
  assert.equal(groups[0].entries[0].entry.isEmptySlot, true);
  assert.equal(groups[0].entries[1].entry.id, "e2");
  assert.equal(groups[1].entries.length, 1);
  assert.equal(groups[1].entries[0].entry.id, "e3");
});

function createStructure() {
  return {
    subBrackets: [],
    entryBrackets: {}
  };
}

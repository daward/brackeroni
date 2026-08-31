import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { parseSeedingStructure } from "@/lib/brackets/engine/seeding-structure";

describe("seeding structure parsing", () => {
  it("parses serialized seeding structures", () => {
    const structure = parseSeedingStructure(JSON.stringify({
      subBrackets: [{ id: "east", name: "East" }],
      entryBrackets: { "entry-1": "east" },
    }));

    assert.deepEqual(structure, {
      subBrackets: [{ id: "east", name: "East" }],
      entryBrackets: { "entry-1": "east" },
    });
  });

  it("falls back to an empty structure for invalid values", () => {
    assert.deepEqual(parseSeedingStructure("not json"), {});
    assert.deepEqual(parseSeedingStructure(null), {});
    assert.deepEqual(parseSeedingStructure(42), {});
  });
});

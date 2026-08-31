import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { buildSwissStandings } from "@/lib/brackets/engine/swiss-standings";

describe("Swiss standings", () => {
  it("counts right-side wins and byes", () => {
    const standings = buildSwissStandings(
      [{ id: "one", seed: 1 }, { id: "two", seed: 2 }, { id: "three", seed: 3 }],
      [
        { leftEntryId: "one", rightEntryId: "two", winnerEntryId: "two" },
        { rightEntryId: "three" },
      ],
    );

    assert.deepEqual(standings.map((standing) => [standing.id, standing.wins]), [
      ["two", 1],
      ["three", 1],
      ["one", 0],
    ]);
  });

  it("ignores matches with unknown entries", () => {
    const standings = buildSwissStandings(
      [{ id: "one", seed: 1 }, { id: "two", seed: 2 }],
      [{ leftEntryId: "one", rightEntryId: "missing", winnerEntryId: "one" }],
    );

    assert.deepEqual(standings.map((standing) => standing.played), [0, 0]);
  });

  it("uses opponent wins before played count and seed", () => {
    const standings = buildSwissStandings(
      [1, 2, 3, 4].map((seed) => ({ id: `entry-${seed}`, seed })),
      [
        { leftEntryId: "entry-1", rightEntryId: "entry-2", winnerEntryId: "entry-1" },
        { leftEntryId: "entry-2", rightEntryId: "entry-3", winnerEntryId: "entry-2" },
        { leftEntryId: "entry-3", rightEntryId: "entry-4", winnerEntryId: "entry-3" },
      ],
    );

    assert.deepEqual(standings.map((standing) => standing.id), [
      "entry-2",
      "entry-3",
      "entry-1",
      "entry-4",
    ]);
  });
});

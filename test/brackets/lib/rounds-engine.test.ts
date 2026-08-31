import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { buildInitialRound, buildNextRound, buildSwissRound } from "@/lib/brackets/engine/rounds";

describe("bracket round engine", () => {
  function entry(id: string, seed: number, subSeed = 0) {
    return { id, seed, subSeed };
  }

  it("creates play-in matches for duplicate seeds", () => {
    const matches = buildInitialRound([
      entry("one", 1),
      entry("two-a", 2, 0),
      entry("two-b", 2, 1),
      entry("three", 3),
    ]);

    assert.deepEqual(matches.map((match) => match.pairKey), [
      "round-1-seed-1-bye",
      "round-1-play-in-seed-2",
      "round-1-seed-3-bye",
    ]);
  });

  it("assigns fixed-bracket byes by slot order", () => {
    const matches = buildNextRound(
      [entry("one", 1), entry("two", 2), entry("three", 3)],
      { playStyle: "fixed_bracket", roundNumber: 2 },
    );

    assert.equal(matches[0].winnerEntryId, "one");
    assert.equal(matches[1].pairKey, "round-2-slot-2-2-3");
  });

  it("reseeds non-power-of-two rounds with top seeds on bye", () => {
    const matches = buildNextRound(
      [1, 2, 3, 4, 5, 6].map((seed) => entry(`entry-${seed}`, seed)),
      { playStyle: "reseed", roundNumber: 2 },
    );

    assert.deepEqual(matches.map((match) => match.pairKey), [
      "round-2-seed-1-bye",
      "round-2-seed-2-bye",
      "round-2-seed-3-6",
      "round-2-seed-4-5",
    ]);
  });

  it("rejects rounds without enough entries", () => {
    assert.throws(() => buildInitialRound([entry("one", 1)]), /NOT_ENOUGH_ENTRIES/);
    assert.throws(
      () => buildNextRound([entry("one", 1)], { playStyle: "fixed_bracket", roundNumber: 2 }),
      /NOT_ENOUGH_ENTRIES/,
    );
  });

  it("pairs Swiss first rounds across the bracket halves", () => {
    const matches = buildSwissRound(
      [1, 2, 3, 4, 5].map((seed) => entry(`entry-${seed}`, seed)),
      { roundNumber: 1 },
    );

    assert.equal(matches[0].pairKey, "round-1-swiss-bye-3");
    assert.deepEqual(matches.slice(1).map((match) => match.pairKey), [
      "round-1-swiss-1-4",
      "round-1-swiss-2-5",
    ]);
  });

  it("falls back to Swiss rematches when no clean pairing exists", () => {
    const matches = buildSwissRound(
      [entry("one", 1), entry("two", 2)],
      {
        roundNumber: 2,
        priorMatches: [{
          leftEntryId: "one",
          rightEntryId: "two",
          leftSeed: 1,
          rightSeed: 2,
          leftSlotType: "entry",
          rightSlotType: "entry",
          status: "open",
          resolutionSource: null,
          winnerEntryId: "one",
          pairKey: "round-1-swiss-1-2",
        }],
      },
    );

    assert.deepEqual(matches.map((match) => match.pairKey), ["round-2-swiss-1-2"]);
  });
}
);

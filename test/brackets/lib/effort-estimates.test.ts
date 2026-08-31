import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { estimateTournamentEffort } from "@/lib/brackets/engine/effort-estimates";

describe("bracket effort estimates", () => {
  it("returns zero effort until a bracket has enough entries", () => {
    const estimate = estimateTournamentEffort({ candidateCount: 1 });

    assert.equal(estimate.estimatedVotesPerParticipant, 0);
    assert.equal(estimate.note, "Add at least two contenders to estimate voting effort.");
  });

  it("counts manual Swiss rounds without participant votes", () => {
    const estimate = estimateTournamentEffort({
      candidateCount: 5,
      resultMode: "fast_full_rank",
      advancementMode: "manual_winner",
    });

    assert.equal(estimate.estimatedVotesPerParticipant, 0);
    assert.equal(estimate.estimatedSynchronizedRounds, 4);
  });

  it("marks open-ended rankings as medium-confidence simulations", () => {
    const estimate = estimateTournamentEffort({
      candidateCount: 6,
      resultMode: "partial_ranking",
      playStyle: "reseed",
    });

    assert.equal(estimate.confidence, "medium");
    assert.equal(estimate.synchronized, true);
  });
});

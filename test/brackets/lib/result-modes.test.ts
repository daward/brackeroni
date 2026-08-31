import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  formatResultModeLabel,
  getParticipantChildResultMode,
  isParallelResultMode,
  isPartialRankingMode,
  usesBracketStyleForResultMode,
  usesOpenEndedRankingMode,
  usesSwissResultMode,
} from "@/lib/brackets/engine/result-modes";

describe("bracket result modes", () => {
  it("classifies standard and parallel ranking modes", () => {
    assert.equal(isParallelResultMode("parallel_full_ranking"), true);
    assert.equal(isParallelResultMode("full_ranking"), false);
    assert.equal(usesOpenEndedRankingMode("partial_ranking"), true);
    assert.equal(isPartialRankingMode("parallel_partial_ranking"), true);
  });

  it("identifies modes that use Swiss or bracket structure", () => {
    assert.equal(usesSwissResultMode("fast_full_rank"), true);
    assert.equal(usesSwissResultMode("winner_only"), false);
    assert.equal(usesBracketStyleForResultMode("parallel_full_ranking"), false);
    assert.equal(usesBracketStyleForResultMode("winner_only"), true);
  });

  it("maps parallel parents to participant child modes", () => {
    assert.equal(getParticipantChildResultMode("parallel_partial_ranking"), "partial_ranking");
    assert.equal(getParticipantChildResultMode("parallel_full_ranking"), "full_ranking");
    assert.equal(formatResultModeLabel("not_a_mode"), "not a mode");
  });
});

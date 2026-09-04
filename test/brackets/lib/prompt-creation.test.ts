import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { __testing } from "@/lib/brackets/internal/prompt-creation";
import type { PoolSelectionOption } from "@/lib/pools/types";

type PromptPool = PoolSelectionOption & {
  visibility?: "private" | "public_listed" | "public_unlisted";
  isOwned?: boolean;
};

describe("prompt bracket creation planning", () => {
  let pools: PromptPool[];

  beforeEach(() => {
    pools = [
      { id: "11111111-1111-4111-8111-111111111111", name: "Board Games", candidateCount: 24, isOwned: true },
      { id: "22222222-2222-4222-8222-222222222222", name: "Boston Brunch", candidateCount: 16, isOwned: true }
    ];
  });

  it("uses a matching existing pool instead of creating a duplicate", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Make a full ranking bracket using my Board Games pool",
      availablePools: pools
    });

    assert.equal(plan.source.type, "existing_owned_pool");
    assert.equal(plan.source.poolId, pools[0].id);
    assert.equal(plan.resultMode, "full_ranking");
  });

  it("keeps prompt-created brackets private and signed-in by default", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Make a bracket for 8 lunch spots that anyone can vote on",
      availablePools: []
    });

    assert.equal(plan.visibility, "private");
    assert.equal(plan.votingAccess, "signed_in_only");
    assert.equal(plan.sharingMode, "private");
  });

  it("treats family decision prompts as friends brackets", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "I want to quickly pick the best option for dinner that my family agrees on",
      availablePools: []
    });

    assert.equal(plan.sharingMode, "with_friends");
    assert.equal(plan.visibility, "private");
  });

  it("uses parallel ranking for group consensus prompts", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "I want to quickly pick the best option for dinner that my family agrees on",
      availablePools: []
    });

    assert.equal(plan.resultMode, "parallel_full_ranking");
  });

  it("keeps explicit single-winner friends prompts as winner brackets", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "I want one winner for dinner that my family agrees on",
      availablePools: []
    });

    assert.equal(plan.sharingMode, "with_friends");
    assert.equal(plan.resultMode, "winner_only");
  });

  it("keeps numeric winner prompts as winner brackets", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Make a 1 winner bracket for dinner options with my family",
      availablePools: []
    });

    assert.equal(plan.resultMode, "winner_only");
  });

  it("requires explicit public visibility before anonymous voting can be planned", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Make an unlisted public link bracket for 8 songs with anyone can vote",
      availablePools: []
    });

    assert.equal(plan.visibility, "public_unlisted");
    assert.equal(plan.votingAccess, "anyone");
  });

  it("turns explicit contender lists into private item pools", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Make a winner bracket with: Arrival, Alien, Jaws, Heat",
      availablePools: []
    });

    assert.equal(plan.source.type, "new_pool_from_items");
    assert.equal(plan.source.candidates.map((candidate) => candidate.name).join(", "), "Arrival, Alien, Jaws, Heat");
  });

  it("uses model-planned titles instead of the full prompt", () => {
    const plan = __testing.buildPromptPlan({
      prompt: "Please make me a full ranking bracket for 16 places to eat brunch in Boston",
      availablePools: [],
      modelPlan: {
        title: "Boston Brunch Spots",
        poolName: "Boston Brunch Spots"
      }
    });

    assert.equal(plan.title, "Boston Brunch Spots Bracket");
    assert.equal(plan.source.type, "new_pool_from_generation");
    assert.equal(plan.source.poolName, "Boston Brunch Spots");
  });
});

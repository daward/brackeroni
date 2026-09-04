// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import {
  expectValidRequest,
  expectValidResponse,
  responseJson,
  routeRequest
} from "./api-contract-harness.mjs";

const bracketId = "11111111-1111-4111-8111-111111111111";
const poolId = "22222222-2222-4222-8222-222222222222";

let scenario;

describe("bracket intent route contracts", () => {
  beforeEach(async () => {
    vi.resetModules();
    scenario = {
      user: { id: "user-1" },
      calls: []
    };
    vi.doMock("@/lib/auth/current-user", () => ({
      getCurrentUser: vi.fn(async () => scenario.user)
    }));
    vi.doMock("@/lib/brackets", () => ({
      previewBracketIntent: vi.fn(async (options) => {
        scenario.calls.push(["preview", options]);
        return preview();
      }),
      createBracketFromPrompt: vi.fn(async (options) => {
        scenario.calls.push(["create", options]);
        return {
          item: bracket(),
          plan: preview().plan,
          sourceSummary: "Uses Board Games"
        };
      })
    }));
  });

  it("previews prompt-created bracket plans through the documented route", async () => {
    const { POST } = await import("../../app/api/bracket-intents/route.js");
    const body = { prompt: "Make a bracket using my Board Games pool", action: "preview" };

    expectValidRequest("post", "/api/bracket-intents", body);
    const response = await POST(routeRequest("/api/bracket-intents", { method: "POST", body }));
    const payload = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("post", "/api/bracket-intents", 200, payload);
    assert.deepEqual(scenario.calls[0], ["preview", { creatorUserId: "user-1", prompt: body.prompt }]);
  });

  it("creates draft brackets through the documented prompt route", async () => {
    const { POST } = await import("../../app/api/bracket-intents/route.js");
    const body = { prompt: "Make a bracket using my Board Games pool", action: "create" };

    expectValidRequest("post", "/api/bracket-intents", body);
    const response = await POST(routeRequest("/api/bracket-intents", { method: "POST", body }));
    const payload = await responseJson(response);

    assert.equal(response.status, 201);
    expectValidResponse("post", "/api/bracket-intents", 201, payload);
    assert.equal(payload.item.status, "draft");
  });
});

function preview() {
  return {
    plan: {
      title: "Board Games Bracket",
      description: null,
      source: { type: "existing_owned_pool", poolId },
      sharingMode: "private",
      visibility: "private",
      votingAccess: "signed_in_only",
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      tieBreakMode: "higher_seed_wins",
      advancementMode: "vote_winner",
      intentPreset: null
    },
    sourceSummary: "Uses Board Games",
    safety: {
      startsAutomatically: false,
      publishesAutomatically: false,
      createsPrivatePoolByDefault: true
    },
    matchedPools: [{ id: poolId, name: "Board Games", candidateCount: 24, visibility: "private" }]
  };
}

function bracket() {
  return {
    id: bracketId,
    title: "Board Games Bracket",
    description: null,
    sourcePoolId: poolId,
    sourcePoolName: "Board Games",
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "fixed_bracket",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins",
    status: "draft",
    roundClosureMode: "manual",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    entries: []
  };
}

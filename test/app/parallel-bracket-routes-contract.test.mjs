// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import {
  expectValidRequest,
  expectValidResponse,
  responseJson,
  routeRequest
} from "./api-contract-harness.mjs";

const parallelBracketId = "11111111-1111-4111-8111-111111111111";
const sourcePoolId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const childBracketId = "44444444-4444-4444-8444-444444444444";

let scenario;

function parallelBracketDetail(overrides = {}) {
  return {
    id: parallelBracketId,
    creatorUserId: userId,
    title: "Team Rankings",
    description: null,
    sourcePoolId,
    sourcePoolName: "Movie Pool",
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    tieBreakMode: "higher_seed_wins",
    status: "draft",
    startedAt: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    candidateCount: 4,
    participantCount: 1,
    activeParticipantCount: 0,
    completedParticipantCount: 0,
    participants: [participantDetail()],
    ...overrides
  };
}

function participantDetail(overrides = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    userId,
    anonymousVoterToken: null,
    tournamentId: childBracketId,
    status: "active",
    startedAt: "2026-01-01T00:00:00.000Z",
    completedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    name: "Alex",
    email: "alex@example.com",
    imageUrl: null,
    ...overrides
  };
}

function shareLinkDetail() {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    token: "share-token",
    active: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z"
  };
}

function createParallelBracketHandle(options) {
  scenario.calls.push(["parallelBracket", options]);
  return {
    update: vi.fn(async (patch) => {
      scenario.calls.push(["update", patch]);
      return { ...scenario.parallelBracket, ...patch };
    }),
    archive: vi.fn(async () => scenario.calls.push(["archive"])),
    listShareLinks: vi.fn(async () => scenario.shareLinks),
    ensureShareLink: vi.fn(async () => scenario.shareLinks[0]),
    rotateShareLink: vi.fn(async () => scenario.shareLinks[0])
  };
}

async function useParallelBracketModules() {
  vi.doMock("@/lib/auth/current-user", () => ({
    getCurrentUser: vi.fn(async () => scenario.user),
    getOptionalCurrentUser: vi.fn(async () => scenario.optionalUser)
  }));
  vi.doMock("@/lib/auth/viewer", () => ({
    ANONYMOUS_VOTER_COOKIE: "anon-voter",
    createAnonymousVoterToken: vi.fn(() => "new-anon-token"),
    getAnonymousVoterTokenFromRequest: vi.fn(() => scenario.existingAnonymousVoterToken)
  }));
  vi.doMock("@/lib/api/request-rate-limit", () => ({
    takeRequestRateLimit: vi.fn(() => ({ allowed: true }))
  }));
  vi.doMock("@/lib/brackets", () => ({
    parallelBracket: vi.fn(createParallelBracketHandle),
    parallelBracketDirectory: vi.fn(() => ({
      getAccessibleBracketById: vi.fn(async (options) => {
        scenario.calls.push(["getAccessibleBracketById", options]);
        return scenario.parallelBracket;
      }),
      openParticipantBracket: vi.fn(async (options) => {
        scenario.calls.push(["openParticipantBracket", options]);
        return { bracketId: childBracketId };
      })
    })),
    parallelBrackets: vi.fn((options) => ({
      list: vi.fn(async (listOptions) => {
        scenario.calls.push(["list", options, listOptions]);
        return { items: [scenario.parallelBracket], hasNextPage: false };
      }),
      statusCounts: vi.fn(async () => scenario.statusCounts),
      create: vi.fn(async (body) => {
        scenario.calls.push(["create", options, body]);
        return scenario.parallelBracket;
      })
    }))
  }));
}

describe("parallel bracket route contracts", () => {
  beforeEach(async () => {
    vi.resetModules();
    scenario = {
      user: { id: userId },
      optionalUser: { id: userId },
      existingAnonymousVoterToken: null,
      parallelBracket: parallelBracketDetail(),
      shareLinks: [shareLinkDetail()],
      statusCounts: { draft: 1, active: 0, complete: 0 },
      calls: []
    };
    await useParallelBracketModules();
  });

  it("lists owned parallel brackets through the documented collection route", async () => {
    const { GET } = await import("../../app/api/parallel-brackets/route.js");

    const response = await GET(routeRequest("/api/parallel-brackets?limit=20&offset=5&status=draft"));
    const body = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("get", "/api/parallel-brackets", 200, body);
    assert.deepEqual(scenario.calls[0], ["list", { creatorUserId: userId }, { status: "draft", limit: 20, offset: 5 }]);
  });

  it("creates parallel brackets from the documented request body", async () => {
    const { POST } = await import("../../app/api/parallel-brackets/route.js");
    const body = { title: "Team Rankings", sourcePoolId, sharingMode: "private" };

    expectValidRequest("post", "/api/parallel-brackets", body);
    const response = await POST(routeRequest("/api/parallel-brackets", { method: "POST", body }));

    assert.equal(response.status, 201);
    expectValidResponse("post", "/api/parallel-brackets", 201, await responseJson(response));
    assert.deepEqual(scenario.calls.at(-1), [
      "create",
      { creatorUserId: userId },
      {
        ...body,
        visibility: "private",
        votingAccess: "signed_in_only",
        playStyle: "fixed_bracket",
        resultMode: "parallel_full_ranking",
        tieBreakMode: "higher_seed_wins"
      }
    ]);
  });

  it("fetches accessible parallel brackets through the bracket-named member route", async () => {
    const { GET } = await import("../../app/api/parallel-brackets/[parallelBracketId]/route.js");

    const response = await GET(routeRequest(`/api/parallel-brackets/${parallelBracketId}`), {
      params: Promise.resolve({ parallelBracketId })
    });

    expectValidResponse("get", "/api/parallel-brackets/{parallelBracketId}", 200, await responseJson(response));
    assert.deepEqual(scenario.calls[0], ["getAccessibleBracketById", { parallelBracketId, userId }]);
  });

  it("updates and archives through the parallel bracket handle", async () => {
    const route = await import("../../app/api/parallel-brackets/[parallelBracketId]/route.js");
    const patch = { title: "Better Team Rankings" };
    const context = { params: Promise.resolve({ parallelBracketId }) };

    expectValidRequest("patch", "/api/parallel-brackets/{parallelBracketId}", patch);
    const patchResponse = await route.PATCH(routeRequest(`/api/parallel-brackets/${parallelBracketId}`, { method: "PATCH", body: patch }), context);
    const deleteResponse = await route.DELETE(routeRequest(`/api/parallel-brackets/${parallelBracketId}`, { method: "DELETE" }), context);

    expectValidResponse("patch", "/api/parallel-brackets/{parallelBracketId}", 200, await responseJson(patchResponse));
    expectValidResponse("delete", "/api/parallel-brackets/{parallelBracketId}", 200, await responseJson(deleteResponse));
    assert.deepEqual(scenario.calls.filter(([name]) => name === "update" || name === "archive"), [["update", patch], ["archive"]]);
  });

  it("serves parallel bracket share links through documented child routes", async () => {
    const route = await import("../../app/api/parallel-brackets/[parallelBracketId]/links/route.js");
    const body = { rotate: true };
    const context = { params: Promise.resolve({ parallelBracketId }) };

    expectValidRequest("post", "/api/parallel-brackets/{parallelBracketId}/links", body);
    const listResponse = await route.GET(routeRequest(`/api/parallel-brackets/${parallelBracketId}/links`), context);
    const createResponse = await route.POST(
      routeRequest(`/api/parallel-brackets/${parallelBracketId}/links`, { method: "POST", body }),
      context
    );

    expectValidResponse("get", "/api/parallel-brackets/{parallelBracketId}/links", 200, await responseJson(listResponse));
    expectValidResponse("post", "/api/parallel-brackets/{parallelBracketId}/links", 200, await responseJson(createResponse));
    assert.equal(scenario.calls.at(-1)[0], "parallelBracket");
  });

  it("opens the current caller participant bracket through the documented route", async () => {
    const { POST } = await import("../../app/api/parallel-brackets/[parallelBracketId]/participants/me/route.js");

    const response = await POST(routeRequest(`/api/parallel-brackets/${parallelBracketId}/participants/me`, { method: "POST" }), {
      params: Promise.resolve({ parallelBracketId })
    });

    expectValidResponse("post", "/api/parallel-brackets/{parallelBracketId}/participants/me", 200, await responseJson(response));
    assert.deepEqual(scenario.calls[0], ["openParticipantBracket", { parallelBracketId, userId, anonymousVoterToken: null }]);
  });

  it("redirects anonymous participants to their child bracket and sets a voter cookie", async () => {
    scenario.optionalUser = null;
    const { GET } = await import("../../app/api/parallel-brackets/[parallelBracketId]/participants/me/route.js");

    const response = await GET(routeRequest(`/api/parallel-brackets/${parallelBracketId}/participants/me?returnTo=create`), {
      params: Promise.resolve({ parallelBracketId })
    });

    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), `http://localhost/vote?bracket=${childBracketId}&returnTo=create`);
    assert.match(response.headers.get("set-cookie") ?? "", /anon-voter=new-anon-token/);
  });
});

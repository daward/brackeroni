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
const entryId = "22222222-2222-4222-8222-222222222222";
const candidateId = "33333333-3333-4333-8333-333333333333";
const matchId = "44444444-4444-4444-8444-444444444444";

let scenario;

function bracketDetail(overrides = {}) {
  return {
    id: bracketId,
    title: "Movie Night",
    description: null,
    sourcePoolId: null,
    sourcePoolName: null,
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "fixed_bracket",
    resultMode: "full_ranking",
    tieBreakMode: "higher_seed_wins",
    status: "draft",
    roundClosureMode: "manual",
    lastVoteAt: null,
    startedAt: null,
    completedAt: null,
    archivedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    entryCount: 1,
    winnerEntryId: null,
    winnerName: null,
    winnerSeed: null,
    winnerImageUrl: null,
    entries: [bracketEntry()],
    ...overrides
  };
}

function bracketEntry(overrides = {}) {
  return {
    id: entryId,
    seed: 1,
    finalRank: null,
    candidateId,
    candidateName: "Arrival",
    candidateDescription: null,
    candidateImageUrl: null,
    ...overrides
  };
}

function createBracketHandle(options) {
  scenario.calls.push(["bracket", options]);
  return {
    get: vi.fn(async () => scenario.bracket),
    update: vi.fn(async (patch) => {
      scenario.calls.push(["update", patch]);
      return { ...scenario.bracket, ...patch };
    }),
    archive: vi.fn(async () => scenario.calls.push(["archive"])),
    updateEntries: vi.fn(async (options) => {
      scenario.calls.push(["updateEntries", options]);
      return scenario.bracket;
    }),
    listInvites: vi.fn(async () => scenario.invites),
    listMatches: vi.fn(async () => ({ bracket: scenario.bracket, matches: scenario.matches })),
    listRounds: vi.fn(async () => scenario.rounds),
    listShareLinks: vi.fn(async () => scenario.shareLinks),
    ensureShareLink: vi.fn(async () => scenario.shareLinks[0]),
    createRerun: vi.fn(async () => scenario.rerun)
  };
}

async function useBracketModules() {
  vi.doMock("@/lib/auth/current-user", () => ({
    getCurrentUser: vi.fn(async () => scenario.user),
    getOptionalCurrentUser: vi.fn(async () => scenario.optionalUser)
  }));
  vi.doMock("@/lib/auth/viewer", () => ({
    ANONYMOUS_VOTER_COOKIE: "anon-voter",
    getAnonymousVoterTokenFromRequest: vi.fn(() => null)
  }));
  vi.doMock("next/headers", () => ({
    cookies: vi.fn(async () => ({ get: vi.fn(() => null) }))
  }));
  vi.doMock("@/lib/api/request-rate-limit", () => ({
    takeRequestRateLimit: vi.fn(() => ({ allowed: true }))
  }));
  vi.doMock("@/lib/brackets", () => ({
    bracket: vi.fn(createBracketHandle),
    bracketDirectory: vi.fn(() => ({
      listAccessibleBrackets: vi.fn(async (options) => {
        scenario.calls.push(["listAccessibleBrackets", options]);
        return [scenario.bracket];
      }),
      listPublicBrackets: vi.fn(async (options) => {
        scenario.calls.push(["listPublicBrackets", options]);
        return [];
      }),
      getAccessibleBracketById: vi.fn(async (options) => {
        scenario.calls.push(["getAccessibleBracketById", options]);
        return scenario.bracket;
      })
    })),
    brackets: vi.fn((options) => ({
      list: vi.fn(async (listOptions) => {
        scenario.calls.push(["list", options, listOptions]);
        return { items: [scenario.bracket], hasNextPage: false };
      }),
      statusCounts: vi.fn(async () => scenario.statusCounts),
      create: vi.fn(async (body) => {
        scenario.calls.push(["create", options, body]);
        return scenario.bracket;
      })
    })),
    parallelBracketDirectory: vi.fn(() => ({
      listAccessibleBrackets: vi.fn(async () => []),
      listPublicBrackets: vi.fn(async () => [])
    }))
  }));
}

describe("bracket route contracts", () => {
  beforeEach(async () => {
    vi.resetModules();
    scenario = {
      user: { id: "user-1" },
      optionalUser: { id: "user-1" },
      bracket: bracketDetail({ entries: [bracketEntry(), bracketEntry({ id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", seed: 2 })], entryCount: 2 }),
      rerun: bracketDetail({ id: "55555555-5555-4555-8555-555555555555" }),
      statusCounts: { draft: 1, active: 0, complete: 0 },
      invites: [{
        id: "99999999-9999-4999-8999-999999999999",
        status: "pending",
        userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Friend",
        email: "friend@example.com",
        openMatchCount: 1,
        votesCast: 0
      }],
      matches: [{ id: matchId, status: "open", roundId: "66666666-6666-4666-8666-666666666666", roundNumber: 1 }],
      rounds: [{ id: "77777777-7777-4777-8777-777777777777", roundNumber: 1 }],
      shareLinks: [{
        id: "88888888-8888-4888-8888-888888888888",
        token: "share-token",
        active: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z"
      }],
      calls: []
    };
    await useBracketModules();
  });

  it("lists owned brackets through the documented collection route", async () => {
    const { GET } = await import("../../app/api/brackets/route.js");

    const response = await GET(routeRequest("/api/brackets?limit=20&offset=5&status=draft"));
    const body = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("get", "/api/brackets", 200, body);
    assert.deepEqual(scenario.calls[0], ["list", { creatorUserId: "user-1" }, { status: "draft", limit: 20, offset: 5 }]);
  });

  it("creates brackets from the documented request body", async () => {
    const { POST } = await import("../../app/api/brackets/route.js");
    const body = { title: "Movie Night", sharingMode: "private", playStyle: "fixed_bracket", resultMode: "full_ranking", tieBreakMode: "higher_seed_wins" };

    expectValidRequest("post", "/api/brackets", body);
    const response = await POST(routeRequest("/api/brackets", { method: "POST", body }));

    assert.equal(response.status, 201);
    expectValidResponse("post", "/api/brackets", 201, await responseJson(response));
    assert.deepEqual(scenario.calls.at(-1), ["create", { creatorUserId: "user-1" }, { ...body, visibility: "private", votingAccess: "signed_in_only", advancementMode: "vote_winner" }]);
  });

  it("lists completed vote brackets from accessible and public directories", async () => {
    const { GET } = await import("../../app/api/brackets/route.js");

    const response = await GET(routeRequest("/api/brackets?scope=vote-completed&limit=12&offset=0"));
    const body = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("get", "/api/brackets", 200, body);
    assert.deepEqual(scenario.calls[0], ["listAccessibleBrackets", { userId: "user-1", statuses: ["complete"], limit: 13, offset: 0 }]);
  });

  it("fetches accessible brackets through the bracket-named member route", async () => {
    const { GET } = await import("../../app/api/brackets/[bracketId]/route.js");

    const response = await GET(routeRequest(`/api/brackets/${bracketId}`), { params: Promise.resolve({ bracketId }) });

    expectValidResponse("get", "/api/brackets/{bracketId}", 200, await responseJson(response));
    assert.deepEqual(scenario.calls[0], ["getAccessibleBracketById", { bracketId, userId: "user-1", anonymousVoterToken: null }]);
  });

  it("updates and archives through the bracket handle", async () => {
    const route = await import("../../app/api/brackets/[bracketId]/route.js");
    const patch = { title: "Better Movie Night" };
    const context = { params: Promise.resolve({ bracketId }) };

    expectValidRequest("patch", "/api/brackets/{bracketId}", patch);
    const patchResponse = await route.PATCH(routeRequest(`/api/brackets/${bracketId}`, { method: "PATCH", body: patch }), context);
    const deleteResponse = await route.DELETE(routeRequest(`/api/brackets/${bracketId}`, { method: "DELETE" }), context);

    expectValidResponse("patch", "/api/brackets/{bracketId}", 200, await responseJson(patchResponse));
    expectValidResponse("delete", "/api/brackets/{bracketId}", 200, await responseJson(deleteResponse));
    assert.deepEqual(scenario.calls.filter(([name]) => name === "update" || name === "archive"), [["update", patch], ["archive"]]);
  });

  it("serves bracket sub-resources through documented child routes", async () => {
    const linksRoute = await import("../../app/api/brackets/[bracketId]/links/route.js");
    const matchesRoute = await import("../../app/api/brackets/[bracketId]/matches/route.js");
    const rerunsRoute = await import("../../app/api/brackets/[bracketId]/rerun-drafts/route.js");
    const context = { params: Promise.resolve({ bracketId }) };

    const linkResponse = await linksRoute.GET(routeRequest(`/api/brackets/${bracketId}/links`), context);
    const matchResponse = await matchesRoute.GET(routeRequest(`/api/brackets/${bracketId}/matches`), context);
    const rerunResponse = await rerunsRoute.POST(routeRequest(`/api/brackets/${bracketId}/rerun-drafts`, { method: "POST" }), context);

    expectValidResponse("get", "/api/brackets/{bracketId}/links", 200, await responseJson(linkResponse));
    expectValidResponse("get", "/api/brackets/{bracketId}/matches", 200, await responseJson(matchResponse));
    expectValidResponse("post", "/api/brackets/{bracketId}/rerun-drafts", 201, await responseJson(rerunResponse));
  });

  it("serves bracket entries, invites, and rounds through child routes", async () => {
    const entriesRoute = await import("../../app/api/brackets/[bracketId]/entries/route.js");
    const invitesRoute = await import("../../app/api/brackets/[bracketId]/invites/route.js");
    const roundsRoute = await import("../../app/api/brackets/[bracketId]/rounds/route.js");
    const context = { params: Promise.resolve({ bracketId }) };

    const entriesResponse = await entriesRoute.GET(routeRequest(`/api/brackets/${bracketId}/entries`), context);
    const invitesResponse = await invitesRoute.GET(routeRequest(`/api/brackets/${bracketId}/invites`), context);
    const roundsResponse = await roundsRoute.GET(routeRequest(`/api/brackets/${bracketId}/rounds`), context);

    expectValidResponse("get", "/api/brackets/{bracketId}/entries", 200, await responseJson(entriesResponse));
    expectValidResponse("get", "/api/brackets/{bracketId}/invites", 200, await responseJson(invitesResponse));
    expectValidResponse("get", "/api/brackets/{bracketId}/rounds", 200, await responseJson(roundsResponse));
  });

  it("updates bracket entries through the documented entries route", async () => {
    const { PATCH } = await import("../../app/api/brackets/[bracketId]/entries/route.js");
    const body = {
      entries: [{ id: entryId, seed: 2 }, { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", seed: 1 }],
      seedingStructure: { subBrackets: [], entryBrackets: {} }
    };

    expectValidRequest("patch", "/api/brackets/{bracketId}/entries", body);
    const response = await PATCH(routeRequest(`/api/brackets/${bracketId}/entries`, { method: "PATCH", body }), {
      params: Promise.resolve({ bracketId })
    });

    expectValidResponse("patch", "/api/brackets/{bracketId}/entries", 200, await responseJson(response));
    assert.equal(scenario.calls.at(-1)[0], "updateEntries");
  });
});

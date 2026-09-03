// @vitest-environment node

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import {
  expectValidRequest,
  expectValidResponse,
  responseJson,
  routeRequest
} from "./api-contract-harness.mjs";

const poolId = "11111111-1111-4111-8111-111111111111";
const candidateId = "22222222-2222-4222-8222-222222222222";
const sourcePoolId = "33333333-3333-4333-8333-333333333333";

let scenario;

function poolDetail(overrides = {}) {
  return {
    id: poolId,
    name: "Movie Night",
    description: "Films to rank",
    visibility: "private",
    archivedAt: null,
    candidateCount: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    candidates: [
      {
        id: candidateId,
        name: "Arrival",
        description: "Sci-fi",
        imageUrl: null,
        displayOrder: 0
      }
    ],
    candidatePagination: {
      count: 1,
      totalCount: 1,
      limit: 24,
      offset: 0,
      hasNextPage: false
    },
    ...overrides
  };
}

function candidateDetail(overrides = {}) {
  return {
    id: candidateId,
    name: "Arrival",
    description: "Sci-fi",
    imageUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    ...overrides
  };
}

function createPoolHandle() {
  return {
    get: vi.fn(async (options) => {
      scenario.calls.push(["get", options]);
      return scenario.poolDetail;
    }),
    update: vi.fn(async (patch) => {
      scenario.calls.push(["update", patch]);
      return scenario.poolDetail;
    }),
    archive: vi.fn(async () => scenario.calls.push(["archive"])),
    favorite: vi.fn(async () => scenario.poolDetail),
    enrichCandidatesFromSourceUrls: vi.fn(async () => {
      scenario.calls.push(["enrichCandidatesFromSourceUrls"]);
      return {
        pool: scenario.poolDetail,
        processedCount: 3,
        enrichedCount: 2,
        skippedCount: 1,
        failedCount: 0,
        remainingCount: 4
      };
    }),
    removeLowValueTagsFromCandidates: vi.fn(async (options) => {
      scenario.calls.push(["removeLowValueTagsFromCandidates", options]);
      return { pool: scenario.poolDetail, removedTags: ["old"] };
    }),
    removeTagFromCandidates: vi.fn(async (options) => {
      scenario.calls.push(["removeTagFromCandidates", options]);
      return scenario.poolDetail;
    }),
    importCandidates: vi.fn(async (options) => {
      scenario.calls.push(["importCandidates", options]);
      return {
        pool: scenario.poolDetail,
        importedCount: options.candidates.length,
        skippedCount: 0,
        importedNames: options.candidates.map((candidate) => candidate.name),
        skippedNames: []
      };
    }),
    mergeFromPool: vi.fn(async (options) => {
      scenario.calls.push(["mergeFromPool", options]);
      return scenario.poolDetail;
    }),
    addCandidates: vi.fn(async (options) => {
      scenario.calls.push(["addCandidates", options]);
      return scenario.poolDetail;
    }),
    createCandidate: vi.fn(async (candidate) => {
      scenario.calls.push(["createCandidate", candidate]);
      return scenario.poolDetail;
    }),
    candidate: vi.fn((id) => ({
      update: vi.fn(async (patch) => {
        scenario.calls.push(["updateCandidate", id, patch]);
        return scenario.candidateDetail;
      }),
      remove: vi.fn(async () => {
        scenario.calls.push(["removeCandidate", id]);
        return { item: scenario.poolDetail };
      })
    }))
  };
}

async function usePoolModules() {
  vi.doMock("@/lib/auth/current-user", () => ({
    getCurrentUser: vi.fn(async () => scenario.user),
    getOptionalCurrentUser: vi.fn(async () => scenario.user)
  }));
  vi.doMock("@/lib/api/request-rate-limit", () => ({
    takeRequestRateLimit: vi.fn(() => ({ allowed: true }))
  }));
  vi.doMock("@/lib/gemini/extract-pools-v2", () => ({
    extractCandidatesWithGeminiForPools: vi.fn(async (source) => {
      scenario.calls.push(["extractCandidatesWithGeminiForPools", source]);
      return {
        candidates: [
          {
            label: "Blade Runner",
            description: "Replicant noir",
            imageUrl: null,
            sourceUrl: "/movies/blade-runner",
            tags: ["sci-fi"]
          }
        ]
      };
    })
  }));
  vi.doMock("@/lib/gemini/generate-candidates", () => ({
    generateCandidatesWithGemini: vi.fn(async (payload) => {
      scenario.calls.push(["generateCandidatesWithGemini", payload]);
      return {
        candidates: [
          {
            name: "Blade Runner",
            description: "Replicant noir",
            imageUrl: "https://images.example.test/blade-runner.jpg",
            sourceUrl: null,
            tags: ["sci-fi"]
          }
        ],
        generatedImageCount: 1,
        model: "gemini-test"
      };
    })
  }));
  vi.doMock("@/lib/pools", () => ({
    listPools: vi.fn(async (options) => {
      scenario.calls.push(["listPools", options]);
      return { items: [scenario.poolSummary], totalCount: 1, limit: options.limit, offset: options.offset };
    }),
    createPool: vi.fn(async (options) => {
      scenario.calls.push(["createPool", options]);
      return scenario.poolDetail;
    }),
    pool: vi.fn((options) => {
      scenario.calls.push(["pool", options]);
      return createPoolHandle();
    })
  }));
}

describe("pool route contracts", () => {
  beforeEach(async () => {
    vi.resetModules();
    scenario = {
      user: { id: "user-1" },
      poolDetail: poolDetail(),
      poolSummary: poolDetail({ candidates: undefined, candidatePagination: undefined }),
      candidateDetail: candidateDetail(),
      calls: []
    };
    await usePoolModules();
  });

  it("lists the current user's pools through the documented collection response", async () => {
    const { GET } = await import("../../app/api/pools/route.js");

    const response = await GET(routeRequest("/api/pools?limit=20&offset=5"));
    const body = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("get", "/api/pools", 200, body);
    assert.deepEqual(scenario.calls[0], ["listPools", { userId: "user-1", limit: 20, offset: 5 }]);
  });

  it("returns a documented error when pool listing pagination is missing", async () => {
    const { GET } = await import("../../app/api/pools/route.js");

    const response = await GET(routeRequest("/api/pools"));
    const body = await responseJson(response);

    assert.equal(response.status, 400);
    expectValidResponse("get", "/api/pools", 400, body);
    assert.equal(body.error.code, "PAGINATION_REQUIRED");
  });

  it("returns a documented error when pool listing pagination is invalid", async () => {
    const { GET } = await import("../../app/api/pools/route.js");

    const response = await GET(routeRequest("/api/pools?limit=99&offset=-1"));
    const body = await responseJson(response);

    assert.equal(response.status, 400);
    expectValidResponse("get", "/api/pools", 400, body);
    assert.equal(body.error.code, "INVALID_PAGINATION");
  });

  it("creates a pool from documented source items", async () => {
    const { POST } = await import("../../app/api/pools/route.js");
    const body = {
      name: "Movie Night",
      visibility: "private",
      source: { type: "items", items: [{ name: "Arrival", tags: ["sci-fi"] }] }
    };

    expectValidRequest("post", "/api/pools", body);
    const response = await POST(routeRequest("/api/pools", { method: "POST", body }));
    const responseBody = await responseJson(response);

    assert.equal(response.status, 201);
    expectValidResponse("post", "/api/pools", 201, responseBody);
    assert.equal(scenario.calls.at(-1)[1].candidates[0].tags[0], "sci-fi");
  });

  it("creates a pool from extracted source content", async () => {
    const { POST } = await import("../../app/api/pools/route.js");
    const body = {
      name: "Sci-Fi",
      source: { type: "extract", prompt: "Find movies", pageUrl: "https://example.test/list", text: "Blade Runner" }
    };

    expectValidRequest("post", "/api/pools", body);
    const response = await POST(routeRequest("/api/pools", { method: "POST", body }));

    assert.equal(response.status, 201);
    expectValidResponse("post", "/api/pools", 201, await responseJson(response));
    assert.equal(scenario.calls.at(-1)[1].importSourceUrl, "https://example.test/list");
  });

  it("adds public cache headers for anonymous public pool reads", async () => {
    scenario.user = null;
    scenario.poolDetail = poolDetail({ visibility: "public_listed" });
    const { GET } = await import("../../app/api/pools/[poolId]/route.js");

    const response = await GET(routeRequest(`/api/pools/${poolId}?candidateLimit=12&candidateOffset=6`), {
      params: Promise.resolve({ poolId })
    });

    expectValidResponse("get", "/api/pools/{poolId}", 200, await responseJson(response));
    assert.match(response.headers.get("cache-control") ?? "", /s-maxage=300/);
    assert.deepEqual(scenario.calls[1], ["get", { candidateLimit: 12, candidateOffset: 6 }]);
  });

  it("updates and archives an existing pool through the pool handle", async () => {
    const route = await import("../../app/api/pools/[poolId]/route.js");
    const patch = { name: "Better Movie Night" };

    expectValidRequest("patch", "/api/pools/{poolId}", patch);
    const updateResponse = await route.PATCH(routeRequest(`/api/pools/${poolId}`, { method: "PATCH", body: patch }), {
      params: Promise.resolve({ poolId })
    });
    const deleteResponse = await route.DELETE(routeRequest(`/api/pools/${poolId}`, { method: "DELETE" }), {
      params: Promise.resolve({ poolId })
    });

    expectValidResponse("patch", "/api/pools/{poolId}", 200, await responseJson(updateResponse));
    expectValidResponse("delete", "/api/pools/{poolId}", 200, await responseJson(deleteResponse));
    assert.deepEqual(scenario.calls.filter(([name]) => name === "update" || name === "archive"), [
      ["update", patch],
      ["archive"]
    ]);
  });

  it("runs pool source enrichment and tag cleanup through documented updates", async () => {
    const route = await import("../../app/api/pools/[poolId]/route.js");
    const context = { params: Promise.resolve({ poolId }) };
    const enrichBody = { enrichFromSourceUrls: true };
    const cleanupBody = { removeTagsAtOrBelowCount: 2 };

    expectValidRequest("patch", "/api/pools/{poolId}", enrichBody);
    expectValidRequest("patch", "/api/pools/{poolId}", cleanupBody);
    const enrichResponse = await route.PATCH(routeRequest(`/api/pools/${poolId}`, { method: "PATCH", body: enrichBody }), context);
    const cleanupResponse = await route.PATCH(routeRequest(`/api/pools/${poolId}`, { method: "PATCH", body: cleanupBody }), context);

    expectValidResponse("patch", "/api/pools/{poolId}", 200, await responseJson(enrichResponse));
    expectValidResponse("patch", "/api/pools/{poolId}", 200, await responseJson(cleanupResponse));
    assert.deepEqual(scenario.calls.filter(([name]) => name.includes("Candidates")), [
      ["enrichCandidatesFromSourceUrls"],
      ["removeLowValueTagsFromCandidates", { maxCandidateCount: 2 }]
    ]);
  });

  it("removes one tag from candidates through the documented update route", async () => {
    const { PATCH } = await import("../../app/api/pools/[poolId]/route.js");
    const body = { removeTag: "sci-fi" };

    expectValidRequest("patch", "/api/pools/{poolId}", body);
    const response = await PATCH(routeRequest(`/api/pools/${poolId}`, { method: "PATCH", body }), {
      params: Promise.resolve({ poolId })
    });

    expectValidResponse("patch", "/api/pools/{poolId}", 200, await responseJson(response));
    assert.deepEqual(scenario.calls.at(-1), ["removeTagFromCandidates", { tag: "sci-fi" }]);
  });

  it("lists and mutates pool candidates through documented candidate responses", async () => {
    const route = await import("../../app/api/pools/[poolId]/candidates/route.js");
    const createBody = { name: "Arrival", tags: ["sci-fi"] };

    expectValidRequest("post", "/api/pools/{poolId}/candidates", createBody);
    const listResponse = await route.GET(routeRequest(`/api/pools/${poolId}/candidates?limit=24`), {
      params: Promise.resolve({ poolId })
    });
    const createResponse = await route.POST(
      routeRequest(`/api/pools/${poolId}/candidates`, { method: "POST", body: createBody }),
      { params: Promise.resolve({ poolId }) }
    );

    expectValidResponse("get", "/api/pools/{poolId}/candidates", 200, await responseJson(listResponse));
    expectValidResponse("post", "/api/pools/{poolId}/candidates", 200, await responseJson(createResponse));
    assert.equal(scenario.calls.at(-1)[1].tags[0], "sci-fi");
  });

  it("attaches existing candidates and rejects invalid candidate pagination", async () => {
    const route = await import("../../app/api/pools/[poolId]/candidates/route.js");
    const body = { candidateIds: [candidateId] };
    const context = { params: Promise.resolve({ poolId }) };

    expectValidRequest("post", "/api/pools/{poolId}/candidates", body);
    const invalidResponse = await route.GET(routeRequest(`/api/pools/${poolId}/candidates?limit=0`), context);
    const attachResponse = await route.POST(
      routeRequest(`/api/pools/${poolId}/candidates`, { method: "POST", body }),
      context
    );

    expectValidResponse("get", "/api/pools/{poolId}/candidates", 400, await responseJson(invalidResponse));
    expectValidResponse("post", "/api/pools/{poolId}/candidates", 200, await responseJson(attachResponse));
    assert.deepEqual(scenario.calls.at(-1), ["addCandidates", { candidateIds: [candidateId] }]);
  });

  it("updates and removes a candidate through the documented member route", async () => {
    const route = await import("../../app/api/pools/[poolId]/candidates/[candidateId]/route.js");
    const patch = { name: "Arrival 2" };
    const context = { params: Promise.resolve({ poolId, candidateId }) };

    expectValidRequest("patch", "/api/pools/{poolId}/candidates/{candidateId}", patch);
    const updateResponse = await route.PATCH(
      routeRequest(`/api/pools/${poolId}/candidates/${candidateId}`, { method: "PATCH", body: patch }),
      context
    );
    const deleteResponse = await route.DELETE(
      routeRequest(`/api/pools/${poolId}/candidates/${candidateId}`, { method: "DELETE" }),
      context
    );

    expectValidResponse("patch", "/api/pools/{poolId}/candidates/{candidateId}", 200, await responseJson(updateResponse));
    expectValidResponse("delete", "/api/pools/{poolId}/candidates/{candidateId}", 200, await responseJson(deleteResponse));
    assert.deepEqual(
      scenario.calls.filter(([name]) => name === "updateCandidate" || name === "removeCandidate"),
      [
        ["updateCandidate", candidateId, patch],
        ["removeCandidate", candidateId]
      ]
    );
  });

  it("favorites and imports pools through documented sub-resource routes", async () => {
    const favoritesRoute = await import("../../app/api/pools/[poolId]/favorites/route.js");
    const importsRoute = await import("../../app/api/pools/[poolId]/imports/route.js");
    const importBody = { sourcePoolId };

    expectValidRequest("post", "/api/pools/{poolId}/imports", importBody);
    const favoriteResponse = await favoritesRoute.POST(routeRequest(`/api/pools/${poolId}/favorites`, { method: "POST" }), {
      params: Promise.resolve({ poolId })
    });
    const importResponse = await importsRoute.POST(
      routeRequest(`/api/pools/${poolId}/imports`, { method: "POST", body: importBody }),
      { params: Promise.resolve({ poolId }) }
    );

    expectValidResponse("post", "/api/pools/{poolId}/favorites", 201, await responseJson(favoriteResponse));
    expectValidResponse("post", "/api/pools/{poolId}/imports", 200, await responseJson(importResponse));
    assert.deepEqual(scenario.calls.at(-1), ["mergeFromPool", { sourcePoolId }]);
  });

  it("imports explicit and extracted candidates through the documented import route", async () => {
    const { POST } = await import("../../app/api/pools/[poolId]/imports/route.js");
    scenario.poolDetail = poolDetail({ importSourceUrl: "https://example.test/source" });
    const itemBody = { source: { type: "items", items: [{ name: "Arrival", sourceUrl: "https://example.test/arrival" }] } };
    const extractBody = { source: { type: "extract", prompt: "Find films", pageUrl: "https://example.test/list", text: "Blade Runner" } };

    expectValidRequest("post", "/api/pools/{poolId}/imports", itemBody);
    expectValidRequest("post", "/api/pools/{poolId}/imports", extractBody);
    await POST(routeRequest(`/api/pools/${poolId}/imports`, { method: "POST", body: itemBody }), {
      params: Promise.resolve({ poolId })
    });
    const response = await POST(routeRequest(`/api/pools/${poolId}/imports`, { method: "POST", body: extractBody }), {
      params: Promise.resolve({ poolId })
    });

    expectValidResponse("post", "/api/pools/{poolId}/imports", 200, await responseJson(response));
    assert.equal(scenario.calls.filter(([name]) => name === "importCandidates").length, 2);
  });

  it("generates candidates directly into a pool", async () => {
    const { POST } = await import("../../app/api/pools/[poolId]/generations/route.js");
    scenario.poolDetail = poolDetail({
      candidates: [
        {
          id: candidateId,
          name: "Blade Runner",
          description: "Replicant noir",
          imageUrl: "https://images.example.test/blade-runner.jpg",
          displayOrder: 0
        }
      ]
    });
    const body = { count: 4, includeImages: true, prompt: "sci-fi movie night" };

    expectValidRequest("post", "/api/pools/{poolId}/generations", body);
    const response = await POST(routeRequest(`/api/pools/${poolId}/generations`, { method: "POST", body }), {
      params: Promise.resolve({ poolId })
    });
    const responseBody = await responseJson(response);

    assert.equal(response.status, 200);
    expectValidResponse("post", "/api/pools/{poolId}/generations", 200, responseBody);
    assert.equal(responseBody.meta.generatedCount, 1);
    assert.equal(responseBody.meta.generatedImageCount, 1);
    assert.equal(responseBody.meta.imageCount, 1);
    assert.deepEqual(scenario.calls.filter(([name]) => name === "generateCandidatesWithGemini" || name === "importCandidates"), [
      ["generateCandidatesWithGemini", body],
      [
        "importCandidates",
        {
          candidates: [
            {
              name: "Blade Runner",
              description: "Replicant noir",
              imageUrl: "https://images.example.test/blade-runner.jpg",
              sourceUrl: null,
              tags: ["sci-fi"]
            }
          ]
        }
      ]
    ]);
  });
});

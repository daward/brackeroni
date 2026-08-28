import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";
import {
  candidateRows,
  createSql,
  importPools,
  poolRow,
  poolSupport,
  useCandidateSupport,
  useSql
} from "./pool-test-harness.mjs";

describe("pool candidate source enrichment", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      candidateSupport: { hasTags: true, hasSourceUrl: true },
      pool: poolRow({ candidateCount: 2, importSourceUrl: "https://example.com/people" }),
      candidates: candidateRows([
        { id: "candidate-1", name: "Ada", sourceUrl: null },
        { id: "candidate-2", name: "Grace", sourceUrl: "/grace", tags: ["math"], displayOrder: 1 }
      ]),
      poolAccess: [{ id: "pool-1", creatorUserId: "user-1", visibility: "private" }],
      existingCandidate: candidateRows([{ id: "candidate-2", name: "Grace", sourceUrl: "/grace", tags: ["math"] }]),
      updatedCandidate: candidateRows([
        {
          id: "candidate-2",
          name: "Grace",
          description: "Generated description",
          imageUrl: "https://example.com/image.jpg",
          sourceUrl: "https://example.com/grace",
          tags: ["math", "Generated", "Profile"]
        }
      ]),
      updatedPool: poolRow({ candidateCount: 2, importSourceUrl: "https://example.com/people", enrichmentCursorDisplayOrder: 1 }),
      updatedCandidates: candidateRows([
        { id: "candidate-1", name: "Ada", sourceUrl: null },
        {
          id: "candidate-2",
          name: "Grace",
          description: "Generated description",
          imageUrl: "https://example.com/image.jpg",
          sourceUrl: "https://example.com/grace",
          tags: ["math", "Generated", "Profile"],
          displayOrder: 1
        }
      ])
    };

    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      headers: { get: () => "text/html; charset=utf-8" },
      text: async () => "<html>Grace Hopper</html>"
    })));
  });

  function installUnsupportedSchemaScenario() {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([poolSupport(), scenario.pool, scenario.candidates]);
    useSql(setup.sql);
    return setup;
  }

  function installEnrichmentScenario() {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([
      poolSupport(),
      scenario.pool,
      scenario.candidates,
      scenario.poolAccess,
      scenario.existingCandidate,
      scenario.updatedCandidate,
      [],
      scenario.updatedPool,
      scenario.updatedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  function installFailedFetchScenario() {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([
      poolSupport(),
      scenario.pool,
      scenario.candidates,
      [],
      scenario.updatedPool,
      scenario.updatedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("skips enrichment when candidates cannot store source tags", async () => {
    scenario.candidateSupport = { hasTags: false, hasSourceUrl: true };
    const { calls } = installUnsupportedSchemaScenario();

    const result = await poolHandle.enrichCandidatesFromSourceUrls();

    assert.equal(result.enrichedCount, 0);
    assert.equal(result.skippedCount, 2);
    assert.equal(calls.filter((call) => call.sql.includes("update candidate")).length, 0);
  });

  it("enriches candidates that have resolvable HTML source pages", async () => {
    const { calls } = installEnrichmentScenario();

    const result = await poolHandle.enrichCandidatesFromSourceUrls();

    const candidateUpdate = calls.find((call) => call.sql.startsWith("update candidate set"));
    assert.equal(result.enrichedCount, 1);
    assert.equal(result.skippedCount, 1);
    assert.equal(result.processedCount, 2);
    assert.equal(fetch.mock.calls[0][0], "https://example.com/grace");
    assert.deepEqual(candidateUpdate.values.slice(0, 5), [
      "Grace",
      "Generated description",
      "https://example.com/image.jpg",
      "https://example.com/grace",
      ["math", "Generated", "Profile"]
    ]);
  });

  it("counts source fetch failures without updating candidates", async () => {
    scenario.candidates = candidateRows([{ id: "candidate-1", name: "Ada", sourceUrl: "https://example.com/ada" }]);
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      headers: { get: () => "text/html" },
      text: async () => ""
    })));
    const { calls } = installFailedFetchScenario();

    const result = await poolHandle.enrichCandidatesFromSourceUrls();

    assert.equal(result.failedCount, 1);
    assert.equal(result.enrichedCount, 0);
    assert.equal(calls.filter((call) => call.sql.startsWith("update candidate set")).length, 0);
  });

  it("returns an empty enrichment result when the pool has no candidates", async () => {
    scenario.pool = poolRow({ candidateCount: 0 });
    scenario.candidates = [];
    const { calls } = installUnsupportedSchemaScenario();

    const result = await poolHandle.enrichCandidatesFromSourceUrls();

    assert.equal(result.processedCount, 0);
    assert.equal(result.remainingCount, 0);
    assert.equal(calls.filter((call) => call.sql.startsWith("update candidate_pool")).length, 0);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useCandidateSupport, useSql } from "./pool-test-harness.mjs";

describe("pool candidate tag cleanup", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      candidateSupport: { hasTags: true, hasSourceUrl: true },
      pool: poolRow({ candidateCount: 3 }),
      candidates: candidateRows([
        { id: "candidate-1", name: "Ada", tags: ["math", "science"] },
        { id: "candidate-2", name: "Grace", tags: ["math", "code"] },
        { id: "candidate-3", name: "Katherine", tags: ["math"] }
      ]),
      updatedPool: poolRow({ candidateCount: 3 }),
      updatedCandidates: candidateRows([
        { id: "candidate-1", name: "Ada", tags: ["math"] },
        { id: "candidate-2", name: "Grace", tags: ["math"] },
        { id: "candidate-3", name: "Katherine", tags: ["math"] }
      ]),
      tagToRemove: " math ",
      maxCandidateCount: "1"
    };
  });

  function installTagScenario(...mutationResponses) {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([poolSupport(), scenario.pool, scenario.candidates, ...mutationResponses]);
    useSql(setup.sql);
    return setup;
  }

  it("removes a normalized tag from every candidate in the pool", async () => {
    scenario.pool = poolRow();
    scenario.candidates = candidateRows([{ id: "candidate-1", name: "Ada", tags: ["Math", "Code"] }]);
    scenario.updatedPool = poolRow();
    scenario.updatedCandidates = candidateRows([{ id: "candidate-1", name: "Ada", tags: ["Code"] }]);
    const { calls } = installTagScenario([], [], scenario.updatedPool, scenario.updatedCandidates);

    const poolDetail = await poolHandle.removeTagFromCandidates({
      tag: scenario.tagToRemove
    });

    const tagUpdate = calls.find((call) => call.sql.includes("from unnest(c.tags)"));
    assert.deepEqual(poolDetail.candidates[0].tags, ["Code"]);
    assert.equal(tagUpdate.values[0], "math");
  });

  it("does not remove tags when the schema cannot store them", async () => {
    scenario.candidateSupport = { hasTags: false, hasSourceUrl: true };
    const { calls } = installTagScenario();

    const poolDetail = await poolHandle.removeTagFromCandidates({
      tag: "math"
    });

    assert.equal(poolDetail.id, "pool-1");
    assert.equal(calls.filter((call) => call.sql.startsWith("update candidate c")).length, 0);
  });

  it("removes tags that appear at or below the requested candidate count", async () => {
    const { calls } = installTagScenario([], [], scenario.updatedPool, scenario.updatedCandidates);

    const result = await poolHandle.removeLowValueTagsFromCandidates({
      maxCandidateCount: scenario.maxCandidateCount
    });

    const tagUpdate = calls.find((call) => call.sql.includes("where not (lower(btrim(existing_tag))"));
    assert.deepEqual(result.removedTags.sort(), ["code", "science"]);
    assert.deepEqual(tagUpdate.values[0].sort(), ["code", "science"]);
  });

  it("does not remove low-value tags for an invalid threshold", async () => {
    scenario.maxCandidateCount = "nope";
    const { calls } = installTagScenario();

    const result = await poolHandle.removeLowValueTagsFromCandidates({
      maxCandidateCount: scenario.maxCandidateCount
    });

    assert.deepEqual(result.removedTags, []);
    assert.equal(calls.filter((call) => call.sql.startsWith("update candidate c")).length, 0);
  });
});

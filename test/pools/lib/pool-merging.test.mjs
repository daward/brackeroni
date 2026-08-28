import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool merging", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      targetPool: poolRow({ candidateCount: 1 }),
      targetCandidates: candidateRows([{ id: "candidate-1", name: "Ada" }]),
      sourcePool: poolRow({ id: "source-1", candidateCount: 3 }),
      sourceCandidates: candidateRows([
        { id: "candidate-2", name: "Ada" },
        { id: "candidate-3", name: "Grace" },
        { id: "candidate-4", name: "  " }
      ]),
      targetNames: [{ name: "Ada" }],
      sourceNames: [
        { id: "candidate-2", name: "Ada" },
        { id: "candidate-3", name: "Grace" },
        { id: "candidate-4", name: "  " }
      ],
      mergedPool: poolRow({ candidateCount: 2 }),
      mergedCandidates: candidateRows([{ id: "candidate-1", name: "Ada" }, { id: "candidate-3", name: "Grace" }])
    };
  });

  function installMergeScenario() {
    const setup = createSql([
      poolSupport(),
      scenario.targetPool,
      scenario.targetCandidates,
      scenario.sourcePool,
      scenario.sourceCandidates,
      scenario.targetNames,
      scenario.sourceNames,
      [],
      [],
      scenario.mergedPool,
      scenario.mergedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("adds only new candidate names from the source pool", async () => {
    const { calls } = installMergeScenario();

    const pool = await poolHandle.mergeFromPool({ sourcePoolId: "source-1" });

    const inserts = calls.filter((call) => call.sql.includes("insert into candidate_pool_item"));
    assert.deepEqual(pool.candidates.map((candidate) => candidate.name), ["Ada", "Grace"]);
    assert.deepEqual(inserts.map((call) => call.values), [["pool-1", "candidate-3"]]);
  });

  it("rejects attempts to merge a pool into itself", async () => {
    await assert.rejects(poolHandle.mergeFromPool({ sourcePoolId: "pool-1" }), /INVALID_POOL_MERGE/);
  });
});

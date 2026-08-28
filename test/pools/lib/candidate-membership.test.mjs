import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool candidate membership", () => {
  let scenario;
  let poolHandle;
  let candidateHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    candidateHandle = poolHandle.candidate("candidate-1");
    scenario = {
      poolAccess: [{ id: "pool-1", creatorUserId: "user-1", visibility: "private" }],
      currentPool: poolRow({ candidateCount: 1 }),
      currentCandidates: candidateRows([{ id: "candidate-1", name: "Ada" }]),
      createdCandidate: [{ id: "candidate-2" }],
      nextDisplayOrder: [{ displayOrder: 5 }],
      createdPool: poolRow({ candidateCount: 2 }),
      createdCandidates: candidateRows([
        { id: "candidate-1", name: "Ada", displayOrder: 0 },
        { id: "candidate-2", name: "Grace", tags: ["code"], displayOrder: 5 }
      ]),
      candidateIdsToAdd: ["candidate-2"],
      ownedCandidates: [{ id: "candidate-2" }],
      addedPool: poolRow({ candidateCount: 2 }),
      addedCandidates: candidateRows([
        { id: "candidate-1", name: "Ada" },
        { id: "candidate-2", name: "Grace" }
      ]),
      candidateToRemoveRows: [{ id: "candidate-1" }]
    };
  });

  function installCreateCandidateScenario() {
    const setup = createSql([
      poolSupport(),
      scenario.poolAccess,
      scenario.createdCandidate,
      scenario.nextDisplayOrder,
      [],
      [],
      scenario.createdPool,
      scenario.createdCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  function installAddCandidatesScenario() {
    const uniqueCandidateIds = [...new Set(scenario.candidateIdsToAdd)];
    const setup = createSql([
      poolSupport(),
      scenario.currentPool,
      scenario.currentCandidates,
      scenario.ownedCandidates,
      ...uniqueCandidateIds.map(() => []),
      [],
      scenario.addedPool,
      scenario.addedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  function installRemoveCandidateScenario() {
    const setup = createSql([
      poolSupport(),
      scenario.poolAccess,
      scenario.candidateToRemoveRows,
      [],
      [],
      []
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("adds a newly created candidate to the end of the pool", async () => {
    const { calls } = installCreateCandidateScenario();

    const poolDetail = await poolHandle.createCandidate({
      name: "Grace",
      tags: [" code ", "code"]
    });

    const candidateInsert = calls.find((call) => call.sql.includes("insert into candidate ("));
    const poolItemInsert = calls.find((call) => call.sql.includes("insert into candidate_pool_item"));
    assert.deepEqual(poolDetail.candidates.map((candidate) => candidate.id), ["candidate-1", "candidate-2"]);
    assert.equal(candidateInsert.values[1], "Grace");
    assert.deepEqual(candidateInsert.values[5], ["code"]);
    assert.deepEqual(poolItemInsert.values, ["pool-1", "candidate-2", 5]);
  });

  it("links each selected owned candidate only once", async () => {
    scenario.candidateIdsToAdd = ["candidate-2", "candidate-2", "candidate-3"];
    scenario.ownedCandidates = [{ id: "candidate-2" }, { id: "candidate-3" }];
    scenario.addedPool = poolRow({ candidateCount: 3 });
    scenario.addedCandidates = candidateRows([{ id: "candidate-1" }, { id: "candidate-2" }, { id: "candidate-3" }]);
    const { calls } = installAddCandidatesScenario();

    const poolDetail = await poolHandle.addCandidates({
      candidateIds: scenario.candidateIdsToAdd
    });

    const poolItemInserts = calls.filter((call) => call.sql.includes("insert into candidate_pool_item"));
    assert.deepEqual(poolDetail.candidates.map((candidate) => candidate.id), ["candidate-1", "candidate-2", "candidate-3"]);
    assert.deepEqual(poolItemInserts.map((call) => call.values), [["pool-1", "candidate-2"], ["pool-1", "candidate-3"]]);
  });

  it("rejects candidates the requester does not own", async () => {
    scenario.candidateIdsToAdd = ["candidate-2", "candidate-3"];
    scenario.ownedCandidates = [{ id: "candidate-2" }];
    installAddCandidatesScenario();

    await assert.rejects(
      poolHandle.addCandidates({
        candidateIds: scenario.candidateIdsToAdd
      }),
      /FORBIDDEN/
    );
  });

  it("removes a candidate from the pool and deletes it when it is orphaned", async () => {
    const { calls } = installRemoveCandidateScenario();

    const result = await candidateHandle.remove();

    assert.deepEqual(result, { ok: true });
    assert.ok(calls.some((call) => call.sql.includes("delete from candidate_pool_item")));
    assert.ok(calls.some((call) => call.sql.includes("delete from candidate c")));
  });

  it("rejects removal when the candidate is not owned by the requester", async () => {
    scenario.candidateToRemoveRows = [];
    installRemoveCandidateScenario();

    await assert.rejects(candidateHandle.remove(), /FORBIDDEN/);
  });
});

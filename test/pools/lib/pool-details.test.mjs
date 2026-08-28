import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool details", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      support: poolSupport(),
      currentPool: poolRow({ visibility: "private" }),
      currentCandidates: candidateRows([{ id: "candidate-1", name: "Ada" }]),
      updatedPool: poolRow({ name: "Updated", description: "New description", visibility: "public_listed" }),
      updatedCandidates: candidateRows([{ id: "candidate-1", name: "Ada" }]),
      patch: { name: "Updated", description: "New description", visibility: "public_listed" }
    };
  });

  function installDetailsScenario() {
    const setup = createSql([
      scenario.support,
      scenario.currentPool,
      scenario.currentCandidates,
      [],
      scenario.updatedPool,
      scenario.updatedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("updates pool metadata and publishes a private pool", async () => {
    const { calls } = installDetailsScenario();

    const pool = await poolHandle.update(scenario.patch);

    const updateCall = calls.find((call) => call.sql.startsWith("update candidate_pool set"));
    assert.equal(pool.name, "Updated");
    assert.match(updateCall.sql, /published_at = case/);
    assert.deepEqual(updateCall.values.slice(0, 3), ["Updated", "New description", "public_listed"]);
  });

  it("updates only core metadata against legacy private-only schemas", async () => {
    scenario.support = poolSupport({ hasVisibility: false });
    scenario.patch = { name: "Updated" };
    const { calls } = installDetailsScenario();

    await poolHandle.update(scenario.patch);

    const updateCall = calls.find((call) => call.sql.startsWith("update candidate_pool set"));
    assert.doesNotMatch(updateCall.sql, /visibility =/);
    assert.equal(updateCall.values[0], "Updated");
  });

  it("rejects publishing when the schema cannot store visibility", async () => {
    scenario.support = poolSupport({ hasVisibility: false });
    scenario.patch = { visibility: "public_listed" };
    const { calls } = installDetailsScenario();

    await assert.rejects(poolHandle.update(scenario.patch), /POOL_PUBLIC_REQUIRES_MIGRATION/);
    assert.equal(calls.filter((call) => call.sql.startsWith("update candidate_pool set")).length, 0);
  });
});

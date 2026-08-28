import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool lifecycle", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      pool: poolRow({ visibility: "private" }),
      candidates: candidateRows([{ id: "candidate-1", name: "Ada" }])
    };
  });

  function installArchiveScenario() {
    const setup = createSql([poolSupport(), scenario.pool, scenario.candidates, []]);
    useSql(setup.sql);
    return setup;
  }

  it("archives a mutable pool", async () => {
    const { calls } = installArchiveScenario();

    const result = await poolHandle.archive();

    assert.deepEqual(result, { ok: true });
    assert.ok(calls.some((call) => call.sql.includes("archived_at = coalesce")));
  });

  it("rejects archive requests for published pools", async () => {
    scenario.pool = poolRow({ visibility: "public_listed" });
    const { calls } = installArchiveScenario();

    await assert.rejects(poolHandle.archive(), /POOL_LOCKED/);
    assert.equal(calls.filter((call) => call.sql.includes("archived_at = coalesce")).length, 0);
  });
});

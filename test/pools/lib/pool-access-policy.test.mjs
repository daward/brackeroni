import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { createSql, importPools, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool mutation access policy", () => {
  let scenario;
  let candidateHandle;
  let adminCandidateHandle;

  beforeEach(async () => {
    const { pool } = await importPools();
    const poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    const adminPoolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1", isAdmin: true });

    candidateHandle = poolHandle.candidate("candidate-1");
    adminCandidateHandle = adminPoolHandle.candidate("candidate-1");
    scenario = {
      poolAccess: [{ id: "pool-1", creatorUserId: "user-1", visibility: "public_listed" }],
      existingCandidate: [{ id: "candidate-1", name: "Ada", description: null, imageUrl: null, sourceUrl: null, tags: ["math"] }],
      updatedCandidate: [{ id: "candidate-1", name: "Grace", description: null, imageUrl: null, sourceUrl: null, tags: ["math"] }]
    };
  });

  function installUpdateCandidateScenario() {
    const setup = createSql([poolSupport(), scenario.poolAccess, scenario.existingCandidate, scenario.updatedCandidate]);
    useSql(setup.sql);
    return setup;
  }

  it("rejects published pool mutations from non-admin writers", async () => {
    scenario.poolAccess = [{ id: "pool-1", creatorUserId: "user-1", visibility: "public_unlisted" }];
    installUpdateCandidateScenario();

    await assert.rejects(
      candidateHandle.update({ name: "Grace" }),
      /POOL_LOCKED/
    );
  });

  it("allows admin writers to mutate published pools", async () => {
    const { calls } = installUpdateCandidateScenario();

    const updated = await adminCandidateHandle.update({ name: "Grace" });

    assert.equal(updated.name, "Grace");
    assert.ok(calls.some((call) => call.sql.includes("update candidate")));
  });
});

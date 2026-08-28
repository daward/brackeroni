import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolSupport, useCandidateSupport, useSql } from "./pool-test-harness.mjs";

describe("pool candidate updates", () => {
  let scenario;
  let candidateHandle;

  beforeEach(async () => {
    const { pool } = await importPools();
    const poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });

    candidateHandle = poolHandle.candidate("candidate-1");
    scenario = {
      candidateSupport: { hasTags: true, hasSourceUrl: true },
      poolAccess: [{ id: "pool-1", creatorUserId: "user-1", visibility: "private" }],
      existingCandidate: candidateRows([{ id: "candidate-1", name: "Ada", sourceUrl: null, tags: ["math"] }]),
      updatedCandidate: candidateRows([{ id: "candidate-1", name: "Grace", sourceUrl: "https://example.com/grace", tags: ["code"] }]),
      patch: { name: "Grace", sourceUrl: "https://example.com/grace", tags: [" code ", "code"] }
    };
  });

  function installCandidateUpdateScenario() {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([poolSupport(), scenario.poolAccess, scenario.existingCandidate, scenario.updatedCandidate]);
    useSql(setup.sql);
    return setup;
  }

  function updateSql(calls) {
    return calls.find((call) => call.sql.startsWith("update candidate set")).sql;
  }

  it("stores source URLs and normalized tags when the schema supports both", async () => {
    const { calls } = installCandidateUpdateScenario();

    const candidate = await candidateHandle.update(scenario.patch);

    assert.equal(candidate.name, "Grace");
    assert.match(updateSql(calls), /source_url =/);
    assert.match(updateSql(calls), /tags =/);
  });

  it("omits source URLs when the candidate schema cannot store them", async () => {
    scenario.candidateSupport = { hasTags: true, hasSourceUrl: false };
    const { calls } = installCandidateUpdateScenario();

    await candidateHandle.update(scenario.patch);

    assert.doesNotMatch(updateSql(calls), /source_url =/);
    assert.match(updateSql(calls), /tags =/);
  });

  it("omits tags when the candidate schema cannot store them", async () => {
    scenario.candidateSupport = { hasTags: false, hasSourceUrl: true };
    const { calls } = installCandidateUpdateScenario();

    await candidateHandle.update(scenario.patch);

    assert.match(updateSql(calls), /source_url =/);
    assert.doesNotMatch(updateSql(calls), /tags =/);
  });

  it("stores only core candidate fields when the schema has no optional columns", async () => {
    scenario.candidateSupport = { hasTags: false, hasSourceUrl: false };
    const { calls } = installCandidateUpdateScenario();

    await candidateHandle.update(scenario.patch);

    assert.doesNotMatch(updateSql(calls), /source_url =/);
    assert.doesNotMatch(updateSql(calls), /tags =/);
  });

  it("rejects updates when the candidate is not in the pool", async () => {
    scenario.existingCandidate = [];
    installCandidateUpdateScenario();

    await assert.rejects(candidateHandle.update(scenario.patch), /NOT_FOUND/);
  });
});

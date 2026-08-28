import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool candidate imports", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      existingCandidates: candidateRows([{ id: "existing", name: "Ada", tags: ["math"], displayOrder: 0 }]),
      existingNameRows: [{ name: "Ada" }],
      nextDisplayOrder: [{ nextDisplayOrder: 1 }],
      createdCandidate: [{ id: "candidate-2" }],
      updatedPool: poolRow({ candidateCount: 2 }),
      updatedCandidates: candidateRows([
        { id: "existing", name: "Ada", tags: ["math"], displayOrder: 0 },
        { id: "candidate-2", name: "Grace", tags: ["code"], displayOrder: 1 }
      ]),
      importedCandidates: [
        { name: " Ada ", tags: ["duplicate"] },
        { name: "Grace", tags: [" code ", "code"], sourceUrl: "https://example.com/grace" },
        { name: "grace", tags: ["ignored"] },
        { name: "   " }
      ]
    };
  });

  function installImportScenario() {
    const setup = createSql([
      poolSupport(),
      poolRow({ candidateCount: 1 }),
      scenario.existingCandidates,
      scenario.existingNameRows,
      scenario.nextDisplayOrder,
      scenario.createdCandidate,
      [],
      [],
      scenario.updatedPool,
      scenario.updatedCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("imports new names and reports duplicates already in the pool", async () => {
    const { calls } = installImportScenario();

    const result = await poolHandle.importCandidates({
      candidates: scenario.importedCandidates
    });

    const insertCandidateCall = calls.find((call) => call.sql.includes("insert into candidate ("));
    assert.equal(result.importedCount, 1);
    assert.equal(result.skippedCount, 1);
    assert.deepEqual(result.importedNames, ["Grace"]);
    assert.deepEqual(result.skippedNames, ["Ada"]);
    assert.equal(insertCandidateCall.values[1], "Grace");
    assert.deepEqual(insertCandidateCall.values[5], ["code"]);
  });
});

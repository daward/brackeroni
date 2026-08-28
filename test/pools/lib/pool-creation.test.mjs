import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useCandidateSupport, useSql } from "./pool-test-harness.mjs";

describe("pool creation", () => {
  let scenario;

  beforeEach(() => {
    scenario = {
      candidateSupport: { hasTags: true, hasSourceUrl: true },
      expectedCandidateColumns: "creator_user_id, name, description, image_url, source_url, tags",
      candidate: {
        name: "  Ada  ",
        description: undefined,
        imageUrl: undefined,
        sourceUrl: "https://example.com/ada",
        tags: [" math ", "math", ""]
      }
    };
  });

  function installCreatePoolScenario() {
    useCandidateSupport(scenario.candidateSupport);
    const setup = createSql([
      poolSupport(),
      [{ id: "pool-1", name: "Favorites", description: null }],
      [{ id: "candidate-1" }],
      [],
      poolRow(),
      candidateRows([{ id: "candidate-1", name: "Ada" }])
    ]);
    useSql(setup.sql);
    return setup;
  }

  it.each([
    [{ hasTags: true, hasSourceUrl: true }, "creator_user_id, name, description, image_url, source_url, tags"],
    [{ hasTags: true, hasSourceUrl: false }, "creator_user_id, name, description, image_url, tags"],
    [{ hasTags: false, hasSourceUrl: true }, "creator_user_id, name, description, image_url, source_url"],
    [{ hasTags: false, hasSourceUrl: false }, "creator_user_id, name, description, image_url"]
  ])("stores only candidate fields supported by the current schema", async (candidateSupport, expectedCandidateColumns) => {
    scenario.candidateSupport = candidateSupport;
    scenario.expectedCandidateColumns = expectedCandidateColumns;
    const { calls } = installCreatePoolScenario();
    const { createPool } = await importPools();

    const created = await createPool({ creatorUserId: "user-1", name: "Favorites", candidates: [scenario.candidate] });

    const insertCandidateCall = calls.find((call) => call.sql.includes("insert into candidate ("));
    assert.equal(created.id, "pool-1");
    assert.match(insertCandidateCall.sql, new RegExp(`insert into candidate \\(${scenario.expectedCandidateColumns}\\)`));
    assert.equal(insertCandidateCall.values[0], "user-1");
    assert.equal(insertCandidateCall.values[1], "Ada");
    assert.equal(insertCandidateCall.values[2], null);
    assert.equal(insertCandidateCall.values[3], null);
  });
});

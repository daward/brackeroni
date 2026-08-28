import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { candidateRows, createSql, importPools, poolRow, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool favorites", () => {
  let scenario;
  let poolHandle;

  beforeEach(async () => {
    const { pool } = await importPools();

    poolHandle = pool({ poolId: "pool-1", viewerUserId: "user-1" });
    scenario = {
      sourcePool: poolRow({ id: "pool-1", creatorUserId: "user-2", visibility: "public_listed", candidateCount: 1 }),
      sourceCandidates: candidateRows([{ id: "candidate-1", name: "Ada", tags: ["math"] }]),
      existingFavorite: [{ id: "favorite-1" }],
      favoritePool: poolRow({ id: "favorite-1", candidateCount: 1 }),
      favoriteCandidates: candidateRows([{ id: "candidate-2", name: "Ada", tags: ["math"] }]),
      createdCandidate: [{ id: "candidate-2" }]
    };
  });

  function installExistingFavoriteScenario() {
    const setup = createSql([
      poolSupport(),
      scenario.sourcePool,
      scenario.sourceCandidates,
      scenario.existingFavorite,
      scenario.favoritePool,
      scenario.favoriteCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  function installNewFavoriteScenario() {
    const setup = createSql([
      poolSupport(),
      scenario.sourcePool,
      scenario.sourceCandidates,
      [],
      scenario.favoritePool,
      scenario.createdCandidate,
      [],
      scenario.favoritePool,
      scenario.favoriteCandidates
    ]);
    useSql(setup.sql);
    return setup;
  }

  it("returns an existing saved copy of the source pool", async () => {
    const { calls } = installExistingFavoriteScenario();

    const pool = await poolHandle.favorite();

    assert.equal(pool.id, "favorite-1");
    assert.equal(calls.filter((call) => call.sql.includes("insert into candidate_pool")).length, 0);
  });

  it("creates a private saved copy when one does not exist", async () => {
    const { calls } = installNewFavoriteScenario();

    const pool = await poolHandle.favorite();

    const poolInsert = calls.find((call) => call.sql.includes("insert into candidate_pool ("));
    assert.equal(pool.id, "favorite-1");
    assert.equal(poolInsert.values[5], "pool-1");
  });
});

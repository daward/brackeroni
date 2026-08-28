import assert from "node:assert/strict";
import { beforeEach, describe, it } from "vitest";
import { createSql, importPools, poolSupport, useSql } from "./pool-test-harness.mjs";

describe("pool listing", () => {
  let scenario;

  beforeEach(() => {
    scenario = {
      poolSupport: poolSupport(),
      listedPools: [
        [{ id: "pool-1", name: "Alpha", totalCount: 1 }],
        [{ id: "pool-2", name: "Bravo", totalCount: 1 }]
      ],
      publicPools: [
        {
          id: "pool-public",
          name: "Ada Favorites",
          description: "Public examples",
          visibility: "public_listed",
          featuredOnHome: true,
          candidateCount: 3,
          creatorEmail: "ada@example.com",
          creatorName: "Ada",
          favoritePoolId: "favorite-1",
          isFavorited: true,
          previewCandidates: [{ id: "candidate-1", name: "Grace", imageUrl: null }]
        }
      ]
    };
  });

  function installListPoolsScenario() {
    const setup = createSql([scenario.poolSupport, ...scenario.listedPools]);
    useSql(setup.sql);
    return setup;
  }

  it("reuses schema support after the first owned-pool read", async () => {
    const { calls } = installListPoolsScenario();
    const { listPools } = await importPools();

    const first = await listPools({ userId: "user-1" });
    const second = await listPools({ userId: "user-1" });

    assert.deepEqual(first.items.map((pool) => pool.id), ["pool-1"]);
    assert.deepEqual(second.items.map((pool) => pool.id), ["pool-2"]);
    assert.equal(calls.filter((call) => call.sql.includes("information_schema.columns")).length, 1);
  });

  it("returns no public pools when public-pool columns are unavailable", async () => {
    scenario.poolSupport = poolSupport({ hasVisibility: false });
    scenario.listedPools = [];
    const { calls } = installListPoolsScenario();
    const { listPublicPools } = await importPools();

    const pools = await listPublicPools({ limit: "999", offset: "-5" });

    assert.deepEqual(pools, []);
    assert.equal(calls.length, 1);
  });

  it("lists owned pools against legacy private-only schemas", async () => {
    scenario.poolSupport = poolSupport({ hasVisibility: false });
    scenario.listedPools = [[{ id: "pool-private", name: "Private", totalCount: 12 }]];
    installListPoolsScenario();
    const { listPools } = await importPools();

    const result = await listPools({ userId: "user-1", limit: "999", offset: "-5" });

    assert.deepEqual(result.items.map((pool) => pool.id), ["pool-private"]);
    assert.equal(result.totalCount, 12);
    assert.equal(result.limit, 48);
    assert.equal(result.offset, 0);
  });

  it("returns no featured pools when the featured column is unavailable", async () => {
    scenario.poolSupport = poolSupport({ hasFeaturedOnHome: false });
    scenario.listedPools = [];
    const { calls } = installListPoolsScenario();
    const { listPublicPools } = await importPools();

    const pools = await listPublicPools({ featuredOnly: true });

    assert.deepEqual(pools, []);
    assert.equal(calls.length, 1);
  });

  it("lists public pools with search, featured, and favorite filters", async () => {
    const setup = createSql([scenario.poolSupport, scenario.publicPools]);
    useSql(setup.sql);
    const { listPublicPools } = await importPools();

    const pools = await listPublicPools({
      userId: "user-1",
      query: " Ada ",
      favoritesOnly: true,
      featuredOnly: true,
      limit: "999",
      offset: "-5"
    });

    assert.deepEqual(pools.map((pool) => pool.id), ["pool-public"]);
    assert.equal(pools[0].isFavorited, true);
    assert.equal(setup.calls.at(-1).values.at(-2), 48);
    assert.equal(setup.calls.at(-1).values.at(-1), 0);
  });
});

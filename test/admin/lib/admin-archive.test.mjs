import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

let currentSql = null;

vi.mock("@/lib/db", () => ({
  getDb() {
    if (!currentSql) throw new Error("TEST_SQL_NOT_CONFIGURED");
    return currentSql;
  }
}));

function normalizeSql(strings) {
  return strings.join("?").replace(/\s+/g, " ").trim();
}

function createSql(responses = []) {
  const calls = [];

  function sql(strings, ...values) {
    if (typeof strings?.join !== "function") {
      return { values: strings };
    }

    const call = { sql: normalizeSql(strings), values };
    if (/^(select|insert|update|delete)\b/i.test(call.sql)) {
      calls.push(call);
    }

    return Promise.resolve(responses.shift() ?? []);
  }

  sql.begin = async (callback) => callback(sql);

  return { calls, sql };
}

async function importAdminData() {
  return import("../../../lib/admin/internal/data.js");
}

describe("admin archive cleanup", () => {
  beforeEach(() => {
    currentSql = null;
    vi.resetModules();
  });

  it("deletes archived parallel brackets before archived pools", async () => {
    const { calls, sql } = createSql([
      [{ hasParallelTournamentTable: true }],
      [{ id: "child-1" }],
      [],
      [],
      [],
      [{ id: "parallel-1" }],
      [],
      [{ id: "standard-1" }],
      [{ id: "pool-1" }]
    ]);
    currentSql = sql;
    const { deleteAllArchivedMaterial } = await importAdminData();

    const result = await deleteAllArchivedMaterial();

    assert.equal(result.deletedParallelTournamentCount, 1);
    assert.ok(
      calls.findIndex((call) => call.sql.startsWith("delete from parallel_tournament ")) <
        calls.findIndex((call) => call.sql.startsWith("delete from candidate_pool "))
    );
    assert.ok(calls.find((call) => call.sql.startsWith("delete from candidate_pool "))?.sql.includes("not exists"));
  });

  it("keeps bulk cleanup compatible before parallel tournament migrations", async () => {
    const { calls, sql } = createSql([
      [{ hasParallelTournamentTable: false }],
      [],
      [{ id: "standard-1" }],
      [{ id: "pool-1" }]
    ]);
    currentSql = sql;
    const { deleteAllArchivedMaterial } = await importAdminData();

    const result = await deleteAllArchivedMaterial();

    assert.equal(result.deletedParallelTournamentCount, 0);
    assert.equal(result.deletedPoolCount, 1);
    assert.ok(calls.every((call) => !call.sql.includes("parallel_tournament_participant")));
  });

  it("does not delete an archived pool still referenced by a parallel bracket", async () => {
    const { calls, sql } = createSql([[{ hasParallelTournamentTable: true }], []]);
    currentSql = sql;
    const { deleteArchivedPool } = await importAdminData();

    await assert.rejects(deleteArchivedPool({ poolId: "pool-1" }), /NOT_FOUND/);

    const deleteCall = calls.find((call) => call.sql.startsWith("delete from candidate_pool"));
    assert.ok(deleteCall.sql.includes("not exists"));
    assert.ok(deleteCall.sql.includes("parallel_tournament"));
  });
});

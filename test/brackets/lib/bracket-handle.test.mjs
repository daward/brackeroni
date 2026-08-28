import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket handle", () => {
  let bracketHandle;
  let calls;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [tournamentRows(), []];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { bracket } = await import("@/lib/brackets");
    bracketHandle = bracket({ tournamentId: "bracket-1", creatorUserId: "user-1" });
  });

  function createSql() {
    return Object.assign(
      (strings, ...values) => {
        calls.push({ sql: strings.join("?").replace(/\s+/g, " ").trim(), values });
        return Promise.resolve(responses.shift() ?? []);
      },
      { begin: async (callback) => callback(createSql()) },
    );
  }

  function tournamentRows(overrides = {}) {
    return [{
      id: "bracket-1",
      creatorUserId: "user-1",
      title: "Dinner",
      status: "draft",
      createdAt: "2026-01-01",
      seedingStructure: {},
      ...overrides,
    }];
  }

  it("archives the bracket bound to the owner", async () => {
    const result = await bracketHandle.archive();

    assert.deepEqual(result, { ok: true });
    assert.deepEqual(calls[0].values, ["user-1", "bracket-1"]);
    assert.deepEqual(calls.at(-1).values, ["bracket-1"]);
  });
});

describe("parallel bracket handle", () => {
  let parallelBracketHandle;
  let calls;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [parallelSupportRows(), parallelBracketRows(), [], []];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { parallelBracket } = await import("@/lib/brackets");
    parallelBracketHandle = parallelBracket({ parallelBracketId: "parallel-1", creatorUserId: "user-1" });
  });

  function createSql() {
    return Object.assign(
      (strings, ...values) => {
        calls.push({ sql: strings.join("?").replace(/\s+/g, " ").trim(), values });
        return Promise.resolve(responses.shift() ?? []);
      },
      { begin: async (callback) => callback(createSql()) },
    );
  }

  function parallelSupportRows() {
    return [{ hasParallelTournamentTable: true }];
  }

  function parallelBracketRows(overrides = {}) {
    return [{
      id: "parallel-1",
      creatorUserId: "user-1",
      title: "Dinner",
      sharingMode: "with_friends",
      status: "draft",
      createdAt: "2026-01-01",
      ...overrides,
    }];
  }

  it("archives the parallel bracket bound to the owner", async () => {
    const result = await parallelBracketHandle.archive();

    assert.deepEqual(result, { ok: true });
    assert.ok(calls[1].values.includes("user-1"));
    assert.ok(calls[1].values.includes("parallel-1"));
    assert.deepEqual(calls.at(-1).values, ["parallel-1"]);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket round actions", () => {
  let calls;
  let responses;
  let roundFactory;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { round } = await import("@/lib/brackets");
    roundFactory = round;
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

  it("reveals a closed round for its creator", async () => {
    responses = [[{
      id: "round-1",
      tournamentId: "bracket-1",
      roundNumber: 2,
      status: "closed",
      revealedAt: "2026-01-01",
    }]];

    const result = await roundFactory({
      roundId: "round-1",
      creatorUserId: "creator-1",
    }).reveal();

    assert.equal(result.id, "round-1");
    assert.equal(calls[0].values[0], "round-1");
    assert.equal(calls[0].values[1], "creator-1");
  });

  it("rejects rounds that cannot be revealed", async () => {
    responses = [[]];

    await assert.rejects(
      () => roundFactory({ roundId: "round-1", creatorUserId: "creator-1" }).reveal(),
      /ROUND_NOT_REVEALABLE/,
    );
  });
});

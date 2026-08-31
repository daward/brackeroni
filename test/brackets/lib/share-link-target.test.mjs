import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket share link target", () => {
  let calls;
  let responses;
  let shareLink;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const brackets = await import("@/lib/brackets");
    shareLink = brackets.shareLink;
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

  function shareRecord(overrides = {}) {
    return [{
      shareLinkId: "link-1",
      active: true,
      tournamentId: "bracket-1",
      title: "Dinner",
      status: "draft",
      sharingMode: "with_friends",
      creatorUserId: "creator-1",
      entryCount: 4,
      ...overrides,
    }];
  }

  it("joins a draft friends bracket from an active standard share link", async () => {
    responses = [shareRecord(), [], [{ id: "invite-1", status: "pending" }]];

    const target = await shareLink({
      token: "share-token",
      userId: "user-1",
    }).getTarget();

    assert.equal(target.bracketType, "standard");
    assert.equal(target.joined, true);
    assert.equal(target.inviteStatus, "pending");
    assert.equal(target.votePath, "/vote?bracket=bracket-1");
  });

  it("does not join inactive standard share links", async () => {
    responses = [shareRecord({ active: false }), []];

    const target = await shareLink({
      token: "share-token",
      userId: "user-1",
    }).getTarget();

    assert.equal(target.joined, false);
    assert.equal(target.accessState, "link_inactive");
  });

  it("falls back to an active parallel share link", async () => {
    responses = [
      [],
      [{ hasParallelBracketShareLinks: true }],
      [parallelShareRecord()],
      [],
      [{ id: "participant-1", status: "active" }],
    ];

    const target = await shareLink({
      token: "parallel-token",
      userId: "user-1",
    }).getTarget();

    assert.equal(target.bracketType, "parallel_parent");
    assert.equal(target.joined, true);
    assert.equal(target.votePath, "/vote?parallelBracket=parallel-1");
  });

  function parallelShareRecord() {
    return {
      shareLinkId: "link-1",
      active: true,
      parallelTournamentId: "parallel-1",
      title: "Ranking",
      status: "active",
      sharingMode: "with_friends",
      creatorUserId: "creator-1",
      entryCount: 4,
    };
  }
});

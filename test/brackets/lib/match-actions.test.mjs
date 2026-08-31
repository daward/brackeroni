import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket match actions", () => {
  let calls;
  let matchFactory;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { match } = await import("@/lib/brackets");
    matchFactory = match;
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

  function openMatch(overrides = {}) {
    return [{
      id: "match-1",
      status: "open",
      roundId: "round-1",
      leftEntryId: "left-entry",
      rightEntryId: "right-entry",
      tournamentId: "bracket-1",
      creatorUserId: "creator-1",
      sharingMode: "private",
      visibility: "private",
      votingAccess: "signed_in_only",
      advancementMode: "vote_winner",
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      tieBreakMode: "higher_seed_wins",
      roundClosureMode: "manual",
      parentParallelTournamentId: null,
      tournamentStatus: "active",
      tournamentCreatorUserId: "creator-1",
      ...overrides,
    }];
  }

  function settledMatchRows() {
    return [
      {
        id: "match-1",
        status: "open",
        leftEntryId: "left-entry",
        rightEntryId: "right-entry",
        leftSeed: 1,
        rightSeed: 4,
        leftVoteCount: 2,
        rightVoteCount: 0,
      },
      {
        id: "match-2",
        status: "open",
        leftEntryId: "second-left",
        rightEntryId: "second-right",
        leftSeed: 2,
        rightSeed: 3,
        leftVoteCount: 0,
        rightVoteCount: 2,
      },
    ];
  }

  function advancingEntryRows() {
    return [
      { id: "left-entry", seed: 1, subSeed: 0, seedingStructure: {} },
      { id: "right-entry", seed: 4, subSeed: 0, seedingStructure: {} },
      { id: "second-left", seed: 2, subSeed: 0, seedingStructure: {} },
      { id: "second-right", seed: 3, subSeed: 0, seedingStructure: {} },
    ];
  }

  it("records a creator vote without advancing a manual round", async () => {
    responses = [openMatch(), [], [], [], [{ status: "active" }]];

    const result = await matchFactory({
      matchId: "match-1",
      userId: "creator-1",
    }).recordVote("left-entry");

    assert.deepEqual(result, {
      matchId: "match-1",
      tournamentId: "bracket-1",
      tournamentStatus: "active",
      selectedEntryId: "left-entry",
    });
    assert.equal(calls.some((call) => call.sql.startsWith("insert into vote")), true);
  });

  it("checks locked participant votes before auto-closing friends rounds", async () => {
    responses = [
      openMatch({ sharingMode: "with_friends", roundClosureMode: "all_votes_received" }),
      [],
      [],
      [],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "active" }],
      [{
        id: "match-1",
        status: "open",
        leftEntryId: "left-entry",
        rightEntryId: "right-entry",
        leftSeed: 1,
        rightSeed: 2,
        leftVoteCount: 1,
        rightVoteCount: 0,
      }],
      [{ ready: false }],
      [{ status: "active" }],
    ];

    const result = await matchFactory({
      matchId: "match-1",
      userId: "creator-1",
    }).recordVote("left-entry");

    assert.equal(result.tournamentStatus, "active");
    assert.equal(calls.some((call) => call.sql.includes("with participants as")), true);
  });

  it("creates the next round when automatic voting settles", async () => {
    responses = [
      openMatch({ roundClosureMode: "automatic_when_settled" }),
      [],
      [],
      [],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "active" }],
      settledMatchRows(),
      [],
      [],
      [],
      [],
      advancingEntryRows(),
      [],
      [],
      [{ id: "round-2" }],
      [],
      [{ status: "active" }],
    ];

    const result = await matchFactory({
      matchId: "match-1",
      userId: "creator-1",
    }).recordVote("left-entry");

    assert.equal(result.tournamentStatus, "active");
    assert.equal(calls.some((call) => call.sql.startsWith("insert into tournament_round")), true);
    assert.equal(calls.some((call) => call.sql.startsWith("insert into match")), true);
  });

  it("rejects duplicate anonymous votes", async () => {
    responses = [
      openMatch({ sharingMode: "private", visibility: "public_listed", votingAccess: "anyone" }),
      [{ id: "vote-1", anonymousVoterToken: "anon-1", selectedEntryId: "left-entry" }],
    ];

    await assert.rejects(
      () => matchFactory({
        matchId: "match-1",
        anonymousVoterToken: "anon-1",
      }).recordVote("right-entry"),
      /ALREADY_VOTED/,
    );
  });

  it("rejects a vote for an entry outside the match", async () => {
    responses = [openMatch()];

    await assert.rejects(
      () => matchFactory({ matchId: "match-1", userId: "creator-1" }).recordVote("other-entry"),
      /INVALID_MATCH_SELECTION/,
    );
  });

  it("sets a manual winner for the creator", async () => {
    responses = [
      openMatch({ advancementMode: "manual_winner" }),
      [{ id: "match-1", winnerEntryId: "right-entry", resolutionSource: "manual_result" }],
    ];

    const result = await matchFactory({
      matchId: "match-1",
      creatorUserId: "creator-1",
    }).setManualWinner("right-entry");

    assert.deepEqual(result, {
      id: "match-1",
      winnerEntryId: "right-entry",
      resolutionSource: "manual_result",
    });
  });

  it("rejects manual winners from non-creators", async () => {
    responses = [openMatch({ advancementMode: "manual_winner" })];

    await assert.rejects(
      () => matchFactory({ matchId: "match-1", creatorUserId: "other-user" }).setManualWinner("left-entry"),
      /FORBIDDEN/,
    );
  });
});

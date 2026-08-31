import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("parallel bracket directory", () => {
  let calls;
  let directory;
  let ownedBrackets;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { parallelBracketDirectory, parallelBrackets } = await import("@/lib/brackets");
    directory = parallelBracketDirectory();
    ownedBrackets = parallelBrackets({ creatorUserId: "creator-1" });
  });

  function createSql() {
    return Object.assign(
      (strings, ...values) => {
        const sql = strings.join("?").replace(/\s+/g, " ").trim();
        if (!/^(select|update|insert|delete|with)\b/i.test(sql)) {
          return { sql };
        }

        calls.push({ sql, values });
        return Promise.resolve(responses.shift() ?? []);
      },
      { begin: async (callback) => callback(createSql()) },
    );
  }

  function supportRows() {
    return [[{ hasTags: false }], [{ hasParallelTournamentTable: true }]];
  }

  function parallelRow(overrides = {}) {
    return {
      id: "parallel-1",
      title: "Ranking",
      description: null,
      sourcePoolId: "pool-1",
      sourcePoolName: "Dinner",
      sharingMode: "with_friends",
      visibility: "private",
      votingAccess: "signed_in_only",
      playStyle: "fixed_bracket",
      resultMode: "parallel_full_ranking",
      tieBreakMode: "higher_seed_wins",
      status: "active",
      participantCount: 1,
      completedParticipantCount: 1,
      viewerTournamentId: "child-1",
      ...overrides,
    };
  }

  function teaserRow() {
    return {
      parallelTournamentId: "parallel-1",
      parallelTournamentTitle: "Ranking",
      leftCandidateId: "candidate-1",
      leftName: "Pizza",
      leftSeed: 1,
      rightCandidateId: "candidate-2",
      rightName: "Tacos",
      rightSeed: 2,
    };
  }

  function participantRow() {
    return {
      id: "participant-1",
      userId: "viewer-1",
      tournamentId: "child-1",
      status: "complete",
    };
  }

  function aggregateEntry(overrides = {}) {
    return {
      candidateId: "candidate-1",
      seed: 1,
      candidateName: "Pizza",
      candidateImageUrl: null,
      averageRank: 2,
      rankStdDev: 0,
      ballotCount: 1,
      ...overrides,
    };
  }

  function participantEntry() {
    return {
      tournamentId: "child-1",
      entryId: "entry-1",
      candidateId: "candidate-2",
      finalRank: 1,
    };
  }

  function participantMatch() {
    return {
      id: "match-1",
      tournamentId: "child-1",
      status: "complete",
      winnerEntryId: "entry-1",
      leftEntryId: "entry-1",
      leftSeed: 1,
      leftName: "Tacos",
      leftVoteCount: 1,
      rightEntryId: "entry-2",
      rightSeed: 2,
      rightName: "Pizza",
      rightVoteCount: 0,
    };
  }

  it("lists owned parallel brackets", async () => {
    responses = [...supportRows(), [parallelRow(), parallelRow({ id: "parallel-2" })]];

    const result = await ownedBrackets.list({ limit: 1 });

    assert.equal(result.hasNextPage, true);
    assert.equal(result.items[0].id, "parallel-1");
  });

  it("lists accessible parallel brackets with viewer bracket ids", async () => {
    responses = [[{ hasParallelTournamentTable: true }], [parallelRow()]];

    const brackets = await directory.listAccessibleBrackets({ userId: "user-1" });

    assert.equal(brackets[0].viewerBracketId, "child-1");
  });

  it("gets a creator's parallel bracket with participants", async () => {
    responses = [
      [{ hasParallelTournamentTable: true }],
      [parallelRow({ creatorUserId: "creator-1" })],
      [{ id: "participant-1", userId: "user-1", tournamentId: "child-1" }],
    ];

    const bracket = await directory.getAccessibleBracketById({
      parallelBracketId: "parallel-1",
      userId: "creator-1",
    });

    assert.equal(bracket.id, "parallel-1");
    assert.equal(bracket.participants[0].id, "participant-1");
  });

  it("lists public parallel brackets", async () => {
    responses = [[{ hasParallelTournamentTable: true }], [parallelRow({ visibility: "public_listed" })]];

    const brackets = await directory.listPublicBrackets({ statuses: ["active"], limit: 3 });

    assert.equal(brackets[0].id, "parallel-1");
    assert.equal(calls.at(-1).values.includes(3), true);
  });

  it("gets featured teaser matchups", async () => {
    responses = [[{ hasParallelTournamentTable: true }], [teaserRow()]];

    const matchups = await directory.getFeaturedTeaserMatchups({ limit: 2 });

    assert.equal(matchups[0].parallelTournamentId, "parallel-1");
    assert.equal(matchups[0].leftName, "Pizza");
    assert.equal(calls.at(-1).values.includes(2), true);
  });

  it("returns aggregate results for visible participant ballots", async () => {
    responses = [
      [{ hasParallelTournamentTable: true }],
      [{ hasTags: false }],
      [{ hasParallelTournamentTable: true }],
      [parallelRow({ visibility: "public_unlisted", sharingMode: "private" })],
      [participantRow()],
      [aggregateEntry({ candidateId: "candidate-2", averageRank: 1 })],
      [participantEntry()],
      [participantMatch()],
    ];

    const results = await directory.getAggregateResults({
      parallelBracketId: "parallel-1",
      userId: "viewer-1",
    });

    assert.equal(results.completedBallotCount, 1);
    assert.equal(results.aggregateEntries[0].finalRank, 1);
    assert.equal(results.participants[0].matches[0].id, "match-1");
  });

  it("requires a viewer before opening a participant bracket", async () => {
    responses = [[{ hasParallelTournamentTable: true }]];

    await assert.rejects(() => directory.openParticipantBracket({
      parallelBracketId: "parallel-1",
    }), /UNAUTHORIZED/);

    assert.equal(calls.length, 1);
  });

  it("creates a parallel bracket from an accessible pool", async () => {
    responses = [
      [{ hasParallelTournamentTable: true }],
      [{ id: "pool-1", name: "Dinner" }],
      [{ candidateCount: 4 }],
      [{ id: "parallel-1" }],
      [],
      [{ hasParallelTournamentTable: true }],
      [parallelRow({ creatorUserId: "creator-1" })],
      [],
    ];

    const bracket = await ownedBrackets.create({
      title: "Ranking",
      sourcePoolId: "pool-1",
      sharingMode: "with_friends",
      visibility: "private",
      votingAccess: "signed_in_only",
      tieBreakMode: "higher_seed_wins",
    });

    assert.equal(bracket.id, "parallel-1");
    assert.equal(calls.some((call) => call.sql.startsWith("insert into parallel_tournament_participant")), true);
  });
});

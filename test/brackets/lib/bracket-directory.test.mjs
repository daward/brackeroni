import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket directory", () => {
  let calls;
  let directory;
  let ownedBrackets;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { bracketDirectory, brackets } = await import("@/lib/brackets");
    directory = bracketDirectory();
    ownedBrackets = brackets({ creatorUserId: "creator-1" });
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

  function bracketRow(overrides = {}) {
    return {
      id: "bracket-1",
      creatorUserId: "creator-1",
      title: "Dinner",
      status: "complete",
      winnerEntryId: "entry-1",
      winnerName: "Pizza",
      winnerSeed: 1,
      ...overrides,
    };
  }

  it("lists owned brackets with normalized winners", async () => {
    responses = [
      [{ hasParentParallelTournamentId: true, hasParallelTournamentParticipantTable: true }],
      [bracketRow(), bracketRow({ id: "bracket-2" })],
    ];

    const result = await ownedBrackets.list({ limit: 1, offset: 2 });

    assert.equal(result.hasNextPage, true);
    assert.deepEqual(result.items[0].winner, {
      id: "entry-1",
      name: "Pizza",
      seed: 1,
      imageUrl: null,
    });
    assert.equal(calls.at(-1).values.includes("creator-1"), true);
  });

  it("gets an accessible public bracket by id", async () => {
    responses = [
      [{ hasParentParallelTournamentId: true, hasParallelTournamentParticipantTable: true }],
      [bracketRow({ visibility: "public_listed", hasHiddenClosedRounds: true })],
      [{ id: "entry-1", seed: 1, candidateId: "candidate-1", candidateName: "Pizza", finalRank: null }],
    ];

    const bracket = await directory.getAccessibleBracketById({
      bracketId: "bracket-1",
      userId: "viewer-1",
    });

    assert.equal(bracket.id, "bracket-1");
    assert.equal(bracket.entries[0].finalRank, null);
  });

  it("rejects inaccessible bracket reads", async () => {
    responses = [
      [{ hasParentParallelTournamentId: false, hasParallelTournamentParticipantTable: false }],
      [],
    ];

    await assert.rejects(
      () => directory.getAccessibleBracketById({ bracketId: "bracket-1", userId: "viewer-1" }),
      /NOT_FOUND/,
    );
  });

  it("returns status counts for the creator", async () => {
    responses = [
      [{ hasParentParallelTournamentId: false, hasParallelTournamentParticipantTable: false }],
      [{ status: "active", count: "2" }],
    ];

    const counts = await ownedBrackets.statusCounts();

    assert.deepEqual(counts, { active: 2 });
  });

  it("creates a public bracket with public voting access", async () => {
    responses = [
      [{ id: "bracket-2" }],
      [bracketRow({ id: "bracket-2", visibility: "public_listed", votingAccess: "anyone" })],
      [],
    ];

    const bracket = await ownedBrackets.create({
      title: "Dinner",
      sharingMode: "private",
      visibility: "public_listed",
      votingAccess: "signed_in_only",
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      tieBreakMode: "higher_seed_wins",
    });

    assert.equal(bracket.id, "bracket-2");
    assert.equal(calls[0].values.includes("anyone"), true);
  });

  it("rejects mismatched custom seeding", async () => {
    responses = [[{ id: "candidate-1" }]];

    await assert.rejects(
      () => ownedBrackets.create({
        title: "Dinner",
        sourcePoolId: "pool-1",
        sharingMode: "private",
        playStyle: "fixed_bracket",
        resultMode: "winner_only",
        tieBreakMode: "higher_seed_wins",
        seedCandidateIds: ["candidate-2"],
      }),
      /TOURNAMENT_SEEDING_MISMATCH/,
    );
  });

  it("lists public brackets through the directory", async () => {
    responses = [
      [{ hasParentParallelTournamentId: false, hasParallelTournamentParticipantTable: false }],
      [bracketRow({ visibility: "public_listed" })],
    ];

    const brackets = await directory.listPublicBrackets({ statuses: ["complete"], limit: 6 });

    assert.equal(brackets[0].id, "bracket-1");
    assert.equal(calls.at(-1).values.includes(6), true);
  });

  it("gets featured public matchups", async () => {
    responses = [
      [{ hasParentParallelTournamentId: true, hasParallelTournamentParticipantTable: true }],
      [{ matchId: "match-1", tournamentId: "bracket-1", leftName: "Pizza", rightName: "Tacos" }],
    ];

    const matchups = await directory.getFeaturedPublicMatchups({ userId: "user-1", limit: 4 });

    assert.equal(matchups[0].matchId, "match-1");
    assert.equal(calls.at(-1).values.includes(4), true);
  });

  it("gets homepage public matchups", async () => {
    responses = [
      [{ hasParentParallelTournamentId: false, hasParallelTournamentParticipantTable: false }],
      [{ matchId: "match-1", tournamentId: "bracket-1" }],
    ];

    const matchups = await directory.getFeaturedPublicMatchupsForHomepage({ limit: 2 });

    assert.deepEqual(matchups, [{ matchId: "match-1", tournamentId: "bracket-1" }]);
    assert.equal(calls.at(-1).values.includes(2), true);
  });
});

import assert from "node:assert/strict";
import { beforeEach, describe, it, vi } from "vitest";

describe("bracket handle", () => {
  let bracketHandle;
  let bracketFactory;
  let calls;
  let responses;

  beforeEach(async () => {
    vi.resetModules();
    calls = [];
    responses = [tournamentRows(), []];
    vi.doMock("@/lib/db", () => ({ getDb: () => createSql() }));

    const { bracket } = await import("@/lib/brackets");
    bracketFactory = bracket;
    bracketHandle = bracketFactory({ bracketId: "bracket-1", creatorUserId: "user-1" });
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

  it("gets a bracket with a normalized winner", async () => {
    responses = [
      tournamentRows({
        winnerEntryId: "entry-1",
        winnerName: "Pizza",
        winnerSeed: 1,
      }),
      [],
    ];

    const bracket = await bracketHandle.get();

    assert.deepEqual(bracket.winner, {
      id: "entry-1",
      name: "Pizza",
      seed: 1,
      imageUrl: null,
    });
  });

  it("lists matches with normalized sides and hidden public tallies", async () => {
    responses = [
      [{ hasTags: false }],
      [{ hasParallelTournamentParticipantTable: false }],
      tournamentRows({ status: "complete", sharingMode: "with_friends", visibility: "public_listed" }),
      [matchRow()],
    ];

    const result = await bracketFactory({ bracketId: "bracket-1", userId: "viewer-1" }).listMatches();

    assert.equal("tournament" in result, false);
    assert.equal(result.bracket.id, "bracket-1");
    assert.deepEqual(result.matches[0].left, {
      id: "left-entry",
      name: "Pizza",
      seed: 1,
      imageUrl: null,
      voteCount: null,
    });
  });

  it("rejects friends match lists for uninvited viewers", async () => {
    responses = [
      [{ hasTags: false }],
      [{ hasParallelTournamentParticipantTable: false }],
      tournamentRows({
        creatorUserId: "creator-1",
        sharingMode: "with_friends",
        visibility: "private",
      }),
      [],
    ];

    await assert.rejects(
      () => bracketFactory({ bracketId: "bracket-1", userId: "viewer-1" }).listMatches(),
      /FORBIDDEN/,
    );
  });

  it("returns an existing friends share link", async () => {
    responses = [
      tournamentRows({ sharingMode: "with_friends" }),
      [],
      [{ id: "link-1", token: "abc", active: true }],
    ];

    const link = await bracketHandle.ensureShareLink();

    assert.deepEqual(link, { id: "link-1", token: "abc", active: true });
  });

  it("creates a friends share link when none exists", async () => {
    responses = [
      tournamentRows({ sharingMode: "with_friends" }),
      [],
      [],
      [{ id: "link-1", token: "new-token", active: true }],
    ];

    const link = await bracketHandle.ensureShareLink();

    assert.equal(link.id, "link-1");
    assert.equal(calls.at(-1).sql.startsWith("insert into share_link"), true);
  });

  it("rotates a friends share link", async () => {
    responses = [
      tournamentRows({ sharingMode: "with_friends" }),
      [],
      [],
      [{ id: "link-2", token: "rotated-token", active: true }],
    ];

    const link = await bracketHandle.rotateShareLink();

    assert.equal(link.token, "rotated-token");
    assert.equal(calls.some((call) => call.sql.startsWith("update share_link")), true);
  });

  it("rejects share links for private brackets", async () => {
    responses = [tournamentRows({ sharingMode: "private" }), []];

    await assert.rejects(() => bracketHandle.ensureShareLink(), /FORBIDDEN/);
  });

  it("lists bracket invites for the owner", async () => {
    responses = [
      tournamentRows({ sharingMode: "with_friends" }),
      [],
      [{ id: "invite-1", userId: "viewer-1", votesCast: 1, openMatchCount: 2 }],
    ];

    const invites = await bracketHandle.listInvites();

    assert.equal(invites[0].id, "invite-1");
    assert.equal(invites[0].votesCast, 1);
  });

  it("lists bracket share links for the owner", async () => {
    responses = [
      tournamentRows({ sharingMode: "with_friends" }),
      [],
      [{ id: "link-1", token: "abc", active: false }],
    ];

    const links = await bracketHandle.listShareLinks();

    assert.deepEqual(links, [{ id: "link-1", token: "abc", active: false }]);
  });

  it("rejects closing a draft bracket round", async () => {
    responses = [tournamentRows({ status: "draft" })];

    await assert.rejects(() => bracketHandle.closeCurrentRound(), /ROUND_NOT_CLOSABLE/);
  });

  it("closes a final active round and completes the bracket", async () => {
    responses = [
      [activeTournament()],
      [{ id: "round-1" }],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "active" }],
      [{
        id: "match-1",
        status: "open",
        leftEntryId: "entry-1",
        rightEntryId: "entry-2",
        leftSeed: 1,
        rightSeed: 2,
        leftVoteCount: 3,
        rightVoteCount: 1,
      }],
      [],
      [],
      [],
      [],
      [],
    ];

    const result = await bracketHandle.closeCurrentRound();

    assert.deepEqual(result, { advanced: true, completed: true });
    assert.equal(calls.some((call) => call.sql.startsWith("update match")), true);
    assert.equal(calls.some((call) => call.sql.startsWith("update tournament set")), true);
  });

  it("defers advancement when closing a public round", async () => {
    responses = [
      [activeTournament({ visibility: "public_listed" })],
      [{ id: "round-1" }],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "active" }],
      [matchRow()],
      [],
      [],
    ];

    const result = await bracketHandle.closeCurrentRound();

    assert.deepEqual(result, { advanced: false, closed: true, completed: false });
    assert.equal(calls.some((call) => call.sql.includes("revealed_at = coalesce")), false);
  });

  it("reveals and advances a closed public round", async () => {
    responses = [
      [activeTournament({ visibility: "public_listed" })],
      [{ id: "round-1" }],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "closed" }],
      [closedMatchRow()],
      [],
      [],
      [],
      [],
      [{ id: "round-1", tournamentId: "bracket-1", roundNumber: 1, status: "closed" }],
    ];

    const result = await bracketHandle.openNextRound();

    assert.equal(result.completed, true);
    assert.equal(result.round.id, "round-1");
    assert.equal(calls.at(-1).sql.startsWith("update tournament_round"), true);
  });

  it("assigns final rank when a full-ranking round closes", async () => {
    responses = [
      [activeTournament({ resultMode: "full_ranking" })],
      [{ id: "round-1" }],
      [{ id: "round-1", sequenceNumber: 1, rankingTargetRank: 1, status: "active" }],
      [{
        id: "match-1",
        status: "open",
        leftEntryId: "entry-1",
        rightEntryId: "entry-2",
        leftSeed: 1,
        rightSeed: 2,
        leftVoteCount: 3,
        rightVoteCount: 1,
      }],
      [],
      [],
      [],
      [],
      [
        { id: "entry-1", seed: 1, finalRank: 1 },
        { id: "entry-2", seed: 2, finalRank: 2 },
      ],
      [],
      [],
    ];

    const result = await bracketHandle.closeCurrentRound();

    assert.deepEqual(result, { advanced: true, completed: true });
    assert.equal(calls.some((call) => call.sql.includes("final_rank = case")), true);
  });

  it("rejects opening rounds on private brackets", async () => {
    responses = [tournamentRows({ status: "active", visibility: "private" })];

    await assert.rejects(() => bracketHandle.openNextRound(), /ROUND_NOT_REVEALABLE/);
  });

  it("lists only visible rounds for the viewer", async () => {
    responses = [
      [{ id: "bracket-1", creatorUserId: "user-1", visibility: "public_listed" }],
      [{ id: "round-1", roundNumber: 1, status: "active", matchCount: 2 }],
    ];

    const rounds = await bracketFactory({
      bracketId: "bracket-1",
      userId: "viewer-1",
    }).listRounds();

    assert.deepEqual(rounds, [{ id: "round-1", roundNumber: 1, status: "active", matchCount: 2 }]);
    assert.equal(calls.at(-1).values.includes(false), true);
  });

  it("lists voter scores with vote history for the bracket owner", async () => {
    responses = [[scoreRow()], [voteHistoryRow()]];

    const results = await bracketFactory({
      bracketId: "bracket-1",
      creatorUserId: "user-1",
      userId: "user-1",
    }).listVoterScores({
      bracket: activeTournament({ id: "bracket-1", sharingMode: "private" }),
      includeVoteHistory: true,
    });

    assert.equal(results.canInspectAllScores, true);
    assert.equal(results.scores[0].winPercentage, 0.5);
    assert.equal(results.voteHistoryByVoterKey["viewer-1"][0].opponentName, "Tacos");
  });

  it("skips score queries for public brackets", async () => {
    responses = [];

    const results = await bracketHandle.listVoterScores({
      bracket: activeTournament({ visibility: "public_listed", sharingMode: "private" }),
    });

    assert.deepEqual(results, { canInspectAllScores: false, scores: [] });
    assert.equal(calls.length, 0);
  });

  it("rejects duplicate draft entry seeds", async () => {
    responses = [
      tournamentRows(),
      [
        { id: "entry-1", candidateId: "candidate-1", seed: 1 },
        { id: "entry-2", candidateId: "candidate-2", seed: 2 },
      ],
    ];

    await assert.rejects(
      () => bracketHandle.updateEntries({
        entries: [
          { id: "entry-1", seed: 1 },
          { id: "entry-2", seed: 1 },
        ],
      }),
      /INVALID_TOURNAMENT_ENTRIES/,
    );
  });

  it("updates draft entry order with normalized sub-brackets", async () => {
    responses = [
      tournamentRows(),
      [
        { id: "entry-1", candidateId: "candidate-1", seed: 1 },
        { id: "entry-2", candidateId: "candidate-2", seed: 2 },
      ],
      [],
      [],
      [],
      [],
      [],
      tournamentRows(),
      [
        { id: "entry-2", candidateId: "candidate-2", seed: 1 },
        { id: "entry-1", candidateId: "candidate-1", seed: 2 },
      ],
    ];

    const bracket = await bracketHandle.updateEntries({
      entries: [
        { id: "entry-2", seed: 1, subSeed: 0 },
        { id: "entry-1", seed: 2, subSeed: 0 },
      ],
      seedingStructure: {
        subBrackets: [{ id: "east", index: 0, name: "East" }],
        entryBrackets: { "entry-2": "east", missing: "east" },
      },
    });

    assert.equal(bracket.id, "bracket-1");
    assert.equal(calls.some((call) => call.sql.includes("seeding_structure")), true);
  });

  it("starts a draft bracket by generating its initial round", async () => {
    responses = [
      tournamentRows({ resultMode: "winner_only", playStyle: "fixed_bracket" }),
      [
        { id: "entry-1", candidateId: "candidate-1", seed: 1 },
        { id: "entry-2", candidateId: "candidate-2", seed: 2 },
      ],
      [{ resultMode: "winner_only", seedingStructure: {} }],
      [
        { id: "entry-1", seed: 1, subSeed: 0 },
        { id: "entry-2", seed: 2, subSeed: 0 },
      ],
      [],
      [],
      [],
      [{ id: "round-1", rankingTargetRank: 1 }],
      [],
      [],
      tournamentRows({ status: "active" }),
      [],
    ];

    const bracket = await bracketHandle.update({ status: "active" });

    assert.equal(bracket.status, "active");
    assert.equal(calls.some((call) => call.sql.startsWith("insert into tournament_round")), true);
    assert.equal(calls.some((call) => call.sql.startsWith("insert into match")), true);
  });

  it("creates a private rerun with the same entries", async () => {
    responses = [
      tournamentRows({ title: "Dinner" }),
      entryRows(),
      [{ id: "rerun-1" }],
      [],
      [],
      tournamentRows({ id: "rerun-1", title: "Dinner Rerun" }),
      entryRows(),
    ];

    const rerun = await bracketHandle.createRerun();

    assert.equal(rerun.title, "Dinner Rerun");
    assert.equal(calls.filter((call) => call.sql.startsWith("insert into tournament_entry")).length, 2);
  });

  it("syncs missing draft entries from the source pool", async () => {
    responses = [
      tournamentRows({ sourcePoolId: "pool-1" }),
      [entryRows()[0]],
      poolCandidateRows(),
      [{ candidateId: "candidate-1", seed: 1 }],
      [],
      [],
      tournamentRows({ sourcePoolId: "pool-1" }),
      entryRows(),
    ];

    const bracket = await bracketHandle.update({ syncWithPool: true });

    assert.equal(bracket.syncAddedCount, 1);
    assert.equal(calls.some((call) => call.sql.startsWith("insert into tournament_entry")), true);
  });

  it("rejects invalid status transitions", async () => {
    responses = [tournamentRows({ status: "complete" }), []];

    await assert.rejects(
      () => bracketHandle.update({ status: "active" }),
      /INVALID_TOURNAMENT_STATUS_TRANSITION/,
    );
  });

  function matchRow() {
    return {
      id: "match-1",
      status: "open",
      leftEntryId: "left-entry",
      leftName: "Pizza",
      leftSeed: 1,
      leftVoteCount: 12,
      rightEntryId: "right-entry",
      rightName: "Tacos",
      rightSeed: 2,
      rightVoteCount: 9,
    };
  }

  function closedMatchRow() {
    return {
      ...matchRow(),
      status: "closed",
      winnerEntryId: "left-entry",
    };
  }

  function entryRows() {
    return [
      { id: "entry-1", candidateId: "candidate-1", seed: 1 },
      { id: "entry-2", candidateId: "candidate-2", seed: 2 },
    ];
  }

  function poolCandidateRows() {
    return [
      { id: "candidate-1", displayOrder: 1 },
      { id: "candidate-2", displayOrder: 2 },
    ];
  }

  function scoreRow() {
    return {
      voterKey: "viewer-1",
      userId: "viewer-1",
      name: "Viewer",
      totalPicks: 2,
      correctPicks: 1,
      score: 4,
    };
  }

  function voteHistoryRow() {
    return {
      voterKey: "viewer-1",
      roundNumber: 2,
      matchId: "match-1",
      winnerEntryId: "entry-1",
      leftEntryId: "entry-1",
      rightEntryId: "entry-2",
      leftSeed: 1,
      rightSeed: 2,
      leftName: "Pizza",
      rightName: "Tacos",
      selectedEntryId: "entry-1",
      selectedSeed: 1,
      selectedName: "Pizza",
      winnerSeed: 1,
      winnerName: "Pizza",
      correct: true,
      pointsEarned: 4,
    };
  }

  function activeTournament(overrides = {}) {
    return {
      id: "bracket-1",
      creatorUserId: "user-1",
      sharingMode: "private",
      visibility: "private",
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      tieBreakMode: "higher_seed_wins",
      advancementMode: "vote_winner",
      roundClosureMode: "manual",
      status: "active",
      ...overrides,
    };
  }
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

  it("returns an existing parallel friends share link", async () => {
    responses = [
      [{ hasParallelBracketShareLinks: true }],
      parallelSupportRows(),
      parallelBracketRows(),
      [],
      [{ id: "link-1", token: "parallel-token", active: true }],
    ];

    const link = await parallelBracketHandle.ensureShareLink();

    assert.deepEqual(link, { id: "link-1", token: "parallel-token", active: true });
  });

  it("rejects configuration edits for published parallel brackets", async () => {
    responses = [
      parallelSupportRows(),
      parallelBracketRows({ status: "active", visibility: "public_listed" }),
      [],
    ];

    await assert.rejects(
      () => parallelBracketHandle.update({ title: "Updated" }),
      /TOURNAMENT_PUBLISHED_LOCKED/,
    );
  });
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildInitialRound,
  buildNextRound,
  buildSwissRound,
  calculateSwissRoundCount
} from "../lib/tournament/rounds.js";
import { resolveMatchWinner } from "../lib/tournament/match-resolution.js";
import { closeActiveRoundIfReady } from "../lib/data/rounds.js";

function entry(id, seed) {
  return { id, seed };
}

function createFakeTx(fixtures) {
  const calls = [];

  const tx = async (strings, ...values) => {
    const normalizedSql = strings.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
    calls.push({ sql: normalizedSql, values });

    if (normalizedSql.includes("from tournament_round")) {
      return fixtures.roundRow ? [fixtures.roundRow] : [];
    }

    if (normalizedSql.includes("from match m")) {
      return fixtures.matchRows ?? [];
    }

    if (normalizedSql.startsWith("update match set")) {
      fixtures.updatedMatches.push({
        matchId: values.at(-1),
        winnerEntryId: values[0],
        resolutionSource: values[1]
      });

      return [];
    }

    if (normalizedSql.startsWith("update tournament_round set")) {
      fixtures.roundClosed = true;
      return [];
    }

    if (normalizedSql.startsWith("update tournament set")) {
      fixtures.tournamentCompleted = true;
      return [];
    }

    if (normalizedSql.startsWith("update parallel_tournament_participant set")) {
      fixtures.parallelParticipantCompleted = true;
      return [];
    }

    if (normalizedSql.startsWith("select id, seed from tournament_entry")) {
      return fixtures.advancingEntries ?? [];
    }

    if (normalizedSql.startsWith("select id from tournament_round where tournament_id")) {
      return fixtures.nextRoundRows ?? [];
    }

    if (normalizedSql.startsWith("insert into tournament_round")) {
      const nextRound = fixtures.createdRounds[fixtures.createdRounds.length] ?? null;

      if (nextRound) {
        return [nextRound];
      }

      const createdRound = {
        id: fixtures.createdRoundId || "next-round",
        rankingTargetRank: values[2]
      };
      fixtures.createdRounds.push(createdRound);
      return [createdRound];
    }

    if (normalizedSql.startsWith("insert into match")) {
      fixtures.createdMatches.push({
        leftEntryId: values[2],
        rightEntryId: values[3],
        status: values[5],
        winnerEntryId: values[6],
        resolutionSource: values[7],
        pairKey: values[8]
      });
      return [];
    }

    if (normalizedSql.includes("update tournament_entry set final_rank")) {
      fixtures.finalRankUpdates.push({
        rank: values[0],
        entryId: values[1]
      });
      return [];
    }

    throw new Error(`Unhandled query in fake tx: ${normalizedSql}`);
  };

  return { tx, calls };
}

test("initial round pairs top seeds and assigns byes to the strongest seeds", () => {
  const matches = buildInitialRound([
    entry("e1", 1),
    entry("e2", 2),
    entry("e3", 3),
    entry("e4", 4)
  ]);

  assert.equal(matches.length, 2);
  assert.deepEqual(matches[0], {
    leftEntryId: "e1",
    rightEntryId: "e4",
    leftSeed: 1,
    rightSeed: 4,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "round-1-seed-1-4"
  });
  assert.deepEqual(matches[1], {
    leftEntryId: "e2",
    rightEntryId: "e3",
    leftSeed: 2,
    rightSeed: 3,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "round-1-seed-2-3"
  });
});

test("initial round pairs entries inside sub-brackets", () => {
  const matches = buildInitialRound(
    [
      { id: "east-1", seed: 1, subSeed: 0 },
      { id: "east-2", seed: 2, subSeed: 0 },
      { id: "west-1", seed: 3, subSeed: 0 },
      { id: "west-2", seed: 4, subSeed: 0 }
    ],
    {
      subBrackets: [
        { id: "east", index: 0, name: "East" },
        { id: "west", index: 1, name: "West" }
      ],
      entryBrackets: {
        "east-1": "east",
        "east-2": "east",
        "west-1": "west",
        "west-2": "west"
      }
    }
  );

  assert.equal(matches.length, 2);
  assert.deepEqual(matches[0], {
    leftEntryId: "east-1",
    rightEntryId: "east-2",
    leftSeed: 1,
    rightSeed: 2,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "group-east-round-1-seed-1-2"
  });
  assert.deepEqual(matches[1], {
    leftEntryId: "west-1",
    rightEntryId: "west-2",
    leftSeed: 1,
    rightSeed: 2,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "group-west-round-1-seed-1-2"
  });
});

test("next round keeps single surviving sub-brackets on bye until cross-bracket phase", () => {
  const matches = buildNextRound(
    [
      { id: "east-winner", seed: 1, subSeed: 0 },
      { id: "west-1", seed: 3, subSeed: 0 },
      { id: "west-2", seed: 4, subSeed: 0 }
    ],
    {
      playStyle: "reseed",
      roundNumber: 2,
      seedingStructure: {
        subBrackets: [
          { id: "east", index: 0, name: "East" },
          { id: "west", index: 1, name: "West" }
        ],
        entryBrackets: {
          "east-winner": "east",
          "west-1": "west",
          "west-2": "west"
        }
      }
    }
  );

  assert.equal(matches.length, 2);
  assert.deepEqual(matches[0], {
    leftEntryId: "east-winner",
    rightEntryId: null,
    leftSeed: 1,
    rightSeed: null,
    leftSlotType: "entry",
    rightSlotType: "bye",
    status: "auto_resolved",
    resolutionSource: "bye",
    winnerEntryId: "east-winner",
    pairKey: "group-east-round-2-seed-1-bye"
  });
  assert.deepEqual(matches[1], {
    leftEntryId: "west-1",
    rightEntryId: "west-2",
    leftSeed: 1,
    rightSeed: 2,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "group-west-round-2-seed-1-2"
  });
});

test("next round crosses sub-bracket winners once each bracket has one entry left", () => {
  const matches = buildNextRound(
    [
      { id: "east-winner", seed: 1, subSeed: 0 },
      { id: "west-winner", seed: 3, subSeed: 0 }
    ],
    {
      playStyle: "fixed_bracket",
      roundNumber: 3,
      seedingStructure: {
        subBrackets: [
          { id: "east", index: 0, name: "East" },
          { id: "west", index: 1, name: "West" }
        ],
        entryBrackets: {
          "east-winner": "east",
          "west-winner": "west"
        }
      }
    }
  );

  assert.equal(matches.length, 1);
  assert.deepEqual(matches[0], {
    leftEntryId: "east-winner",
    rightEntryId: "west-winner",
    leftSeed: 1,
    rightSeed: 2,
    leftSlotType: "entry",
    rightSlotType: "entry",
    status: "open",
    resolutionSource: null,
    winnerEntryId: null,
    pairKey: "cross-round-3-slot-1-1-2"
  });
});

test("Swiss rounds avoid rematches and rotate byes", () => {
  const matches = buildSwissRound(
    [
      { id: "a", seed: 1, score: 2, buchholz: 3 },
      { id: "b", seed: 2, score: 2, buchholz: 3 },
      { id: "c", seed: 3, score: 2, buchholz: 3 },
      { id: "d", seed: 4, score: 2, buchholz: 3 },
      { id: "e", seed: 5, score: 2, buchholz: 3 }
    ],
    {
      roundNumber: 2,
      priorMatches: [
        {
          leftEntryId: "a",
          rightEntryId: "b",
          winnerEntryId: "a"
        },
        {
          leftEntryId: "e",
          rightEntryId: null,
          winnerEntryId: "e"
        }
      ]
    }
  );

  const byeMatch = matches.find((match) => match.rightEntryId === null);
  assert.ok(byeMatch);
  assert.equal(byeMatch.leftEntryId, "d");
  assert.equal(byeMatch.winnerEntryId, "d");
  assert.equal(byeMatch.status, "auto_resolved");

  const contestedPairs = matches
    .filter((match) => match.rightEntryId)
    .map((match) => [match.leftEntryId, match.rightEntryId].sort().join(":"));

  assert.equal(contestedPairs.includes("a:b"), false);
  assert.equal(contestedPairs.length, 2);
});

test("Swiss round count stays within the hard cap", () => {
  assert.equal(calculateSwissRoundCount(0), 0);
  assert.equal(calculateSwissRoundCount(1), 0);
  assert.equal(calculateSwissRoundCount(2), 1);
  assert.equal(calculateSwissRoundCount(5), 4);
  assert.equal(calculateSwissRoundCount(16), 5);
});

test("next round uses play style specific pairing rules", () => {
  const orderedEntries = [
    entry("a", 1),
    entry("b", 2),
    entry("c", 3),
    entry("d", 4)
  ];

  const fixedBracketMatches = buildNextRound(orderedEntries, {
    playStyle: "fixed_bracket",
    roundNumber: 2
  });
  const reseedMatches = buildNextRound(orderedEntries, {
    playStyle: "reseed",
    roundNumber: 2
  });

  assert.equal(fixedBracketMatches[0].pairKey, "round-2-slot-1-1-2");
  assert.equal(reseedMatches[0].pairKey, "round-2-seed-1-4");
});

test("match resolution prefers votes, byes, and configured tie breaks", () => {
  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: null
      },
      "higher_seed_wins"
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "bye"
    }
  );

  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: "b",
        leftVoteCount: 3,
        rightVoteCount: 1,
        leftSeed: 8,
        rightSeed: 1
      },
      "higher_seed_wins"
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "vote"
    }
  );

  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: "b",
        leftVoteCount: 2,
        rightVoteCount: 2,
        leftSeed: 2,
        rightSeed: 7
      },
      "higher_seed_wins"
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "tie_break"
    }
  );

  const originalRandom = Math.random;
  Math.random = () => 0.9;

  try {
    assert.deepEqual(
      resolveMatchWinner(
        {
          leftEntryId: "a",
          rightEntryId: "b",
          leftVoteCount: 4,
          rightVoteCount: 4,
          leftSeed: 1,
          rightSeed: 9
        },
        "random"
      ),
      {
        winnerEntryId: "b",
        resolutionSource: "tie_break"
      }
    );
  } finally {
    Math.random = originalRandom;
  }
});

test("closing an active round completes a winner-only tournament when only one entry remains", async () => {
  const fixtures = {
    roundRow: {
      id: "round-1",
      sequenceNumber: 1,
      rankingTargetRank: 1,
      status: "active"
    },
    matchRows: [
      {
        id: "match-1",
        status: "open",
        leftEntryId: "entry-a",
        rightEntryId: "entry-b",
        winnerEntryId: null,
        leftSeed: 1,
        rightSeed: 2,
        leftVoteCount: 3,
        rightVoteCount: 1
      }
    ],
    advancingEntries: [{ id: "entry-a", seed: 1 }],
    nextRoundRows: [],
    updatedMatches: [],
    createdRounds: [],
    createdMatches: [],
    finalRankUpdates: [],
    roundClosed: false,
    tournamentCompleted: false
  };
  const { tx, calls } = createFakeTx(fixtures);

  const result = await closeActiveRoundIfReady(tx, {
    tournamentId: "tournament-1",
    roundId: "round-1",
    playStyle: "fixed_bracket",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins",
    roundClosureMode: "automatic_when_settled",
    force: true
  });

  assert.deepEqual(result, { advanced: true, completed: true });
  assert.equal(fixtures.updatedMatches.length, 1);
  assert.deepEqual(fixtures.updatedMatches[0], {
    matchId: "match-1",
    winnerEntryId: "entry-a",
    resolutionSource: "vote"
  });
  assert.equal(fixtures.roundClosed, true);
  assert.equal(fixtures.tournamentCompleted, true);
  assert.equal(calls.some((call) => call.sql.startsWith("update match set")), true);
});

test("round closure waits when an open match has no votes and auto-close is not forced", async () => {
  const fixtures = {
    roundRow: {
      id: "round-1",
      sequenceNumber: 1,
      rankingTargetRank: 1,
      status: "active"
    },
    matchRows: [
      {
        id: "match-1",
        status: "open",
        leftEntryId: "entry-a",
        rightEntryId: "entry-b",
        winnerEntryId: null,
        leftSeed: 1,
        rightSeed: 2,
        leftVoteCount: 0,
        rightVoteCount: 0
      }
    ],
    updatedMatches: [],
    createdRounds: [],
    createdMatches: [],
    finalRankUpdates: [],
    roundClosed: false,
    tournamentCompleted: false
  };
  const { tx, calls } = createFakeTx(fixtures);

  const result = await closeActiveRoundIfReady(tx, {
    tournamentId: "tournament-1",
    roundId: "round-1",
    playStyle: "fixed_bracket",
    resultMode: "winner_only",
    tieBreakMode: "higher_seed_wins",
    roundClosureMode: "automatic_when_settled",
    force: false
  });

  assert.deepEqual(result, { advanced: false });
  assert.equal(fixtures.updatedMatches.length, 0);
  assert.equal(fixtures.roundClosed, false);
  assert.equal(fixtures.tournamentCompleted, false);
  assert.equal(calls.some((call) => call.sql.startsWith("update match set")), false);
});

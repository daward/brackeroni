import { test } from "vitest";
import assert from "node:assert/strict";

import { buildInitialRound, buildNextRound, buildSwissRound, calculateSwissRoundCount } from "../../../lib/brackets/engine/rounds.js";
import { resolveMatchWinner } from "../../../lib/brackets/engine/match-resolution.js";
import { estimateTournamentEffort } from "../../../lib/brackets/engine/effort-estimates.js";
import { buildSwissStandings } from "../../../lib/brackets/engine/swiss-standings.js";

function entry(id, seed) {
  return { id, seed };
}

test("initial round pairs top seeds and assigns byes to the strongest seeds", () => {
  const matches = buildInitialRound([entry("e1", 1), entry("e2", 2), entry("e3", 3), entry("e4", 4)]);

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
    pairKey: "round-1-seed-1-4",
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
    pairKey: "round-1-seed-2-3",
  });
});

test("initial round pairs entries inside sub-brackets", () => {
  const matches = buildInitialRound(
    [
      { id: "east-1", seed: 1, subSeed: 0 },
      { id: "east-2", seed: 2, subSeed: 0 },
      { id: "west-1", seed: 3, subSeed: 0 },
      { id: "west-2", seed: 4, subSeed: 0 },
    ],
    {
      subBrackets: [
        { id: "east", index: 0, name: "East" },
        { id: "west", index: 1, name: "West" },
      ],
      entryBrackets: {
        "east-1": "east",
        "east-2": "east",
        "west-1": "west",
        "west-2": "west",
      },
    },
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
    pairKey: "group-east-round-1-seed-1-2",
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
    pairKey: "group-west-round-1-seed-1-2",
  });
});

test("next round keeps single surviving sub-brackets on bye until cross-bracket phase", () => {
  const matches = buildNextRound(
    [
      { id: "east-winner", seed: 1, subSeed: 0 },
      { id: "west-1", seed: 3, subSeed: 0 },
      { id: "west-2", seed: 4, subSeed: 0 },
    ],
    {
      playStyle: "reseed",
      roundNumber: 2,
      seedingStructure: {
        subBrackets: [
          { id: "east", index: 0, name: "East" },
          { id: "west", index: 1, name: "West" },
        ],
        entryBrackets: {
          "east-winner": "east",
          "west-1": "west",
          "west-2": "west",
        },
      },
    },
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
    pairKey: "group-east-round-2-seed-1-bye",
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
    pairKey: "group-west-round-2-seed-1-2",
  });
});

test("next round crosses sub-bracket winners once each bracket has one entry left", () => {
  const matches = buildNextRound(
    [
      { id: "east-winner", seed: 1, subSeed: 0 },
      { id: "west-winner", seed: 3, subSeed: 0 },
    ],
    {
      playStyle: "fixed_bracket",
      roundNumber: 3,
      seedingStructure: {
        subBrackets: [
          { id: "east", index: 0, name: "East" },
          { id: "west", index: 1, name: "West" },
        ],
        entryBrackets: {
          "east-winner": "east",
          "west-winner": "west",
        },
      },
    },
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
    pairKey: "cross-round-3-slot-1-1-2",
  });
});

test("Swiss rounds avoid rematches and rotate byes", () => {
  const matches = buildSwissRound(
    [
      { id: "a", seed: 1, score: 2, buchholz: 3 },
      { id: "b", seed: 2, score: 2, buchholz: 3 },
      { id: "c", seed: 3, score: 2, buchholz: 3 },
      { id: "d", seed: 4, score: 2, buchholz: 3 },
      { id: "e", seed: 5, score: 2, buchholz: 3 },
    ],
    {
      roundNumber: 2,
      priorMatches: [
        {
          leftEntryId: "a",
          rightEntryId: "b",
          winnerEntryId: "a",
        },
        {
          leftEntryId: "e",
          rightEntryId: null,
          winnerEntryId: "e",
        },
      ],
    },
  );

  const byeMatch = matches.find((match) => match.rightEntryId === null);
  assert.ok(byeMatch);
  assert.equal(byeMatch.leftEntryId, "d");
  assert.equal(byeMatch.winnerEntryId, "d");
  assert.equal(byeMatch.status, "auto_resolved");

  const contestedPairs = matches.filter((match) => match.rightEntryId).map((match) => [match.leftEntryId, match.rightEntryId].sort().join(":"));

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

test("effort estimates count winner-only contested votes and synchronized rounds", () => {
  assert.deepEqual(
    estimateTournamentEffort({
      candidateCount: 24,
      resultMode: "winner_only",
      playStyle: "fixed_bracket",
    }),
    {
      candidateCount: 24,
      resultMode: "winner_only",
      estimatedVotesPerParticipant: 23,
      estimatedSynchronizedRounds: 5,
      synchronized: true,
      confidence: "high",
      note: "Byes do not require votes, so the estimate counts only contested matchups.",
    },
  );
});

test("effort estimates use Swiss round count for fast full ranking", () => {
  const estimate = estimateTournamentEffort({
    candidateCount: 16,
    resultMode: "fast_full_rank",
    playStyle: "fixed_bracket",
  });

  assert.equal(estimate.estimatedSynchronizedRounds, 5);
  assert.equal(estimate.estimatedVotesPerParticipant, 40);
});

test("effort estimates mark parallel ranking as independent", () => {
  const estimate = estimateTournamentEffort({
    candidateCount: 8,
    resultMode: "parallel_full_ranking",
    playStyle: "fixed_bracket",
  });

  assert.equal(estimate.estimatedVotesPerParticipant, 16);
  assert.equal(estimate.estimatedSynchronizedRounds, 0);
  assert.equal(estimate.synchronized, false);
});

test("effort estimates keep rounds but clear participant votes for manual advancement", () => {
  const estimate = estimateTournamentEffort({
    candidateCount: 8,
    resultMode: "winner_only",
    playStyle: "fixed_bracket",
    advancementMode: "manual_winner",
  });

  assert.equal(estimate.estimatedVotesPerParticipant, 0);
  assert.equal(estimate.estimatedSynchronizedRounds, 3);
});

test("next round uses play style specific pairing rules", () => {
  const orderedEntries = [entry("a", 1), entry("b", 2), entry("c", 3), entry("d", 4)];

  const fixedBracketMatches = buildNextRound(orderedEntries, {
    playStyle: "fixed_bracket",
    roundNumber: 2,
  });
  const reseedMatches = buildNextRound(orderedEntries, {
    playStyle: "reseed",
    roundNumber: 2,
  });

  assert.equal(fixedBracketMatches[0].pairKey, "round-2-slot-1-1-2");
  assert.equal(reseedMatches[0].pairKey, "round-2-seed-1-4");
});

test("match resolution prefers votes, byes, and configured tie breaks", () => {
  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: null,
      },
      "higher_seed_wins",
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "bye",
    },
  );

  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: "b",
        leftVoteCount: 3,
        rightVoteCount: 1,
        leftSeed: 8,
        rightSeed: 1,
      },
      "higher_seed_wins",
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "vote",
    },
  );

  assert.deepEqual(
    resolveMatchWinner(
      {
        leftEntryId: "a",
        rightEntryId: "b",
        leftVoteCount: 2,
        rightVoteCount: 2,
        leftSeed: 2,
        rightSeed: 7,
      },
      "higher_seed_wins",
    ),
    {
      winnerEntryId: "a",
      resolutionSource: "tie_break",
    },
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
          rightSeed: 9,
        },
        "random",
      ),
      {
        winnerEntryId: "b",
        resolutionSource: "tie_break",
      },
    );
  } finally {
    Math.random = originalRandom;
  }
});

test("Swiss standings rank wins, Buchholz, and seed deterministically", () => {
  const standings = buildSwissStandings(
    [entry("a", 1), entry("b", 2), entry("c", 3)],
    [
      { leftEntryId: "a", rightEntryId: "b", winnerEntryId: "a" },
      { leftEntryId: "b", rightEntryId: "c", winnerEntryId: "b" },
      { leftEntryId: "a", rightEntryId: "c", winnerEntryId: "a" },
    ],
  );

  assert.deepEqual(
    standings.map((standing) => standing.id),
    ["a", "b", "c"],
  );
});

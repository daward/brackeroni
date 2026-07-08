import test from "node:test";
import assert from "node:assert/strict";

import {
  canInspectAllParallelParticipants,
  filterVisibleParallelParticipants
} from "../lib/data/parallel-tournaments.js";

test("friends brackets expose participant ballot selector while public ones do not", () => {
  assert.equal(
    canInspectAllParallelParticipants({
      sharingMode: "with_friends",
      visibility: "private"
    }),
    true
  );

  assert.equal(
    canInspectAllParallelParticipants({
      sharingMode: "with_friends",
      visibility: "public_listed"
    }),
    false
  );

  assert.equal(
    canInspectAllParallelParticipants({
      sharingMode: "private",
      visibility: "private"
    }),
    false
  );
});

test("parallel participant visibility falls back to only your own ballot", () => {
  const participants = [
    { id: "p1", userId: "u1", anonymousVoterToken: null },
    { id: "p2", userId: "u2", anonymousVoterToken: null },
    { id: "p3", userId: null, anonymousVoterToken: "anon-123" }
  ];

  assert.deepEqual(
    filterVisibleParallelParticipants({
      participants,
      userId: "u2",
      anonymousVoterToken: null,
      canInspectAllParticipants: false
    }).map((participant) => participant.id),
    ["p2"]
  );

  assert.deepEqual(
    filterVisibleParallelParticipants({
      participants,
      userId: null,
      anonymousVoterToken: "anon-123",
      canInspectAllParticipants: false
    }).map((participant) => participant.id),
    ["p3"]
  );

  assert.deepEqual(
    filterVisibleParallelParticipants({
      participants,
      userId: null,
      anonymousVoterToken: null,
      canInspectAllParticipants: true
    }).map((participant) => participant.id),
    ["p1", "p2", "p3"]
  );
});

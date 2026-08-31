import { describe, it } from "vitest";
import assert from "node:assert/strict";

import { parallelBracketDirectory } from "@/lib/brackets";

describe("parallel bracket results policy", () => {
  const directory = parallelBracketDirectory();

  it("exposes participant ballot inspection only for friends brackets", () => {
    assert.equal(
      directory.canInspectAllParticipants({
        sharingMode: "with_friends",
        visibility: "private"
      }),
      true
    );

    assert.equal(
      directory.canInspectAllParticipants({
        sharingMode: "with_friends",
        visibility: "public_listed"
      }),
      false
    );

    assert.equal(
      directory.canInspectAllParticipants({
        sharingMode: "private",
        visibility: "private"
      }),
      false
    );
  });

  it("falls back to only the viewer's own ballot", () => {
    const participants = [
      { id: "p1", userId: "u1", anonymousVoterToken: null },
      { id: "p2", userId: "u2", anonymousVoterToken: null },
      { id: "p3", userId: null, anonymousVoterToken: "anon-123" }
    ];

    assert.deepEqual(
      directory.filterVisibleParticipants({
        participants,
        userId: "u2",
        anonymousVoterToken: null,
        canInspectAllParticipants: false
      }).map((participant) => participant.id),
      ["p2"]
    );

    assert.deepEqual(
      directory.filterVisibleParticipants({
        participants,
        userId: null,
        anonymousVoterToken: "anon-123",
        canInspectAllParticipants: false
      }).map((participant) => participant.id),
      ["p3"]
    );

    assert.deepEqual(
      directory.filterVisibleParticipants({
        participants,
        userId: null,
        anonymousVoterToken: null,
        canInspectAllParticipants: true
      }).map((participant) => participant.id),
      ["p1", "p2", "p3"]
    );
  });
});

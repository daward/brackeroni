import { describe, expect, it } from "vitest";
import { getActiveStandardBracketStatus } from "@/components/brackets/management";
import type { BracketMatch } from "@/lib/brackets/types";

const matches: BracketMatch[] = [
  {
    id: "open-with-votes",
    status: "open",
    leftEntryId: "left-1",
    rightEntryId: "right-1",
    leftName: "Left One",
    rightName: "Right One",
    leftSeed: 1,
    rightSeed: 2,
    leftVoteCount: 3,
    rightVoteCount: 5,
  },
  {
    id: "open-with-winner",
    status: "open",
    leftEntryId: "left-2",
    rightEntryId: "right-2",
    leftName: "Left Two",
    rightName: "Right Two",
    leftSeed: 3,
    rightSeed: 4,
    winnerEntryId: "left-2",
  },
  {
    id: "closed",
    status: "closed",
    leftEntryId: "left-3",
    rightEntryId: "right-3",
    leftName: "Left Three",
    rightName: "Right Three",
    leftSeed: 5,
    rightSeed: 6,
    leftVoteCount: 100,
    rightVoteCount: 100,
  },
];

describe("creator bracket live-status policy", () => {
  it("summarizes only open matchups and keeps manual closing blocked", () => {
    expect(
      getActiveStandardBracketStatus(
        {
          advancementMode: "manual_winner",
          visibility: "private",
          hasHiddenClosedRounds: true,
        },
        matches,
      ),
    ).toMatchObject({
      usesManualAdvancement: true,
      isPublicBracket: false,
      isPrivateBracket: true,
      awaitingNextRound: false,
      completedManualResults: 1,
      unresolvedManualCount: 1,
      roundVoteTotal: 8,
      activeVotedMatchCount: 1,
      canCloseManualVoting: false,
    });
  });

  it("recognizes a public bracket waiting to reveal its next round", () => {
    const status = getActiveStandardBracketStatus(
      {
        advancementMode: "vote_winner",
        visibility: "public_unlisted",
        hasHiddenClosedRounds: true,
      },
      [],
    );

    expect(status.awaitingNextRound).toBe(true);
    expect(status.canCloseManualVoting).toBe(true);
    expect(status.currentRoundMatches).toEqual([]);
  });
});

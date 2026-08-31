import { beforeEach, describe, expect, it } from "vitest";
import { getActiveStandardBracketStatus } from "@/components/brackets/management";
import type { BracketMatch } from "@/lib/brackets/types";

describe("creator bracket live-status policy", () => {
  let matches: BracketMatch[];

  beforeEach(() => {
    matches = [
      makeMatch("open-with-votes", "open", { leftVotes: 3, rightVotes: 5 }),
      makeMatch("open-with-winner", "open", { leftId: "left-2", rightId: "right-2", winnerEntryId: "left-2" }),
      makeMatch("closed", "closed", { leftVotes: 100, rightVotes: 100 }),
    ];
  });

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

  function makeMatch(
    id: string,
    status: string,
    options: {
      leftId?: string;
      rightId?: string;
      leftVotes?: number;
      rightVotes?: number;
      winnerEntryId?: string;
    } = {},
  ): BracketMatch {
    const leftId = options.leftId ?? "left-1";
    const rightId = options.rightId ?? "right-1";

    return {
      id,
      status,
      left: {
        id: leftId,
        name: "Left",
        seed: 1,
        voteCount: options.leftVotes,
      },
      right: {
        id: rightId,
        name: "Right",
        seed: 2,
        voteCount: options.rightVotes,
      },
      winnerEntryId: options.winnerEntryId,
    };
  }
});

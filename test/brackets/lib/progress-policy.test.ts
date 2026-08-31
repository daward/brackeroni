import { describe, expect, it } from "vitest";
import { formatRoundTitle, getRoundStats, orderFinalEntries, supportsRoundProgressView } from "@/components/brackets/progress";

describe("bracket progress policies", () => {
  it("summarizes completed head-to-head matches without treating byes as vote results", () => {
    const stats = getRoundStats([
      {
        id: "one",
        status: "closed",
        roundNumber: 1,
        left: {
          id: "left",
          name: "Left",
          seed: 3,
          voteCount: 8,
        },
        right: {
          id: "right",
          name: "Right",
          seed: 1,
          voteCount: 12,
        },
        winnerEntryId: "right"
      },
      {
        id: "bye",
        status: "auto_resolved",
        roundNumber: 1,
        left: {
          id: "bye",
          name: "Bye",
          seed: 2,
        },
        right: null,
        winnerEntryId: "bye",
      }
    ]);

    expect(stats).toMatchObject({
      totalVotes: 20,
      voteLeader: { candidate: { id: "right", name: "Right", seed: 1 }, votes: 12 },
      closestMatch: { winner: { id: "right", name: "Right", seed: 1 }, margin: 4 },
      winners: [{ id: "one" }]
    });
  });

  it("keeps ranking terminology and final entries deterministic", () => {
    const roundTitle = formatRoundTitle(
      { id: "round", roundNumber: 2, rankingTargetRank: 4, rankingRoundNumber: 1 },
      { id: "bracket", title: "Ranked", resultMode: "full_ranking" }
    );
    const orderedEntryIds = orderFinalEntries([
      { id: "two", candidateName: "Two", seed: 2, finalRank: 2 },
      { id: "one", candidateName: "One", seed: 1, finalRank: 1 }
    ]).map((entry) => entry.id);

    expect(roundTitle).toBe("Ranking 4: Round 1");
    expect(orderedEntryIds).toEqual(["one", "two"]);
  });

  it("keeps internal ranking decisions out of the rounds view", () => {
    expect(supportsRoundProgressView("winner_only")).toBe(true);
    expect(supportsRoundProgressView("fast_full_rank")).toBe(true);
    expect(supportsRoundProgressView("full_ranking")).toBe(false);
    expect(supportsRoundProgressView("partial_ranking")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { formatRoundTitle, getRoundStats, orderFinalEntries, supportsRoundProgressView } from "@/lib/brackets/progress";

describe("bracket progress policies", () => {
  it("summarizes completed head-to-head matches without treating byes as vote results", () => {
    const stats = getRoundStats([
      { id: "one", roundNumber: 1, leftEntryId: "left", rightEntryId: "right", leftName: "Left", rightName: "Right", leftSeed: 3, rightSeed: 1, leftVoteCount: 8, rightVoteCount: 12, winnerEntryId: "right" },
      { id: "bye", roundNumber: 1, leftEntryId: "bye", leftName: "Bye", leftSeed: 2, winnerEntryId: "bye" }
    ]);
    expect(stats).toMatchObject({ totalVotes: 20, voteLeader: { entryId: "right", votes: 12 }, closestMatch: { winnerName: "Right", margin: 4 }, winners: [{ id: "one" }] });
  });

  it("keeps ranking terminology and final entries deterministic", () => {
    expect(formatRoundTitle({ id: "round", roundNumber: 2, rankingTargetRank: 4, rankingRoundNumber: 1 }, { id: "bracket", title: "Ranked", resultMode: "full_ranking" })).toBe("Ranking 4: Round 1");
    expect(orderFinalEntries([{ id: "two", candidateName: "Two", seed: 2, finalRank: 2 }, { id: "one", candidateName: "One", seed: 1, finalRank: 1 }]).map((entry) => entry.id)).toEqual(["one", "two"]);
  });

  it("keeps internal ranking decisions out of the rounds view", () => {
    expect(supportsRoundProgressView("winner_only")).toBe(true);
    expect(supportsRoundProgressView("fast_full_rank")).toBe(true);
    expect(supportsRoundProgressView("full_ranking")).toBe(false);
    expect(supportsRoundProgressView("partial_ranking")).toBe(false);
  });
});

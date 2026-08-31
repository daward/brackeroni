import { describe, expect, it } from "vitest";
import { formatVoteHeader } from "@/components/brackets/voting/internal/vote-match-state";

describe("vote match state", () => {
  it("shows ranking progress out of the total ranking targets", () => {
    expect(
      formatVoteHeader(
        { id: "match-1", status: "open", roundNumber: 1, rankingTargetRank: 1, rankingRoundNumber: 1 },
        { id: "tournament-1", title: "Ranked", status: "active", createdAt: "2026-01-01", resultMode: "full_ranking", entryCount: 20, winner: null },
      ),
    ).toBe("Ranking 1 of 20 / Round 1 of 5");

    expect(
      formatVoteHeader(
        { id: "match-5", status: "open", roundNumber: 6, rankingTargetRank: 3, rankingRoundNumber: 2, leftEntryId: "entry-1", rightEntryId: "entry-2" },
        {
          id: "tournament-1",
          title: "Ranked",
          status: "active",
          createdAt: "2026-01-01",
          resultMode: "partial_ranking",
          entryCount: 19,
          winner: null,
          matches: [
            { id: "match-1", status: "closed", rankingTargetRank: 3, leftEntryId: "entry-1", rightEntryId: "entry-8" },
            { id: "match-2", status: "closed", rankingTargetRank: 3, leftEntryId: "entry-2", rightEntryId: "entry-7" },
            { id: "match-3", status: "closed", rankingTargetRank: 3, leftEntryId: "entry-3", rightEntryId: "entry-6" },
            { id: "match-4", status: "closed", rankingTargetRank: 3, leftEntryId: "entry-4", rightEntryId: "entry-5" },
            { id: "match-5", status: "open", rankingTargetRank: 3, leftEntryId: "entry-1", rightEntryId: "entry-2" },
          ],
        },
      ),
    ).toBe("Ranking 3 of 10 / Round 2 of 3");
  });
});

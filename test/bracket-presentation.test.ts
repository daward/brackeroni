import { describe, expect, it } from "vitest";
import {
  buildDirectBracketSharePath,
  canCopyBracketLink,
  getTournamentAudienceMode,
  getTournamentAudiencePatch,
  normalizeParallelBracketItem,
  sortManagedBrackets
} from "@/lib/brackets/presentation";

describe("bracket presentation policies", () => {
  it("preserves audience rules and share paths", () => {
    expect(getTournamentAudienceMode({ visibility: "public_unlisted" })).toBe("public_unlisted");
    expect(getTournamentAudiencePatch("with_friends")).toEqual({ sharingMode: "with_friends", visibility: "private" });
    expect(buildDirectBracketSharePath({ id: "complete-1", status: "complete" })).toBe("/results/complete-1");
    expect(buildDirectBracketSharePath({ id: "parallel-1", status: "active", kind: "parallel_parent" })).toBe("/vote?parallelTournament=parallel-1");
    expect(canCopyBracketLink({ visibility: "private", sharingMode: "with_friends" })).toBe(true);
  });

  it("normalizes and orders managed brackets", () => {
    expect(normalizeParallelBracketItem({ id: "parallel-1", title: "Rankings", status: "draft", createdAt: "2026-01-02", candidateCount: 4 })).toMatchObject({
      kind: "parallel_parent",
      entryCount: 4,
      resultMode: "parallel_full_ranking"
    });
    expect(sortManagedBrackets([
      { id: "complete", status: "complete", createdAt: "2026-01-03" },
      { id: "draft", status: "draft", createdAt: "2026-01-02" },
      { id: "active", status: "active", createdAt: "2026-01-01" }
    ]).map((item) => item.id)).toEqual(["active", "draft", "complete"]);
  });
});

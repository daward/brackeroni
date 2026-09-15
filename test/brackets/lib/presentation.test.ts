import { describe, expect, it } from "vitest";
import {
  buildDirectBracketSharePath,
  canCopyBracketLink,
  getTournamentAudienceMode,
  getTournamentAudiencePatch,
  normalizeParallelBracketItem,
  sortBrackets
} from "@/components/brackets/management";

describe("bracket presentation policies", () => {
  it("preserves audience rules and share paths", () => {
    expect(getTournamentAudienceMode({ visibility: "public_unlisted" })).toBe("public_unlisted");
    expect(getTournamentAudiencePatch("with_friends")).toEqual({ sharingMode: "with_friends", visibility: "private" });
    expect(buildDirectBracketSharePath({ id: "complete-1", status: "complete" })).toBe("/results/complete-1");
    expect(buildDirectBracketSharePath({ id: "standard-1", status: "active" })).toBe("/vote?bracket=standard-1&vote=1");
    expect(buildDirectBracketSharePath({ id: "parallel-1", status: "active", kind: "parallel_parent" })).toBe("/vote?parallelBracket=parallel-1&vote=1");
    expect(canCopyBracketLink({ visibility: "private", sharingMode: "with_friends" })).toBe(true);
  });

  it("normalizes and orders managed brackets", () => {
    expect(normalizeParallelBracketItem({ id: "parallel-1", title: "Rankings", status: "draft", createdAt: "2026-01-02", candidateCount: 4 })).toMatchObject({
      kind: "parallel_parent",
      entryCount: 4,
      resultMode: "parallel_full_ranking"
    });
    expect(sortBrackets([
      { id: "complete", status: "complete", createdAt: "2026-01-03" },
      { id: "draft", status: "draft", createdAt: "2026-01-02" },
      { id: "active", status: "active", createdAt: "2026-01-01" }
    ]).map((item) => item.id)).toEqual(["active", "draft", "complete"]);
  });

  it("orders active brackets by when they went live", () => {
    expect(sortBrackets([
      { id: "older-live", status: "active", createdAt: "2026-01-03", startedAt: "2026-01-03T10:00:00Z" },
      { id: "newly-started", status: "active", createdAt: "2025-12-01", startedAt: "2026-01-04T10:00:00Z" }
    ]).map((item) => item.id)).toEqual(["newly-started", "older-live"]);
  });
});

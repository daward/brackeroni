import { describe, expect, it } from "vitest";
import { sortVoteTournamentsByRecentActivity } from "@/components/brackets/voting/internal/vote-activity";
import type { VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

function bracket(id: string, overrides: Partial<VoteTournament>): VoteTournament {
  return {
    id,
    title: id,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    winner: null,
    ...overrides,
  } as VoteTournament;
}

describe("vote page data", () => {
  it("sorts vote cards by latest activity", () => {
    const sorted = sortVoteTournamentsByRecentActivity([
      bracket("older", { updatedAt: "2026-01-02T00:00:00.000Z" }),
      bracket("voted", { lastVoteAt: "2026-01-04T00:00:00.000Z" }),
      bracket("completed", { completedAt: "2026-01-03T00:00:00.000Z" }),
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["voted", "completed", "older"]);
  });
});

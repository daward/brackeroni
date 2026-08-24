import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useNewBracketSubmission } from "@/components/brackets/configuration/internal/use-new-bracket-submission";
import type { BracketCreationInput } from "@/components/brackets/configuration";

const mocks = vi.hoisted(() => ({
  createPool: vi.fn(),
  createTournament: vi.fn(),
  startParallelTournament: vi.fn(),
  startTournament: vi.fn(),
  updateTournament: vi.fn(),
  createParallelTournament: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock("@/lib/client-api/create-workspace", () => ({
  createPool: (...args: unknown[]) => mocks.createPool(...args),
  createTournament: (...args: unknown[]) => mocks.createTournament(...args),
  startParallelTournament: (...args: unknown[]) => mocks.startParallelTournament(...args),
  startTournament: (...args: unknown[]) => mocks.startTournament(...args),
  updateTournament: (...args: unknown[]) => mocks.updateTournament(...args),
  createParallelTournament: (...args: unknown[]) => mocks.createParallelTournament(...args),
}));

const privateInput: BracketCreationInput = {
  title: "Dinner Finals",
  source: {
    type: "existing",
    pool: {
      id: "pool-1",
      name: "Dinner Pool",
      candidateCount: 4,
    },
  },
  playStyle: "fixed_bracket",
  resultMode: "winner_only",
  advancementMode: "vote_winner",
  tieBreakMode: "higher_seed_wins",
  seedingMode: "pool_order",
  seedCandidateIds: null,
  audienceMode: "private",
};

describe("new bracket submission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createTournament.mockResolvedValue({ item: { id: "tournament-1" } });
    mocks.startTournament.mockResolvedValue({ item: { id: "tournament-1", status: "active" } });
  });

  it("starts private brackets immediately and opens voting", async () => {
    const { result } = renderHook(() => useNewBracketSubmission(null));

    await act(async () => {
      await result.current.createBracket(privateInput);
    });

    expect(mocks.createTournament).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dinner Finals",
        sourcePoolId: "pool-1",
        sharingMode: "private",
        visibility: "private",
      }),
    );
    expect(mocks.startTournament).toHaveBeenCalledWith("tournament-1");
    expect(mocks.routerPush).toHaveBeenCalledWith("/vote?tournament=tournament-1&returnTo=create");
  });

  it("leaves shared brackets in drafts", async () => {
    const { result } = renderHook(() => useNewBracketSubmission(null));

    await act(async () => {
      await result.current.createBracket({ ...privateInput, audienceMode: "friends" });
    });

    expect(mocks.startTournament).not.toHaveBeenCalled();
    expect(mocks.routerPush).toHaveBeenCalledWith("/brackets?stage=draft");
  });
});

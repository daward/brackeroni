import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FriendsBracketVotePage } from "@/components/brackets/voting/internal/friends-bracket-vote-page";
import type { VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

const { getTournamentWithMatches, submitMatchVote } = vi.hoisted(() => ({
  getTournamentWithMatches: vi.fn(),
  submitMatchVote: vi.fn(),
}));

vi.mock("@/lib/client-api/voting", () => ({
  getTournamentWithMatches,
  submitMatchVote,
}));

function friendsBracket(overrides: Partial<VoteTournament> = {}): VoteTournament {
  return {
    id: "bracket-1",
    title: "Friends bracket",
    status: "active",
    sharingMode: "with_friends",
    visibility: "private",
    votingAccess: "signed_in_only",
    activeRoundNumber: 1,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    winner: null,
    ...overrides,
  };
}

const waitingMatches = [
  {
    id: "match-1",
    status: "closed",
    roundNumber: 1,
    leftEntryId: "entry-1",
    rightEntryId: "entry-2",
    userVoteEntryId: "entry-1",
    winnerEntryId: "entry-1",
  },
  {
    id: "match-2",
    status: "open",
    roundNumber: 1,
    leftEntryId: "entry-3",
    rightEntryId: "entry-4",
    userVoteEntryId: "entry-3",
  },
];

const openMatches = [
  {
    id: "match-3",
    status: "open",
    roundNumber: 2,
    leftEntryId: "entry-1",
    rightEntryId: "entry-3",
    leftName: "One",
    rightName: "Three",
  },
];

async function advancePollingChecks(count: number) {
  for (let index = 0; index < count; index += 1) {
    await act(async () => {
      vi.advanceTimersByTime(10_000);
    });
  }
}

describe("friends bracket vote page", () => {
  beforeEach(() => {
    getTournamentWithMatches.mockReset();
    submitMatchVote.mockReset();
  });

  it("polls waiting friends brackets for a limited window", async () => {
    vi.useFakeTimers();
    getTournamentWithMatches.mockResolvedValue({
      matches: waitingMatches,
      tournament: friendsBracket(),
    });

    try {
      render(
        <FriendsBracketVotePage
          initialTournament={friendsBracket()}
          initialMatches={waitingMatches}
        />,
      );

      expect(screen.getByText("Waiting for the next round to open.")).not.toBeNull();
      expect(screen.getByText("1/2 closed")).not.toBeNull();

      await advancePollingChecks(18);

      expect(getTournamentWithMatches).toHaveBeenCalledTimes(18);
      expect(screen.getByRole("button", { name: "Check again" })).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resumes polling from the refresh button and opens the standard voting dialog when a round opens", async () => {
    vi.useFakeTimers();
    let refreshCount = 0;
    getTournamentWithMatches.mockImplementation(async () => {
      refreshCount += 1;
      return refreshCount <= 18
        ? { matches: waitingMatches, tournament: friendsBracket() }
        : { matches: openMatches, tournament: friendsBracket({ activeRoundNumber: 2 }) };
    });

    try {
      render(
        <FriendsBracketVotePage
          initialTournament={friendsBracket()}
          initialMatches={waitingMatches}
        />,
      );

      await advancePollingChecks(18);
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Check again" }));
      });

      expect(screen.getByText("One")).not.toBeNull();
      expect(screen.getByText("Three")).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

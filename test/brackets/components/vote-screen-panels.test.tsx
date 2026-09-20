import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteScreenPanels } from "@/components/brackets/voting/internal/vote-screen-panels";
import type { VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

const replace = vi.fn();
const push = vi.fn();
const { getTournamentWithMatches, submitMatchVote } = vi.hoisted(() => ({
  getTournamentWithMatches: vi.fn(),
  submitMatchVote: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("@/lib/client-api/voting", () => ({
  getTournamentWithMatches,
  submitMatchVote,
}));

function publicBracket(): VoteTournament {
  return {
    id: "bracket-1",
    title: "Public bracket",
    status: "active",
    visibility: "public_unlisted",
    votingAccess: "anyone",
    resultMode: "full_ranking",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
    winner: null,
    matches: [
      {
        id: "match-1",
        status: "open",
        roundNumber: 1,
        leftEntryId: "entry-1",
        rightEntryId: "entry-2",
        leftName: "One",
        rightName: "Two",
      },
      {
        id: "match-2",
        status: "open",
        roundNumber: 1,
        leftEntryId: "entry-3",
        rightEntryId: "entry-4",
        leftName: "Three",
        rightName: "Four",
      },
    ],
  };
}

function finalMatchBracket(overrides: Partial<VoteTournament> = {}): VoteTournament {
  return {
    ...publicBracket(),
    visibility: "private",
    sharingMode: "private",
    matches: [
      {
        id: "match-1",
        status: "open",
        roundNumber: 1,
        leftEntryId: "entry-1",
        rightEntryId: "entry-2",
        leftName: "One",
        rightName: "Two",
      },
    ],
    ...overrides,
  };
}

describe("vote screen panels", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
    push.mockClear();
    submitMatchVote.mockResolvedValue({ item: { tournamentStatus: "active" } });
    getTournamentWithMatches.mockResolvedValue({
      matches: [],
      tournament: {
        ...finalMatchBracket(),
        matches: undefined,
      },
    });
  });

  it("does not open the voting modal just because a public bracket is focused in the URL", async () => {
    const user = userEvent.setup();

    render(
      <VoteScreenPanels
        activeTournaments={[publicBracket()]}
        initialFocusedTournamentId="bracket-1"
      />,
    );

    const bracketCards = screen.getAllByRole("button", { name: /Public bracket/ });
    expect(bracketCards.length).toBeGreaterThan(0);
    expect(screen.queryByText("One")).toBeNull();

    await user.click(bracketCards[0]);

    expect(screen.getByText("One")).not.toBeNull();
    expect(screen.getByText("Two")).not.toBeNull();
  });

  it("opens the requested matchup when the URL asks to vote now", () => {
    render(
      <VoteScreenPanels
        activeTournaments={[publicBracket()]}
        initialFocusedTournamentId="bracket-1"
        initialFocusedMatchId="match-2"
        initialOpenVote
      />,
    );

    expect(screen.getByText("Three")).not.toBeNull();
    expect(screen.getByText("Four")).not.toBeNull();
    expect(screen.queryByText("One")).toBeNull();
  });

  it("does not open the waiting modal just because a finished public bracket is focused in the URL", () => {
    render(
      <VoteScreenPanels
        activeTournaments={[
          {
            ...publicBracket(),
            viewerHasVotes: true,
            matches: [],
          },
        ]}
        initialFocusedTournamentId="bracket-1"
      />,
    );

    expect(screen.getAllByRole("button", { name: /Public bracket/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Waiting for the next round to open")).toBeNull();
  });

  it("does not open the waiting modal for public brackets even when vote links auto-open", () => {
    render(
      <VoteScreenPanels
        activeTournaments={[
          {
            ...publicBracket(),
            viewerHasVotes: true,
            matches: [],
          },
        ]}
        initialFocusedTournamentId="bracket-1"
        initialOpenVote
      />,
    );

    expect(screen.getAllByRole("button", { name: /Public bracket/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("Waiting for the next round to open")).toBeNull();
  });

  it("keeps the waiting modal for friends brackets", () => {
    render(
      <VoteScreenPanels
        activeTournaments={[
          {
            ...publicBracket(),
            title: "Friends bracket",
            visibility: "private",
            sharingMode: "with_friends",
            viewerHasVotes: true,
            matches: [],
          },
        ]}
        initialFocusedTournamentId="bracket-1"
        initialOpenVote
      />,
    );

    expect(screen.getByText("Waiting for the next round to open")).not.toBeNull();
  });

  it("does not poll waiting brackets on the plain vote page", async () => {
    vi.useFakeTimers();

    try {
      render(
        <VoteScreenPanels
          activeTournaments={[
            {
              ...publicBracket(),
              title: "Friends bracket",
              visibility: "private",
              sharingMode: "with_friends",
              viewerHasVotes: true,
              matches: [],
            },
          ]}
        />,
      );

      await act(async () => {
        vi.advanceTimersByTime(10000);
      });

      expect(getTournamentWithMatches).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns bracket manager popup voting to active bracket management when voting is done", async () => {
    const user = userEvent.setup();

    render(
      <VoteScreenPanels
        activeTournaments={[finalMatchBracket()]}
        initialFocusedTournamentId="bracket-1"
        initialOpenVote
        initialReturnTo="create"
      />,
    );

    await user.click(screen.getByRole("button", { name: /One/ }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/brackets?stage=active&tournament=bracket-1");
    });
  });

  it("returns non-management popup voting to the voting page when voting is done", async () => {
    const user = userEvent.setup();

    render(
      <VoteScreenPanels
        activeTournaments={[finalMatchBracket({ visibility: "public_unlisted", votingAccess: "anyone" })]}
        initialFocusedTournamentId="bracket-1"
        initialOpenVote
      />,
    );

    await user.click(screen.getByRole("button", { name: /One/ }));

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/vote");
    });
  });

  it("opens friends brackets on their dedicated voting page from the vote index", async () => {
    const user = userEvent.setup();

    render(
      <VoteScreenPanels
        activeTournaments={[
          {
            ...publicBracket(),
            sharingMode: "with_friends",
            visibility: "private",
          },
        ]}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: /Public bracket/ })[0]);

    expect(push).toHaveBeenCalledWith("/brackets/bracket-1/vote");
  });

  it("lets owners vote first and sends owned voted brackets to management", async () => {
    const user = userEvent.setup();

    render(
      <VoteScreenPanels
        currentUserId="user-1"
        activeTournaments={[
          {
            ...publicBracket(),
            title: "Owned open bracket",
            creatorUserId: "user-1",
          },
          {
            ...publicBracket(),
            id: "bracket-2",
            title: "Owned waiting bracket",
            creatorUserId: "user-1",
            viewerHasVotes: true,
            matches: [],
          },
        ]}
      />,
    );

    expect(screen.getByText("Vote now")).not.toBeNull();
    expect(screen.getByText("Manage bracket")).not.toBeNull();
    expect(screen.queryByText("Waiting for reveal")).toBeNull();

    await user.click(screen.getByRole("button", { name: /Owned open bracket/ }));

    expect(screen.getByText("One")).not.toBeNull();
    expect(push).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Close" }));

    await user.click(screen.getByRole("button", { name: /Owned waiting bracket/ }));

    expect(push).toHaveBeenCalledWith("/brackets?stage=active&tournament=bracket-2");
  });
});

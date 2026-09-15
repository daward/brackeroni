import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteScreenPanels } from "@/components/brackets/voting/internal/vote-screen-panels";
import type { VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
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

describe("vote screen panels", () => {
  beforeEach(() => {
    localStorage.clear();
    replace.mockClear();
    push.mockClear();
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
});

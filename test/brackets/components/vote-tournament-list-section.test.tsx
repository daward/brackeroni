import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TournamentListSection } from "@/components/brackets/voting/internal/tournament-list-section";
import type { VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

describe("vote tournament list", () => {
  it("shows voted brackets with no open matches as waiting instead of hiding them", async () => {
    const user = userEvent.setup();
    const onSelectTournament = vi.fn();
    const tournament: VoteTournament = {
      id: "bracket-1",
      creatorName: "Ada Lovelace",
      title: "Public bracket",
      status: "active",
      visibility: "public_unlisted",
      createdAt: "2026-01-01",
      winner: null,
      viewerHasVotes: true,
      matches: [],
    };

    render(
      <TournamentListSection
        tournaments={[tournament]}
        emptyTitle="No Open Matches"
        onSelectTournament={onSelectTournament}
      />,
    );

    expect(screen.getByText("Public bracket")).not.toBeNull();
    expect(screen.getByText("By Ada Lovelace")).not.toBeNull();
    expect(screen.queryByText(/open match/)).toBeNull();
    expect(screen.getByText("Waiting for reveal")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Public bracket/ }).className).toContain("vote-tournament-choice-waiting");

    await user.click(screen.getByRole("button", { name: /Public bracket/ }));

    expect(onSelectTournament).toHaveBeenCalledWith(tournament);
  });

  it("shows owner brackets with remaining votes as vote actions", () => {
    const tournament: VoteTournament = {
      id: "bracket-1",
      creatorUserId: "user-1",
      title: "Owned bracket",
      status: "active",
      visibility: "public_unlisted",
      createdAt: "2026-01-01",
      winner: null,
      matches: [
        {
          id: "match-1",
          status: "open",
          leftEntryId: "entry-1",
          rightEntryId: "entry-2",
        },
      ],
    };

    render(
      <TournamentListSection
        currentUserId="user-1"
        tournaments={[tournament]}
        emptyTitle="No Open Matches"
        onSelectTournament={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", { name: /Owned bracket/ });

    expect(screen.getByText("Vote now")).not.toBeNull();
    expect(screen.queryByText("Manage bracket")).toBeNull();
    expect(card.className).not.toContain("vote-tournament-choice-waiting");
  });

  it("shows owner public brackets already voted as management actions", () => {
    const tournament: VoteTournament = {
      id: "bracket-1",
      creatorUserId: "user-1",
      title: "Owned public bracket",
      status: "active",
      visibility: "public_unlisted",
      sharingMode: "private",
      createdAt: "2026-01-01",
      winner: null,
      viewerHasVotes: true,
      matches: [],
    };

    render(
      <TournamentListSection
        currentUserId="user-1"
        tournaments={[tournament]}
        emptyTitle="No Open Matches"
        onSelectTournament={vi.fn()}
      />,
    );

    const card = screen.getByRole("button", { name: /Owned public bracket/ });

    expect(screen.getByText("Manage bracket")).not.toBeNull();
    expect(screen.queryByText("Waiting for reveal")).toBeNull();
    expect(card.className).not.toContain("vote-tournament-choice-waiting");
  });

  it("shows owner friends brackets ready to close as close round actions", () => {
    const tournament: VoteTournament = {
      id: "bracket-1",
      creatorUserId: "user-1",
      title: "Owned friends bracket",
      status: "active",
      visibility: "private",
      sharingMode: "with_friends",
      allParticipantVotesReady: true,
      createdAt: "2026-01-01",
      winner: null,
      viewerHasVotes: true,
      matches: [],
    };

    render(
      <TournamentListSection
        currentUserId="user-1"
        tournaments={[tournament]}
        emptyTitle="No Open Matches"
        onSelectTournament={vi.fn()}
      />,
    );

    expect(screen.getByText("Close round")).not.toBeNull();
    expect(screen.queryByText("Manage bracket")).toBeNull();
    expect(screen.queryByText("Waiting for reveal")).toBeNull();
  });
});

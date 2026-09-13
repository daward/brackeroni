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
    expect(screen.getByText("You finished the current round")).not.toBeNull();
    expect(screen.getByText("Waiting for reveal")).not.toBeNull();

    await user.click(screen.getByRole("button", { name: /Public bracket/ }));

    expect(onSelectTournament).toHaveBeenCalledWith(tournament);
  });
});

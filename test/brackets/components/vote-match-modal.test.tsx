import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoteMatchModal } from "@/components/brackets/voting/internal/vote-match-modal";
import type { VoteMatch, VoteTournament } from "@/components/brackets/voting/internal/voting-internal-types";

vi.mock("@/components/shared", () => ({
  BackdropRemoteImage: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const tournament: VoteTournament = {
  id: "bracket-1",
  title: "Best Cartoons",
  status: "active",
  createdAt: "2026-01-01",
  winner: null,
};

const match: VoteMatch = {
  id: "match-1",
  status: "open",
  left: { id: "left-entry", name: "The Left", seed: 1, imageUrl: "https://images.example/left.jpg" },
  right: { id: "right-entry", name: "The Right", seed: 2, imageUrl: "https://images.example/right.jpg" },
};

describe("vote match modal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders normalized match side images and votes with the side entry id", async () => {
    const user = userEvent.setup();
    const onVote = vi.fn();

    render(
      <VoteMatchModal
        tournament={tournament}
        match={match}
        focusedMatches={[match]}
        currentRoundProgress={{ completed: 0, total: 1, percent: 0 }}
        pendingVoteMatchId={null}
        transitionMessage=""
        onClose={vi.fn()}
        onVote={onVote}
      />,
    );

    expect(screen.getByRole("img", { name: "The Left" }).getAttribute("src")).toBe("https://images.example/left.jpg");
    expect(screen.getByRole("img", { name: "The Right" }).getAttribute("src")).toBe("https://images.example/right.jpg");

    await user.click(screen.getByRole("button", { name: /The Left/ }));

    expect(onVote).toHaveBeenCalledWith("match-1", "bracket-1", "left-entry");
  });
});

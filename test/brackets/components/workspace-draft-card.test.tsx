import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceDraftCard } from "@/components/brackets/management/internal/workspace-draft-card";
import type { WorkspaceTournament } from "@/components/brackets/management/internal/workspace-internal-types";

const mocks = vi.hoisted(() => ({
  routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.routerPush }),
}));

const tournament: WorkspaceTournament = {
  id: "tournament-1",
  title: "Dinner Finals",
  status: "draft",
  createdAt: "2026-01-01",
  sourcePoolId: "pool-1",
  sharingMode: "private",
  visibility: "private",
};

describe("workspace draft card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the card as the start action when the draft can start", async () => {
    const user = userEvent.setup();
    const onStartTournament = vi.fn();

    render(
      <WorkspaceDraftCard
        tournament={tournament}
        pool={{ id: "pool-1", name: "Dinner Pool", candidateCount: 4 }}
        candidateCount={4}
        canStart
        menuIsOpen={false}
        isActionPending={() => false}
        onToggleMenu={vi.fn()}
        onStartTournament={onStartTournament}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Dinner Finals.*Start bracket/s }));

    expect(onStartTournament).toHaveBeenCalledWith("tournament-1");
    expect(mocks.routerPush).not.toHaveBeenCalled();
  });

  it("uses the card as the setup action when the draft is incomplete", async () => {
    const user = userEvent.setup();
    const onStartTournament = vi.fn();

    render(
      <WorkspaceDraftCard
        tournament={{ ...tournament, sourcePoolId: null }}
        pool={null}
        candidateCount={0}
        canStart={false}
        menuIsOpen={false}
        isActionPending={() => false}
        onToggleMenu={vi.fn()}
        onStartTournament={onStartTournament}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Dinner Finals.*Finish setup/s }));

    expect(onStartTournament).not.toHaveBeenCalled();
    expect(mocks.routerPush).toHaveBeenCalledWith("/brackets/tournament-1/configuration");
  });

  it("keeps draft editing in the card menu", async () => {
    const user = userEvent.setup();

    render(
      <WorkspaceDraftCard
        tournament={tournament}
        pool={{ id: "pool-1", name: "Dinner Pool", candidateCount: 4 }}
        candidateCount={4}
        canStart
        menuIsOpen
        isActionPending={() => false}
        onToggleMenu={vi.fn()}
        onStartTournament={vi.fn()}
        onArchiveTournament={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit draft" }));

    expect(mocks.routerPush).toHaveBeenCalledWith("/brackets/tournament-1/configuration");
  });
});

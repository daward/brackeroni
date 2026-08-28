import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DraftCandidateManager, DraftPoolControls, ManualResultQueue } from "@/components/brackets/management";
import type { DraftEntrantsProps, DraftPoolProps } from "@/components/brackets/management";
import type { BracketMatch, Bracket } from "@/lib/brackets/types";

const tournament: Bracket = {
  id: "bracket-1",
  title: "Movie Night",
  status: "active",
  createdAt: "2026-01-01",
};

const match: BracketMatch = {
  id: "match-1",
  status: "open",
  leftEntryId: "left-entry",
  rightEntryId: "right-entry",
  leftName: "The Left",
  rightName: "The Right",
  leftSeed: 1,
  rightSeed: 2,
};

function makePool(overrides: Partial<DraftPoolProps> = {}): DraftPoolProps {
  return {
    bracketDraft: {
      title: "Movie Night",
      sourcePoolId: "pool-1",
      playStyle: "fixed_bracket",
      resultMode: "winner_only",
      tieBreakMode: "higher_seed_wins",
    },
    pools: [
      { id: "pool-1", name: "Current Pool", candidateCount: 4 },
      { id: "pool-2", name: "Other Pool", candidateCount: 8 },
    ],
    linkedPool: null,
    trimmedBracketTitle: "Movie Night",
    hasSourcePool: false,
    isPublishedTournament: false,
    isParallelParent: false,
    isManagingEntrants: false,
    isPoolMenuOpen: true,
    isActionPending: () => false,
    onPatchDraft: vi.fn(),
    onPersistTournamentPatch: vi.fn(),
    onToggleManageEntrants: vi.fn(),
    onTogglePoolMenu: vi.fn(),
    onClosePoolMenu: vi.fn(),
    onCreatePool: vi.fn(),
    onSyncWithPool: vi.fn(),
    onOpenSeedingEditor: vi.fn(),
    ...overrides,
  };
}

function makeEntrants(overrides: Partial<DraftEntrantsProps> = {}): DraftEntrantsProps {
  return {
    linkedPoolCandidates: [],
    candidateDraft: { name: "", description: "", imageUrl: "", tagsText: "" },
    isCandidateEditorOpen: false,
    isEditingCandidate: false,
    imageSuggestions: [],
    imageSuggestionLoading: false,
    removingCandidateId: null,
    updateCandidateDraft: vi.fn(),
    openCandidateCreator: vi.fn(),
    handleImportCandidatesIntoPool: vi.fn(),
    handleCandidateEditSubmit: vi.fn(),
    handleCreateCandidateInPool: vi.fn(),
    closeCandidateEditor: vi.fn(),
    handleSuggestImages: vi.fn(),
    selectSuggestedImage: vi.fn(),
    openCandidateEditor: vi.fn(),
    handleRemoveCandidateFromPool: vi.fn(),
    ...overrides,
  };
}

describe("bracket management workflows", () => {
  it("selects and clears a manual matchup winner", async () => {
    const user = userEvent.setup();
    const onSetManualMatchWinner = vi.fn();
    const { rerender } = render(<ManualResultQueue tournament={tournament} matches={[match]} isActionPending={() => false} onSetManualMatchWinner={onSetManualMatchWinner} />);

    await user.click(screen.getByRole("button", { name: /The Left/ }));
    expect(onSetManualMatchWinner).toHaveBeenLastCalledWith("bracket-1", "match-1", "left-entry");

    rerender(
      <ManualResultQueue
        tournament={tournament}
        matches={[{ ...match, winnerEntryId: "left-entry" }]}
        isActionPending={() => false}
        onSetManualMatchWinner={onSetManualMatchWinner}
      />,
    );
    await user.click(screen.getByRole("button", { name: /The Left/ }));
    expect(onSetManualMatchWinner).toHaveBeenLastCalledWith("bracket-1", "match-1", null);
  });

  it("routes draft pool menu actions through the controls adapter", async () => {
    const user = userEvent.setup();
    const onCreatePool = vi.fn();
    const onSelectPool = vi.fn();
    render(<DraftPoolControls tournament={tournament} pool={makePool()} onCreatePool={onCreatePool} onSelectPool={onSelectPool} />);

    await user.click(screen.getByRole("button", { name: /Other Pool/ }));
    expect(onSelectPool).toHaveBeenCalledWith("pool-2");

    await user.click(screen.getByRole("button", { name: /New Pool/ }));
    expect(onCreatePool).toHaveBeenCalledOnce();
  });

  it("keeps the bracket-specific candidate manager configuration intact", () => {
    render(<DraftCandidateManager poolId="pool-1" linkedPool={null} isPublishedTournament={false} entrants={makeEntrants()} isActionPending={() => false} />);

    expect(screen.getByText("In This Bracket")).not.toBeNull();
    expect(screen.getByRole("button", { name: /Add candidate/ })).not.toBeNull();
    expect(screen.getByRole("button", { name: /Import a list/ })).not.toBeNull();
  });
});

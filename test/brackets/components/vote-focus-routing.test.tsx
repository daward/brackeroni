import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVoteFocusRouting } from "../../../components/brackets/voting/internal/use-vote-focus-routing";
import type { VoteTournament } from "../../../components/brackets/voting/internal/voting-internal-types";

let replaceCalls: string[];
let renderedWaitingState: boolean | null;

function replaceIfChanged(href: string) {
  replaceCalls.push(href);
}

function activeTournament(overrides: Partial<VoteTournament> = {}): VoteTournament {
  return {
    id: "bracket-1",
    title: "Creator Bracket",
    status: "active",
    sharingMode: "private",
    visibility: "private",
    votingAccess: "signed_in_only",
    playStyle: "fixed_bracket",
    resultMode: "full_ranking",
    tieBreakMode: "higher_seed_wins",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    matches: [{ id: "match-1", status: "open", userVoteEntryId: "entry-1" }],
    ...overrides,
  } as VoteTournament;
}

function RoutingProbe({ tournament }: { tournament: VoteTournament }) {
  const routing = useVoteFocusRouting({
    active: [tournament],
    focusedMatch: null,
    focusedTournament: tournament,
    focusedTournamentId: tournament.id,
    initialFocusedTournamentId: tournament.id,
    initialReturnTo: "create",
    pendingVoteMatchId: null,
    refreshTournamentState: vi.fn(),
    replaceIfChanged,
    setFocusedTournamentId: vi.fn(),
  });

  renderedWaitingState = routing.isFocusedTournamentWaiting;
  return null;
}

describe("vote focus routing", () => {
  beforeEach(() => {
    localStorage.clear();
    replaceCalls = [];
    renderedWaitingState = null;
  });

  it("returns creator flows to bracket management instead of waiting for another round", async () => {
    render(<RoutingProbe tournament={activeTournament()} />);

    await waitFor(() => expect(replaceCalls).toContain("/brackets?stage=active"));
    expect(renderedWaitingState).toBe(false);
  });
});

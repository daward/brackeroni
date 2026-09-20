import { render, screen, waitFor } from "@testing-library/react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";
import { useBracketRouteSelection } from "@/components/brackets/management/internal/use-bracket-route-selection";
import type { BracketStageView, WorkspaceTournament } from "@/components/brackets/management/internal/workspace-internal-types";

function activeTournament(id: string): WorkspaceTournament {
  return {
    id,
    title: id,
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as WorkspaceTournament;
}

function RouteSelectionProbe() {
  const [stage, setStage] = useState<BracketStageView>("draft");
  const [selectedLiveTournamentId, setSelectedLiveTournamentId] = useState<string | null>(null);
  const [, setExpandedDraftTournamentId] = useState<string | "all" | null>("all");
  const tournamentCardRefs = useRef({});

  useBracketRouteSelection({
    searchParams: new URLSearchParams("stage=active&tournament=beatles-bracket") as unknown as ReadonlyURLSearchParams,
    setExpandedDraftTournamentId,
    setSelectedLiveTournamentId,
    setTournamentStageViewState: setStage,
    tournamentCardRefs,
    tournaments: [activeTournament("first-bracket"), activeTournament("beatles-bracket")],
  });

  return <p>{`${stage}:${selectedLiveTournamentId}`}</p>;
}

describe("bracket route selection", () => {
  it("selects the requested live bracket instead of falling back to the first one", async () => {
    render(<RouteSelectionProbe />);

    await waitFor(() => expect(screen.getByText("active:beatles-bracket")).not.toBeNull());
  });
});

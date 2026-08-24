import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { ReadonlyURLSearchParams } from "next/navigation";
import type { BracketStageView, SetExpandedDraftId, TournamentCardRefs, WorkspaceTournament } from "./workspace-internal-types";

type UseBracketRouteSelectionProps = {
  searchParams: ReadonlyURLSearchParams | null;
  setExpandedDraftTournamentId: SetExpandedDraftId;
  setTournamentStageViewState: Dispatch<SetStateAction<BracketStageView>>;
  tournamentCardRefs: TournamentCardRefs;
  tournaments: WorkspaceTournament[];
};

export function useBracketRouteSelection({
  searchParams,
  setExpandedDraftTournamentId,
  setTournamentStageViewState,
  tournamentCardRefs,
  tournaments,
}: UseBracketRouteSelectionProps) {
  useEffect(() => {
    const requestedStage = searchParams?.get("stage");
    const requestedTournamentId = searchParams?.get("tournament");

    if (requestedStage === "draft" || requestedStage === "active" || requestedStage === "complete") {
      setTournamentStageViewState(requestedStage);
    }

    if (!requestedTournamentId) {
      return;
    }

    const requestedTournament = tournaments.find((tournament) => tournament.id === requestedTournamentId);
    if (!requestedTournament) {
      return;
    }

    if (requestedTournament.status === "draft") {
      setTournamentStageViewState("draft");
      setExpandedDraftTournamentId(requestedTournament.id);
    } else if (requestedTournament.status === "active") {
      setTournamentStageViewState("active");
    } else if (requestedTournament.status === "complete") {
      setTournamentStageViewState("complete");
    }

    const timer = setTimeout(() => {
      tournamentCardRefs.current[requestedTournament.id]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);

    return () => clearTimeout(timer);
  }, [tournaments, searchParams, setExpandedDraftTournamentId, setTournamentStageViewState, tournamentCardRefs]);
}

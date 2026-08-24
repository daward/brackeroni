import { useEffect } from "react";
import type { BracketStageView, MessageSetter, TournamentDrafts, WorkspaceTournament } from "./workspace-internal-types";
import { getErrorMessage } from "./workspace-internal-types";

type UseBracketManagementHydrationProps = {
  ensurePoolDetails: (poolId: string) => Promise<unknown>;
  ensureTournamentWorkspaceDetails: (tournament: WorkspaceTournament) => Promise<unknown>;
  expandedDraftTournamentId: string | "all" | null;
  selectedLiveTournamentId: string | null;
  setErrorMessage: MessageSetter;
  tournamentInlineDrafts: TournamentDrafts;
  tournamentStageView: BracketStageView;
  tournaments: WorkspaceTournament[];
};

export function useBracketManagementHydration({
  ensurePoolDetails,
  ensureTournamentWorkspaceDetails,
  expandedDraftTournamentId,
  selectedLiveTournamentId,
  setErrorMessage,
  tournamentInlineDrafts,
  tournamentStageView,
  tournaments,
}: UseBracketManagementHydrationProps) {
  useEffect(() => {
    if (tournamentStageView === "draft") {
      const targetDraftId = expandedDraftTournamentId === "all" ? (tournaments.find((tournament) => tournament.status === "draft")?.id ?? null) : expandedDraftTournamentId;

      if (!targetDraftId) {
        return;
      }

      const targetTournament = tournaments.find((tournament) => tournament.id === targetDraftId);
      if (!targetTournament) {
        return;
      }

      ensureTournamentWorkspaceDetails(targetTournament).catch((error: unknown) => {
        setErrorMessage(getErrorMessage(error, "Failed to load bracket."));
      });

      const sourcePoolId = tournamentInlineDrafts[targetTournament.id]?.sourcePoolId || targetTournament.sourcePoolId;
      if (sourcePoolId) {
        ensurePoolDetails(sourcePoolId).catch((error: unknown) => {
          setErrorMessage(getErrorMessage(error, "Failed to load pool."));
        });
      }
    }
  }, [ensurePoolDetails, ensureTournamentWorkspaceDetails, expandedDraftTournamentId, tournamentInlineDrafts, tournamentStageView, tournaments]);

  useEffect(() => {
    if (tournamentStageView !== "active") {
      return;
    }

    const targetTournament =
      tournaments.find((tournament) => tournament.id === selectedLiveTournamentId) || tournaments.find((tournament) => tournament.status === "active") || null;

    if (!targetTournament) {
      return;
    }

    ensureTournamentWorkspaceDetails(targetTournament).catch((error: unknown) => {
      setErrorMessage(getErrorMessage(error, "Failed to load bracket."));
    });
  }, [ensureTournamentWorkspaceDetails, selectedLiveTournamentId, tournamentStageView, tournaments]);
}

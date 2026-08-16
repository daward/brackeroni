import { useEffect } from "react";



export function useWorkspaceBracketHydration({ ensurePoolDetails, ensureTournamentWorkspaceDetails, expandedDraftTournamentId, selectedLiveTournamentId, setErrorMessage, tournamentInlineDrafts, tournamentStageView, tournaments, workspaceView }) {

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    if (tournamentStageView === "draft") {
      const targetDraftId =
        expandedDraftTournamentId === "all"
          ? tournaments.find((tournament) => tournament.status === "draft")?.id ?? null
          : expandedDraftTournamentId;

      if (!targetDraftId) {
        return;
      }

      const targetTournament = tournaments.find((tournament) => tournament.id === targetDraftId);
      if (!targetTournament) {
        return;
      }

      ensureTournamentWorkspaceDetails(targetTournament).catch((error) => {
        setErrorMessage(error.message || "Failed to load bracket.");
      });

      const sourcePoolId =
        tournamentInlineDrafts[targetTournament.id]?.sourcePoolId || targetTournament.sourcePoolId;
      if (sourcePoolId) {
        ensurePoolDetails(sourcePoolId).catch((error) => {
          setErrorMessage(error.message || "Failed to load pool.");
        });
      }
    }
  }, [
    ensurePoolDetails,
    ensureTournamentWorkspaceDetails,
    expandedDraftTournamentId,
    tournamentInlineDrafts,
    tournamentStageView,
    tournaments,
    workspaceView
  ]);

  useEffect(() => {
    if (workspaceView !== "tournaments" || tournamentStageView !== "active") {
      return;
    }

    const targetTournament =
      tournaments.find((tournament) => tournament.id === selectedLiveTournamentId) ||
      tournaments.find((tournament) => tournament.status === "active") ||
      null;

    if (!targetTournament) {
      return;
    }

    ensureTournamentWorkspaceDetails(targetTournament).catch((error) => {
      setErrorMessage(error.message || "Failed to load bracket.");
    });
  }, [
    ensureTournamentWorkspaceDetails,
    selectedLiveTournamentId,
    tournamentStageView,
    tournaments,
    workspaceView
  ]);

}


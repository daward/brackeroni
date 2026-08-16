import { useEffect } from "react";



export function useWorkspaceShareLink({ expandedDraftTournamentId, handleEnsureShareLink, isActionPending, selectedLiveTournamentId, tournamentShareLinks, tournamentStageView, tournaments, workspaceView }) {

  useEffect(() => {
    if (workspaceView !== "tournaments") {
      return;
    }

    let targetTournament = null;

    if (tournamentStageView === "active") {
      targetTournament =
        tournaments.find((tournament) => tournament.id === selectedLiveTournamentId) ||
        tournaments.find((tournament) => tournament.status === "active") ||
        null;
    } else if (tournamentStageView === "draft") {
      const targetDraftId =
        expandedDraftTournamentId === "all"
          ? tournaments.find((tournament) => tournament.status === "draft")?.id ?? null
          : expandedDraftTournamentId;

      targetTournament =
        tournaments.find((tournament) => tournament.id === targetDraftId) || null;
    }

    if (
      !targetTournament ||
      (targetTournament.status !== "draft" && targetTournament.status !== "active") ||
      targetTournament.sharingMode !== "with_friends" ||
      tournamentShareLinks[targetTournament.id]?.some((item) => item.active) ||
      isActionPending(`share-link:${targetTournament.id}`)
    ) {
      return;
    }

    handleEnsureShareLink(targetTournament.id, { silent: true }).catch(() => {
      // Error handling stays in the action path.
    });
  }, [
    expandedDraftTournamentId,
    selectedLiveTournamentId,
    tournamentShareLinks,
    tournamentStageView,
    tournaments,
    workspaceView
  ]);

}



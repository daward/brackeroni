import { useEffect } from "react";
import type {
  BracketStageView,
  PendingActionChecker,
  TournamentShareLinksState,
  WorkspaceShareLink,
  WorkspaceTournament,
} from "./workspace-internal-types";

type UseBracketShareLinkProps = {
  expandedDraftTournamentId: string | "all" | null;
  handleEnsureShareLink: (tournamentId: string, options?: { silent?: boolean; rotate?: boolean }) => Promise<WorkspaceShareLink | null>;
  isActionPending: PendingActionChecker;
  selectedLiveTournamentId: string | null;
  tournamentShareLinks: TournamentShareLinksState;
  tournamentStageView: BracketStageView;
  tournaments: WorkspaceTournament[];
};

export function useBracketShareLink({
  expandedDraftTournamentId,
  handleEnsureShareLink,
  isActionPending,
  selectedLiveTournamentId,
  tournamentShareLinks,
  tournamentStageView,
  tournaments,
}: UseBracketShareLinkProps) {
  useEffect(() => {
    let targetTournament: WorkspaceTournament | null = null;

    if (tournamentStageView === "active") {
      targetTournament = tournaments.find((tournament) => tournament.id === selectedLiveTournamentId) || tournaments.find((tournament) => tournament.status === "active") || null;
    } else if (tournamentStageView === "draft") {
      const targetDraftId = expandedDraftTournamentId === "all" ? (tournaments.find((tournament) => tournament.status === "draft")?.id ?? null) : expandedDraftTournamentId;

      targetTournament = tournaments.find((tournament) => tournament.id === targetDraftId) || null;
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
  }, [expandedDraftTournamentId, selectedLiveTournamentId, tournamentShareLinks, tournamentStageView, tournaments]);
}

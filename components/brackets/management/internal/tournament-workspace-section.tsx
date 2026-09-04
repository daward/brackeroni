"use client";

import { useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CreateCard, InfiniteScrollControl } from "@/components/shared";
import { canCopyBracketLink, describeTournamentAudienceMode, formatBracketRuleLabel } from "./presentation";
import type { BracketDraft } from "@/lib/brackets/types";
import type { Pagination } from "@/lib/pagination/types";
import type { PoolDetail } from "@/lib/pools/types";
import type { BracketPoolOption } from "../types";
import { ActiveParallelTournamentSection, ActiveStandardTournamentSection } from "./tournament-status-sections";
import { LiveBracketPicker } from "./live-bracket-picker";
import { LiveBracketRail } from "./live-bracket-rail";
import { PromptDraftBracketCard } from "./prompt-draft-bracket-card";
import { WorkspaceCompletedCard } from "./workspace-completed-card";
import { WorkspaceDraftCard } from "./workspace-draft-card";
import type {
  BracketStageView,
  PendingActionChecker,
  PoolDetailsState,
  TournamentInvitesState,
  TournamentMatchesState,
  TournamentShareLinksState,
  WorkspaceTournament,
} from "./workspace-internal-types";

type StageCounts = Partial<Record<BracketStageView, number>>;
type TournamentInlinePatch = Partial<BracketDraft> & Pick<Partial<WorkspaceTournament>, "status">;

type TournamentWorkspaceSectionProps = {
  tournaments: WorkspaceTournament[];
  tournamentStageView: BracketStageView;
  loadedTournamentStage: BracketStageView | null;
  tournamentPage: number;
  tournamentPagination?: Pagination | null;
  tournamentStatusCounts?: StageCounts | null;
  setTournamentPage: Dispatch<SetStateAction<number>>;
  isLoadingBrackets: boolean;
  setTournamentStageView: (stage: BracketStageView, options?: { history?: "push" | "replace" }) => void;
  selectedLiveTournamentId: string | null;
  setSelectedLiveTournamentId: Dispatch<SetStateAction<string | null>>;
  recentlySavedBrackets: Record<string, boolean>;
  tournamentInvites: TournamentInvitesState;
  tournamentMatches: TournamentMatchesState;
  tournamentShareLinks: TournamentShareLinksState;
  pools: BracketPoolOption[];
  poolDetails: PoolDetailsState;
  isActionPending: PendingActionChecker;
  onOpenBracketWizard: () => void;
  onPromptDraftCreated: () => Promise<void> | void;
  setErrorMessage: (message: string) => void;
  setSuccessMessage: (message: string) => void;
  handleCopyShareLink: (tournamentId: string) => void;
  handleStartTournament: (tournamentId: string) => void;
  handleArchiveTournament: (tournamentId: string, title: string) => void;
  updateTournamentInline: (
    tournamentId: string,
    patch: TournamentInlinePatch,
    options?: { silent?: boolean },
  ) => Promise<void> | void;
  handleCloseCurrentRound: (tournamentId: string) => void;
  handleOpenNextRound: (tournamentId: string) => void;
  handleRerunTournament: (tournamentId: string) => void;
  handleSetManualMatchWinner: (tournamentId: string, matchId: string, winnerEntryId: string | null) => void;
};

function getActiveShareLink(tournamentId: string, tournamentShareLinks: TournamentShareLinksState) {
  return tournamentShareLinks[tournamentId]?.find((item) => Boolean(item.active)) || null;
}

function getPoolForTournament(
  tournament: WorkspaceTournament,
  pools: BracketPoolOption[],
  poolDetails: PoolDetailsState,
): BracketPoolOption | PoolDetail | null {
  const sourcePoolId = tournament.sourcePoolId || "";
  return pools.find((item) => item.id === sourcePoolId) || (sourcePoolId ? poolDetails[sourcePoolId] : null) || null;
}

function getPoolCandidateCount(
  tournament: WorkspaceTournament,
  pool: BracketPoolOption | PoolDetail | null,
) {
  return pool?.candidateCount ?? tournament.entryCount ?? 0;
}

export function TournamentWorkspaceSection({
  tournaments,
  tournamentStageView,
  loadedTournamentStage,
  tournamentPage,
  tournamentPagination,
  tournamentStatusCounts,
  setTournamentPage,
  isLoadingBrackets,
  setTournamentStageView,
  selectedLiveTournamentId,
  setSelectedLiveTournamentId,
  recentlySavedBrackets,
  tournamentInvites,
  tournamentMatches,
  tournamentShareLinks,
  pools,
  poolDetails,
  isActionPending,
  onOpenBracketWizard,
  onPromptDraftCreated,
  setErrorMessage,
  setSuccessMessage,
  handleCopyShareLink,
  handleStartTournament,
  handleArchiveTournament,
  updateTournamentInline,
  handleCloseCurrentRound,
  handleOpenNextRound,
  handleRerunTournament,
  handleSetManualMatchWinner,
}: TournamentWorkspaceSectionProps) {
  const [draftCardMenuId, setDraftCardMenuId] = useState<string | null>(null);
  const [completedCardMenuId, setCompletedCardMenuId] = useState<string | null>(null);
  const canLoadMore = Boolean(tournamentPagination?.hasNextPage);
  const draftTournaments = tournaments.filter((tournament) => tournament.status === "draft");
  const activeTournaments = tournaments.filter((tournament) => tournament.status === "active");
  const completedTournaments = tournaments.filter((tournament) => tournament.status === "complete");
  const isStageLoading = loadedTournamentStage !== tournamentStageView;

  useEffect(() => {
    if (tournamentStageView !== "active") {
      return;
    }

    if (activeTournaments.length === 0) {
      if (selectedLiveTournamentId !== null) {
        setSelectedLiveTournamentId(null);
      }
      return;
    }

    if (!selectedLiveTournamentId || !activeTournaments.some((item) => item.id === selectedLiveTournamentId)) {
      setSelectedLiveTournamentId(activeTournaments[0].id);
    }
  }, [activeTournaments, selectedLiveTournamentId, setSelectedLiveTournamentId, tournamentStageView]);

  function renderActiveTournamentWorkspace(tournament: WorkspaceTournament) {
    const isParallelParent = tournament.kind === "parallel_parent";
    const activeShareLink = getActiveShareLink(tournament.id, tournamentShareLinks);
    const invitees = tournamentInvites[tournament.id] || [];
    const activeRoundVoteGoal = tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
    const creatorVotesCast = Math.max(activeRoundVoteGoal - (tournament.openVoteCount ?? 0), 0);
    const creatorIsDone = activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
    const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;
    const viewerParallelBracketComplete = isParallelParent && tournament.viewerParticipantStatus === "complete";
    const primaryParallelActionHref = viewerParallelBracketComplete
      ? `/results/${tournament.id}`
      : `/vote?parallelBracket=${tournament.id}&returnTo=create`;
    const primaryParallelActionLabel = viewerParallelBracketComplete ? "Results" : "Vote";

    return (
      <div>
        {isParallelParent ? (
          <ActiveParallelTournamentSection
            tournament={tournament}
            primaryActionHref={primaryParallelActionHref}
            primaryActionLabel={primaryParallelActionLabel}
            activeShareLink={activeShareLink}
            invitees={invitees}
            canCopyBracketLink={canCopyBracketLink}
            describeTournamentAudienceMode={describeTournamentAudienceMode}
            formatBracketRuleLabel={formatBracketRuleLabel}
            isActionPending={isActionPending}
            onCopyShareLink={handleCopyShareLink}
            onCloseBracket={(tournamentId) => updateTournamentInline(tournamentId, { status: "complete" }, { silent: false })}
            onArchiveTournament={handleArchiveTournament}
          />
        ) : (
          <ActiveStandardTournamentSection
            tournament={tournament}
            activeRoundMatches={tournamentMatches[tournament.id] || []}
            hasOpenVotes={hasOpenVotes}
            activeRoundVoteGoal={activeRoundVoteGoal}
            creatorVotesCast={creatorVotesCast}
            creatorIsDone={creatorIsDone}
            activeShareLink={activeShareLink}
            invitees={invitees}
            canCopyBracketLink={canCopyBracketLink}
            describeTournamentAudienceMode={describeTournamentAudienceMode}
            formatBracketRuleLabel={formatBracketRuleLabel}
            isActionPending={isActionPending}
            onCloseCurrentRound={handleCloseCurrentRound}
            onOpenNextRound={handleOpenNextRound}
            onCopyShareLink={handleCopyShareLink}
            onSetManualMatchWinner={handleSetManualMatchWinner}
            onRerunTournament={handleRerunTournament}
            onArchiveTournament={handleArchiveTournament}
          />
        )}
      </div>
    );
  }

  function renderLiveWorkspace() {
    if (activeTournaments.length === 0) {
      return (
        <div className="workspace-empty-state">
          <p className="workspace-empty-copy">No live brackets.</p>
        </div>
      );
    }

    const selectedTournament = activeTournaments.find((tournament) => tournament.id === selectedLiveTournamentId) || activeTournaments[0];

    return (
      <div className="workspace-live-layout">
        <div className="workspace-live-mobile-picker">
          <div className="workspace-live-mobile-picker-inner">
            <p className="ui-section-kicker">Viewing live bracket</p>
            <LiveBracketPicker
              tournaments={activeTournaments}
              tournamentInvites={tournamentInvites}
              tournamentMatches={tournamentMatches}
              selectedTournamentId={selectedTournament.id}
              onSelectTournament={setSelectedLiveTournamentId}
            />
          </div>
        </div>
        <LiveBracketRail
          tournaments={activeTournaments}
          tournamentInvites={tournamentInvites}
          tournamentMatches={tournamentMatches}
          selectedTournamentId={selectedTournament.id}
          onSelectTournament={setSelectedLiveTournamentId}
          className="workspace-live-rail-desktop"
        />
        <div className="workspace-live-detail">{renderActiveTournamentWorkspace(selectedTournament)}</div>
      </div>
    );
  }

  function renderDraftWorkspace() {
    return (
      <div className="workspace-card-grid">
        <CreateCard
          type="button"
          onClick={onOpenBracketWizard}
          disabled={isActionPending("create-tournament")}
          icon="+"
          title="Add a bracket"
          description="Set up a new bracket."
        />
        <PromptDraftBracketCard
          disabled={isActionPending("create-tournament")}
          onCreated={onPromptDraftCreated}
          onError={setErrorMessage}
          onSuccess={setSuccessMessage}
        />
        {draftTournaments.map((tournament) => {
          const pool = getPoolForTournament(tournament, pools, poolDetails);
          const candidateCount = getPoolCandidateCount(tournament, pool);
          const canStart = Boolean(tournament.sourcePoolId) && candidateCount > 0;
          const menuIsOpen = draftCardMenuId === tournament.id;

          return (
            <WorkspaceDraftCard
              key={tournament.id}
              tournament={tournament}
              pool={pool}
              candidateCount={candidateCount}
              canStart={canStart}
              menuIsOpen={menuIsOpen}
              isActionPending={isActionPending}
              onToggleMenu={() => setDraftCardMenuId((current) => (current === tournament.id ? null : tournament.id))}
              onStartTournament={(tournamentId) => {
                setDraftCardMenuId(null);
                handleStartTournament(tournamentId);
              }}
              onArchiveTournament={(tournamentId, title) => {
                setDraftCardMenuId(null);
                handleArchiveTournament(tournamentId, title);
              }}
            />
          );
        })}
      </div>
    );
  }

  function renderCompletedWorkspace() {
    if (completedTournaments.length === 0) {
      return (
        <div className="workspace-empty-state">
          <p className="workspace-empty-copy">No completed brackets.</p>
        </div>
      );
    }

    return (
      <div className="workspace-card-grid">
        {completedTournaments.map((tournament) => {
          const menuIsOpen = completedCardMenuId === tournament.id;

          return (
            <WorkspaceCompletedCard
              key={tournament.id}
              tournament={tournament}
              menuIsOpen={menuIsOpen}
              isActionPending={isActionPending}
              onToggleMenu={() => setCompletedCardMenuId((current) => (current === tournament.id ? null : tournament.id))}
              onRerunTournament={(tournamentId) => {
                setCompletedCardMenuId(null);
                handleRerunTournament(tournamentId);
              }}
              onArchiveTournament={(tournamentId, title) => {
                setCompletedCardMenuId(null);
                handleArchiveTournament(tournamentId, title);
              }}
            />
          );
        })}
      </div>
    );
  }

  function renderStageContent() {
    if (tournamentStageView === "active") {
      return renderLiveWorkspace();
    }

    if (tournamentStageView === "draft") {
      return renderDraftWorkspace();
    }

    return renderCompletedWorkspace();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            key: "draft" as const,
            label: "Drafts",
            count: tournamentStatusCounts?.draft ?? draftTournaments.length,
          },
          {
            key: "active" as const,
            label: "Live",
            count: tournamentStatusCounts?.active ?? activeTournaments.length,
          },
          {
            key: "complete" as const,
            label: "Completed",
            count: tournamentStatusCounts?.complete ?? completedTournaments.length,
          },
        ].map((view) => {
          const isActiveView = tournamentStageView === view.key;

          return (
            <button
              key={view.key}
              type="button"
              onClick={() => setTournamentStageView(view.key, { history: "push" })}
              className={`ui-button ${isActiveView ? "ui-button-current" : "ui-button-muted"}`}
            >
              {view.label} ({view.count})
            </button>
          );
        })}
      </div>
      <section aria-busy={isStageLoading}>
        {isStageLoading ? (
          <div className="workspace-stage-loading" role="status">
            <span aria-hidden="true" className="workspace-stage-loading-spinner" />
            <span>Loading {tournamentStageView === "active" ? "live" : tournamentStageView} brackets...</span>
          </div>
        ) : (
          <div className="space-y-0">{renderStageContent()}</div>
        )}
      </section>
      {canLoadMore ? (
        <InfiniteScrollControl
          enabled={canLoadMore}
          loading={isLoadingBrackets}
          pageKey={tournamentPage}
          onLoadMore={() => setTournamentPage((current) => current + 1)}
          className="h-px"
          loadingLabel="Loading more brackets"
        />
      ) : null}
      {isStageLoading ? (
        <p role="status" className="hidden">
          Loading {tournamentStageView === "active" ? "live" : tournamentStageView} brackets...
        </p>
      ) : null}
      {tournamentStageView === "draft" ? (
        <button
          type="button"
          onClick={onOpenBracketWizard}
          disabled={isActionPending("create-tournament")}
          aria-label="Add bracket"
          className="ui-button ui-button-primary workspace-mobile-create-button"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}
    </div>
  );
}

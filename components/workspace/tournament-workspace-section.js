"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CompletedBracketCard } from "@/components/brackets/shared";
import { ExpandedDraftTournamentSection } from "@/components/brackets/management/expanded-draft-tournament-section";
import { CreateCard } from "@/components/shared";
import {
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketDate,
  formatBracketRuleLabel
} from "@/lib/brackets/presentation";
import { InfiniteScrollControl, InlineTitleField } from "@/components/shared";
import { TournamentMetaRow } from "@/components/brackets/management/tournament-management";
import { TournamentManagementCard } from "@/components/brackets/management/tournament-management-card";
import {
  ActiveParallelTournamentSection,
  ActiveStandardTournamentSection,
  CollapsedDraftTournamentSection,
  CompletedTournamentSection
} from "@/components/brackets/management/tournament-status-sections";

function getLiveBracketStat(tournament, invitees = [], matches = []) {
  if (tournament.kind === "parallel_parent") {
    const complete = tournament.completedParticipantCount ?? 0;
    const total = tournament.participantCount ?? 0;
    return {
      kicker: "Parallel",
      detail: total > 0 ? `${complete} of ${total} finished` : "Waiting for participants"
    };
  }

  if (tournament.advancementMode === "manual_winner") {
    const unresolvedCount = (matches || []).filter(
      (match) => match.status === "open" && !match.winnerEntryId
    ).length;
    return {
      kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Manual Results",
      detail:
        unresolvedCount > 0
          ? `${unresolvedCount} winners still to enter`
          : "All winners entered"
    };
  }

  const openMatches = tournament.activeRoundOpenMatchCount ?? 0;
  if (tournament.sharingMode === "with_friends" && invitees.length > 0) {
    const waitingCount = invitees.filter(
      (invite) => invite.openMatchCount > 0 && invite.votesCast < invite.openMatchCount
    ).length;
    return {
      kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Voting",
      detail:
        waitingCount > 0
          ? `${waitingCount} voters still voting`
          : openMatches > 0
            ? `${openMatches} matchups open`
            : "Round ready to close"
    };
  }

  return {
    kicker: tournament.activeRoundNumber ? `Round ${tournament.activeRoundNumber}` : "Live",
    detail: openMatches > 0 ? `${openMatches} matchups open` : "Round ready to close"
  };
}

function LiveBracketRail({
  tournaments,
  tournamentInvites,
  tournamentMatches,
  selectedTournamentId,
  onSelectTournament,
  className = ""
}) {
  return (
    <div className={`border-r border-[var(--line-strong)] py-5 pr-5 ${className}`}>
      <div className="flex flex-col gap-3">
        {tournaments.map((tournament) => {
          const isSelected = tournament.id === selectedTournamentId;
          const invitees = tournamentInvites[tournament.id] || [];
          const matches = tournamentMatches[tournament.id] || [];
          const stat = getLiveBracketStat(tournament, invitees, matches);

          return (
            <button
              key={tournament.id}
              type="button"
              onClick={() => onSelectTournament(tournament.id)}
              className={`relative block w-full border px-5 py-5 text-left transition ${
                isSelected
                  ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.08)]"
                  : "border-[var(--line)] bg-transparent hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              <p className="display-face text-lg font-black uppercase leading-tight">
                {tournament.title}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
                {stat.kicker}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                {stat.detail}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LiveBracketPicker({
  tournaments,
  tournamentInvites,
  tournamentMatches,
  selectedTournamentId,
  onSelectTournament
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedTournament =
    tournaments.find((tournament) => tournament.id === selectedTournamentId) || tournaments[0];
  const selectedStat = getLiveBracketStat(
    selectedTournament,
    tournamentInvites[selectedTournament.id] || [],
    tournamentMatches[selectedTournament.id] || []
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`live-bracket-picker-trigger ui-field flex items-center justify-between gap-3 bg-transparent text-left ${
          isOpen ? "border-[var(--accent-2)]" : "border-[var(--line-strong)]"
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="min-w-0 truncate">
          {selectedTournament.title} — {selectedStat.detail}
        </span>
        <span aria-hidden="true" className="shrink-0 text-lg leading-none">⌄</span>
      </button>
      {isOpen ? (
        <div
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-30 border border-[var(--line-strong)] bg-[var(--panel)] p-1 shadow-[0_12px_28px_rgba(0,0,0,0.3)]"
        >
          {tournaments.map((tournament) => {
            const stat = getLiveBracketStat(
              tournament,
              tournamentInvites[tournament.id] || [],
              tournamentMatches[tournament.id] || []
            );
            const isSelected = tournament.id === selectedTournament.id;

            return (
              <button
                key={tournament.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelectTournament(tournament.id);
                  setIsOpen(false);
                }}
                className={`block w-full px-3 py-3 text-left text-sm transition ${
                  isSelected
                    ? "border-l-2 border-[var(--accent-2)] bg-transparent pl-[0.625rem] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ink)]"
                }`}
              >
                {tournament.title} — {stat.detail}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
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
  tournamentInlineDrafts,
  setTournamentInlineDrafts,
  expandedDraftTournamentId,
  setExpandedDraftTournamentId,
  managedEntrantsTournamentId,
  setManagedEntrantsTournamentId,
  poolMenuTournamentId,
  setPoolMenuTournamentId,
  editingTournamentTitleId,
  setEditingTournamentTitleId,
  expandedBracketRules,
  setExpandedBracketRules,
  recentlySavedBrackets,
  tournamentInvites,
  tournamentMatches,
  tournamentShareLinks,
  tournamentCardRefs,
  pools,
  poolDetails,
  candidateDrafts,
  candidateEditor,
  imageSuggestions,
  imageSuggestionLoading,
  emptyCandidateForm,
  isActionPending,
  onOpenBracketWizard,
  createPoolRecord,
  handleSyncTournamentWithPool,
  openSeedingEditor,
  updateCandidateDraft,
  openCandidateCreator,
  handleImportCandidatesIntoPool,
  handleCandidateEditSubmit,
  handleCreateCandidateInPool,
  closeCandidateEditor,
  handleSuggestImages,
  selectSuggestedImage,
  openCandidateEditor,
  handleRemoveCandidateFromPool,
  handleCopyShareLink,
  handleStartTournament,
  handleArchiveTournament,
  updateTournamentInline,
  handleCloseCurrentRound,
  handleOpenNextRound,
  handleRerunTournament,
  handleSetManualMatchWinner
}) {
  const router = useRouter();
  const [draftCardMenuId, setDraftCardMenuId] = useState(null);
  const [completedCardMenuId, setCompletedCardMenuId] = useState(null);
  const canLoadMore = Boolean(tournamentPagination?.hasNextPage);
  const draftTournaments = tournaments.filter((tournament) => tournament.status === "draft");
  const activeTournaments = tournaments.filter((tournament) => tournament.status === "active");
  const completedTournaments = tournaments.filter((tournament) => tournament.status === "complete");

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
  }, [activeTournaments, selectedLiveTournamentId, tournamentStageView]);

  function buildBracketDraft(tournament) {
    return tournamentInlineDrafts[tournament.id] || {
      title: tournament.title,
      sourcePoolId: tournament.sourcePoolId || "",
      sharingMode: tournament.sharingMode,
      visibility: tournament.visibility,
      votingAccess: tournament.votingAccess,
      playStyle: tournament.playStyle,
      resultMode: tournament.resultMode,
      tieBreakMode: tournament.tieBreakMode,
      advancementMode: tournament.advancementMode || "vote_winner"
    };
  }

  function renderDraftOrCompleteTournamentCard(tournament, firstDraftTournamentId) {
    if (tournament.status === "draft") {
      const pool = pools.find((item) => item.id === tournament.sourcePoolId) || poolDetails[tournament.sourcePoolId];
      const candidateCount = pool?.candidateCount ?? tournament.entryCount ?? 0;
      const canStart = Boolean(tournament.sourcePoolId) && candidateCount > 0;

      return (
        <section key={tournament.id} className="border-b border-[var(--line-strong)] py-7 last:border-b-0">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="ui-section-kicker">Draft bracket</p>
              <h3 className="display-face mt-2 text-2xl font-black">{tournament.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {pool ? `${pool.name} · ${candidateCount} candidates` : "Choose a pool in setup to add contenders."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button type="button" onClick={() => router.push(`/brackets/${tournament.id}/configuration`)} className="ui-button ui-button-accent ui-button-compact">Continue setup</button>
              <button type="button" onClick={() => handleStartTournament(tournament.id)} disabled={!canStart || isActionPending(`start-tournament:${tournament.id}`)} className="ui-button ui-button-muted ui-button-compact">Start</button>
              <button type="button" onClick={() => handleArchiveTournament(tournament.id, tournament.title)} className="ui-button ui-button-muted ui-button-compact">Archive</button>
            </div>
          </div>
        </section>
      );
    }

    if (tournament.status === "complete") {
      const completedOn = tournament.completedAt ? formatBracketDate(tournament.completedAt) : null;
      const resultMode = formatBracketRuleLabel(tournament.resultMode || "winner_only");
      const winner = tournament.winnerName
        ? `${tournament.winnerName}${tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}`
        : null;

      return (
        <section key={tournament.id} className="border-b border-[var(--line-strong)] py-7 last:border-b-0">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <h3 className="display-face text-2xl font-black">{tournament.title}</h3>
              {winner ? (
                <p className="display-face mt-3 text-lg font-bold text-[var(--accent-3)]">
                  Winner · {winner}
                </p>
              ) : null}
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                {[resultMode, `${tournament.entryCount} candidates`, completedOn].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <a href={`/results/${tournament.id}`} className="ui-button ui-button-accent ui-button-compact">Results</a>
              <button type="button" onClick={() => handleRerunTournament(tournament.id)} disabled={isActionPending(`rerun-tournament:${tournament.id}`)} className="ui-button ui-button-accent ui-button-compact">
                {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Run again"}
              </button>
              <button type="button" onClick={() => handleArchiveTournament(tournament.id, tournament.title)} disabled={isActionPending(`archive-tournament:${tournament.id}`)} className="ui-button ui-button-muted ui-button-compact">
                {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
              </button>
            </div>
          </div>
        </section>
      );
    }

    const bracketDraft = buildBracketDraft(tournament);
    const trimmedBracketTitle = (bracketDraft.title || "").trim();
    const hasBracketName =
      trimmedBracketTitle.length > 0 && trimmedBracketTitle !== "Untitled Bracket";
    const hasSourcePool = Boolean(bracketDraft.sourcePoolId);
    const linkedPool = hasSourcePool
      ? pools.find((pool) => pool.id === bracketDraft.sourcePoolId)
      : null;
    const linkedPoolCandidates = hasSourcePool
      ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || [])
      : [];
    const selectedPoolCandidateCount = hasSourcePool
      ? poolDetails[bracketDraft.sourcePoolId]?.candidates?.length ??
        linkedPool?.candidateCount ??
        0
      : 0;
    const isParallelParent = tournament.kind === "parallel_parent";
    const activeShareLink =
      tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
    const invitees = tournamentInvites[tournament.id] || [];
    const activeRoundVoteGoal =
      tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
    const creatorVotesCast = Math.max(activeRoundVoteGoal - (tournament.openVoteCount ?? 0), 0);
    const creatorIsDone = activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
    const rulesExpanded = Boolean(expandedBracketRules[tournament.id]);
    const isEditingTournamentTitle = editingTournamentTitleId === tournament.id;
    const isDraftExpanded =
      tournament.status !== "draft"
        ? true
        : expandedDraftTournamentId === "all"
          ? tournament.id === firstDraftTournamentId
          : expandedDraftTournamentId === tournament.id;
    const isManagingEntrants = managedEntrantsTournamentId === tournament.id;
    const isPoolMenuOpen = poolMenuTournamentId === tournament.id;
    const isPublishedTournament =
      tournament.status !== "draft" && tournament.visibility !== "private";
    const canStartBracket =
      hasBracketName &&
      hasSourcePool &&
      Math.max(tournament.entryCount ?? 0, selectedPoolCandidateCount) > 0;
    const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;
    const viewerParallelBracketComplete =
      isParallelParent && tournament.viewerParticipantStatus === "complete";
    const primaryParallelActionHref = viewerParallelBracketComplete
      ? `/results/${tournament.id}`
      : `/vote?parallelTournament=${tournament.id}&returnTo=create`;
    const primaryParallelActionLabel = viewerParallelBracketComplete ? "Results" : "Vote";

    return (
      <TournamentManagementCard
        key={tournament.id}
        tournament={tournament}
        cardRef={(node) => {
          if (node) {
            tournamentCardRefs.current[tournament.id] = node;
          } else {
            delete tournamentCardRefs.current[tournament.id];
          }
        }}
        isMuted={false}
        statusLabel={recentlySavedBrackets[tournament.id] ? "Saved" : tournament.status}
        audienceLabel={describeTournamentAudienceMode(tournament)}
        completedLabel={
          tournament.status === "complete" && tournament.completedAt
            ? formatBracketDate(tournament.completedAt)
            : null
        }
        title={
          tournament.status === "draft" && isDraftExpanded && isEditingTournamentTitle ? (
            <InlineTitleField
              autoFocus
              value={bracketDraft.title}
              onChange={(event) =>
                setTournamentInlineDrafts((current) => ({
                  ...current,
                  [tournament.id]: {
                    ...bracketDraft,
                    title: event.target.value
                  }
                }))
              }
              onBlur={() => {
                const nextTitle = bracketDraft.title.trim();

                if (!nextTitle) {
                  setTournamentInlineDrafts((current) => ({
                    ...current,
                    [tournament.id]: {
                      ...bracketDraft,
                      title: tournament.title
                    }
                  }));
                  setEditingTournamentTitleId(null);
                  return;
                }

                if (nextTitle !== tournament.title) {
                  updateTournamentInline(tournament.id, { title: nextTitle }, { silent: false });
                }

                setEditingTournamentTitleId(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }

                if (event.key === "Escape") {
                  setTournamentInlineDrafts((current) => ({
                    ...current,
                    [tournament.id]: {
                      ...bracketDraft,
                      title: tournament.title
                    }
                  }));
                  setEditingTournamentTitleId(null);
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                if (tournament.status === "draft" && !isPublishedTournament) {
                  setExpandedDraftTournamentId(tournament.id);
                  setEditingTournamentTitleId(tournament.id);
                }
              }}
              className={`-mx-3 block w-[calc(100%+1.5rem)] border border-transparent bg-transparent px-3 py-2 text-left ${
                tournament.status === "draft"
                  ? "transition hover:border-[var(--line)] hover:bg-[var(--panel)]"
                  : ""
              }`}
            >
              <span
                style={{
                  fontFamily: '"Arial Narrow", Arial, Helvetica, sans-serif',
                  fontSize: "24px",
                  fontWeight: 900,
                  lineHeight: 1
                }}
              >
                {tournament.title}
              </span>
            </button>
          )
        }
      >
        {tournament.status === "draft" ? (
          isDraftExpanded ? (
            <ExpandedDraftTournamentSection
              tournament={tournament}
              bracketDraft={bracketDraft}
              pools={pools}
              linkedPool={linkedPool}
              linkedPoolCandidates={linkedPoolCandidates}
              trimmedBracketTitle={trimmedBracketTitle}
              hasSourcePool={hasSourcePool}
              isPublishedTournament={isPublishedTournament}
              isParallelParent={isParallelParent}
              rulesExpanded={rulesExpanded}
              isManagingEntrants={isManagingEntrants}
              isPoolMenuOpen={isPoolMenuOpen}
              activeShareLink={activeShareLink}
              invitees={invitees}
              canStartBracket={canStartBracket}
              candidateDraft={candidateDrafts[bracketDraft.sourcePoolId] || emptyCandidateForm}
              isCandidateEditorOpen={candidateEditor?.poolId === bracketDraft.sourcePoolId}
              isEditingCandidate={
                candidateEditor?.poolId === bracketDraft.sourcePoolId &&
                Boolean(candidateEditor?.candidateId)
              }
              imageSuggestions={imageSuggestions[bracketDraft.sourcePoolId] || []}
              imageSuggestionLoading={Boolean(imageSuggestionLoading[bracketDraft.sourcePoolId])}
              removingCandidateId={
                linkedPoolCandidates.find((candidate) =>
                  isActionPending(`remove-candidate:${bracketDraft.sourcePoolId}:${candidate.id}`)
                )?.id || null
              }
              isActionPending={isActionPending}
              onPatchDraft={(patch) =>
                setTournamentInlineDrafts((current) => ({
                  ...current,
                  [tournament.id]: {
                    ...bracketDraft,
                    ...patch
                  }
                }))
              }
              onPersistTournamentPatch={(patch) =>
                updateTournamentInline(tournament.id, patch, { silent: false })
              }
              onToggleRules={() =>
                setExpandedBracketRules((current) => ({
                  ...current,
                  [tournament.id]: !rulesExpanded
                }))
              }
              onToggleManageEntrants={(forceOpen) =>
                setManagedEntrantsTournamentId((current) =>
                  forceOpen ? tournament.id : current === tournament.id ? null : tournament.id
                )
              }
              onTogglePoolMenu={() =>
                setPoolMenuTournamentId((current) => (current === tournament.id ? null : tournament.id))
              }
              onClosePoolMenu={() => setPoolMenuTournamentId(null)}
              onCreatePool={createPoolRecord}
              onSyncWithPool={() => handleSyncTournamentWithPool(tournament.id)}
              onOpenSeedingEditor={() => openSeedingEditor(tournament)}
              updateCandidateDraft={updateCandidateDraft}
              openCandidateCreator={openCandidateCreator}
              handleImportCandidatesIntoPool={handleImportCandidatesIntoPool}
              handleCandidateEditSubmit={handleCandidateEditSubmit}
              handleCreateCandidateInPool={handleCreateCandidateInPool}
              closeCandidateEditor={closeCandidateEditor}
              handleSuggestImages={handleSuggestImages}
              selectSuggestedImage={selectSuggestedImage}
              openCandidateEditor={openCandidateEditor}
              handleRemoveCandidateFromPool={handleRemoveCandidateFromPool}
              onCopyShareLink={() => handleCopyShareLink(tournament.id)}
              onStartTournament={() => handleStartTournament(tournament.id)}
              onArchiveTournament={() => handleArchiveTournament(tournament.id, tournament.title)}
            />
          ) : (
            <CollapsedDraftTournamentSection
              tournament={tournament}
              isPublishedTournament={isPublishedTournament}
              canStartBracket={canStartBracket}
              describeTournamentAudienceMode={describeTournamentAudienceMode}
              formatBracketRuleLabel={formatBracketRuleLabel}
              isActionPending={isActionPending}
              onEditDraft={setExpandedDraftTournamentId}
              onStartTournament={handleStartTournament}
            />
          )
        ) : tournament.status === "complete" ? (
          <CompletedTournamentSection
            tournament={tournament}
            hasSourcePool={hasSourcePool}
            formatBracketRuleLabel={formatBracketRuleLabel}
            isActionPending={isActionPending}
            onRerunTournament={handleRerunTournament}
            onArchiveTournament={handleArchiveTournament}
          />
        ) : isParallelParent ? (
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
            onCloseBracket={(tournamentId) =>
              updateTournamentInline(tournamentId, { status: "complete" }, { silent: false })
            }
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
        {tournament.status !== "complete" && hasSourcePool && !isDraftExpanded ? (
          <div className="mt-4">
            <TournamentMetaRow
              separator="slash"
              className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--muted)]"
              items={[
                describeTournamentAudienceMode(tournament),
                formatBracketRuleLabel(tournament.playStyle),
                formatBracketRuleLabel(tournament.resultMode),
                `${tournament.entryCount} entries`
              ]}
            />
          </div>
        ) : null}
      </TournamentManagementCard>
    );
  }

  function renderActiveTournamentWorkspace(tournament) {
    const bracketDraft = buildBracketDraft(tournament);
    const hasSourcePool = Boolean(bracketDraft.sourcePoolId);
    const isParallelParent = tournament.kind === "parallel_parent";
    const activeShareLink =
      tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
    const invitees = tournamentInvites[tournament.id] || [];
    const activeRoundVoteGoal =
      tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
    const creatorVotesCast = Math.max(activeRoundVoteGoal - (tournament.openVoteCount ?? 0), 0);
    const creatorIsDone = activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
    const hasOpenVotes = (tournament.openVoteCount ?? 0) > 0;
    const viewerParallelBracketComplete =
      isParallelParent && tournament.viewerParticipantStatus === "complete";
    const primaryParallelActionHref = viewerParallelBracketComplete
      ? `/results/${tournament.id}`
      : `/vote?parallelTournament=${tournament.id}&returnTo=create`;
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
            onCloseBracket={(tournamentId) =>
              updateTournamentInline(tournamentId, { status: "complete" }, { silent: false })
            }
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
        <div className="p-5">
          <p className="text-sm text-[var(--muted)]">No live brackets.</p>
        </div>
      );
    }

    const selectedTournament =
      activeTournaments.find((tournament) => tournament.id === selectedLiveTournamentId) ||
      activeTournaments[0];

    return (
      <div className="lg:grid lg:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="border-b border-[var(--line-strong)] px-0 py-5 lg:hidden">
          <div className="space-y-2">
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
          className="hidden lg:block"
        />
        <div className="py-6 lg:px-8 lg:pb-8 lg:pt-5">
          {renderActiveTournamentWorkspace(selectedTournament)}
        </div>
      </div>
    );
  }

  const isStageLoading = loadedTournamentStage !== tournamentStageView;

  function renderStageContent() {
    if (tournamentStageView === "active") {
      return renderLiveWorkspace();
    }

    if (tournamentStageView === "draft") {
      return (
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CreateCard
            type="button"
            onClick={onOpenBracketWizard}
            disabled={isActionPending("create-tournament")}
            icon="+"
            title="Add a bracket"
            description="Set up a new bracket."
          />
          {draftTournaments.map((tournament) => {
            const pool = pools.find((item) => item.id === tournament.sourcePoolId) || poolDetails[tournament.sourcePoolId];
            const candidateCount = pool?.candidateCount ?? tournament.entryCount ?? 0;
            const canStart = Boolean(tournament.sourcePoolId) && candidateCount > 0;
            const menuIsOpen = draftCardMenuId === tournament.id;

            return (
              <div key={tournament.id} className="relative h-full">
                <button
                  type="button"
                  onClick={() => router.push(`/brackets/${tournament.id}/configuration`)}
                  className="group flex h-full min-h-44 w-full flex-col items-start justify-start border border-[var(--line)] bg-[rgba(255,255,255,0.025)] p-5 pr-16 text-left transition hover:border-[var(--accent-3)] hover:bg-[rgba(45,211,201,0.06)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-3)]"
                >
                  <h3 className="display-face text-lg font-black leading-tight transition group-hover:text-[var(--accent-3)] group-focus-visible:text-[var(--accent-3)]">
                    {tournament.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                    {pool ? `${pool.name} · ${candidateCount} candidates` : "Choose a pool in setup to add contenders."}
                  </p>
                </button>
                <button
                  type="button"
                  disabled={isActionPending(`start-tournament:${tournament.id}`)}
                  onClick={() => {
                    if (canStart) {
                      handleStartTournament(tournament.id);
                      return;
                    }

                    router.push(`/brackets/${tournament.id}/configuration`);
                  }}
                  className="display-face absolute bottom-5 left-5 z-10 text-sm font-black uppercase tracking-[0.12em] text-[var(--accent-3)] transition hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-3)] disabled:opacity-60"
                >
                  {canStart ? "Start bracket →" : "Set up bracket →"}
                </button>
                <button
                  type="button"
                  aria-label={`Actions for ${tournament.title}`}
                  aria-expanded={menuIsOpen}
                  onClick={() => setDraftCardMenuId((current) => current === tournament.id ? null : tournament.id)}
                  className="completed-bracket-card-menu absolute right-3 top-3 z-10 h-10 w-10 p-0 text-2xl leading-none"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
                {menuIsOpen ? (
                  <div className="absolute right-3 top-16 z-20 w-48 border border-[var(--line-strong)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <button
                      type="button"
                      disabled={!canStart || isActionPending(`start-tournament:${tournament.id}`)}
                      onClick={() => {
                        setDraftCardMenuId(null);
                        handleStartTournament(tournament.id);
                      }}
                      className="ui-button ui-button-primary w-full justify-start disabled:opacity-45"
                    >
                      Start bracket
                    </button>
                    <button
                      type="button"
                      disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                      onClick={() => {
                        setDraftCardMenuId(null);
                        handleArchiveTournament(tournament.id, tournament.title);
                      }}
                      className="ui-button ui-button-muted mt-2 w-full justify-start"
                    >
                      Archive
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    if (tournamentStageView === "complete") {
      return (
        <div className="grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3">
          {completedTournaments.map((tournament) => {
            const completedOn = tournament.completedAt ? formatBracketDate(tournament.completedAt) : null;
            const resultMode = formatBracketRuleLabel(tournament.resultMode || "winner_only");
            const winner = tournament.winnerName
              ? `${tournament.winnerName}${tournament.winnerSeed ? ` (Seed ${tournament.winnerSeed})` : ""}`
              : "No winner recorded";
            const menuIsOpen = completedCardMenuId === tournament.id;

            return (
              <div key={tournament.id} className="relative h-full">
                <CompletedBracketCard
                  tournament={tournament}
                  as="a"
                  href={`/results/${tournament.id}`}
                  winnerLabel={winner}
                  railClassName="pr-14"
                />
                <button
                  type="button"
                  aria-label={`Actions for ${tournament.title}`}
                  aria-expanded={menuIsOpen}
                  onClick={() => setCompletedCardMenuId((current) => current === tournament.id ? null : tournament.id)}
                  className="completed-bracket-card-menu absolute right-3 top-3 z-10 h-10 w-10 p-0 text-2xl leading-none"
                >
                  <span aria-hidden="true">⋮</span>
                </button>
                {menuIsOpen ? (
                  <div className="absolute right-3 top-16 z-20 w-48 border border-[var(--line-strong)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <button
                      type="button"
                      disabled={isActionPending(`rerun-tournament:${tournament.id}`)}
                      onClick={() => {
                        setCompletedCardMenuId(null);
                        handleRerunTournament(tournament.id);
                      }}
                      className="ui-button ui-button-accent w-full justify-start"
                    >
                      {isActionPending(`rerun-tournament:${tournament.id}`) ? "Creating" : "Run again"}
                    </button>
                    <button
                      type="button"
                      disabled={isActionPending(`archive-tournament:${tournament.id}`)}
                      onClick={() => {
                        setCompletedCardMenuId(null);
                        handleArchiveTournament(tournament.id, tournament.title);
                      }}
                      className="ui-button ui-button-muted mt-2 w-full justify-start"
                    >
                      Archive
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      );
    }

    const visibleTournaments = completedTournaments;
    const firstDraftTournamentId = draftTournaments[0]?.id ?? null;

    if (visibleTournaments.length === 0) {
      return (
        <div className="py-7">
          {tournamentStageView === "draft" ? (
            <p className="text-sm text-[var(--muted)]">No draft brackets yet.</p>
          ) : (
            <p className="text-sm text-[var(--muted)]">No completed brackets.</p>
          )}
        </div>
      );
    }

    return visibleTournaments.map((tournament) =>
      renderDraftOrCompleteTournamentCard(tournament, firstDraftTournamentId)
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {[
          {
            key: "draft",
            label: "Drafts",
            count: tournamentStatusCounts?.draft ?? draftTournaments.length
          },
          {
            key: "active",
            label: "Live",
            count: tournamentStatusCounts?.active ?? activeTournaments.length
          },
          {
            key: "complete",
            label: "Completed",
            count: tournamentStatusCounts?.complete ?? completedTournaments.length
          }
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
            <span>Loading {tournamentStageView === "active" ? "live" : tournamentStageView} brackets…</span>
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
          Loading {tournamentStageView === "active" ? "live" : tournamentStageView} brackets…
        </p>
      ) : null}
      {tournamentStageView === "draft" ? (
        <button
          type="button"
          onClick={onOpenBracketWizard}
          disabled={isActionPending("create-tournament")}
          aria-label="Add bracket"
          className="ui-button ui-button-primary fixed bottom-6 right-6 z-40 !hidden h-14 w-14 items-center justify-center rounded-full p-0 text-3xl leading-none shadow-[0_12px_28px_rgba(0,0,0,0.35)] max-md:!flex"
        >
          <span aria-hidden="true">+</span>
        </button>
      ) : null}
    </div>
  );
}




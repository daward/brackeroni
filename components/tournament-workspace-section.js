"use client";

import { useEffect } from "react";
import { ExpandedDraftTournamentSection } from "@/components/expanded-draft-tournament-section";
import {
  canCopyBracketLink,
  describeTournamentAudienceMode,
  formatBracketDate,
  formatBracketRuleLabel,
  InlineTitleField
} from "@/components/create-panel-helpers";
import { SectionCard } from "@/components/section-card";
import { TournamentMetaRow } from "@/components/tournament-management";
import { TournamentManagementCard } from "@/components/tournament-management-card";
import {
  ActiveParallelTournamentSection,
  ActiveStandardTournamentSection,
  CollapsedDraftTournamentSection,
  CompletedTournamentSection
} from "@/components/tournament-status-sections";

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
  onSelectTournament
}) {
  return (
    <div className="border-r border-[var(--line-strong)] bg-[rgba(255,255,255,0.015)] p-3">
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
              className={`relative block w-full border px-4 py-4 text-left transition ${
                isSelected
                  ? "border-[var(--accent-2)] bg-[rgba(255,216,77,0.08)]"
                  : "border-[var(--line)] bg-transparent hover:border-[var(--line-strong)] hover:bg-[rgba(255,255,255,0.03)]"
              }`}
            >
              <p className="display-face text-base font-black uppercase leading-tight">
                {tournament.title}
              </p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                {stat.kicker}
              </p>
              <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
                {stat.detail}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function TournamentWorkspaceSection({
  tournaments,
  tournamentStageView,
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
  createDraftBracket,
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
  handleRerunTournament,
  handleSetManualMatchWinner
}) {
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
      <div className="grid min-h-[36rem] border border-[var(--line-strong)] bg-[rgba(255,255,255,0.01)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <LiveBracketRail
          tournaments={activeTournaments}
          tournamentInvites={tournamentInvites}
          tournamentMatches={tournamentMatches}
          selectedTournamentId={selectedTournament.id}
          onSelectTournament={setSelectedLiveTournamentId}
        />
        <div className="p-6">
          {renderActiveTournamentWorkspace(selectedTournament)}
        </div>
      </div>
    );
  }

  function renderStageContent() {
    if (tournamentStageView === "active") {
      return renderLiveWorkspace();
    }

    const visibleTournaments =
      tournamentStageView === "draft" ? draftTournaments : completedTournaments;
    const firstDraftTournamentId = draftTournaments[0]?.id ?? null;

    if (visibleTournaments.length === 0) {
      return (
        <div className="p-5">
          {tournamentStageView === "draft" ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-[var(--muted)]">No draft brackets yet.</p>
              <button
                type="button"
                onClick={() => createDraftBracket()}
                disabled={isActionPending("create-tournament")}
                className="ui-button ui-button-compact ui-button-primary"
              >
                Add Bracket
              </button>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No completed brackets.</p>
          )}
        </div>
      );
    }

    return (
      <>
        {tournamentStageView === "draft" ? (
          <div className="flex justify-end border-b border-[var(--line)] bg-[var(--panel)] px-5 py-4">
            <button
              type="button"
              onClick={() => createDraftBracket()}
              disabled={isActionPending("create-tournament")}
              className="ui-button ui-button-compact ui-button-primary"
            >
              Add Bracket
            </button>
          </div>
        ) : null}
        {visibleTournaments.map((tournament) =>
          renderDraftOrCompleteTournamentCard(tournament, firstDraftTournamentId)
        )}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          {
            key: "draft",
            label: "Drafts",
            count: draftTournaments.length
          },
          {
            key: "active",
            label: "Live",
            count: activeTournaments.length
          },
          {
            key: "complete",
            label: "Completed",
            count: completedTournaments.length
          }
        ].map((view) => {
          const isActiveView = tournamentStageView === view.key;

          return (
            <button
              key={view.key}
              type="button"
              onClick={() => setTournamentStageView(view.key, { history: "push" })}
              className={`ui-button ${isActiveView ? "ui-button-primary" : "ui-button-muted"}`}
            >
              {view.label} ({view.count})
            </button>
          );
        })}
      </div>
      <SectionCard
        className={
          tournamentStageView === "active" || tournamentStageView === "complete"
            ? "results-shell border-0 bg-transparent"
            : ""
        }
      >
        <div className="space-y-0">{renderStageContent()}</div>
      </SectionCard>
    </div>
  );
}

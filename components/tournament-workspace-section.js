"use client";

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

export function TournamentWorkspaceSection({
  tournaments,
  tournamentStageView,
  setTournamentStageView,
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
  handleRerunTournament
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {[
          {
            key: "draft",
            label: "Drafts",
            count: tournaments.filter((tournament) => tournament.status === "draft").length
          },
          {
            key: "active",
            label: "Live",
            count: tournaments.filter((tournament) => tournament.status === "active").length
          },
          {
            key: "complete",
            label: "Completed",
            count: tournaments.filter((tournament) => tournament.status === "complete").length
          }
        ].map((view) => {
          const isActiveView = tournamentStageView === view.key;

          return (
            <button
              key={view.key}
              type="button"
              onClick={() => setTournamentStageView(view.key)}
              className={`ui-button ${isActiveView ? "ui-button-primary" : "ui-button-muted"}`}
            >
              {view.label} ({view.count})
            </button>
          );
        })}
      </div>
      <SectionCard
        className={tournamentStageView === "complete" ? "results-shell border-0 bg-transparent" : ""}
      >
        <div className="space-y-0">
          {(() => {
            const firstDraftTournamentId =
              tournaments.find((entry) => entry.status === "draft")?.id ?? null;
            const visibleTournaments = tournaments.filter((tournament) => {
              if (tournamentStageView === "draft") {
                return tournament.status === "draft";
              }

              if (tournamentStageView === "active") {
                return tournament.status === "active";
              }

              return tournament.status === "complete";
            });
            const activeTournamentFocusId =
              editingTournamentTitleId ??
              (expandedDraftTournamentId !== "all" ? expandedDraftTournamentId : null);
            const shouldDimOtherTournaments = Boolean(activeTournamentFocusId);

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
                    <p className="text-sm text-[var(--muted)]">
                      {tournamentStageView === "active"
                        ? "No live brackets."
                        : "No completed brackets."}
                    </p>
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
                {visibleTournaments.map((tournament) => {
                  const bracketDraft = tournamentInlineDrafts[tournament.id] || {
                    title: tournament.title,
                    sourcePoolId: tournament.sourcePoolId || "",
                    sharingMode: tournament.sharingMode,
                    visibility: tournament.visibility,
                    votingAccess: tournament.votingAccess,
                    playStyle: tournament.playStyle,
                    resultMode: tournament.resultMode,
                    tieBreakMode: tournament.tieBreakMode
                  };
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
                    ? (poolDetails[bracketDraft.sourcePoolId]?.candidates || []).length
                    : 0;
                  const isParallelParent = tournament.kind === "parallel_parent";
                  const activeShareLink =
                    tournamentShareLinks[tournament.id]?.find((item) => item.active) || null;
                  const invitees = tournamentInvites[tournament.id] || [];
                  const activeRoundVoteGoal =
                    tournament.activeRoundOpenMatchCount ?? invitees[0]?.openMatchCount ?? 0;
                  const completedInviteCount = invitees.filter(
                    (invite) => activeRoundVoteGoal > 0 && invite.votesCast >= activeRoundVoteGoal
                  ).length;
                  const creatorVotesCast = Math.max(
                    activeRoundVoteGoal - (tournament.openVoteCount ?? 0),
                    0
                  );
                  const creatorIsDone =
                    activeRoundVoteGoal > 0 && creatorVotesCast >= activeRoundVoteGoal;
                  const rulesExpanded = Boolean(expandedBracketRules[tournament.id]);
                  const isEditingTournamentTitle = editingTournamentTitleId === tournament.id;
                  const isDraftExpanded =
                    tournament.status !== "draft"
                      ? true
                      : expandedDraftTournamentId === "all"
                        ? tournament.id === firstDraftTournamentId
                        : expandedDraftTournamentId === tournament.id;
                  const isMutedTournament =
                    shouldDimOtherTournaments && activeTournamentFocusId !== tournament.id;
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
                      isMuted={isMutedTournament}
                      statusLabel={recentlySavedBrackets[tournament.id] ? "Saved" : tournament.status}
                      audienceLabel={describeTournamentAudienceMode(tournament)}
                      completedLabel={
                        tournament.status === "complete" && tournament.completedAt
                          ? formatBracketDate(tournament.completedAt)
                          : null
                      }
                      title={
                        tournament.status === "draft" &&
                        isDraftExpanded &&
                        isEditingTournamentTitle ? (
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
                                updateTournamentInline(
                                  tournament.id,
                                  { title: nextTitle },
                                  { silent: false }
                                );
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
                            candidateDraft={
                              candidateDrafts[bracketDraft.sourcePoolId] || emptyCandidateForm
                            }
                            isCandidateEditorOpen={
                              candidateEditor?.poolId === bracketDraft.sourcePoolId
                            }
                            isEditingCandidate={
                              candidateEditor?.poolId === bracketDraft.sourcePoolId &&
                              Boolean(candidateEditor?.candidateId)
                            }
                            imageSuggestions={imageSuggestions[bracketDraft.sourcePoolId] || []}
                            imageSuggestionLoading={Boolean(
                              imageSuggestionLoading[bracketDraft.sourcePoolId]
                            )}
                            removingCandidateId={
                              linkedPoolCandidates.find((candidate) =>
                                isActionPending(
                                  `remove-candidate:${bracketDraft.sourcePoolId}:${candidate.id}`
                                )
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
                                forceOpen
                                  ? tournament.id
                                  : current === tournament.id
                                    ? null
                                    : tournament.id
                              )
                            }
                            onTogglePoolMenu={() =>
                              setPoolMenuTournamentId((current) =>
                                current === tournament.id ? null : tournament.id
                              )
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
                            onArchiveTournament={() =>
                              handleArchiveTournament(tournament.id, tournament.title)
                            }
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
                      ) : tournament.status === "active" ? (
                        isParallelParent ? (
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
                              updateTournamentInline(
                                tournamentId,
                                { status: "complete" },
                                { silent: false }
                              )
                            }
                            onArchiveTournament={handleArchiveTournament}
                          />
                        ) : (
                          <ActiveStandardTournamentSection
                            tournament={tournament}
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
                            onRerunTournament={handleRerunTournament}
                            onArchiveTournament={handleArchiveTournament}
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
                      ) : null}
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
                })}
              </>
            );
          })()}
        </div>
      </SectionCard>
    </div>
  );
}

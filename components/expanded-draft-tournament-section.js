"use client";

import {
  BracketStyleField,
  ResultModeField
} from "@/components/bracket-config-fields";
import { CandidateManagerPanel } from "@/components/candidate-manager-panel";
import {
  formatBracketRuleLabel,
  getTournamentAudienceMode,
  getTournamentAudiencePatch
} from "@/components/create-panel-helpers";
import { isParallelResultMode } from "@/lib/bracket-modes";

function PoolMenu({
  pools,
  bracketDraft,
  isPublishedTournament,
  isActionPending,
  onCreatePool,
  onSelectPool,
  showCurrentPool = false
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-64 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <div className="max-h-72 overflow-y-auto">
        <button
          type="button"
          onClick={onCreatePool}
          disabled={isPublishedTournament || isActionPending}
          className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm">{isActionPending ? "Creating Pool" : "New Pool"}</span>
            <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Create a fresh pool for this bracket
            </span>
          </span>
        </button>
        {pools.map((pool) => {
          const isCurrentPool = pool.id === bracketDraft.sourcePoolId;

          return (
            <button
              key={pool.id}
              type="button"
              onClick={() => onSelectPool(pool)}
              className={`flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition ${
                showCurrentPool && isCurrentPool
                  ? "bg-[var(--panel-3)] text-[var(--accent-3)]"
                  : "hover:bg-[var(--panel-3)]"
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm">{pool.name}</span>
                <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  {pool.candidateCount} candidates
                </span>
              </span>
              {showCurrentPool && isCurrentPool ? (
                <span className="text-[11px] uppercase tracking-[0.14em]">Current</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DraftAccessPanel({ bracketDraft, isPublishedTournament, onAudienceModeChange }) {
  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
      <p className="mb-3 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
        Bracket Access
      </p>
      <select
        aria-label="Bracket Access"
        value={getTournamentAudienceMode(bracketDraft)}
        disabled={isPublishedTournament}
        onChange={(event) => onAudienceModeChange(event.target.value)}
        className="ui-field ui-field-panel ui-field-select"
      >
        <option value="private">Private</option>
        <option value="with_friends">Friends</option>
        <option value="public_listed">Public</option>
        <option value="public_unlisted">Public Unlisted</option>
      </select>
    </div>
  );
}

function DraftRulesPanel({
  bracketDraft,
  isPublishedTournament,
  isParallelParent,
  rulesExpanded,
  onToggleRules,
  onPlayStyleChange,
  onResultModeChange,
  onTieBreakModeChange,
  onAdvancementModeChange
}) {
  return (
    <div className="border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {bracketDraft.playStyle.replace("_", " ")} {" / "}
            {formatBracketRuleLabel(bracketDraft.resultMode)} {" / "}
            {formatBracketRuleLabel(bracketDraft.advancementMode || "vote_winner")} {" / "}
            {bracketDraft.tieBreakMode.replace("_", " ")}
          </p>
          {isPublishedTournament ? (
            <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
              Published brackets are locked in create.
            </p>
          ) : null}
        </div>
        {!isPublishedTournament ? (
          <button
            type="button"
            onClick={onToggleRules}
            className="display-face border border-[var(--line)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent-2)]"
          >
            {rulesExpanded ? "Hide Rules" : "Edit Rules"}
          </button>
        ) : null}
      </div>
      {rulesExpanded && !isPublishedTournament ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <BracketStyleField
            value={bracketDraft.playStyle}
            onChange={onPlayStyleChange}
            className="ui-field ui-field-panel ui-field-select"
          />
          <ResultModeField
            value={bracketDraft.resultMode}
            isParallelParent={isParallelParent}
            onChange={onResultModeChange}
            className="ui-field ui-field-panel ui-field-select"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
              <span>Advancement</span>
              <button
                type="button"
                title="Choose whether votes decide who advances or whether the creator picks the winner for each live matchup."
                className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
              >
                ?
              </button>
            </div>
            <select
              aria-label="Advancement"
              value={bracketDraft.advancementMode || "vote_winner"}
              onChange={(event) => onAdvancementModeChange(event.target.value)}
              className="ui-field ui-field-panel ui-field-select"
            >
              <option value="vote_winner">Vote Winner</option>
              <option value="manual_winner">Manual Winner</option>
            </select>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
              <span>Tie Break</span>
              <button
                type="button"
                title="Decides who advances if a round is closed without a clear vote winner."
                className="cursor-help border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]"
              >
                ?
              </button>
            </div>
            <select
              aria-label="Tie Break"
              value={bracketDraft.tieBreakMode}
              onChange={(event) => onTieBreakModeChange(event.target.value)}
              className="ui-field ui-field-panel ui-field-select"
            >
              <option value="higher_seed_wins">Higher Seed Wins</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DraftFriendsLobby({
  activeShareLink,
  invitees,
  isParallelParent,
  isCopyPending,
  onCopyShareLink
}) {
  return (
    <div className="mt-4 border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="display-face text-xs font-bold uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Friends Lobby
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {activeShareLink ? "Share this bracket with friends before it starts." : "Preparing invite link..."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onCopyShareLink}
            disabled={isCopyPending}
            className="ui-button ui-button-accent"
          >
            {activeShareLink ? "Copy Link" : "Preparing"}
          </button>
        </div>
      </div>
      <div className="mt-3">
        {invitees.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No one is waiting yet.</p>
        ) : (
          <>
            <p className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
              {isParallelParent ? "Participants" : "Waiting On Start"}
            </p>
            <div className="mt-2 space-y-2">
              {invitees.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel-2)] px-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="display-face truncate text-sm font-black">
                      {invite.name || invite.email}
                    </p>
                    {invite.email ? (
                      <p className="mt-1 truncate text-xs tracking-[0.08em] text-[var(--muted)]">
                        {invite.email}
                      </p>
                    ) : null}
                  </div>
                  <span className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-2)]">
                    {invite.status}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function ExpandedDraftTournamentSection({
  tournament,
  bracketDraft,
  pools,
  linkedPool,
  linkedPoolCandidates,
  trimmedBracketTitle,
  hasSourcePool,
  isPublishedTournament,
  isParallelParent,
  rulesExpanded,
  isManagingEntrants,
  isPoolMenuOpen,
  activeShareLink,
  invitees,
  canStartBracket,
  candidateDraft,
  isCandidateEditorOpen,
  isEditingCandidate,
  imageSuggestions,
  imageSuggestionLoading,
  removingCandidateId,
  isActionPending,
  onPatchDraft,
  onPersistTournamentPatch,
  onToggleRules,
  onToggleManageEntrants,
  onTogglePoolMenu,
  onClosePoolMenu,
  onCreatePool,
  onSyncWithPool,
  onOpenSeedingEditor,
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
  onCopyShareLink,
  onStartTournament,
  onArchiveTournament
}) {
  async function handleCreatePool() {
    if (isPublishedTournament) {
      return;
    }

    onClosePoolMenu();
    const createdPool = await onCreatePool({
      name: trimmedBracketTitle || "Untitled Pool",
      attachedTournamentId: tournament.id,
      switchToPools: false
    });

    if (createdPool) {
      onPatchDraft({ sourcePoolId: createdPool.id });
      onToggleManageEntrants(true);
    }
  }

  function handleSelectPool(pool) {
    onClosePoolMenu();
    onPatchDraft({ sourcePoolId: pool.id });
    if (!isPublishedTournament) {
      onPersistTournamentPatch({ sourcePoolId: pool.id });
    }
  }

  function handleAudienceModeChange(nextAudienceMode) {
    const audiencePatch = getTournamentAudiencePatch(nextAudienceMode);
    onPatchDraft(audiencePatch);
    onPersistTournamentPatch(audiencePatch);
  }

  function handlePlayStyleChange(playStyle) {
    onPatchDraft({ playStyle });
    onPersistTournamentPatch({ playStyle });
  }

  function handleResultModeChange(resultMode) {
    onPatchDraft({ resultMode });
    if (!isParallelResultMode(resultMode)) {
      onPersistTournamentPatch({ resultMode });
    }
  }

  function handleTieBreakModeChange(tieBreakMode) {
    onPatchDraft({ tieBreakMode });
    onPersistTournamentPatch({ tieBreakMode });
  }

  function handleAdvancementModeChange(advancementMode) {
    onPatchDraft({ advancementMode });
    onPersistTournamentPatch({ advancementMode });
  }

  const createPoolPending = isActionPending(`create-pool-for-tournament:${tournament.id}`);

  return (
    <>
      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] xl:items-stretch">
        <DraftAccessPanel
          bracketDraft={bracketDraft}
          isPublishedTournament={isPublishedTournament}
          onAudienceModeChange={handleAudienceModeChange}
        />
        <DraftRulesPanel
          bracketDraft={bracketDraft}
          isPublishedTournament={isPublishedTournament}
          isParallelParent={isParallelParent}
          rulesExpanded={rulesExpanded}
          onToggleRules={onToggleRules}
          onPlayStyleChange={handlePlayStyleChange}
          onResultModeChange={handleResultModeChange}
          onTieBreakModeChange={handleTieBreakModeChange}
          onAdvancementModeChange={handleAdvancementModeChange}
        />
      </div>

      <div className="mt-4 border border-[var(--line)] bg-[var(--panel)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-3)]">
              {hasSourcePool ? `Pool: ${tournament.sourcePoolName || "Linked Pool"}` : "Pool"}
            </p>
            {!hasSourcePool ? (
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                This bracket does not have entrants yet.
              </p>
            ) : null}
          </div>
          <div className="relative flex flex-wrap gap-3">
            {hasSourcePool ? (
              <>
                <button
                  type="button"
                  onClick={() => onToggleManageEntrants()}
                  disabled={isPublishedTournament}
                  className="ui-button ui-button-accent"
                >
                  {isManagingEntrants ? "Close Entrants" : "Manage Candidates"}
                </button>
                <button
                  type="button"
                  onClick={onTogglePoolMenu}
                  disabled={isPublishedTournament}
                  className="ui-button ui-button-muted"
                >
                  Pick Pool
                </button>
                {!isParallelParent ? (
                  <button
                    type="button"
                    onClick={onSyncWithPool}
                    disabled={isPublishedTournament || isActionPending(`sync-tournament:${tournament.id}`)}
                    className="ui-button ui-button-muted"
                  >
                    {isActionPending(`sync-tournament:${tournament.id}`) ? "Syncing" : "Sync With Pool"}
                  </button>
                ) : null}
                {isPoolMenuOpen ? (
                  <PoolMenu
                    pools={pools}
                    bracketDraft={bracketDraft}
                    isPublishedTournament={isPublishedTournament}
                    isActionPending={false}
                    onCreatePool={handleCreatePool}
                    onSelectPool={handleSelectPool}
                    showCurrentPool
                  />
                ) : null}
                <button
                  type="button"
                  onClick={onOpenSeedingEditor}
                  disabled={isPublishedTournament}
                  className="ui-button ui-button-muted"
                >
                  Set Seeding
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onTogglePoolMenu}
                  disabled={isPublishedTournament}
                  className="ui-button ui-button-muted"
                >
                  Pick Pool
                </button>
                {isPoolMenuOpen ? (
                  <PoolMenu
                    pools={pools}
                    bracketDraft={bracketDraft}
                    isPublishedTournament={isPublishedTournament}
                    isActionPending={createPoolPending}
                    onCreatePool={handleCreatePool}
                    onSelectPool={handleSelectPool}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
        {isManagingEntrants && hasSourcePool ? (
          <CandidateManagerPanel
            poolId={bracketDraft.sourcePoolId}
            candidateDraft={candidateDraft}
            isCandidateEditorOpen={isCandidateEditorOpen}
            isEditingCandidate={isEditingCandidate}
            readOnly={isPublishedTournament}
            candidates={linkedPoolCandidates}
            imageSuggestions={imageSuggestions}
            imageSuggestionLoading={imageSuggestionLoading}
            onDraftChange={(field, value) => updateCandidateDraft(bracketDraft.sourcePoolId, field, value)}
            onCreateCandidate={() => openCandidateCreator(bracketDraft.sourcePoolId)}
            onImportCandidates={() =>
              handleImportCandidatesIntoPool({
                id: bracketDraft.sourcePoolId,
                name: linkedPool?.name || "Selected Pool"
              })
            }
            onSubmit={() =>
              isEditingCandidate
                ? handleCandidateEditSubmit(bracketDraft.sourcePoolId)
                : handleCreateCandidateInPool(bracketDraft.sourcePoolId)
            }
            onCloseEditor={() => closeCandidateEditor(bracketDraft.sourcePoolId)}
            onSuggestImages={() => handleSuggestImages(bracketDraft.sourcePoolId)}
            onClearImage={() => selectSuggestedImage(bracketDraft.sourcePoolId, "")}
            onSelectSuggestedImage={(imageUrl) => selectSuggestedImage(bracketDraft.sourcePoolId, imageUrl)}
            onEditCandidate={(candidate) => openCandidateEditor(bracketDraft.sourcePoolId, candidate)}
            onRemoveCandidate={(candidate) => handleRemoveCandidateFromPool(bracketDraft.sourcePoolId, candidate)}
            isCreatePending={isActionPending(`create-candidate:${bracketDraft.sourcePoolId}`)}
            isSavePending={isActionPending(`save-candidate:${bracketDraft.sourcePoolId}`)}
            removingCandidateId={removingCandidateId}
            listHeading="In This Bracket"
            listEmptyMessage="No entrants in this bracket yet."
          />
        ) : null}
      </div>

      {bracketDraft.sharingMode === "with_friends" ? (
        <DraftFriendsLobby
          activeShareLink={activeShareLink}
          invitees={invitees}
          isParallelParent={isParallelParent}
          isCopyPending={isActionPending(`share-link:${tournament.id}`)}
          onCopyShareLink={onCopyShareLink}
        />
      ) : null}

      <div className="mt-4 flex flex-col gap-4 border-t border-[var(--line)] pt-4 xl:flex-row xl:items-end xl:justify-between">
        <div />
        <div className="flex flex-wrap gap-3 xl:justify-end">
          <button
            type="button"
            onClick={onStartTournament}
            disabled={!canStartBracket || isActionPending(`start-tournament:${tournament.id}`)}
            className="ui-button ui-button-primary"
          >
            {isActionPending(`start-tournament:${tournament.id}`) ? "Starting" : "Start Bracket"}
          </button>
          <button
            type="button"
            onClick={onArchiveTournament}
            disabled={isActionPending(`archive-tournament:${tournament.id}`)}
            className="ui-button ui-button-muted"
          >
            {isActionPending(`archive-tournament:${tournament.id}`) ? "Archiving" : "Archive"}
          </button>
        </div>
      </div>
    </>
  );
}

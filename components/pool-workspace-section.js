"use client";

import { CandidateManagerPanel } from "@/components/candidate-manager-panel";
import { PoolManagementPanel } from "@/components/pool-management-panel";
import { describePoolVisibility, InlineTitleField } from "@/components/create-panel-helpers";

export function PoolWorkspaceSection({
  pools,
  poolDetails,
  expandedPoolId,
  poolInlineDrafts,
  candidateDrafts,
  candidateEditor,
  imageSuggestions,
  imageSuggestionLoading,
  openPoolActionsMenuId,
  openPoolMergeMenuId,
  emptyCandidateForm,
  isActionPending,
  onCreatePool,
  onOpenImport,
  onCreateBracketFromPool,
  onUsePoolForBracket,
  onSavePool,
  onPatchPoolDraft,
  onCommitPoolDraft,
  onSetExpandedPoolId,
  onSetOpenPoolActionsMenuId,
  onSetOpenPoolMergeMenuId,
  onCopyPoolLink,
  onAutoFillMissingImages,
  onEnrichPoolCandidatesFromSourceUrls,
  onMergePool,
  onRemoveLowValueTagsFromPool,
  onRemoveTagFromPool,
  onArchivePool,
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
  poolCardRefs
}) {
  return (
    <div className={expandedPoolId ? "" : "space-y-3"}>
      <div className={expandedPoolId ? "" : "grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"}>
        {!expandedPoolId ? (
          <button
            type="button"
            onClick={onCreatePool}
            disabled={isActionPending("create-pool")}
            className="group flex h-full min-h-44 w-full flex-col items-start justify-start gap-5 border border-[var(--accent-2)] p-5 text-left transition hover:bg-[rgba(255,216,77,0.07)] disabled:opacity-60"
          >
            <span className="display-face text-4xl font-black leading-none text-[var(--accent-2)]">+</span>
            <span>
              <span className="display-face block text-xl font-black uppercase leading-tight text-[var(--ink)]">Add a pool</span>
              <span className="ui-copy mt-2 block text-sm leading-6 text-[var(--muted)]">Start a new candidate set.</span>
            </span>
          </button>
        ) : null}          {pools.length > 0 ? (
            pools.filter((pool) => !expandedPoolId || pool.id === expandedPoolId).map((pool) => {
              const isExpanded = expandedPoolId === pool.id;
              const shouldDimOtherPools = Boolean(expandedPoolId);
              const isMutedPool = shouldDimOtherPools && !isExpanded;
              const previewCandidates = poolDetails[pool.id]?.candidates || [];
              const missingPoolImageCount = previewCandidates.filter(
                (candidate) => !candidate.imageUrl
              ).length;
              const sourceLinkedCandidateCount = previewCandidates.filter(
                (candidate) => candidate.sourceUrl
              ).length;
              const inlinePoolDraft = poolInlineDrafts[pool.id] || {
                name: pool.name,
                description: pool.description || "",
                visibility: pool.visibility || "private"
              };
              const candidateDraft = candidateDrafts[pool.id] || emptyCandidateForm;
              const isCandidateEditorOpen = candidateEditor?.poolId === pool.id;
              const isEditingPoolCandidate =
                candidateEditor?.poolId === pool.id && Boolean(candidateEditor?.candidateId);
              const poolIsReadOnly = Boolean(pool.isReadOnly);

              return (
                <div
                  key={pool.id}
                  ref={(node) => {
                    poolCardRefs.current[pool.id] = node;
                  }}
                  className={`${isExpanded ? "bg-transparent p-0" : "border border-[var(--line)] bg-[rgba(255,255,255,0.025)]"} transition-opacity duration-150 ${isMutedPool ? "opacity-45" : "opacity-100"}`}
                >
                  {isExpanded ? (
                    <>
                      <header className="flex items-center justify-between gap-6 py-3">
                        <div className="min-w-0 flex-1">
                          <InlineTitleField
                            heading
                            value={inlinePoolDraft.name}
                            onChange={(event) =>
                              onPatchPoolDraft(pool.id, {
                                name: event.target.value,
                                description: inlinePoolDraft.description ?? pool.description ?? "",
                                visibility: inlinePoolDraft.visibility ?? pool.visibility ?? "private"
                              })
                            }
                          onBlur={(event) => onCommitPoolDraft(pool.id, { name: event.target.value, description: inlinePoolDraft.description ?? pool.description ?? "", visibility: inlinePoolDraft.visibility ?? pool.visibility ?? "private" })}
                          />
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            <span className="text-[var(--accent-3)]">{pool.candidateCount} candidates</span>
                            {" · "}{describePoolVisibility(pool.visibility)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { onSetExpandedPoolId(null); onSetOpenPoolActionsMenuId(null); onSetOpenPoolMergeMenuId(null); }}
                          className="display-face shrink-0 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)] transition hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-2)]"
                        >
                          ← Back to pools
                        </button>
                      </header>
                      <PoolManagementPanel
                        pool={pool}
                        draft={inlinePoolDraft}
                        readOnly={poolIsReadOnly}
                        showTitle={false}
                        showSummary={false}
                        compactDetails
                        onDraftChange={(patch) => onPatchPoolDraft(pool.id, patch)}
                        onDraftCommit={(draft) => onCommitPoolDraft(pool.id, draft)}
                        actionBar={
                        <>
                          {pool.candidateCount >= 2 && onUsePoolForBracket ? <button type="button" onClick={() => onUsePoolForBracket(pool)} className="ui-button ui-button-muted">Use for bracket</button> : null}
                          {pool.candidateCount >= 2 ? <button type="button" onClick={() => onCreateBracketFromPool(pool)} disabled={isActionPending("create-tournament")} className="ui-button ui-button-primary">Set up bracket</button> : null}
                          <div className="relative">
                            <button type="button" onClick={() => { onSetOpenPoolActionsMenuId(openPoolActionsMenuId === pool.id ? null : pool.id); onSetOpenPoolMergeMenuId(null); }} className="ui-button ui-button-muted">
                              {openPoolActionsMenuId === pool.id ? "Close" : "⋮ More"}
                            </button>
                            {openPoolActionsMenuId === pool.id ? (
                              <PoolActionsMenu pool={pool} pools={pools} poolIsReadOnly={poolIsReadOnly} missingPoolImageCount={missingPoolImageCount} sourceLinkedCandidateCount={sourceLinkedCandidateCount} openPoolMergeMenuId={openPoolMergeMenuId} isActionPending={isActionPending} onCopyPoolLink={onCopyPoolLink} onAutoFillMissingImages={onAutoFillMissingImages} onEnrichPoolCandidatesFromSourceUrls={onEnrichPoolCandidatesFromSourceUrls} onSetOpenPoolMergeMenuId={onSetOpenPoolMergeMenuId} onMergePool={onMergePool} onArchivePool={onArchivePool} />
                            ) : null}
                          </div>
                        </>
                      }
                    >
                      {false ? (
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <InlineTitleField
                            value={inlinePoolDraft.name}
                            onChange={(event) =>
                              onPatchPoolDraft(pool.id, {
                                name: event.target.value,
                                description: inlinePoolDraft.description ?? pool.description ?? "",
                                visibility: inlinePoolDraft.visibility ?? pool.visibility ?? "private"
                              })
                            }
                          onBlur={(event) => onCommitPoolDraft(pool.id, { name: event.target.value, description: inlinePoolDraft.description ?? pool.description ?? "", visibility: inlinePoolDraft.visibility ?? pool.visibility ?? "private" })}
                          />
                          <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                            {pool.candidateCount} candidates
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                            {describePoolVisibility(pool.visibility)}
                            {poolIsReadOnly ? " â€¢ locked" : ""}
                          </p>
                          {pool.importSourceUrl ? (
                            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                              Imported from{" "}
                              <span className="text-[var(--ink)]">
                                {pool.importSourceTitle || pool.importSourceUrl}
                              </span>
                            </p>
                          ) : null}
                          <textarea
                            value={inlinePoolDraft.description}
                            disabled={poolIsReadOnly}
                            onChange={(event) =>
                              onPatchPoolDraft(pool.id, {
                                name: inlinePoolDraft.name ?? pool.name,
                                description: event.target.value,
                                visibility: inlinePoolDraft.visibility ?? pool.visibility ?? "private"
                              })
                            }
                            rows={2}
                            placeholder="Pool description"
                            className="mt-3 -mx-3 block w-[calc(100%+1.5rem)] border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm leading-6 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-3)]"
                          />
                          {!poolIsReadOnly ? (
                            <select
                              value={inlinePoolDraft.visibility}
                              onChange={(event) =>
                                onPatchPoolDraft(pool.id, {
                                  name: inlinePoolDraft.name ?? pool.name,
                                  description: inlinePoolDraft.description ?? pool.description ?? "",
                                  visibility: event.target.value
                                })
                              }
                              className="mt-3 -mx-3 block w-[calc(100%+1.5rem)] max-w-sm border border-[var(--line)] bg-[var(--panel)] px-3 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent-3)]"
                            >
                              <option value="private">Private Draft</option>
                              <option value="public_listed">Publish</option>
                              <option value="public_unlisted">Publish Unlisted</option>
                            </select>
                          ) : null}
                        </div>
                        <div className="flex w-36 flex-col items-stretch gap-2">
                          {onUsePoolForBracket ? (
                            <button
                              type="button"
                              onClick={() => onUsePoolForBracket(pool)}
                              className="ui-button ui-button-primary ui-button-stack"
                            >
                              Use for Bracket
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => onCreateBracketFromPool(pool)}
                            disabled={isActionPending("create-tournament")}
                            className="ui-button ui-button-primary ui-button-stack"
                          >
                            Set up bracket
                          </button>
                          <button
                            type="button"
                            onClick={() => onSavePool(pool.id)}
                            disabled={poolIsReadOnly || isActionPending(`update-pool:${pool.id}`)}
                            className="ui-button ui-button-accent ui-button-stack"
                          >
                            {isActionPending(`update-pool:${pool.id}`) ? "Saving" : "Save Pool"}
                          </button>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                onSetOpenPoolActionsMenuId(
                                  openPoolActionsMenuId === pool.id ? null : pool.id
                                );
                                onSetOpenPoolMergeMenuId(null);
                              }}
                              className="ui-button ui-button-muted ui-button-stack w-full"
                            >
                              {openPoolActionsMenuId === pool.id ? "Close Actions" : "Actions"}
                            </button>
                            {openPoolActionsMenuId === pool.id ? (
                              <PoolActionsMenu
                                pool={pool}
                                pools={pools}
                                poolIsReadOnly={poolIsReadOnly}
                                missingPoolImageCount={missingPoolImageCount}
                                sourceLinkedCandidateCount={sourceLinkedCandidateCount}
                                openPoolMergeMenuId={openPoolMergeMenuId}
                                isActionPending={isActionPending}
                                onCopyPoolLink={onCopyPoolLink}
                                onAutoFillMissingImages={onAutoFillMissingImages}
                                onEnrichPoolCandidatesFromSourceUrls={onEnrichPoolCandidatesFromSourceUrls}
                                onSetOpenPoolMergeMenuId={onSetOpenPoolMergeMenuId}
                                onMergePool={onMergePool}
                                onArchivePool={onArchivePool}
                              />
                            ) : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onSetExpandedPoolId(expandedPoolId === pool.id ? null : pool.id);
                              onSetOpenPoolActionsMenuId(null);
                              onSetOpenPoolMergeMenuId(null);
                            }}
                            className="ui-button ui-button-muted ui-button-stack"
                          >
                            Collapse
                          </button>
                        </div>
                      </div>
                      ) : null}
                      <CandidateManagerPanel
                        poolId={pool.id}
                        candidateDraft={candidateDraft}
                        isCandidateEditorOpen={isCandidateEditorOpen}
                        isEditingCandidate={isEditingPoolCandidate}
                        candidates={previewCandidates}
                        readOnly={poolIsReadOnly}
                        imageSuggestions={imageSuggestions[pool.id] || []}
                        imageSuggestionLoading={Boolean(imageSuggestionLoading[pool.id])}
                        onDraftChange={(field, value) => updateCandidateDraft(pool.id, field, value)}
                        onCreateCandidate={() => openCandidateCreator(pool.id)}
                        onImportCandidates={() => handleImportCandidatesIntoPool(pool)}
                        onSubmit={() =>
                          isEditingPoolCandidate
                            ? handleCandidateEditSubmit(pool.id)
                            : handleCreateCandidateInPool(pool.id)
                        }
                        onCloseEditor={() => closeCandidateEditor(pool.id)}
                        onSuggestImages={() => handleSuggestImages(pool.id)}
                        onClearImage={() => selectSuggestedImage(pool.id, "")}
                        onSelectSuggestedImage={(imageUrl) => selectSuggestedImage(pool.id, imageUrl)}
                        onEditCandidate={(candidate) => openCandidateEditor(pool.id, candidate)}
                        onRemoveCandidate={(candidate) =>
                          handleRemoveCandidateFromPool(pool.id, candidate)
                        }
                        onRemoveTagFromPool={onRemoveTagFromPool}
                        onRemoveLowValueTagsFromPool={onRemoveLowValueTagsFromPool}
                        isRemoveTagPending={(tag) =>
                          isActionPending(`remove-pool-tag:${pool.id}:${tag.toLowerCase()}`)
                        }
                        isRemoveLowValueTagsPending={(threshold) =>
                          isActionPending(`remove-low-value-tags:${pool.id}:${threshold}`)
                        }
                        isCreatePending={isActionPending(`create-candidate:${pool.id}`)}
                        isSavePending={isActionPending(`save-candidate:${pool.id}`)}
                        removingCandidateId={
                          poolDetails[pool.id]?.candidates?.find((candidate) =>
                            isActionPending(`remove-candidate:${pool.id}:${candidate.id}`)
                          )?.id || null
                        }
                        listHeading={previewCandidates.length === 0 ? "Start building this pool" : "In this pool"}
                        listEmptyMessage="No candidates in this pool yet."
                      />
                    </PoolManagementPanel>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetExpandedPoolId(pool.id)}
                      className="group block h-full w-full p-5 text-left transition hover:bg-[rgba(52,211,196,0.055)] focus-visible:bg-[rgba(52,211,196,0.055)]"
                    >
                      <div>
                        <h3 className="display-face text-xl font-black leading-tight transition group-hover:text-[var(--accent-3)] group-focus-visible:text-[var(--accent-3)]">
                          {pool.name}
                        </h3>
                        <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)] transition group-hover:text-[var(--accent-2)] group-focus-visible:text-[var(--accent-2)]">
                          {pool.candidateCount} candidates
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {describePoolVisibility(pool.visibility)}
                        </p>
                        {pool.description ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                            {pool.description}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  )}
                </div>
              );
            })
          ) : null}
        </div>
    </div>
  );
}

function PoolActionsMenu({
  pool,
  pools,
  poolIsReadOnly,
  missingPoolImageCount,
  sourceLinkedCandidateCount,
  openPoolMergeMenuId,
  isActionPending,
  onCopyPoolLink,
  onAutoFillMissingImages,
  onEnrichPoolCandidatesFromSourceUrls,
  onSetOpenPoolMergeMenuId,
  onMergePool,
  onArchivePool
}) {
  return (
    <div className="absolute right-0 top-full z-20 mt-2 w-64 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <div className="space-y-1">
        {pool.visibility !== "private" ? (
          <button
            type="button"
            onClick={() => onCopyPoolLink(pool.id)}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)]"
          >
            <span className="text-sm">Copy link</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
              Share
            </span>
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => onAutoFillMissingImages(pool)}
          disabled={
            poolIsReadOnly ||
            missingPoolImageCount === 0 ||
            isActionPending(`auto-fill-images:${pool.id}`)
          }
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
        >
          <span className="text-sm">
            {isActionPending(`auto-fill-images:${pool.id}`) ? "Filling images" : "Fill missing images"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {missingPoolImageCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onEnrichPoolCandidatesFromSourceUrls(pool.id)}
          disabled={
            poolIsReadOnly ||
            sourceLinkedCandidateCount === 0 ||
            isActionPending(`enrich-pool-candidates:${pool.id}`)
          }
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
        >
          <span className="text-sm">
            {isActionPending(`enrich-pool-candidates:${pool.id}`)
              ? "Enriching tags"
              : "Enrich tags from links"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {sourceLinkedCandidateCount}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSetOpenPoolMergeMenuId(openPoolMergeMenuId === pool.id ? null : pool.id)}
          disabled={poolIsReadOnly}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
        >
          <span className="text-sm">Merge pool</span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
            {openPoolMergeMenuId === pool.id ? "Close" : "Pick"}
          </span>
        </button>
        {openPoolMergeMenuId === pool.id ? (
          <div className="border-t border-[var(--line)] pt-2">
            <div className="max-h-72 overflow-y-auto">
              {pools
                .filter((candidatePool) => candidatePool.id !== pool.id)
                .map((candidatePool) => (
                  <button
                    key={candidatePool.id}
                    type="button"
                    onClick={() => onMergePool(pool.id, candidatePool.id)}
                    disabled={isActionPending(`merge-pool:${pool.id}`)}
                    className="flex w-full items-center justify-between gap-3 border-b border-[var(--line)] px-3 py-3 text-left transition hover:bg-[var(--panel-3)] last:border-b-0 disabled:opacity-60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{candidatePool.name}</span>
                      <span className="mt-1 block text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                        {candidatePool.candidateCount} candidates
                      </span>
                    </span>
                    <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      {isActionPending(`merge-pool:${pool.id}`) ? "Merging" : "Merge"}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onArchivePool(pool.id, pool.name)}
          disabled={poolIsReadOnly || isActionPending(`archive-pool:${pool.id}`)}
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)] disabled:opacity-60"
        >
          <span className="text-sm">
            {isActionPending(`archive-pool:${pool.id}`) ? "Archiving" : "Archive"}
          </span>
          <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">Hide</span>
        </button>
      </div>
    </div>
  );
}

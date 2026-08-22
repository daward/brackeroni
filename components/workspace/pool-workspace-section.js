"use client";

import { useState } from "react";

import { PaginatedCandidateManagerPanel } from "@/components/pools/candidates";
import { PoolManagementPanel, PoolSourceInfo, PoolVisibilityPicker } from "@/components/pools/shared";
import { getPoolTitlePresentation } from "@/lib/pools/title-presentation";
import { describePoolVisibility } from "@/lib/pools/visibility";
import { CreateCard, InlineTitleField, useInfiniteScroll } from "@/components/shared";

export function PoolWorkspaceSection({
  pools,
  poolDetails,
  poolPage,
  isLoadingPools,
  poolPagination,
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
  onLoadMorePools,
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
  const [tagDrawerPoolId, setTagDrawerPoolId] = useState(null);
  const canLoadMore = !expandedPoolId && poolPagination.hasNextPage;
  const loadMoreSentinelRef = useInfiniteScroll({
    enabled: canLoadMore,
    loading: isLoadingPools,
    pageKey: poolPage,
    onLoadMore: onLoadMorePools
  });
  return (
    <div className={expandedPoolId ? "" : "space-y-3"}>
      <div className={expandedPoolId ? "" : "grid items-stretch gap-4 md:grid-cols-2 xl:grid-cols-3"}>
        {!expandedPoolId ? (
          <CreateCard
            type="button"
            onClick={onCreatePool}
            disabled={isActionPending("create-pool")}
            icon="+"
            title="Add a pool"
            description="Start a new candidate set."
          />
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
              const poolTagCount = new Set(
                previewCandidates.flatMap((candidate) => candidate.tags || [])
              ).size;
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
                      <header className="grid gap-4 border-b border-[var(--line)] py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-3">
                            <button
                              type="button"
                              onClick={() => { onSetExpandedPoolId(null); onSetOpenPoolActionsMenuId(null); onSetOpenPoolMergeMenuId(null); }}
                              className="display-face shrink-0 text-base font-black uppercase tracking-[0.1em] text-[var(--accent-3)] underline decoration-[var(--accent-3)] decoration-1 underline-offset-4 transition hover:text-[var(--ink)] hover:decoration-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--accent-3)]"
                            >
                              Pools
                            </button>
                            <span aria-hidden="true" className="text-[var(--muted)]">/</span>
                          {getPoolTitlePresentation(pool) === "static" ? (
                            <h1 className="display-face min-w-0 text-[30px] font-black leading-none text-[var(--ink)]">
                              {pool.name}
                            </h1>
                          ) : (
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
                          )}
                          <div className="col-start-3 mt-1 flex flex-wrap items-center gap-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                            <span className="text-[var(--accent-3)]">{pool.candidateCount} candidates</span>
                            <span aria-hidden="true">·</span>
                            {poolIsReadOnly ? (
                              <span>{describePoolVisibility(pool.visibility)}</span>
                            ) : (
                              <PoolVisibilityPicker
                                compact
                                value={inlinePoolDraft.visibility ?? pool.visibility ?? "private"}
                                onChange={(visibility) =>
                                  onCommitPoolDraft(pool.id, {
                                    name: inlinePoolDraft.name ?? pool.name,
                                    description: inlinePoolDraft.description ?? pool.description ?? "",
                                    visibility
                                  })
                                }
                              />
                            )}
                            <PoolSourceInfo
                              sourceUrl={pool.importSourceUrl}
                              sourceTitle={pool.importSourceTitle}
                            />
                          </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          {pool.candidateCount >= 2 && onUsePoolForBracket ? (
                            <button type="button" onClick={() => onUsePoolForBracket(pool)} className="ui-button ui-button-muted">
                              Use for bracket
                            </button>
                          ) : null}
                          {pool.candidateCount >= 2 ? (
                            <button type="button" onClick={() => onCreateBracketFromPool(pool)} disabled={isActionPending("create-tournament")} className="ui-button ui-button-primary">
                              Set up bracket
                            </button>
                          ) : null}
                          <div className="relative">
                            <button
                              type="button"
                              aria-label="More pool actions"
                              aria-expanded={openPoolActionsMenuId === pool.id}
                              onClick={() => { onSetOpenPoolActionsMenuId(openPoolActionsMenuId === pool.id ? null : pool.id); onSetOpenPoolMergeMenuId(null); }}
                              className="ui-button ui-button-muted px-3"
                            >
                              ⋮
                            </button>
                            {openPoolActionsMenuId === pool.id ? (
                              <PoolActionsMenu pool={pool} pools={pools} poolIsReadOnly={poolIsReadOnly} missingPoolImageCount={missingPoolImageCount} sourceLinkedCandidateCount={sourceLinkedCandidateCount} tagCount={poolTagCount} openPoolMergeMenuId={openPoolMergeMenuId} isActionPending={isActionPending} onCopyPoolLink={onCopyPoolLink} onAutoFillMissingImages={onAutoFillMissingImages} onEnrichPoolCandidatesFromSourceUrls={onEnrichPoolCandidatesFromSourceUrls} onViewTags={() => { setTagDrawerPoolId(pool.id); onSetOpenPoolActionsMenuId(null); }} onSetOpenPoolMergeMenuId={onSetOpenPoolMergeMenuId} onMergePool={onMergePool} onArchivePool={onArchivePool} />
                            ) : null}
                          </div>
                        </div>
                      </header>
                      <PoolManagementPanel
                        pool={pool}
                        draft={inlinePoolDraft}
                        readOnly={poolIsReadOnly}
                        presentation={{ title: { show: false }, summary: { show: false, visibility: false }, details: { compact: true } }}
                        onDraftChange={(patch) => onPatchPoolDraft(pool.id, patch)}
                        onDraftCommit={(draft) => onCommitPoolDraft(pool.id, draft)}
                    >
                      <PaginatedCandidateManagerPanel
                        source={{ poolId: pool.id, candidates: previewCandidates, pagination: poolDetails[pool.id]?.candidatePagination }}
                        editor={{ isOpen: isCandidateEditorOpen, isEditing: isEditingPoolCandidate, draft: candidateDraft, imageSuggestions: imageSuggestions[pool.id] || [], imageSuggestionLoading: Boolean(imageSuggestionLoading[pool.id]), isCreatePending: isActionPending(`create-candidate:${pool.id}`), isSavePending: isActionPending(`save-candidate:${pool.id}`), onDraftChange: (field, value) => updateCandidateDraft(pool.id, field, value), onSubmit: () => isEditingPoolCandidate ? handleCandidateEditSubmit(pool.id) : handleCreateCandidateInPool(pool.id), onClose: () => closeCandidateEditor(pool.id), onSuggestImages: () => handleSuggestImages(pool.id), onClearImage: () => selectSuggestedImage(pool.id, ""), onSelectSuggestedImage: (imageUrl) => selectSuggestedImage(pool.id, imageUrl) }}
                        actions={{ onCreate: () => openCandidateCreator(pool.id), onImport: () => handleImportCandidatesIntoPool(pool), onEdit: (candidate) => openCandidateEditor(pool.id, candidate), onRemove: (candidate) => handleRemoveCandidateFromPool(pool.id, candidate), removingCandidateId: poolDetails[pool.id]?.candidates?.find((candidate) => isActionPending(`remove-candidate:${pool.id}:${candidate.id}`))?.id || null }}
                        tagManagement={{ showControl: false, openDrawerRequest: tagDrawerPoolId === pool.id, onDrawerRequestHandled: () => setTagDrawerPoolId(null), isRemoveTagPending: (tag) => isActionPending(`remove-pool-tag:${pool.id}:${tag.toLowerCase()}`), isRemoveLowValueTagsPending: (threshold) => isActionPending(`remove-low-value-tags:${pool.id}:${threshold}`), onRemoveTag: (tag) => onRemoveTagFromPool(pool.id, tag), onRemoveLowValueTags: (threshold) => onRemoveLowValueTagsFromPool(pool.id, threshold) }}
                        view={{ readOnly: poolIsReadOnly, listEmptyMessage: "No candidates in this pool yet." }}
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
      {canLoadMore ? (
        <div ref={loadMoreSentinelRef} className="flex justify-center border-t border-[var(--line)] pt-5">
          <button type="button" onClick={onLoadMorePools} disabled={isLoadingPools} className="ui-button ui-button-muted disabled:cursor-wait disabled:opacity-55">
            {isLoadingPools ? "Loading pools" : "Load more pools"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PoolActionsMenu({
  pool,
  pools,
  poolIsReadOnly,
  missingPoolImageCount,
  sourceLinkedCandidateCount,
  tagCount,
  openPoolMergeMenuId,
  isActionPending,
  onCopyPoolLink,
  onAutoFillMissingImages,
  onEnrichPoolCandidatesFromSourceUrls,
  onViewTags,
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
        {tagCount > 0 ? (
          <button
            type="button"
            onClick={onViewTags}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[var(--panel-3)]"
          >
            <span className="text-sm">View tags</span>
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">{tagCount}</span>
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



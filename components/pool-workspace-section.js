"use client";

import { CandidateManagerPanel, CandidatePreviewChips } from "@/components/candidate-manager-panel";
import { describePoolVisibility, InlineTitleField } from "@/components/create-panel-helpers";
import { SectionCard } from "@/components/section-card";

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
  onSavePool,
  onPatchPoolDraft,
  onSetExpandedPoolId,
  onSetOpenPoolActionsMenuId,
  onSetOpenPoolMergeMenuId,
  onCopyPoolLink,
  onAutoFillMissingImages,
  onMergePool,
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
    <div className="space-y-3">
      <div className="flex flex-wrap justify-start gap-3">
        <button
          type="button"
          onClick={onCreatePool}
          disabled={isActionPending("create-pool")}
          className="ui-button ui-button-compact ui-button-primary"
        >
          Add Pool
        </button>
        <button
          type="button"
          onClick={onOpenImport}
          disabled={isActionPending("import-pool")}
          className="ui-button ui-button-compact ui-button-muted"
        >
          {isActionPending("import-pool") ? "Importing" : "Import Pool"}
        </button>
      </div>
      <SectionCard>
        <div className="space-y-0">
          {pools.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No pools yet.</p>
          ) : (
            pools.map((pool) => {
              const isExpanded = expandedPoolId === pool.id;
              const shouldDimOtherPools = Boolean(expandedPoolId);
              const isMutedPool = shouldDimOtherPools && !isExpanded;
              const previewCandidates = poolDetails[pool.id]?.candidates || [];
              const missingPoolImageCount = previewCandidates.filter(
                (candidate) => !candidate.imageUrl
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
                  className={`border-b border-[var(--line)] bg-[var(--panel-2)] transition-opacity duration-150 last:border-b-0 ${
                    isExpanded ? "p-5" : "p-0"
                  } ${isMutedPool ? "opacity-45" : "opacity-100"}`}
                >
                  {isExpanded ? (
                    <>
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
                          />
                          <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)]">
                            {pool.candidateCount} candidates
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                            {describePoolVisibility(pool.visibility)}
                            {poolIsReadOnly ? " • locked" : ""}
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
                          <button
                            type="button"
                            onClick={() => onCreateBracketFromPool(pool)}
                            disabled={isActionPending("create-tournament")}
                            className="ui-button ui-button-primary ui-button-stack"
                          >
                            {isActionPending("create-tournament") ? "Creating" : "Start Bracket"}
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
                                openPoolMergeMenuId={openPoolMergeMenuId}
                                isActionPending={isActionPending}
                                onCopyPoolLink={onCopyPoolLink}
                                onAutoFillMissingImages={onAutoFillMissingImages}
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
                      <CandidateManagerPanel
                        poolId={pool.id}
                        candidateDraft={candidateDraft}
                        isCandidateEditorOpen={isCandidateEditorOpen}
                        isEditingCandidate={isEditingPoolCandidate}
                        candidates={poolDetails[pool.id]?.candidates || []}
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
                        onRemoveCandidate={(candidate) => handleRemoveCandidateFromPool(pool.id, candidate)}
                        isCreatePending={isActionPending(`create-candidate:${pool.id}`)}
                        isSavePending={isActionPending(`save-candidate:${pool.id}`)}
                        removingCandidateId={
                          poolDetails[pool.id]?.candidates?.find((candidate) =>
                            isActionPending(`remove-candidate:${pool.id}:${candidate.id}`)
                          )?.id || null
                        }
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSetExpandedPoolId(pool.id)}
                      className="group grid w-full gap-4 border border-transparent p-5 text-left transition hover:border-[var(--accent-3)] hover:bg-[rgba(63,221,213,0.05)] focus-visible:border-[var(--accent-3)] focus-visible:bg-[rgba(63,221,213,0.05)] xl:grid-cols-[0.4fr_0.6fr] xl:items-start"
                    >
                      <div>
                        <h3 className="display-face text-2xl font-black transition group-hover:text-[var(--accent-3)] group-focus-visible:text-[var(--accent-3)]">
                          {pool.name}
                        </h3>
                        <p className="mt-2 text-sm uppercase tracking-[0.14em] text-[var(--accent-3)] transition group-hover:text-[var(--accent-2)] group-focus-visible:text-[var(--accent-2)]">
                          {pool.candidateCount} candidates
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                          {describePoolVisibility(pool.visibility)}
                        </p>
                        {pool.importSourceUrl ? (
                          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                            Imported from{" "}
                            <span className="text-[var(--ink)]">
                              {pool.importSourceTitle || pool.importSourceUrl}
                            </span>
                          </p>
                        ) : null}
                        {pool.description ? (
                          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{pool.description}</p>
                        ) : null}
                      </div>
                      <div className="xl:self-start xl:pt-0">
                        <CandidatePreviewChips candidates={previewCandidates} />
                      </div>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SectionCard>
    </div>
  );
}

function PoolActionsMenu({
  pool,
  pools,
  poolIsReadOnly,
  missingPoolImageCount,
  openPoolMergeMenuId,
  isActionPending,
  onCopyPoolLink,
  onAutoFillMissingImages,
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

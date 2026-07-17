"use client";

import { useState } from "react";
import { CandidateTagList } from "@/components/candidate-tag-list";
import { ResilientRemoteImage } from "@/components/resilient-remote-image";

export function CandidatePreviewChips({ candidates, limit = 4 }) {
  const previewCandidates = candidates.slice(0, limit);
  const remainingCount = Math.max(candidates.length - previewCandidates.length, 0);

  return (
    <div className="flex flex-wrap gap-2">
      {previewCandidates.map((candidate) => (
        <span
          key={candidate.id}
          className="flex items-center gap-2 border border-[var(--line)] bg-[var(--panel)] px-3 py-2"
        >
          {candidate.imageUrl ? (
            <ResilientRemoteImage
              src={candidate.imageUrl}
              alt={candidate.name}
              className="h-7 w-7 rounded-sm object-cover"
            />
          ) : null}
          <span className="text-xs tracking-[0.08em] text-[var(--ink)]">{candidate.name}</span>
        </span>
      ))}
      {remainingCount > 0 ? (
        <span className="border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs tracking-[0.08em] text-[var(--muted)]">
          +{remainingCount} more
        </span>
      ) : null}
    </div>
  );
}

export function CandidateManagerPanel({
  poolId = null,
  candidateDraft,
  isCandidateEditorOpen,
  isEditingCandidate,
  readOnly = false,
  candidates,
  imageSuggestions,
  imageSuggestionLoading,
  onDraftChange,
  onCreateCandidate,
  onImportCandidates,
  onSubmit,
  onCloseEditor,
  onSuggestImages,
  onClearImage,
  onSelectSuggestedImage,
  onEditCandidate,
  onRemoveCandidate,
  onRemoveTagFromPool,
  onRemoveLowValueTagsFromPool,
  isRemoveTagPending,
  isRemoveLowValueTagsPending,
  isCreatePending,
  isSavePending,
  removingCandidateId = null,
  listHeading = "In This Pool",
  listEmptyMessage = "No candidates in this pool yet."
}) {
  const [isTagDrawerOpen, setIsTagDrawerOpen] = useState(false);
  const [activeTagFilter, setActiveTagFilter] = useState("");
  const [lowValueTagThreshold, setLowValueTagThreshold] = useState("1");

  const tagCounts = candidates.reduce((counts, candidate) => {
    for (const tag of candidate.tags || []) {
      counts[tag] = (counts[tag] || 0) + 1;
    }

    return counts;
  }, {});
  const sortedTags = Object.entries(tagCounts).sort((left, right) => {
    if (right[1] !== left[1]) {
      return right[1] - left[1];
    }

    return left[0].localeCompare(right[0]);
  });
  const resolvedTagFilter = activeTagFilter && tagCounts[activeTagFilter] ? activeTagFilter : "";
  const visibleCandidates = resolvedTagFilter
    ? candidates.filter((candidate) => (candidate.tags || []).includes(resolvedTagFilter))
    : candidates;

  return (
    <>
      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="display-face text-lg font-black uppercase tracking-[0.12em] text-[var(--accent-3)]">
              {resolvedTagFilter ? `${listHeading} • ${resolvedTagFilter}` : listHeading}
            </p>
            {resolvedTagFilter ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--accent-2)]">
                Filtered by tag
              </p>
            ) : null}
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onCreateCandidate}
                className="ui-button ui-button-accent"
              >
                Add Candidate
              </button>
              {onImportCandidates ? (
                <button
                  type="button"
                  onClick={onImportCandidates}
                  className="ui-button ui-button-muted"
                >
                  Import Candidates
                </button>
              ) : null}
              {sortedTags.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsTagDrawerOpen(true)}
                  className="ui-button ui-button-muted"
                >
                  Manage Tags
                </button>
              ) : null}
            </div>
          ) : sortedTags.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsTagDrawerOpen(true)}
              className="ui-button ui-button-muted"
            >
              View Tags
            </button>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCandidates.length === 0 ? (
            <span className="text-sm text-[var(--muted)]">
              {resolvedTagFilter
                ? `No candidates match the "${resolvedTagFilter}" tag.`
                : listEmptyMessage}
            </span>
          ) : (
            visibleCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`group relative flex flex-col overflow-hidden border border-[var(--line)] bg-[var(--panel)] ${
                  candidate.imageUrl ? "min-h-[16rem]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!readOnly) {
                      onEditCandidate(candidate);
                    }
                  }}
                  className="flex h-full w-full flex-1 flex-col text-left transition hover:border-[var(--accent-2)]"
                >
                  {candidate.imageUrl ? (
                    <div className="h-40 w-full bg-[var(--panel-3)]">
                      <ResilientRemoteImage
                        src={candidate.imageUrl}
                        alt={candidate.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="flex flex-1 flex-col px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="display-face text-sm font-black">{candidate.name}</p>
                      {candidate.sourceUrl ? (
                        <a
                          href={candidate.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(event) => event.stopPropagation()}
                          aria-label={`Open source for ${candidate.name}`}
                          title={`Open source for ${candidate.name}`}
                          className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-[var(--line)] text-[var(--muted)] transition hover:border-[var(--accent-3)] hover:text-[var(--accent-3)]"
                        >
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current stroke-2">
                            <path d="M14 5h5v5" />
                            <path d="M10 14 19 5" />
                            <path d="M19 14v5H5V5h5" />
                          </svg>
                        </a>
                      ) : null}
                    </div>
                    <CandidateTagList tags={candidate.tags} className="mt-2" />
                    {candidate.description ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        {candidate.description}
                      </p>
                    ) : null}
                  </div>
                </button>
                {!readOnly ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onRemoveCandidate(candidate);
                    }}
                    aria-label={`Remove ${candidate.name}`}
                    title={`Remove ${candidate.name}`}
                    disabled={readOnly || removingCandidateId === candidate.id}
                    className={`absolute right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[rgba(10,10,10,0.86)] text-[var(--muted)] opacity-0 transition hover:border-[var(--accent)] hover:text-[var(--accent)] group-hover:opacity-100 group-focus-within:opacity-100 disabled:opacity-60 ${
                      candidate.imageUrl ? "bottom-3" : "top-3"
                    }`}
                  >
                    {removingCandidateId === candidate.id ? (
                      <span className="text-[10px] uppercase tracking-[0.12em]">...</span>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2">
                        <path d="M4 7h16" />
                        <path d="M9 7V4h6v3" />
                        <path d="M7 7l1 13h8l1-13" />
                        <path d="M10 11v5" />
                        <path d="M14 11v5" />
                      </svg>
                    )}
                  </button>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>

      {isTagDrawerOpen ? (
        <div className="fixed inset-0 z-40 bg-black/70">
          <button
            type="button"
            aria-label="Close tag drawer"
            onClick={() => setIsTagDrawerOpen(false)}
            className="absolute inset-0 cursor-default"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[30rem] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  Pool Tags
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Filter the pool or remove a tag everywhere.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTagDrawerOpen(false)}
                className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
              >
                Close
              </button>
            </div>
            <div className="ui-scroll-subtle flex-1 overflow-y-auto px-5 py-5">
              {sortedTags.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No tags in this pool yet.</p>
              ) : (
                <div className="space-y-5">
                  <section className="border border-[var(--line)] bg-[var(--panel-3)] p-4">
                    <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Filter
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveTagFilter("")}
                        className={`border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
                          !resolvedTagFilter
                            ? "border-[var(--accent-2)] bg-[var(--accent-2)] text-black"
                            : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent-3)] hover:text-[var(--accent-3)]"
                        }`}
                      >
                        All Tags
                      </button>
                      {sortedTags.map(([tag, count]) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() =>
                            setActiveTagFilter((current) => (current === tag ? "" : tag))
                          }
                          className={`border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition ${
                            resolvedTagFilter === tag
                              ? "border-[var(--accent-3)] bg-[var(--panel-2)] text-[var(--accent-3)]"
                              : "border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent-3)] hover:text-[var(--accent-3)]"
                          }`}
                        >
                          {tag} ({count})
                        </button>
                      ))}
                    </div>
                  </section>

                  {!readOnly ? (
                    <section className="border border-[var(--line)] bg-[var(--panel-3)] p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                            Delete Tag
                          </p>
                          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                            Remove one tag everywhere, or clear tags with low usage.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-3 border border-[var(--line)] bg-[var(--panel)] px-3 py-3">
                        <label className="flex-1">
                          <span className="mb-2 block text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                            Remove Tags Used By
                          </span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={lowValueTagThreshold}
                            onChange={(event) => setLowValueTagThreshold(event.target.value)}
                            className="ui-field ui-field-panel"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveLowValueTagsFromPool?.(poolId, Number(lowValueTagThreshold))
                          }
                          disabled={Boolean(isRemoveLowValueTagsPending?.(Number(lowValueTagThreshold)))}
                          className="border border-[var(--line)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
                        >
                          {isRemoveLowValueTagsPending?.(Number(lowValueTagThreshold))
                            ? "Removing"
                            : "Delete <= X"}
                        </button>
                      </div>
                      <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                        Delete Individually
                      </p>
                      <div className="mt-4 space-y-2">
                        {sortedTags.map(([tag, count]) => (
                          <div
                            key={`remove:${tag}`}
                            className="flex items-center justify-between gap-3 border border-[var(--line)] bg-[var(--panel)] px-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm text-[var(--ink)]">{tag}</p>
                              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)]">
                                {count} candidate{count === 1 ? "" : "s"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onRemoveTagFromPool?.(poolId, tag)}
                              disabled={Boolean(isRemoveTagPending?.(tag))}
                              className="border border-[var(--line)] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-60"
                            >
                              {isRemoveTagPending?.(tag) ? "Removing" : "Delete"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {isCandidateEditorOpen && !readOnly ? (
        <div className="fixed inset-0 z-40 bg-black/70">
          <button
            type="button"
            aria-label="Close candidate editor"
            onClick={onCloseEditor}
            className="absolute inset-0 cursor-default"
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-[42rem] flex-col border-l border-[var(--line)] bg-[var(--panel)] shadow-[0_0_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div>
                <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                  {isEditingCandidate ? "Edit Candidate" : "Create Candidate"}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                  Update the candidate and keep the full list in place behind the drawer.
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseEditor}
                className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
              >
                Close
              </button>
            </div>

            <div className="ui-scroll-subtle flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4">
                  <input
                    value={candidateDraft.name}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("name", event.target.value)}
                    placeholder="Candidate name"
                    className="ui-field ui-field-panel"
                  />
                  <textarea
                    value={candidateDraft.description}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("description", event.target.value)}
                    placeholder="Description"
                    rows={5}
                    className="ui-field ui-field-panel"
                  />
                  <input
                    value={candidateDraft.imageUrl}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("imageUrl", event.target.value)}
                    placeholder="Image URL"
                    className="ui-field ui-field-panel"
                  />
                  <input
                    value={candidateDraft.tagsText}
                    disabled={readOnly}
                    onChange={(event) => onDraftChange("tagsText", event.target.value)}
                    placeholder="Tags (comma-separated)"
                    className="ui-field ui-field-panel"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={onSubmit}
                      disabled={readOnly || (isEditingCandidate ? isSavePending : isCreatePending)}
                      className="ui-button ui-button-primary"
                    >
                      {isEditingCandidate
                        ? isSavePending
                          ? "Saving"
                          : "Save Candidate"
                        : isCreatePending
                          ? "Creating"
                          : "Create Candidate"}
                    </button>
                    <button
                      type="button"
                      onClick={onCloseEditor}
                      className="ui-button ui-button-muted"
                    >
                      Cancel
                    </button>
                  </div>
                  {candidateDraft.imageUrl ? (
                    <div className="overflow-hidden border border-[var(--line)] bg-[var(--panel)]">
                      <div className="h-56 w-full bg-[var(--panel-2)]">
                        <ResilientRemoteImage
                          src={candidateDraft.imageUrl}
                          alt={candidateDraft.name || "Selected image"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex min-h-56 items-center justify-center border border-dashed border-[var(--line)] bg-[var(--panel)] px-4 py-6">
                      <p className="text-center text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                        Select an image to preview it here.
                      </p>
                    </div>
                  )}
                </div>

                <div
                  className={`space-y-3 border border-[var(--line)] bg-[var(--panel-3)] p-4 transition-opacity ${
                    imageSuggestionLoading ? "opacity-55" : "opacity-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-3)]">
                      Image Picks
                    </p>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={onSuggestImages}
                        disabled={readOnly || imageSuggestionLoading}
                        className="display-face border border-[var(--accent-2)] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--accent-2)] transition hover:bg-[var(--accent-2)] hover:text-black disabled:opacity-60"
                      >
                        {imageSuggestionLoading ? "Searching" : "Suggest"}
                      </button>
                      {candidateDraft.imageUrl ? (
                        <button
                          type="button"
                          onClick={onClearImage}
                          className="display-face text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {imageSuggestions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]">
                        Suggested Images
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {imageSuggestions.map((image) => {
                          const selectedImageUrl = candidateDraft.imageUrl;

                          return (
                            <button
                              key={image.id}
                              type="button"
                              disabled={readOnly}
                              onClick={() => onSelectSuggestedImage(image.imageUrl)}
                              aria-label={image.title || "Suggested image"}
                              title={image.title || "Suggested image"}
                              className={`overflow-hidden border transition ${
                                selectedImageUrl === image.imageUrl
                                  ? "border-[var(--accent-3)] bg-[var(--panel)]"
                                  : "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent-2)]"
                              }`}
                            >
                              <div className="relative h-40 w-full bg-[var(--panel-2)]">
                                <ResilientRemoteImage
                                  src={image.thumbnailUrl || image.imageUrl}
                                  alt={image.title || "Suggested image"}
                                  className="h-full w-full object-cover"
                                />
                                {selectedImageUrl === image.imageUrl ? (
                                  <div className="absolute inset-x-0 bottom-0 bg-[rgba(0,0,0,0.72)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-3)]">
                                    Selected
                                  </div>
                                ) : null}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

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
  isCreatePending,
  isSavePending,
  removingCandidateId = null,
  listHeading = "In This Pool",
  listEmptyMessage = "No candidates in this pool yet."
}) {
  return (
    <>
      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="display-face text-lg font-black uppercase tracking-[0.12em] text-[var(--accent-3)]">
            {listHeading}
          </p>
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
            </div>
          ) : null}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {candidates.length === 0 ? (
            <span className="text-sm text-[var(--muted)]">{listEmptyMessage}</span>
          ) : (
            candidates.map((candidate) => (
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
                    <p className="display-face text-sm font-black">{candidate.name}</p>
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

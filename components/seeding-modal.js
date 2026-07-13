"use client";

import { ResilientRemoteImage } from "@/components/resilient-remote-image";

export function SeedingModal({
  tournament,
  entries,
  loading,
  saving,
  draggingEntryId,
  onClose,
  onSubmit,
  onDragStart,
  onDragEnd,
  onDrop
}) {
  if (!tournament) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-4 py-6">
      <div className="mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col border border-[var(--line)] bg-[var(--panel)]">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <div>
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
              Set Seeding
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--accent-3)]">
              {tournament.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
          >
            Close
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading entries...</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Drag entries into seed order. The top item becomes seed 1.
              </p>
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <div
                    key={entry.id}
                    draggable
                    onDragStart={() => onDragStart(entry.id)}
                    onDragEnd={onDragEnd}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => onDrop(index)}
                    className={`flex cursor-move items-center gap-3 border px-3 py-3 transition ${
                      draggingEntryId === entry.id
                        ? "border-[var(--accent-3)] bg-[var(--panel-3)]"
                        : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent-2)]"
                    }`}
                  >
                    <span className="display-face w-12 text-lg font-black uppercase text-[var(--accent-2)]">
                      {index + 1}
                    </span>
                    {entry.candidateImageUrl ? (
                      <ResilientRemoteImage
                        src={entry.candidateImageUrl}
                        alt={entry.candidateName}
                        className="h-12 w-12 rounded-sm object-cover"
                      />
                    ) : null}
                    <div className="min-w-0 flex-1">
                      <p className="display-face truncate text-sm font-black uppercase">
                        {entry.candidateName}
                      </p>
                      {entry.candidateDescription ? (
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--muted)]">
                          {entry.candidateDescription}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={saving || entries.length < 2}
                  className="ui-button ui-button-accent-fill"
                >
                  {saving ? "Saving" : "Save Seeding"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="ui-button ui-button-muted"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

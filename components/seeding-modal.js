"use client";

import { ResilientRemoteImage } from "@/components/resilient-remote-image";
import { useState } from "react";

export function SeedingModal({
  tournament,
  entries,
  groups = [],
  autosaveState = "idle",
  autosaveError = "",
  loading,
  moveTargets = [],
  saving,
  draggingEntryId,
  onAddSubBracket,
  onCreateSubBracketAndMoveEntry,
  onRemoveFromPlayInAtIndex,
  onRemoveSubBracket,
  onClose,
  onSubmit,
  onDragStart,
  onDragEnd,
  onDrop,
  onDropIntoGroup,
  onMoveEntryIntoGroup,
  onRenameSubBracket,
  onTogglePlayInAtIndex,
  onToggleSubBracket
}) {
  const [backdropPointerDown, setBackdropPointerDown] = useState(false);
  const [moveMenuEntryId, setMoveMenuEntryId] = useState(null);

  function handleGroupDrop(event, group, insertIndex) {
    event.preventDefault();
    event.stopPropagation();
    onDropIntoGroup(group, insertIndex);
  }

  if (!tournament) {
    return null;
  }

  const autosaveLabel =
    autosaveState === "saving"
      ? "Saving..."
      : autosaveState === "pending"
        ? "Unsaved changes"
        : autosaveState === "invalid"
          ? "Unsaved: fix invalid seeding changes"
          : autosaveState === "error"
            ? "Save failed"
            : "Saved";

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70"
      onMouseDown={(event) => {
        setBackdropPointerDown(event.target === event.currentTarget);
      }}
      onMouseUp={(event) => {
        const shouldClose = backdropPointerDown && event.target === event.currentTarget;
        setBackdropPointerDown(false);

        if (shouldClose) {
          onClose();
        }
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col border-t border-[var(--line)] bg-[var(--panel)] md:inset-y-0 md:right-0 md:left-auto md:h-full md:max-h-none md:w-[780px] md:border-t-0 md:border-l"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <div>
            <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
              Set Seeding
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="display-face text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-2)]"
          >
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <p className="text-sm text-[var(--muted)]">Loading entries...</p>
          ) : (
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onAddSubBracket}
                  className="ui-button ui-button-muted"
                >
                  Add Sub-bracket
                </button>
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">
                Drag entries into seed order. Use Play-in to pair a normal seed with the next entry. Remove one side to leave an empty play-in slot, or remove both sides to collapse it.
              </p>
              <div className="space-y-3">
                {groups.map((group) => {
                  const isCollapsed = Boolean(group.isCollapsed);
                  const dropInsertIndex = group.isEmpty
                    ? group.startIndex
                    : (group.entries[group.entries.length - 1]?.index ?? group.startIndex) + 1;
                  const showHeader = groups.length > 1 || Boolean(group.name);

                  return (
                    <section key={group.id} className="border border-[var(--line)]">
                      {showHeader ? (
                        <div
                          className="flex items-center justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-3 py-3"
                          onDragOverCapture={(event) => event.preventDefault()}
                          onDropCapture={(event) =>
                            handleGroupDrop(event, group, dropInsertIndex)
                          }
                        >
                          <div className="min-w-0 flex-1">
                            <input
                              value={group.name}
                              onChange={(event) => onRenameSubBracket(group.id, event.target.value)}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => event.preventDefault()}
                              className="w-full bg-transparent text-sm font-semibold uppercase tracking-[0.08em] text-[var(--text)] outline-none"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            {group.id !== "__root__" ? (
                              <button
                                type="button"
                                onClick={() => onRemoveSubBracket(group.id)}
                                className="ui-button ui-button-muted min-h-[36px] px-3 py-2 text-[10px]"
                              >
                                Remove
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => onToggleSubBracket(group.id)}
                              className="ui-button ui-button-muted min-h-[36px] px-3 py-2 text-[10px]"
                            >
                              {isCollapsed ? "Open" : "Close"}
                            </button>
                          </div>
                        </div>
                      ) : null}
                      {!isCollapsed ? (
                        <div className="space-y-2 p-2">
                          {group.isEmpty ? (
                            <div
                              className="border border-dashed border-[var(--line)] bg-[var(--panel-2)] px-3 py-6 text-sm text-[var(--muted)]"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => handleGroupDrop(event, group, dropInsertIndex)}
                            >
                              Empty sub-bracket. Drag entries here next.
                            </div>
                          ) : null}
                          {group.entries.map(({ entry, index, displaySeed, isLocalPlayInSlot, canStartPlayIn, pairDirection }, rowIndex) => (
                            <div
                              key={entry.id}
                              draggable={!entry.isEmptySlot}
                              onDragStart={() => {
                                if (!entry.isEmptySlot) {
                                  onDragStart(entry.id);
                                }
                              }}
                              onDragEnd={onDragEnd}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                onMoveEntryIntoGroup(draggingEntryId, group, index);
                              }}
                              className={`group flex items-center gap-2 border px-2 py-2 transition md:gap-3 md:px-3 md:py-3 ${
                                draggingEntryId === entry.id
                                  ? "border-[var(--accent-3)] bg-[var(--panel-3)]"
                                  : "border-[var(--line)] bg-[var(--panel-2)] hover:border-[var(--accent-2)]"
                              } ${entry.isEmptySlot ? "cursor-default border-dashed" : "cursor-move"}`}
                            >
                              <div className="flex w-10 shrink-0 flex-col md:w-16">
                                <span className="display-face text-base font-black uppercase text-[var(--accent-2)] md:text-lg">
                                  {displaySeed ?? ""}
                                </span>
                                {isLocalPlayInSlot ? (
                                  <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                                    play-in
                                  </span>
                                ) : null}
                              </div>
                              {entry.candidateImageUrl ? (
                                <ResilientRemoteImage
                                  src={entry.candidateImageUrl}
                                  alt={entry.candidateName}
                                  className="h-10 w-10 shrink-0 rounded-sm object-cover md:h-12 md:w-12"
                                />
                              ) : null}
                              <div className="min-w-0 flex-1">
                                <p className="display-face truncate text-sm font-black uppercase">
                                  {entry.candidateName}
                                </p>
                                {entry.candidateDescription ? (
                                  <p className="mt-1 hidden line-clamp-2 text-xs leading-5 text-[var(--muted)] md:block">
                                    {entry.candidateDescription}
                                  </p>
                                ) : null}
                                {entry.isEmptySlot ? (
                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
                                    Empty slot
                                  </p>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 items-center">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setMoveMenuEntryId((current) => (current === entry.id ? null : entry.id));
                                    }}
                                    className="ui-button ui-button-muted flex h-10 w-10 items-center justify-center p-0 text-base leading-none tracking-normal"
                                    aria-label={`Actions for ${entry.candidateName}`}
                                    aria-haspopup="menu"
                                    aria-expanded={moveMenuEntryId === entry.id}
                                  >
                                    <span aria-hidden="true">&#8942;</span>
                                  </button>
                                  {moveMenuEntryId === entry.id ? (
                                    <div
                                      role="menu"
                                      className="absolute right-0 top-full z-20 mt-2 w-52 border border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                                    >
                                      <div className="space-y-1">
                                        {isLocalPlayInSlot ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              const partner =
                                                pairDirection === "previous"
                                                  ? group.entries[rowIndex - 1]
                                                  : group.entries[rowIndex + 1];

                                              if (partner?.entry?.id) {
                                                onRemoveFromPlayInAtIndex(entry.id, partner.entry.id);
                                                setMoveMenuEntryId(null);
                                              }
                                            }}
                                            className="block w-full px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--accent-2)] transition hover:bg-[var(--panel-3)]"
                                          >
                                            Remove from play-in
                                          </button>
                                        ) : canStartPlayIn ? (
                                          <button
                                            type="button"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              const partner = group.entries[rowIndex + 1];

                                              if (partner?.entry?.id) {
                                                onTogglePlayInAtIndex(entry.id, partner.entry.id);
                                                setMoveMenuEntryId(null);
                                              }
                                            }}
                                            className="block w-full px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--accent-2)] transition hover:bg-[var(--panel-3)]"
                                          >
                                            Create play-in
                                          </button>
                                        ) : null}
                                        {isLocalPlayInSlot || canStartPlayIn ? (
                                          <div className="my-1 border-t border-[var(--line)]" />
                                        ) : null}
                                        {moveTargets.map((target) => (
                                          <button
                                            key={`${entry.id}-${target.id}`}
                                            type="button"
                                            onClick={(event) => {
                                              event.preventDefault();
                                              event.stopPropagation();
                                              const targetGroup = groups.find((candidateGroup) => candidateGroup.id === target.id);

                                              if (targetGroup) {
                                                onMoveEntryIntoGroup(entry.id, targetGroup, target.insertIndex);
                                                setMoveMenuEntryId(null);
                                              }
                                            }}
                                            className="block w-full px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--text)] transition hover:bg-[var(--panel-3)]"
                                          >
                                            {target.label}
                                          </button>
                                        ))}
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.preventDefault();
                                            event.stopPropagation();
                                            onCreateSubBracketAndMoveEntry(entry.id);
                                            setMoveMenuEntryId(null);
                                          }}
                                          className="block w-full border-t border-[var(--line)] px-3 py-2 text-left text-xs uppercase tracking-[0.12em] text-[var(--accent-2)] transition hover:bg-[var(--panel-3)]"
                                        >
                                          New sub-bracket
                                        </button>
                                      </div>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs uppercase tracking-[0.14em] ${
                      autosaveState === "error"
                        ? "text-[var(--accent-2)]"
                        : autosaveState === "invalid" || autosaveState === "pending"
                          ? "text-[var(--muted)]"
                          : "text-[var(--accent-3)]"
                    }`}
                  >
                    {autosaveLabel}
                  </p>
                  {autosaveState === "error" && autosaveError ? (
                    <p className="mt-2 text-sm leading-5 text-[var(--accent-2)]">
                      {autosaveError}
                    </p>
                  ) : null}
                </div>
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

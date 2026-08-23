"use client";

import { SideDrawer, SideDrawerBody } from "@/components/shared";
import type { SeedingModalProps } from "../types";
import { SeedingGroupSection } from "./seeding-group-section";
import { SeedingSaveStatus } from "./seeding-save-status";
import styles from "./seeding-editor.module.css";

export function SeedingModal({
  tournament,
  groups = [],
  autosaveState = "idle",
  autosaveError = "",
  loading,
  moveTargets = [],
  draggingEntryId,
  onAddSubBracket,
  onCreateSubBracketAndMoveEntry,
  onRemoveFromPlayInAtIndex,
  onRemoveSubBracket,
  onClose,
  onSubmit,
  onDragStart,
  onDragEnd,
  onDropIntoGroup,
  onMoveEntryIntoGroup,
  onRenameSubBracket,
  onTogglePlayInAtIndex,
  onToggleSubBracket,
}: SeedingModalProps) {
  if (!tournament) return null;
  return (
    <SideDrawer size="xwide" title="Set Seeding" onClose={onClose}>
      <SideDrawerBody>
        {loading ? (
          <p className={`ui-copy ${styles.copy}`}>Loading entries...</p>
        ) : (
          <form className={styles.form} onSubmit={onSubmit}>
            <button type="button" onClick={onAddSubBracket} className="ui-button ui-button-muted">
              Add Sub-bracket
            </button>
            <p className={`ui-copy ${styles.copy}`}>
              Drag entries into seed order. Use Play-in to pair a normal seed with the next entry. Remove one side to leave an empty play-in slot, or remove both sides to collapse
              it.
            </p>
            <div className={styles.groups}>
              {groups.map((group) => (
                <SeedingGroupSection
                  key={group.id}
                  group={group}
                  allGroups={groups}
                  showHeader={groups.length > 1 || Boolean(group.name)}
                  moveTargets={moveTargets}
                  draggingEntryId={draggingEntryId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  onDropIntoGroup={onDropIntoGroup}
                  onMoveEntryIntoGroup={onMoveEntryIntoGroup}
                  onRename={onRenameSubBracket}
                  onToggle={onToggleSubBracket}
                  onRemove={onRemoveSubBracket}
                  onRemoveFromPlayIn={onRemoveFromPlayInAtIndex}
                  onTogglePlayIn={onTogglePlayInAtIndex}
                  onCreateSubBracket={onCreateSubBracketAndMoveEntry}
                />
              ))}
            </div>
            <SeedingSaveStatus state={autosaveState} error={autosaveError} onClose={onClose} />
          </form>
        )}
      </SideDrawerBody>
    </SideDrawer>
  );
}
